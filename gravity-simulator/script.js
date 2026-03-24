// ============================================
// GRAVITY SIMULATOR
// ============================================

class Body {
  constructor(x, y, mass, vx = 0, vy = 0) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.radius = Math.sqrt(mass) * 2;
    this.vx = vx;
    this.vy = vy;
    this.ax = 0;
    this.ay = 0;
    this.trail = [];
    this.maxTrail = 100;
    this.hue = Math.random() * 360;
  }

  applyForce(fx, fy) {
    this.ax += fx / this.mass;
    this.ay += fy / this.mass;
  }

  update(dt = 1) {
    this.vx += this.ax * dt;
    this.vy += this.ay * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ax = 0;
    this.ay = 0;

    // Add to trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }
  }

  draw(ctx, trailOpacity) {
    // Draw trail
    if (this.trail.length > 1 && trailOpacity > 0) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = `hsla(${this.hue}, 70%, 60%, ${trailOpacity * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Glow
    ctx.shadowColor = `hsl(${this.hue}, 70%, 60%)`;
    ctx.shadowBlur = this.radius * 2;

    // Body
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
      this.x, this.y, this.radius
    );
    gradient.addColorStop(0, `hsl(${this.hue}, 70%, 80%)`);
    gradient.addColorStop(1, `hsl(${this.hue}, 70%, 40%)`);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}

class GravitySimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bodies = [];
    this.G = 0.5;
    this.mergeEnabled = true;
    this.trailLength = 50;

    this.isDragging = false;
    this.dragStart = null;
    this.spawnSize = 20;
    this.previewBody = null;

    this.init();
    this.setupEvents();
    this.animate();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const availableHeight = window.innerHeight - 280;
    const availableWidth = window.innerWidth - 40;
    const maxWidth = Math.min(availableWidth, 700);
    const maxHeight = Math.min(availableHeight, 500);
    this.canvas.width = maxWidth;
    this.canvas.height = maxHeight;
  }

  addBody(x, y, mass, vx = 0, vy = 0) {
    this.bodies.push(new Body(x, y, mass, vx, vy));
    this.updateCount();
  }

  updateCount() {
    const el = document.getElementById('bodyCount');
    if (el) el.textContent = this.bodies.length;
  }

  clear() {
    this.bodies = [];
    this.updateCount();
  }

  setupPresets() {
    this.clear();
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    // Sun
    this.addBody(cx, cy, 500, 0, 0);
    this.bodies[0].hue = 45;

    // Planets
    const planets = [
      { dist: 80, mass: 5, speed: 3, hue: 200 },
      { dist: 130, mass: 10, speed: 2.5, hue: 30 },
      { dist: 180, mass: 8, speed: 2, hue: 120 },
      { dist: 240, mass: 15, speed: 1.7, hue: 0 },
    ];

    planets.forEach(p => {
      const angle = Math.random() * Math.PI * 2;
      const x = cx + Math.cos(angle) * p.dist;
      const y = cy + Math.sin(angle) * p.dist;
      const vx = Math.sin(angle) * p.speed;
      const vy = -Math.cos(angle) * p.speed;
      this.addBody(x, y, p.mass, vx, vy);
      this.bodies[this.bodies.length - 1].hue = p.hue;
    });
  }

  setupChaos() {
    this.clear();
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const mass = 10 + Math.random() * 40;
      const vx = (Math.random() - 0.5) * 2;
      const vy = (Math.random() - 0.5) * 2;
      this.addBody(x, y, mass, vx, vy);
    }
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.isDragging = false);
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

    // Touch
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    });
    this.canvas.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      this.onMouseUp({ clientX: touch.clientX, clientY: touch.clientY });
    });
  }

  getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  onMouseDown(e) {
    const pos = this.getCanvasPos(e);
    this.isDragging = true;
    this.dragStart = pos;
    this.previewBody = new Body(pos.x, pos.y, this.spawnSize);
  }

  onMouseMove(e) {
    if (!this.isDragging || !this.previewBody) return;
    const pos = this.getCanvasPos(e);
    this.previewBody.vx = (this.dragStart.x - pos.x) * 0.05;
    this.previewBody.vy = (this.dragStart.y - pos.y) * 0.05;
  }

  onMouseUp(e) {
    if (!this.isDragging || !this.previewBody) return;
    const pos = this.getCanvasPos(e);
    const vx = (this.dragStart.x - pos.x) * 0.05;
    const vy = (this.dragStart.y - pos.y) * 0.05;
    this.addBody(this.dragStart.x, this.dragStart.y, this.spawnSize, vx, vy);
    this.isDragging = false;
    this.previewBody = null;
  }

  onWheel(e) {
    e.preventDefault();
    this.spawnSize = Math.max(5, Math.min(100, this.spawnSize - e.deltaY * 0.1));
  }

  physics() {
    // Apply gravity between all pairs
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const a = this.bodies[i];
        const b = this.bodies[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < a.radius + b.radius && this.mergeEnabled) {
          // Merge bodies
          const totalMass = a.mass + b.mass;
          a.x = (a.x * a.mass + b.x * b.mass) / totalMass;
          a.y = (a.y * a.mass + b.y * b.mass) / totalMass;
          a.vx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
          a.vy = (a.vy * a.mass + b.vy * b.mass) / totalMass;
          a.mass = totalMass;
          a.radius = Math.sqrt(totalMass) * 2;
          a.hue = (a.hue + b.hue) / 2;
          this.bodies.splice(j, 1);
          j--;
          this.updateCount();
          continue;
        }

        const minDist = Math.max(dist, a.radius + b.radius);
        const force = (this.G * a.mass * b.mass) / (minDist * minDist);
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;

        a.applyForce(fx, fy);
        b.applyForce(-fx, -fy);
      }
    }

    // Update positions
    for (let body of this.bodies) {
      body.maxTrail = this.trailLength;
      body.update();

      // Boundary wrapping
      if (body.x < -50) body.x = this.canvas.width + 50;
      if (body.x > this.canvas.width + 50) body.x = -50;
      if (body.y < -50) body.y = this.canvas.height + 50;
      if (body.y > this.canvas.height + 50) body.y = -50;
    }
  }

  render() {
    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.3)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Stars background (static)
    if (!this.stars) {
      this.stars = [];
      for (let i = 0; i < 100; i++) {
        this.stars.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          size: Math.random() * 1.5
        });
      }
    }
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let star of this.stars) {
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    const trailOpacity = this.trailLength / 100;
    for (let body of this.bodies) {
      body.draw(this.ctx, trailOpacity);
    }

    // Draw preview
    if (this.isDragging && this.previewBody) {
      this.ctx.globalAlpha = 0.5;
      this.previewBody.draw(this.ctx, 0);
      this.ctx.globalAlpha = 1;

      // Velocity arrow
      this.ctx.beginPath();
      this.ctx.moveTo(this.dragStart.x, this.dragStart.y);
      this.ctx.lineTo(
        this.dragStart.x - this.previewBody.vx * 20,
        this.dragStart.y - this.previewBody.vy * 20
      );
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  animate() {
    this.physics();
    this.render();
    requestAnimationFrame(() => this.animate());
  }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gravityCanvas');
  const sim = new GravitySimulation(canvas);

  document.getElementById('clearBtn').addEventListener('click', () => sim.clear());
  document.getElementById('presetBtn').addEventListener('click', () => sim.setupPresets());
  document.getElementById('chaosBtn').addEventListener('click', () => sim.setupChaos());

  document.getElementById('gravitySlider').addEventListener('input', (e) => {
    sim.G = parseFloat(e.target.value);
  });

  document.getElementById('trailSlider').addEventListener('input', (e) => {
    sim.trailLength = parseInt(e.target.value);
  });

  document.querySelectorAll('[data-merge]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-merge]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sim.mergeEnabled = btn.dataset.merge === 'true';
    });
  });

  // Start with solar system
  sim.setupPresets();
});
