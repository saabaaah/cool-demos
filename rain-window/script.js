// ============================================
// RAIN ON WINDOW
// ============================================

class RainDrop {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.options = options;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.canvas.width;
    this.y = -20;
    this.speed = 4 + Math.random() * 8;
    this.size = this.options.size * (0.5 + Math.random() * 0.5);
    this.length = 10 + Math.random() * 20;
    this.opacity = 0.1 + Math.random() * 0.3;
  }

  update(wind) {
    this.y += this.speed;
    this.x += wind;

    if (this.y > this.canvas.height + 20) {
      this.reset();
    }
    if (this.x < -20) this.x = this.canvas.width + 20;
    if (this.x > this.canvas.width + 20) this.x = -20;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.options.wind * 2, this.y + this.length);
    ctx.strokeStyle = `rgba(174, 224, 247, ${this.opacity})`;
    ctx.lineWidth = this.size;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

class Droplet {
  constructor(canvas, x, y, size) {
    this.canvas = canvas;
    this.x = x;
    this.y = y;
    this.size = size;
    this.vy = 0;
    this.trail = [];
    this.maxTrail = 20;
    this.life = 1;
  }

  update(wind) {
    this.vy += 0.1;
    this.y += this.vy;
    this.x += wind * 0.3;

    this.trail.push({ x: this.x, y: this.y, size: this.size * this.life });

    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }

    // Random slowdown (surface tension effect)
    if (Math.random() < 0.02) {
      this.vy *= 0.3;
    }

    this.life -= 0.002;

    return this.y < this.canvas.height && this.life > 0;
  }

  draw(ctx) {
    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = (i / this.trail.length) * 0.2 * this.life;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(174, 224, 247, ${alpha})`;
      ctx.fill();
    }

    // Main drop
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 235, 255, ${0.4 * this.life})`;
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * this.life})`;
    ctx.fill();
  }
}

class RainWindow {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.raindrops = [];
    this.droplets = [];
    this.options = {
      intensity: 80,
      wind: 1,
      size: 2
    };

    this.init();
    this.animate();
  }

  init() {
    this.resize();
    this.createRain();
    window.addEventListener('resize', () => {
      this.resize();
      this.createRain();
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createRain() {
    this.raindrops = [];
    for (let i = 0; i < this.options.intensity; i++) {
      const drop = new RainDrop(this.canvas, this.options);
      drop.y = Math.random() * this.canvas.height;
      this.raindrops.push(drop);
    }
  }

  setIntensity(value) {
    this.options.intensity = value;
    this.createRain();
  }

  setWind(value) {
    this.options.wind = value;
  }

  setSize(value) {
    this.options.size = value;
  }

  createDroplet() {
    if (Math.random() < 0.03) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height * 0.3;
      const size = 3 + Math.random() * 5;
      this.droplets.push(new Droplet(this.canvas, x, y, size));
    }
  }

  render() {
    // Clear with slight blur effect
    this.ctx.fillStyle = 'rgba(30, 58, 95, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Background gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, 'rgba(30, 58, 95, 0.05)');
    gradient.addColorStop(1, 'rgba(12, 25, 41, 0.05)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw raindrops
    for (let drop of this.raindrops) {
      drop.update(this.options.wind);
      drop.draw(this.ctx);
    }

    // Create and update droplets
    this.createDroplet();
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const droplet = this.droplets[i];
      if (!droplet.update(this.options.wind)) {
        this.droplets.splice(i, 1);
      } else {
        droplet.draw(this.ctx);
      }
    }

    // Limit droplets
    if (this.droplets.length > 50) {
      this.droplets.splice(0, this.droplets.length - 50);
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
  const canvas = document.getElementById('rain');
  const sim = new RainWindow(canvas);

  document.getElementById('intensitySlider').addEventListener('input', (e) => {
    sim.setIntensity(parseInt(e.target.value));
  });

  document.getElementById('windSlider').addEventListener('input', (e) => {
    sim.setWind(parseFloat(e.target.value));
  });

  document.getElementById('sizeSlider').addEventListener('input', (e) => {
    sim.setSize(parseFloat(e.target.value));
  });
});
