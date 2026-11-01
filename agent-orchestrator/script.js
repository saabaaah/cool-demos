'use strict';

/* ==========================================================================
   Agent Orchestrator - planner + worker pool, three routing strategies
   ========================================================================== */

// ---------- Constants ----------
const W = 1600;
const H = 900;

const TIERS = [
  { id: 'fast', name: 'Fast', letter: 'F', color: '#4ade80', rgb: '74,222,128', speed: 3, price: 1 },
  { id: 'mid', name: 'Mid', letter: 'M', color: '#00d4ff', rgb: '0,212,255', speed: 2, price: 3 },
  { id: 'heavy', name: 'Heavy', letter: 'H', color: '#c084fc', rgb: '192,132,252', speed: 1, price: 15 },
];

const SIZE_INFO = { S: { tokens: 2000, tier: 0, idx: 0 }, M: { tokens: 6000, tier: 1, idx: 1 }, L: { tokens: 15000, tier: 2, idx: 2 } };

// Success probability [tier][sizeIdx]
const SUCCESS = [
  [0.95, 0.6, 0.25],
  [0.99, 0.95, 0.75],
  [0.99, 0.99, 0.97],
];
// Probability a worker notices its own failure right away. The rest look "done"
// and only surface as defects when the planner reviews the merged work.
const CATCH = [0.25, 0.6, 0.9];
// Diagnosing a hidden defect costs the planner (Heavy) this fraction of the task's tokens.
const DIAG_FRACTION = 1.0;

const STRATEGIES = {
  heavy: { label: 'All heavy', sub: 'every task goes to Heavy', color: '#c084fc', rgb: '192,132,252', tiers: [2] },
  fast: { label: 'All fast', sub: 'every task goes to Fast', color: '#4ade80', rgb: '74,222,128', tiers: [0] },
  smart: { label: 'Smart routing', sub: 'S to Fast, M to Mid, L to Heavy, escalate on failure', color: '#00d4ff', rgb: '0,212,255', tiers: [0, 1, 2] },
};
const RACE_ORDER = ['heavy', 'fast', 'smart'];

const NAMES = {
  S: ['fix typo', 'rename var', 'edit README', 'bump version', 'add comment', 'fix lint', 'sort imports', 'drop logs', 'update docs', 'tidy css'],
  M: ['auth.ts', 'write tests', 'new endpoint', 'form checks', 'cache layer', 'dark mode', 'search.ts', 'error paths', 'pagination'],
  L: ['design API', 'migrate db', 'refactor core', 'new parser', 'split app', 'auth flow', 'perf pass'],
};

const TIME_K = 0.8; // sim seconds per 1k tokens at speed 1
const PLAN_TOKENS = 4000;
const REVIEW_TOKENS = 3000;
const NOTE_TIME = 1.6; // seconds the planner shows a review note
const EMIT_GAP = 0.22;
const FLIGHT = 0.5;
const MAX_STEP = 0.05;
const BAR_H = 66;

const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- RNG ----------
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Project: 14-20 tasks, ~45% S / 35% M / 20% L, identical for a given seed
function generateProject(seed) {
  const rng = mulberry32(seed * 2654435761 + 12345);
  const n = 14 + Math.floor(rng() * 7);
  const nL = Math.max(1, Math.round(n * 0.2));
  const nS = Math.round(n * 0.45);
  const nM = n - nL - nS;
  const sizes = shuffle([].concat(Array(nS).fill('S'), Array(nM).fill('M'), Array(nL).fill('L')), rng);
  const pools = { S: shuffle(NAMES.S.slice(), rng), M: shuffle(NAMES.M.slice(), rng), L: shuffle(NAMES.L.slice(), rng) };
  return sizes.map((size, id) => {
    const name = pools[size].length ? pools[size].pop() : NAMES[size][id % NAMES[size].length] + ' 2';
    return { id, size, name, tokens: SIZE_INFO[size].tokens };
  });
}

// ---------- Helpers ----------
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- Task ----------
class Task {
  constructor(def, strategy) {
    this.id = def.id;
    this.size = def.size;
    this.name = def.name;
    this.tokens = def.tokens;
    const base = SIZE_INFO[def.size].tier;
    this.tierIdx = strategy === 'heavy' ? 2 : strategy === 'fast' ? 0 : base;
    this.state = 'new'; // entering | queued | toWorker | working | failing | toDone | done
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;
    this.attempts = 0;
    this.defect = false;
    this.badge = 'retry';
    this.timer = 0;
    this.fl = null;
    this.slot = 0;
    this.doneIdx = 0;
    this.doneTier = 0;
    this.bend = 0.18 + ((def.id * 37) % 10) / 45;
  }
}

// ---------- Worker ----------
class Worker {
  constructor(tier, index) {
    this.tier = tier;
    this.index = index;
    this.task = null;
    this.recv = false;
    this.progress = 0;
    this.dur = 1;
    this.flash = 0;
    this.pulse = 0;
    this.phase = index * 1.7 + tier * 0.9;
    this.eligible = true;
    this.x = 0;
    this.y = 0;
    this.r = 16;
  }
}

