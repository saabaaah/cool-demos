// ============================================
// FLOCKING BOIDS
// ============================================

class Boid {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.ax = 0;
    this.ay = 0;
    this.maxSpeed = 4;
    this.maxForce = 0.2;
    this.size = 4;

    // Color based on initial velocity angle
    const angle = Math.atan2(this.vy, this.vx);
    this.hue = ((angle + Math.PI) / (2 * Math.PI)) * 360;
  }

  edges() {
    if (this.x > this.canvas.width) this.x = 0;
    if (this.x < 0) this.x = this.canvas.width;
    if (this.y > this.canvas.height) this.y = 0;
    if (this.y < 0) this.y = this.canvas.height;
  }

  align(boids, perception) {
    let steering = { x: 0, y: 0 };
    let total = 0;

    for (let other of boids) {
      const d = this.distance(other);
      if (other !== this && d < perception) {
        steering.x += other.vx;
        steering.y += other.vy;
        total++;
      }
    }

    if (total > 0) {
      steering.x /= total;
      steering.y /= total;
      const mag = Math.sqrt(steering.x ** 2 + steering.y ** 2);
      if (mag > 0) {
        steering.x = (steering.x / mag) * this.maxSpeed - this.vx;
        steering.y = (steering.y / mag) * this.maxSpeed - this.vy;
        const steerMag = Math.sqrt(steering.x ** 2 + steering.y ** 2);
        if (steerMag > this.maxForce) {
          steering.x = (steering.x / steerMag) * this.maxForce;
          steering.y = (steering.y / steerMag) * this.maxForce;
        }
      }
    }

    return steering;
  }

  cohesion(boids, perception) {
    let steering = { x: 0, y: 0 };
    let total = 0;

    for (let other of boids) {
      const d = this.distance(other);
      if (other !== this && d < perception) {
        steering.x += other.x;
        steering.y += other.y;
        total++;
      }
    }

    if (total > 0) {
      steering.x /= total;
      steering.y /= total;
      steering.x -= this.x;
      steering.y -= this.y;
      const mag = Math.sqrt(steering.x ** 2 + steering.y ** 2);
      if (mag > 0) {
        steering.x = (steering.x / mag) * this.maxSpeed - this.vx;
        steering.y = (steering.y / mag) * this.maxSpeed - this.vy;
        const steerMag = Math.sqrt(steering.x ** 2 + steering.y ** 2);
        if (steerMag > this.maxForce) {
          steering.x = (steering.x / steerMag) * this.maxForce;
          steering.y = (steering.y / steerMag) * this.maxForce;
        }
      }
    }

    return steering;
  }

  separation(boids, perception) {
    let steering = { x: 0, y: 0 };
    let total = 0;

    for (let other of boids) {
      const d = this.distance(other);
      if (other !== this && d < perception && d > 0) {
        let diffX = this.x - other.x;
        let diffY = this.y - other.y;
        diffX /= d * d;
        diffY /= d * d;
        steering.x += diffX;
        steering.y += diffY;
        total++;
      }
    }

    if (total > 0) {
      steering.x /= total;
      steering.y /= total;
      const mag = Math.sqrt(steering.x ** 2 + steering.y ** 2);
      if (mag > 0) {
        steering.x = (steering.x / mag) * this.maxSpeed - this.vx;
        steering.y = (steering.y / mag) * this.maxSpeed - this.vy;
        const steerMag = Math.sqrt(steering.x ** 2 + steering.y ** 2);
        if (steerMag > this.maxForce) {
          steering.x = (steering.x / steerMag) * this.maxForce;
          steering.y = (steering.y / steerMag) * this.maxForce;
        }
      }
    }

    return steering;
  }

  distance(other) {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }

  flock(boids, params) {
    const alignment = this.align(boids, 50);
    const cohesion = this.cohesion(boids, 50);
    const separation = this.separation(boids, 30);

    this.ax = alignment.x * params.alignment +
              cohesion.x * params.cohesion +
              separation.x * params.separation;
    this.ay = alignment.y * params.alignment +
              cohesion.y * params.cohesion +
              separation.y * params.separation;
  }

  applyMouse(mouseX, mouseY, mode, strength = 100) {
    if (mode === 'none' || mouseX === null) return;

    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < strength && d > 0) {
      const force = (strength - d) / strength;
      const multiplier = mode === 'attract' ? 0.5 : -0.8;
      this.ax += (dx / d) * force * multiplier;
      this.ay += (dy / d) * force * multiplier;
    }
  }

  update() {
    this.vx += this.ax;
    this.vy += this.ay;

    // Limit speed
    const speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Update color based on velocity
    const angle = Math.atan2(this.vy, this.vx);
    this.hue = ((angle + Math.PI) / (2 * Math.PI)) * 360;

    this.ax = 0;
    this.ay = 0;
  }

  draw(ctx) {
    const angle = Math.atan2(this.vy, this.vx);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    // Glow
    ctx.shadowColor = `hsl(${this.hue}, 100%, 60%)`;
    ctx.shadowBlur = 8;

    // Draw triangle boid
    ctx.beginPath();
    ctx.moveTo(this.size * 2, 0);
    ctx.lineTo(-this.size, -this.size);
    ctx.lineTo(-this.size, this.size);
    ctx.closePath();

    ctx.fillStyle = `hsl(${this.hue}, 100%, 60%)`;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

class FlockSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.boids = [];
    this.mouseX = null;
    this.mouseY = null;
    this.mouseMode = 'attract';

    this.params = {
      separation: 1.5,
      alignment: 1,
      cohesion: 1
    };

    this.init();
    this.setupEvents();
    this.animate();
  }

  init() {
    this.resize();
    this.createBoids(150);
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const availableHeight = window.innerHeight - 280;
    const availableWidth = window.innerWidth - 40;
    const maxSize = Math.min(availableWidth, availableHeight, 600);
    this.canvas.width = maxSize;
    this.canvas.height = maxSize * 0.7;
  }

  createBoids(count) {
    this.boids = [];
    for (let i = 0; i < count; i++) {
      this.boids.push(new Boid(this.canvas));
    }
    this.updateCount();
  }

  setBoidCount(count) {
    const diff = count - this.boids.length;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        this.boids.push(new Boid(this.canvas));
      }
    } else if (diff < 0) {
      this.boids.splice(count);
    }
    this.updateCount();
  }

  updateCount() {
    const el = document.getElementById('boidCount');
    if (el) el.textContent = this.boids.length;
  }

  setupEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this.mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseX = null;
      this.mouseY = null;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.mouseX = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
      this.mouseY = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
    });

    this.canvas.addEventListener('touchend', () => {
      this.mouseX = null;
      this.mouseY = null;
    });
  }

  setParam(name, value) {
    this.params[name] = value;
  }

  setMouseMode(mode) {
    this.mouseMode = mode;
  }

  render() {
    // Fade effect for trails
    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw boids
    for (let boid of this.boids) {
      boid.flock(this.boids, this.params);
      boid.applyMouse(this.mouseX, this.mouseY, this.mouseMode);
      boid.update();
      boid.edges();
      boid.draw(this.ctx);
    }

    // Draw mouse influence area
    if (this.mouseX !== null && this.mouseMode !== 'none') {
      this.ctx.beginPath();
      this.ctx.arc(this.mouseX, this.mouseY, 100, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.mouseMode === 'attract'
        ? 'rgba(0, 212, 255, 0.3)'
        : 'rgba(255, 100, 100, 0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
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
  const canvas = document.getElementById('boidsCanvas');
  const sim = new FlockSimulation(canvas);

  // Boid count
  const countSlider = document.getElementById('countSlider');
  const countValue = document.getElementById('countValue');
  countSlider.addEventListener('input', (e) => {
    const count = parseInt(e.target.value);
    sim.setBoidCount(count);
    countValue.textContent = count;
  });

  // Separation
  document.getElementById('separationSlider').addEventListener('input', (e) => {
    sim.setParam('separation', parseFloat(e.target.value));
  });

  // Alignment
  document.getElementById('alignmentSlider').addEventListener('input', (e) => {
    sim.setParam('alignment', parseFloat(e.target.value));
  });

  // Cohesion
  document.getElementById('cohesionSlider').addEventListener('input', (e) => {
    sim.setParam('cohesion', parseFloat(e.target.value));
  });

  // Mouse mode toggles
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sim.setMouseMode(btn.dataset.mode);
    });
  });
});
