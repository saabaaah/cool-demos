// ============================================
// PARTICLE PLAYGROUND
// ============================================

class Particle {
  constructor(x, y, vx, vy, hue) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.hue = hue;
    this.life = 1;
    this.decay = 0.003 + Math.random() * 0.005;
    this.size = 2 + Math.random() * 3;
  }

  update(gravity, friction) {
    this.vy += gravity;
    this.vx *= friction;
    this.vy *= friction;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 100%, 60%, ${this.life})`;
    ctx.fill();
  }
}

class ParticlePlayground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mode = 'explode';
    this.gravity = 0.1;
    this.friction = 0.98;
    this.mouseX = 0;
    this.mouseY = 0;
    this.isMouseDown = false;
    this.hue = 0;

    this.init();
    this.setupEvents();
    this.animate();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (this.mode === 'explode') {
        this.explode(e.clientX, e.clientY);
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (this.isMouseDown && this.mode === 'spray') {
        this.spray(e.clientX, e.clientY);
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.explode(e.clientX, e.clientY, true);
    });

    // Touch
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isMouseDown = true;
      const touch = e.touches[0];
      this.mouseX = touch.clientX;
      this.mouseY = touch.clientY;
      if (this.mode === 'explode') {
        this.explode(touch.clientX, touch.clientY);
      }
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.mouseX = touch.clientX;
      this.mouseY = touch.clientY;
      if (this.mode === 'spray') {
        this.spray(touch.clientX, touch.clientY);
      }
    });

    this.canvas.addEventListener('touchend', () => {
      this.isMouseDown = false;
    });
  }

  explode(x, y, reverse = false) {
    const count = 50 + Math.random() * 50;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const vx = Math.cos(angle) * speed * (reverse ? -0.5 : 1);
      const vy = Math.sin(angle) * speed * (reverse ? -0.5 : 1);
      this.particles.push(new Particle(x, y, vx, vy, this.hue + Math.random() * 30));
    }
    this.hue = (this.hue + 20) % 360;
  }

  spray(x, y) {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.particles.push(new Particle(x, y, vx, vy, this.hue + Math.random() * 30));
    }
    this.hue = (this.hue + 1) % 360;
  }

  applyForce(attract) {
    const strength = attract ? 0.3 : -0.5;
    for (let p of this.particles) {
      const dx = this.mouseX - p.x;
      const dy = this.mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200 && dist > 0) {
        const force = strength / dist * 10;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }
    }
  }

  clear() {
    this.particles = [];
  }

  updateStats() {
    const el = document.getElementById('particleCount');
    if (el) el.textContent = this.particles.length;
  }

  render() {
    // Fade
    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply force if holding mouse
    if (this.isMouseDown) {
      if (this.mode === 'attract') {
        this.applyForce(true);
      } else if (this.mode === 'repel') {
        this.applyForce(false);
      }
    }

    // Update and draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(this.gravity, this.friction);
      p.draw(this.ctx);

      // Remove dead particles
      if (p.life <= 0 || p.x < -50 || p.x > this.canvas.width + 50 ||
          p.y < -50 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
      }
    }

    // Limit particles
    if (this.particles.length > 5000) {
      this.particles.splice(0, this.particles.length - 5000);
    }

    this.updateStats();
  }

  animate() {
    this.render();
    requestAnimationFrame(() => this.animate());
  }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('particles');
  const sim = new ParticlePlayground(canvas);

  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sim.mode = btn.dataset.mode;
    });
  });

  document.getElementById('gravitySlider').addEventListener('input', (e) => {
    sim.gravity = parseFloat(e.target.value);
  });

  document.getElementById('frictionSlider').addEventListener('input', (e) => {
    sim.friction = parseFloat(e.target.value);
  });

  document.getElementById('clearBtn').addEventListener('click', () => sim.clear());
});