// ---------- Lane ----------
class Lane {
  constructor(key, project, counts, seed, laneIdx, h, big) {
    this.key = key;
    this.strat = STRATEGIES[key];
    this.rng = mulberry32(seed + 7919 * (laneIdx + 1));
    this.crng = mulberry32(seed + 104729 * (laneIdx + 1));
    this.total = project.length;
    this.tasks = project.map((d) => new Task(d, key));
    this.pending = this.tasks.slice(); // not yet emitted
    this.queue = [];
    this.workers = [];
    TIERS.forEach((t, ti) => {
      for (let i = 0; i < counts[ti]; i++) {
        const w = new Worker(ti, i);
        w.eligible = this.strat.tiers.indexOf(ti) >= 0;
        this.workers.push(w);
      }
    });
    this.parts = [];
    this.time = 0;
    this.anim = 0;
    this.cost = 0;
    this.retries = 0;
    this.defects = 0;
    this.reviews = 0;
    this.doneCount = 0;
    this.finished = false;
    this.finishAnim = 0;
    this.planner = { state: 'thinking', t: 0, dur: (PLAN_TOKENS / 1000 / TIERS[2].speed) * TIME_K, emitted: 0, x: 0, y: 0, r: 30, note: '', noteT: 0 };
    this.layout(h, big, counts);
  }

  layout(h, big, counts) {
    const n = this.total;
    const g = (this.g = { h, big, hh: big ? 72 : 48 });
    const bodyH = h - g.hh;
    g.cw = big ? 120 : 84;
    g.ch = big ? 30 : 22;
    g.cols = big ? 2 : 3;
    g.rows = Math.ceil(n / g.cols);
    g.px = g.cw + (big ? 8 : 6);
    g.py = g.ch + (big ? 8 : 4);
    g.qx = 24;
    g.qy = g.hh + 36;
    g.qEnd = g.qx + g.cols * g.px;
    g.dw = big ? 30 : 18;
    g.dp = g.dw + (big ? 6 : 3);
    g.dcols = big ? 5 : 4;
    g.dx = W - 24 - g.dcols * g.dp;
    g.dy = g.hh + 36;
    const ax0 = g.qEnd + 40;
    const ax1 = g.dx - 40;
    g.ax0 = ax0;
    g.ax1 = ax1;
    const p = this.planner;
    p.x = (ax0 + ax1) / 2;
    p.y = g.hh + bodyH * (big ? 0.21 : 0.27);
    p.r = big ? 54 : 30;
    const wy = g.hh + bodyH * (big ? 0.7 : 0.74);
    const groups = [0, 1, 2].filter((t) => counts[t] > 0);
    const gap = big ? 60 : 44;
    const nw = this.workers.length;
    const sp = Math.min(big ? 86 : 62, (ax1 - ax0 - gap * (groups.length - 1)) / nw);
    const r = Math.min(big ? 28 : 17, sp * 0.4);
    const totalW = nw * sp + gap * (groups.length - 1);
    let cx = (ax0 + ax1) / 2 - totalW / 2;
    g.sp = sp;
    g.groups = [];
    groups.forEach((t) => {
      const gw = counts[t] * sp;
      g.groups.push({ tier: t, cx: cx + gw / 2, w: gw });
      this.workers
        .filter((w) => w.tier === t)
        .forEach((w, i) => {
          w.x = cx + (i + 0.5) * sp;
          w.y = wy;
          w.r = r;
        });
      cx += gw + gap;
    });
    g.wy = wy;
  }

  slotPos(i) {
    const g = this.g;
    const col = Math.min(g.cols - 1, Math.floor(i / g.rows));
    const row = i % g.rows;
    return [g.qx + col * g.px + g.cw / 2, g.qy + row * g.py + g.ch / 2];
  }

  donePos(i) {
    const g = this.g;
    return [g.dx + (i % g.dcols) * g.dp + g.dw / 2, g.dy + Math.floor(i / g.dcols) * g.dp + g.dw / 2];
  }

  targetOf(t) {
    if (t.state === 'entering') return this.slotPos(t.slot);
    if (t.state === 'toWorker') return [t.worker.x, t.worker.y];
    return this.donePos(t.doneIdx);
  }

  startFlight(t, state, w1, h1) {
    t.state = state;
    t.fl = { sx: t.x, sy: t.y, w0: t.w, h0: t.h, w1, h1, t: 0, dur: FLIGHT };
  }

  emit() {
    const t = this.pending.shift();
    const g = this.g;
    t.x = this.planner.x;
    t.y = this.planner.y;
    t.w = g.cw * 0.3;
    t.h = g.ch * 0.3;
    this.queue.push(t);
    t.slot = this.queue.length - 1;
    this.startFlight(t, 'entering', g.cw, g.ch);
  }

