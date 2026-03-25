// ============================================
// GENERATIVE ART
// ============================================

class GenerativeArt {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pattern = 'flow';
    this.paused = false;
    this.speed = 1;
    this.time = 0;
    this.particles = [];
    this.hueOffset = Math.random() * 360;

    // Pattern-specific state
    this.flowField = [];
    this.flowCols = 0;
    this.flowRows = 0;
    this.flowScale = 20;

    this.spirographAngle = 0;
    this.spirographR1 = 0;
    this.spirographR2 = 0;
    this.spirographP = 0;

    this.init();
    this.animate();
  }

  init() {
    this.resize();
    this.regenerate();
    window.addEventListener('resize', () => {
      this.resize();
      this.regenerate();
    });
  }

  resize() {
    const availableHeight = window.innerHeight - 300;
    const availableWidth = window.innerWidth - 40;
    this.canvas.width = Math.min(availableWidth, 700);
    this.canvas.height = Math.min(availableHeight, 450);
  }

  regenerate() {
    this.time = 0;
    this.hueOffset = Math.random() * 360;
    this.particles = [];

    // Clear canvas
    this.ctx.fillStyle = '#0a0a14';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    switch (this.pattern) {
      case 'flow':
        this.initFlowField();
        break;
      case 'spirograph':
        this.initSpirograph();
        break;
      case 'waves':
        this.initWaves();
        break;
      case 'cells':
        this.initCells();
        break;
    }
  }

  setPattern(pattern) {
    this.pattern = pattern;
    document.getElementById('patternName').textContent =
      pattern.charAt(0).toUpperCase() + pattern.slice(1).replace(/([A-Z])/g, ' $1');

    document.querySelectorAll('.pattern-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pattern === pattern);
    });

    this.regenerate();
  }

  // ============================================
  // FLOW FIELD
  // ============================================

  initFlowField() {
    this.flowCols = Math.ceil(this.canvas.width / this.flowScale);
    this.flowRows = Math.ceil(this.canvas.height / this.flowScale);
    this.flowField = [];

    const noiseScale = 0.01 + Math.random() * 0.03;
    const zOffset = Math.random() * 1000;

    for (let y = 0; y < this.flowRows; y++) {
      for (let x = 0; x < this.flowCols; x++) {
        const angle = this.noise(x * noiseScale, y * noiseScale, zOffset) * Math.PI * 4;
        this.flowField.push(angle);
      }
    }

    // Create particles
    for (let i = 0; i < 1000; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: 0,
        vy: 0,
        hue: this.hueOffset + Math.random() * 60,
        life: 0.5 + Math.random() * 0.5
      });
    }
  }

  updateFlowField() {
    const noiseScale = 0.01;

    for (let y = 0; y < this.flowRows; y++) {
      for (let x = 0; x < this.flowCols; x++) {
        const angle = this.noise(x * noiseScale, y * noiseScale, this.time * 0.0005) * Math.PI * 4;
        this.flowField[y * this.flowCols + x] = angle;
      }
    }

    // Fade effect
    this.ctx.fillStyle = 'rgba(10, 10, 20, 0.02)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let p of this.particles) {
      const col = Math.floor(p.x / this.flowScale);
      const row = Math.floor(p.y / this.flowScale);

      if (col >= 0 && col < this.flowCols && row >= 0 && row < this.flowRows) {
        const angle = this.flowField[row * this.flowCols + col];
        p.vx += Math.cos(angle) * 0.1;
        p.vy += Math.sin(angle) * 0.1;
      }

      p.vx *= 0.95;
      p.vy *= 0.95;

      p.x += p.vx * this.speed;
      p.y += p.vy * this.speed;

      // Wrap around
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Draw
      this.ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.life})`;
      this.ctx.fillRect(p.x, p.y, 2, 2);
    }
  }

  // ============================================
  // SPIROGRAPH
  // ============================================

  initSpirograph() {
    this.spirographAngle = 0;
    this.spirographR1 = 50 + Math.random() * 100;
    this.spirographR2 = 20 + Math.random() * 60;
    this.spirographP = 10 + Math.random() * 50;
    this.spirographPrevX = null;
    this.spirographPrevY = null;
  }

  updateSpirograph() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    // Draw multiple points per frame for smoother lines
    for (let i = 0; i < 5; i++) {
      const t = this.spirographAngle;
      const x = cx + (this.spirographR1 - this.spirographR2) * Math.cos(t) +
                this.spirographP * Math.cos((this.spirographR1 - this.spirographR2) / this.spirographR2 * t);
      const y = cy + (this.spirographR1 - this.spirographR2) * Math.sin(t) -
                this.spirographP * Math.sin((this.spirographR1 - this.spirographR2) / this.spirographR2 * t);

      if (this.spirographPrevX !== null) {
        const hue = (this.hueOffset + this.spirographAngle * 10) % 360;
        this.ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(this.spirographPrevX, this.spirographPrevY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
      }

      this.spirographPrevX = x;
      this.spirographPrevY = y;
      this.spirographAngle += 0.02 * this.speed;
    }

    // Slowly change parameters
    if (this.time % 1000 < 10) {
      this.spirographR1 += (Math.random() - 0.5) * 2;
      this.spirographR2 += (Math.random() - 0.5);
      this.spirographP += (Math.random() - 0.5);
    }
  }

  // ============================================
  // WAVES
  // ============================================

  initWaves() {
    this.waveParams = [];
    for (let i = 0; i < 5; i++) {
      this.waveParams.push({
        amplitude: 20 + Math.random() * 40,
        frequency: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03,
        hue: this.hueOffset + i * 30
      });
    }
  }

  updateWaves() {
    // Fade
    this.ctx.fillStyle = 'rgba(10, 10, 20, 0.05)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const baseY = this.canvas.height / 2;

    for (let wave of this.waveParams) {
      wave.phase += wave.speed * this.speed;

      this.ctx.beginPath();
      this.ctx.strokeStyle = `hsla(${wave.hue}, 80%, 60%, 0.8)`;
      this.ctx.lineWidth = 2;

      for (let x = 0; x < this.canvas.width; x += 2) {
        const y = baseY +
          Math.sin(x * wave.frequency + wave.phase) * wave.amplitude +
          Math.sin(x * wave.frequency * 2 + wave.phase * 1.5) * wave.amplitude * 0.5;

        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.stroke();
    }
  }

  // ============================================
  // CELLS
  // ============================================

  initCells() {
    this.cells = [];
    const cellCount = 30 + Math.floor(Math.random() * 30);

    for (let i = 0; i < cellCount; i++) {
      this.cells.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: 5 + Math.random() * 15,
        hue: this.hueOffset + Math.random() * 60
      });
    }
  }

  updateCells() {
    this.ctx.fillStyle = '#0a0a14';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update cell positions
    for (let cell of this.cells) {
      cell.x += cell.vx * this.speed;
      cell.y += cell.vy * this.speed;

      // Bounce
      if (cell.x < cell.radius || cell.x > this.canvas.width - cell.radius) cell.vx *= -1;
      if (cell.y < cell.radius || cell.y > this.canvas.height - cell.radius) cell.vy *= -1;

      cell.x = Math.max(cell.radius, Math.min(this.canvas.width - cell.radius, cell.x));
      cell.y = Math.max(cell.radius, Math.min(this.canvas.height - cell.radius, cell.y));
    }

    // Draw connections
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.cells.length; i++) {
      for (let j = i + 1; j < this.cells.length; j++) {
        const a = this.cells[i];
        const b = this.cells[j];
        const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

        if (dist < 120) {
          const alpha = 1 - dist / 120;
          const hue = (a.hue + b.hue) / 2;
          this.ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${alpha * 0.5})`;
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.stroke();
        }
      }
    }

    // Draw cells
    for (let cell of this.cells) {
      const gradient = this.ctx.createRadialGradient(
        cell.x, cell.y, 0,
        cell.x, cell.y, cell.radius
      );
      gradient.addColorStop(0, `hsla(${cell.hue}, 80%, 60%, 0.8)`);
      gradient.addColorStop(1, `hsla(${cell.hue}, 80%, 40%, 0)`);

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  // Simple noise function
  noise(x, y, z = 0) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;

    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z)),
        this.lerp(u, this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z))
      ),
      this.lerp(v,
        this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  // Permutation table
  p = (() => {
    const perm = [];
    for (let i = 0; i < 256; i++) perm[i] = Math.floor(Math.random() * 256);
    return [...perm, ...perm];
  })();

  saveImage() {
    const link = document.createElement('a');
    link.download = `generative-art-${Date.now()}.png`;
    link.href = this.canvas.toDataURL();
    link.click();
  }

  update() {
    if (this.paused) return;

    this.time += this.speed;

    switch (this.pattern) {
      case 'flow':
        this.updateFlowField();
        break;
      case 'spirograph':
        this.updateSpirograph();
        break;
      case 'waves':
        this.updateWaves();
        break;
      case 'cells':
        this.updateCells();
        break;
    }
  }

  animate() {
    this.update();
    requestAnimationFrame(() => this.animate());
  }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('artCanvas');
  const art = new GenerativeArt(canvas);

  document.getElementById('regenerateBtn').addEventListener('click', () => art.regenerate());

  const pauseBtn = document.getElementById('pauseBtn');
  pauseBtn.addEventListener('click', () => {
    art.paused = !art.paused;
    pauseBtn.textContent = art.paused ? 'Play' : 'Pause';
  });

  document.getElementById('saveBtn').addEventListener('click', () => art.saveImage());

  document.querySelectorAll('.pattern-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      art.setPattern(btn.dataset.pattern);
    });
  });

  document.getElementById('speedSlider').addEventListener('input', (e) => {
    art.speed = parseFloat(e.target.value);
  });
});