  burst(x, y, color) {
    if (REDUCED_MOTION) return;
    for (let i = 0; i < 14; i++) {
      const a = this.crng() * Math.PI * 2;
      const sp = 40 + this.crng() * 110;
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.5 + this.crng() * 0.4, color });
    }
  }

  update(dt) {
    this.anim += dt;
    this.updateParticles(dt);
    this.workers.forEach((w) => {
      w.flash = Math.max(0, w.flash - dt);
      w.pulse = Math.max(0, w.pulse - dt * 2);
    });
    if (this.finished) {
      this.finishAnim = Math.min(1, this.finishAnim + dt * 2.5);
      return;
    }
    this.time += dt;
    this.queue.forEach((t, i) => (t.slot = i));
    this.tasks.forEach((t) => this.updateTask(t, dt));
    this.workers.forEach((w) => {
      if (w.task && !w.recv) {
        w.progress += dt / w.dur;
        if (w.progress >= 1) this.completeWork(w);
      }
    });
    this.assign();
    this.updatePlanner(dt);
  }

  updateParticles(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life += dt;
      if (p.life >= p.max) {
        this.parts.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }
  }

  updateTask(t, dt) {
    if (t.state === 'failing') {
      t.timer -= dt;
      if (t.timer <= 0) {
        this.queue.unshift(t);
        this.queue.forEach((q, i) => (q.slot = i));
        this.startFlight(t, 'entering', this.g.cw, this.g.ch);
      }
      return;
    }
    if (t.fl) {
      const f = t.fl;
      f.t = Math.min(1, f.t + dt / f.dur);
      const e = ease(f.t);
      const [ex, ey] = this.targetOf(t);
      const dx = ex - f.sx;
      const dy = ey - f.sy;
      const len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len;
      let ny = dx / len;
      if (ny > 0) {
        nx = -nx;
        ny = -ny;
      }
      const cx = (f.sx + ex) / 2 + nx * len * t.bend;
      const cy = (f.sy + ey) / 2 + ny * len * t.bend;
      const u = 1 - e;
      t.x = u * u * f.sx + 2 * u * e * cx + e * e * ex;
      t.y = u * u * f.sy + 2 * u * e * cy + e * e * ey;
      t.w = lerp(f.w0, f.w1, e);
      t.h = lerp(f.h0, f.h1, e);
      if (f.t >= 1) {
        t.fl = null;
        if (t.state === 'entering') t.state = 'queued';
        else if (t.state === 'toWorker') {
          t.state = 'working';
          t.worker.recv = false;
        } else if (t.state === 'toDone') t.state = 'done';
      }
    } else if (t.state === 'queued') {
      const [sx, sy] = this.slotPos(t.slot);
      const k = 1 - Math.exp(-dt * 14);
      t.x += (sx - t.x) * k;
      t.y += (sy - t.y) * k;
    }
  }

  assign() {
    for (const w of this.workers) {
      if (w.task || !w.eligible) continue;
      const idx = this.queue.findIndex((t) => t.state === 'queued' && t.tierIdx === w.tier);
      if (idx < 0) continue;
      const t = this.queue.splice(idx, 1)[0];
      this.queue.forEach((q, i) => (q.slot = i));
      w.task = t;
      w.recv = true;
      w.progress = 0;
      w.dur = (t.tokens / 1000 / TIERS[w.tier].speed) * TIME_K;
      t.worker = w;
      this.startFlight(t, 'toWorker', this.g.cw * 0.4, this.g.ch * 0.4);
    }
  }

  completeWork(w) {
    const t = w.task;
    const tier = TIERS[w.tier];
    this.cost += (t.tokens / 1000) * tier.price;
    const ok = this.rng() < SUCCESS[w.tier][SIZE_INFO[t.size].idx];
    const caught = !ok && this.rng() < CATCH[w.tier];
    w.task = null;
    w.progress = 0;
    const g = this.g;
    if (ok || !caught) {
      // Either real success, or a failure the worker did not notice: it ships as "done"
      // and the planner's review has to find it.
      t.defect = !ok;
      this.doneCount++;
      t.doneIdx = this.doneCount - 1;
      t.doneTier = w.tier;
      t.x = w.x;
      t.y = w.y;
      t.w = g.cw * 0.4;
      t.h = g.ch * 0.4;
      this.startFlight(t, 'toDone', g.dw, g.dw);
      this.burst(w.x, w.y, tier.color);
      w.pulse = 1;
    } else {
      this.retries++;
      t.attempts++;
      t.badge = 'retry';
      if (this.key === 'smart') t.tierIdx = Math.min(2, t.tierIdx + 1);
      t.state = 'failing';
      t.timer = 0.6;
      t.x = w.x;
      t.y = w.y - w.r - 22;
      t.w = g.cw;
      t.h = g.ch;
      w.flash = 0.6;
    }
  }

  updatePlanner(dt) {
    const p = this.planner;
    if (p.state === 'thinking') {
      p.t += dt;
      if (p.t >= p.dur) {
        this.cost += (PLAN_TOKENS / 1000) * TIERS[2].price;
        p.state = 'emitting';
        p.t = EMIT_GAP;
      }
    }
    if (p.state === 'emitting') {
      p.t += dt;
      while (p.t >= EMIT_GAP && this.pending.length) {
        p.t -= EMIT_GAP;
        this.emit();
      }
      if (!this.pending.length) p.state = 'waiting';
    } else if (p.state === 'waiting') {
      if (this.doneCount === this.total) {
        p.state = 'reviewing';
        p.t = 0;
        p.dur = (REVIEW_TOKENS / 1000 / TIERS[2].speed) * TIME_K;
      }
    } else if (p.state === 'reviewing') {
      p.t += dt;
      if (p.t >= p.dur) {
        this.cost += (REVIEW_TOKENS / 1000) * TIERS[2].price;
        this.reviews++;
        const bad = this.tasks.filter((t) => t.state === 'done' && t.defect);
        if (!bad.length) {
          p.state = 'done';
          this.finished = true;
        } else {
          this.kickBack(bad);
          p.state = 'waiting';
          p.note = `review found ${bad.length} defect${bad.length > 1 ? 's' : ''}`;
          p.noteT = NOTE_TIME;
        }
      }
    }
    if (p.noteT > 0) p.noteT -= dt;
  }

  // Defects found at review: the planner pays to diagnose each one, then sends it back to the queue.
  kickBack(bad) {
    const g = this.g;
    bad.forEach((t, i) => {
      this.defects++;
      this.cost += (t.tokens / 1000) * TIERS[2].price * DIAG_FRACTION;
      const [x, y] = this.donePos(t.doneIdx);
      t.defect = false;
      t.attempts++;
      t.badge = 'defect';
      if (this.key === 'smart') t.tierIdx = Math.min(2, t.tierIdx + 1);
      t.state = 'failing';
      t.timer = 0.7 + i * 0.12;
      t.x = x;
      t.y = y;
      t.w = g.cw;
      t.h = g.ch;
      this.doneCount--;
      this.burst(x, y, '#ff6b6b');
    });
    // close the gaps in the Done column
    this.tasks.filter((t) => t.state === 'done').sort((a, b) => a.doneIdx - b.doneIdx).forEach((t, i) => (t.doneIdx = i));
  }
}

// ---------- Renderer ----------
const canvas = document.getElementById('orchCanvas');
const ctx = canvas.getContext('2d');

function rr(c, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}

const SANS = "'Space Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

function txt(c, s, x, y, font, color, align, base) {
  c.font = font;
  c.fillStyle = color;
  c.textAlign = align || 'left';
  c.textBaseline = base || 'middle';
  c.fillText(s, x, y);
}

function caps(c, s, x, y, font, color, align) {
  if ('letterSpacing' in c) c.letterSpacing = '1.5px';
  txt(c, s, x, y, font, color, align);
  if ('letterSpacing' in c) c.letterSpacing = '0px';
}

function fit(c, s, maxW) {
  if (c.measureText(s).width <= maxW) return s;
  let t = s;
  while (t.length > 1 && c.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}

function drawCard(c, t, lane, x, y, w, h, opts) {
  const g = lane.g;
  const tier = TIERS[t.tierIdx];
  const failing = opts && opts.failing;
  const col = failing ? '#ff6b6b' : tier.color;
  rr(c, x - w / 2, y - h / 2, w, h, Math.min(6, h / 3));
  c.fillStyle = failing ? 'rgba(60,18,24,0.95)' : 'rgba(18,20,30,0.95)';
  c.fill();
  c.lineWidth = failing ? 2 : 1.2;
  c.strokeStyle = failing ? col : `rgba(${tier.rgb},0.75)`;
  c.stroke();
  if (w < 40) return;
  const fs = g.big ? 13 : 10.5;
  txt(c, t.size, x - w / 2 + 10, y + 0.5, `700 ${fs}px ${MONO}`, col, 'center');
  c.font = `500 ${fs}px ${SANS}`;
  const label = fit(c, t.name, w - 26);
  txt(c, label, x - w / 2 + 20, y + 0.5, `500 ${fs}px ${SANS}`, 'rgba(255,255,255,0.88)', 'left');
  if (t.attempts > 0 && (opts && opts.badge)) {
    const bw = (g.big ? 42 : 32) + (t.badge === 'defect' ? 6 : 0);
    const bh = g.big ? 15 : 12;
    rr(c, x + w / 2 - bw + 4, y - h / 2 - bh / 2 - 1, bw, bh, 6);
    c.fillStyle = '#ff6b6b';
    c.fill();
    txt(c, t.badge, x + w / 2 - bw / 2 + 4, y - h / 2 - 0.5, `700 ${g.big ? 10 : 8}px ${SANS}`, '#1a0509', 'center');
  }
}

function drawPlanner(c, lane) {
  const p = lane.planner;
  const g = lane.g;
  const col = TIERS[2];
  const busy = p.state === 'thinking' || p.state === 'reviewing';
  const pulse = 0.5 + 0.5 * Math.sin(lane.anim * 5);
  c.save();
  c.shadowColor = `rgba(${col.rgb},${busy ? 0.9 : p.state === 'emitting' ? 0.5 + 0.3 * pulse : 0.35})`;
  c.shadowBlur = busy ? 34 : 20;
  c.beginPath();
  c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  c.fillStyle = '#17121f';
  c.fill();
  c.lineWidth = g.big ? 4 : 3;
  c.strokeStyle = col.color;
  c.stroke();
  c.restore();
  if (busy) {
    const frac = clamp(p.t / p.dur, 0, 1);
    c.beginPath();
    c.arc(p.x, p.y, p.r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    c.lineWidth = 3;
    c.strokeStyle = `rgba(${col.rgb},0.9)`;
    c.lineCap = 'round';
    c.stroke();
    c.lineCap = 'butt';
  }
  txt(c, 'Planner', p.x, p.y, `700 ${g.big ? 20 : 12.5}px ${SANS}`, '#fff', 'center');
  const status = {
    thinking: 'Planning…',
    emitting: 'Dispatching tasks',
    waiting: 'Waiting on workers',
    reviewing: 'Review & merge',
    done: 'Merged',
  }[p.state];
  const showNote = p.noteT > 0 && p.note;
  txt(c, showNote ? p.note : status, p.x, p.y + p.r + (g.big ? 28 : 18), `${showNote ? 700 : 500} ${g.big ? 15 : 11}px ${SANS}`, showNote ? '#ff7b7b' : 'rgba(255,255,255,0.55)', 'center');
}

function drawWorker(c, lane, w) {
  const g = lane.g;
  const tier = TIERS[w.tier];
  const busy = !!w.task;
  const breathe = 0.5 + 0.5 * Math.sin(lane.anim * 2 + w.phase);
  c.save();
  if (!w.eligible) c.globalAlpha = 0.14;
  const flash = w.flash > 0;
  if (busy || w.pulse > 0 || flash) {
    c.shadowColor = flash ? '#ff6b6b' : tier.color;
    c.shadowBlur = busy ? 22 : 14 + 16 * w.pulse;
  }
  c.beginPath();
  c.arc(w.x, w.y, w.r, 0, Math.PI * 2);
  c.fillStyle = busy ? `rgba(${tier.rgb},0.16)` : 'rgba(16,18,26,0.95)';
  c.fill();
  c.lineWidth = g.big ? 3.5 : 2.5;
  c.strokeStyle = flash ? '#ff6b6b' : busy ? tier.color : `rgba(${tier.rgb},${0.28 + 0.14 * breathe})`;
  c.stroke();
  c.restore();
  if (busy && !w.recv) {
    c.beginPath();
    c.arc(w.x, w.y, w.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(w.progress, 0, 1));
    c.lineWidth = g.big ? 3 : 2;
    c.strokeStyle = tier.color;
    c.lineCap = 'round';
    c.stroke();
    c.lineCap = 'butt';
  }
  c.save();
  if (!w.eligible) c.globalAlpha = 0.2;
  const letter = busy ? w.task.size : tier.letter;
  txt(c, letter, w.x, w.y + 0.5, `700 ${Math.round(w.r * 0.8)}px ${MONO}`, busy ? tier.color : `rgba(${tier.rgb},0.55)`, 'center');
  c.restore();
  if (busy && w.eligible) {
    c.font = `500 ${g.big ? 12 : 10}px ${SANS}`;
    const label = fit(c, w.task.name, Math.max(40, g.sp + 6));
    txt(c, label, w.x, w.y + w.r + (g.big ? 18 : 14), `500 ${g.big ? 12 : 10}px ${SANS}`, 'rgba(255,255,255,0.8)', 'center');
  }
}

function drawLane(c, lane, y0, active) {
  const g = lane.g;
  const s = lane.strat;
  const hh = g.hh;
  c.save();
  c.translate(0, y0);
  rr(c, 1, 1, W - 2, g.h - 2, 14);
  c.fillStyle = 'rgba(255,255,255,0.022)';
  c.fill();
  c.save();
  c.clip();

  // header
  c.fillStyle = `rgba(${s.rgb},0.08)`;
  c.fillRect(0, 0, W, hh);
  c.fillStyle = `rgba(${s.rgb},0.45)`;
  c.fillRect(0, hh - 1, W, 1);
  c.beginPath();
  c.arc(30, g.big ? 26 : 18, g.big ? 8 : 6, 0, Math.PI * 2);
  c.fillStyle = s.color;
  c.fill();
  txt(c, s.label, 48, g.big ? 26 : 18, `700 ${g.big ? 30 : 22}px ${SANS}`, '#fff', 'left');
  txt(c, s.sub, 30, g.big ? 54 : 37, `400 ${g.big ? 14 : 11}px ${SANS}`, 'rgba(255,255,255,0.5)', 'left');
  const bw = g.big ? 168 : 124;
  const metrics = [
    ['DONE', `${lane.doneCount}/${lane.total}`, '#fff'],
    ['TIME', `${lane.time.toFixed(1)}s`, '#fff'],
    ['COST (CREDITS)', fmt(lane.cost), s.color],
    ['REWORK', String(lane.retries + lane.defects), lane.retries + lane.defects > 0 ? '#ff7b7b' : '#fff'],
    ['COST / TASK', lane.doneCount ? fmt(lane.cost / lane.doneCount) : '-', '#fff'],
  ];
  metrics.forEach((m, i) => {
    const mx = W - 24 - bw * (5 - i) + 8;
    caps(c, m[0], mx, g.big ? 22 : 15, `500 ${g.big ? 12 : 9.5}px ${SANS}`, 'rgba(255,255,255,0.42)');
    txt(c, m[1], mx, g.big ? 49 : 35, `500 ${g.big ? 28 : 21}px ${MONO}`, m[2], 'left');
  });

  // section labels
  caps(c, `QUEUE ${lane.queue.length}`, g.qx, hh + 18, `500 ${g.big ? 12 : 10}px ${SANS}`, 'rgba(255,255,255,0.4)');
  caps(c, `DONE ${lane.doneCount}`, g.dx, hh + 18, `500 ${g.big ? 12 : 10}px ${SANS}`, 'rgba(255,255,255,0.4)');

  // connection lines planner <-> workers
  const p = lane.planner;
  lane.workers.forEach((w) => {
    if (!w.eligible) return;
    c.beginPath();
    const ly = p.y + p.r + (g.big ? 42 : 28);
    c.moveTo(p.x, ly);
    c.quadraticCurveTo(p.x + (w.x - p.x) * 0.15, (ly + w.y) / 2, w.x, w.y - w.r - 4);
    const hot = !!w.task;
    c.strokeStyle = `rgba(${TIERS[w.tier].rgb},${hot ? 0.28 : 0.09})`;
    c.lineWidth = 1.2;
    c.stroke();
  });

  // worker group labels
  g.groups.forEach((gr) => {
    const tier = TIERS[gr.tier];
    const elig = s.tiers.indexOf(gr.tier) >= 0;
    const ws = lane.workers.filter((w) => w.tier === gr.tier);
    const r = ws[0].r;
    c.save();
    if (!elig) c.globalAlpha = 0.25;
    caps(c, `${tier.name.toUpperCase()}  ${tier.price} CR/1K`, gr.cx, g.wy - r - (g.big ? 22 : 16), `600 ${g.big ? 13 : 10}px ${SANS}`, tier.color, 'center');
    c.restore();
  });

  drawPlanner(c, lane);
  lane.workers.forEach((w) => drawWorker(c, lane, w));

  // tasks
  lane.tasks.forEach((t) => {
    if (t.state === 'done') {
      const tier = TIERS[t.doneTier];
      const [x, y] = lane.donePos(t.doneIdx);
      rr(c, x - g.dw / 2, y - g.dw / 2, g.dw, g.dw, 4);
      c.fillStyle = `rgba(${tier.rgb},0.2)`;
      c.fill();
      c.lineWidth = 1.3;
      c.strokeStyle = tier.color;
      c.stroke();
      txt(c, t.size, x, y + 0.5, `700 ${g.big ? 13 : 9.5}px ${MONO}`, tier.color, 'center');
    } else if (t.state === 'toDone') {
      const tier = TIERS[t.doneTier];
      rr(c, t.x - t.w / 2, t.y - t.h / 2, t.w, t.h, 4);
      c.fillStyle = `rgba(${tier.rgb},0.28)`;
      c.fill();
      c.lineWidth = 1.3;
      c.strokeStyle = tier.color;
      c.stroke();
    } else if (t.state === 'entering' || t.state === 'queued') {
      drawCard(c, t, lane, t.x, t.y, t.w, t.h, { badge: true });
    } else if (t.state === 'toWorker') {
      drawCard(c, t, lane, t.x, t.y, t.w, t.h, {});
    } else if (t.state === 'failing') {
      const sh = Math.sin(lane.anim * 70) * 3 * (t.timer / 0.6 + 0.2);
      drawCard(c, t, lane, t.x + sh, t.y, t.w, t.h, { failing: true, badge: true });
    }
  });

  // particles
  lane.parts.forEach((q) => {
    const a = 1 - q.life / q.max;
    c.beginPath();
    c.arc(q.x, q.y, 1.5 + 2.5 * a, 0, Math.PI * 2);
    c.fillStyle = q.color;
    c.globalAlpha = a;
    c.fill();
    c.globalAlpha = 1;
  });

  // project arriving at the planner
  if (lane.time < 0.9 && !lane.finished) {
    const u = ease(clamp(lane.time / 0.9, 0, 1));
    const x = lerp(p.x - 420, p.x, u);
    const w = lerp(g.big ? 190 : 150, 30, u);
    rr(c, x - w / 2, p.y - 15, w, 30, 8);
    c.globalAlpha = 1 - u * u;
    c.fillStyle = 'rgba(30,24,44,0.95)';
    c.fill();
    c.strokeStyle = TIERS[2].color;
    c.lineWidth = 1.5;
    c.stroke();
    if (w > 100) txt(c, `Project · ${lane.total} tasks`, x, p.y + 0.5, `600 ${g.big ? 14 : 12}px ${SANS}`, '#fff', 'center');
    c.globalAlpha = 1;
  }

  // finished stamp
  if (lane.finished) {
    const a = ease(lane.finishAnim);
    c.fillStyle = `rgba(10,10,15,${0.55 * a})`;
    c.fillRect(0, hh, W, g.h - hh);
    c.save();
    c.translate(W / 2, hh + (g.h - hh) * 0.5);
    c.rotate(-0.05);
    c.scale(lerp(1.4, 1, a), lerp(1.4, 1, a));
    c.globalAlpha = a;
    const bwid = g.big ? 760 : 540;
    const bhei = g.big ? 170 : 104;
    rr(c, -bwid / 2, -bhei / 2, bwid, bhei, 14);
    c.fillStyle = 'rgba(10,10,15,0.9)';
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = s.color;
    c.shadowColor = s.color;
    c.shadowBlur = 24;
    c.stroke();
    c.shadowBlur = 0;
    if ('letterSpacing' in c) c.letterSpacing = g.big ? '8px' : '5px';
    txt(c, 'FINISHED', 0, g.big ? -36 : -24, `700 ${g.big ? 58 : 38}px ${SANS}`, s.color, 'center');
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    txt(c, `${lane.time.toFixed(1)}s  ·  ${fmt(lane.cost)} credits  ·  ${lane.retries + lane.defects} rework`, 0, g.big ? 36 : 24, `500 ${g.big ? 28 : 18}px ${MONO}`, '#fff', 'center');
    c.restore();
  }
  c.restore();
  // border
  rr(c, 1, 1, W - 2, g.h - 2, 14);
  c.lineWidth = 1.5;
  c.strokeStyle = `rgba(${s.rgb},${lane.finished ? 0.7 : 0.25})`;
  c.stroke();
  c.restore();
}

function ratioText(num, den, word) {
  if (!(den > 0)) return null;
  const r = num / den;
  return `${r.toFixed(1)}x ${word}`;
}

function drawResultsBar(c, sim) {
  const y = H - BAR_H;
  rr(c, 1, y, W - 2, BAR_H - 1, 14);
  c.fillStyle = 'rgba(0,212,255,0.07)';
  c.fill();
  c.lineWidth = 1.5;
  c.strokeStyle = 'rgba(0,212,255,0.4)';
  c.stroke();
  const [heavy, fast, smart] = sim.lanes;
  if (!sim.allFinished()) {
    txt(c, 'Same project, same seed, three strategies. Racing…', W / 2, y + BAR_H / 2, `500 22px ${SANS}`, 'rgba(255,255,255,0.55)', 'center');
    return;
  }
  const rw = (l) => l.retries + l.defects;
  const vs = (a, b, better, worse) => (a > b ? `${(a / b).toFixed(1)}x ${better}` : `${(b / a).toFixed(1)}x ${worse}`);
  const costPart = `${vs(heavy.cost, smart.cost, 'cheaper', 'dearer')} than All heavy`;
  const timePart = `${vs(fast.time, smart.time, 'faster', 'slower')} than All fast`;
  const reworkPart = `${rw(smart)} rework vs ${rw(fast)}`;
  const segs = [
    ['Smart routing: ', '#00d4ff', `700 28px ${SANS}`],
    [costPart, '#fff', `700 28px ${SANS}`],
    ['  ·  ', 'rgba(255,255,255,0.35)', `500 28px ${SANS}`],
    [timePart, '#fff', `700 28px ${SANS}`],
    ['  ·  ', 'rgba(255,255,255,0.35)', `500 28px ${SANS}`],
    [reworkPart, '#fff', `700 28px ${SANS}`],
  ];
  let total = 0;
  segs.forEach((sg) => {
    c.font = sg[2];
    sg.w = c.measureText(sg[0]).width;
    total += sg.w;
  });
  let x = W / 2 - total / 2;
  segs.forEach((sg) => {
    txt(c, sg[0], x, y + BAR_H / 2 - 1, sg[2], sg[1], 'left');
    x += sg.w;
  });
}

// ---------- Simulation ----------
const params = new URLSearchParams(window.location.search);
const RECORD = params.get('record') === '1';
const NO_CHROME = params.get('chrome') === '0';

const sim = {
  mode: params.get('mode') === 'race' ? 'race' : 'single',
  strategy: STRATEGIES[params.get('strategy')] ? params.get('strategy') : 'smart',
  speed: clamp(parseFloat(params.get('speed')) || 1, 0.5, 4),
  seed: Number.isFinite(parseInt(params.get('seed'), 10)) ? parseInt(params.get('seed'), 10) : Math.floor(Math.random() * 1e9),
  counts: [4, 2, 2],
  running: !RECORD || params.get('autostart') === '1',
  lanes: [],
  allFinished() {
    return this.lanes.length > 0 && this.lanes.every((l) => l.finished);
  },
};

function buildLanes() {
  const project = generateProject(sim.seed);
  if (sim.mode === 'race') {
    const lh = Math.floor((H - BAR_H - 6 - 12) / 3);
    sim.lanes = RACE_ORDER.map((k, i) => new Lane(k, project, sim.counts, sim.seed, i, lh, false));
  } else {
    sim.lanes = [new Lane(sim.strategy, project, sim.counts, sim.seed, 0, H, true)];
  }
}

function advance(dtMs) {
  if (!sim.running) return;
  let dt = (clamp(dtMs, 0, 250) / 1000) * sim.speed;
  while (dt > 1e-9) {
    const step = Math.min(dt, MAX_STEP);
    sim.lanes.forEach((l) => l.update(step));
    dt -= step;
  }
}

function resizeCanvas() {
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const cw = Math.max(2, Math.round(r.width * dpr));
  const ch = Math.max(2, Math.round((cw * H) / W));
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
}

function render() {
  resizeCanvas();
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a0a0f');
  bg.addColorStop(1, '#0f1419');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  if (sim.mode === 'race') {
    let y = 0;
    sim.lanes.forEach((l) => {
      drawLane(ctx, l, y);
      y += l.g.h + 6;
    });
    drawResultsBar(ctx, sim);
  } else {
    drawLane(ctx, sim.lanes[0], 0);
  }
}

// ---------- UI wiring ----------
const $ = (id) => document.getElementById(id);

function syncUI() {
  document.querySelectorAll('#modeGroup .toggle-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === sim.mode));
  document.querySelectorAll('#strategyGroup .toggle-btn').forEach((b) => b.classList.toggle('active', b.dataset.strategy === sim.strategy));
  $('strategyGroupWrap').classList.toggle('hidden', sim.mode === 'race');
  $('pauseBtn').textContent = sim.running ? 'Pause' : 'Resume';
}

function wireUI() {
  document.querySelectorAll('#modeGroup .toggle-btn').forEach((b) =>
    b.addEventListener('click', () => {
      sim.mode = b.dataset.mode;
      buildLanes();
      syncUI();
      render();
    })
  );
  document.querySelectorAll('#strategyGroup .toggle-btn').forEach((b) =>
    b.addEventListener('click', () => {
      sim.strategy = b.dataset.strategy;
      buildLanes();
      syncUI();
      render();
    })
  );
  [['fast', 0], ['mid', 1], ['heavy', 2]].forEach(([name, ti]) => {
    const el = $(name + 'Slider');
    el.addEventListener('input', () => {
      sim.counts[ti] = parseInt(el.value, 10);
      $(name + 'Value').textContent = el.value;
      buildLanes();
      render();
    });
  });
  $('speedSlider').addEventListener('input', (e) => {
    sim.speed = parseFloat(e.target.value);
    $('speedValue').textContent = sim.speed.toFixed(1).replace('.0', '') + 'x';
  });
  $('newBtn').addEventListener('click', () => {
    sim.seed = Math.floor(Math.random() * 1e9);
    sim.running = true;
    buildLanes();
    syncUI();
    render();
  });
  $('pauseBtn').addEventListener('click', () => {
    sim.running = !sim.running;
    syncUI();
  });
  $('speedSlider').value = String(sim.speed);
  $('speedValue').textContent = sim.speed.toFixed(1).replace('.0', '') + 'x';
}

// ---------- Boot ----------
function stateSnapshot() {
  return {
    finished: sim.allFinished(),
    lanes: sim.lanes.map((l) => ({
      strategy: l.key,
      done: l.doneCount,
      total: l.total,
      time: Math.round(l.time * 100) / 100,
      cost: Math.round(l.cost * 10) / 10,
      retries: l.retries,
      defects: l.defects,
      reviews: l.reviews,
    })),
  };
}

function boot() {
  if (RECORD) document.body.classList.add('recording');
  if (RECORD && NO_CHROME) document.body.classList.add('nochrome');
  wireUI();
  buildLanes();
  syncUI();

  if (RECORD) {
    window.__sim = {
      ready: true,
      tick(dtMs) {
        advance(dtMs);
        render();
      },
      step(dtMs) {
        advance(dtMs);
      },
      state: stateSnapshot,
    };
  }

  window.addEventListener('resize', render);
  render();

  if (!RECORD) {
    let last = performance.now();
    const loop = (now) => {
      advance(now - last);
      last = now;
      render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // Wait for web fonts (with a timeout so offline runs still proceed)
  const fontsReady = document.fonts
    ? Promise.race([
        Promise.all([document.fonts.load(`700 20px ${SANS}`), document.fonts.load(`500 20px ${MONO}`), document.fonts.ready]),
        new Promise((res) => setTimeout(res, 3000)),
      ])
    : Promise.resolve();
  fontsReady.then(() => {
    render();
    window.__simReady = true;
  });
}

boot();
