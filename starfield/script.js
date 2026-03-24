// ============================================
// STARFIELD
// ============================================

class Star {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.canvas.width - this.canvas.width / 2;
    this.y = Math.random() * this.canvas.height - this.canvas.height / 2;
    this.z = Math.random() * this.canvas.width;
    this.pz = this.z;
  }

  update(speed, centerX, centerY) {
    this.pz = this.z;
    this.z -= speed;

    if (this.z < 1) {
      this.reset();
      this.z = this.canvas.width;
      this.pz = this.z;
    }
  }

  draw(ctx, centerX, centerY, trailLength) {
    const sx = (this.x / this.z) * this.canvas.width + centerX;
    const sy = (this.y / this.z) * this.canvas.height + centerY;

    const px = (this.x / this.pz) * this.canvas.width + centerX;
    const py = (this.y / this.pz) * this.canvas.height + centerY;

    const size = Math.max(0, (1 - this.z / this.canvas.width) * 3);
    const brightness = Math.max(0, (1 - this.z / this.canvas.width));

    if (trailLength > 0) {
      // Draw trail
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.5})`;
      ctx.lineWidth = size;
      ctx.stroke();
    }

    // Draw star
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.fill();

    // Glow for close stars
    if (brightness > 0.7) {
      ctx.beginPath();
      ctx.arc(sx, sy, size * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(129, 140, 248, ${(brightness - 0.7) * 0.5})`;
      ctx.fill();
    }
  }
}

class Starfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.speed = 15;
    this.starCount = 800;
    this.trailLength = 60;
    this.mouseX = 0.5;
    this.mouseY = 0.5;

    this.init();
    this.setupEvents();
    this.animate();
  }

  init() {
    this.resize();
    this.createStars();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createStars() {
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push(new Star(this.canvas));
    }
  }

  setStarCount(count) {
    while (this.stars.length < count) {
      this.stars.push(new Star(this.canvas));
    }
    while (this.stars.length > count) {
      this.stars.pop();
    }
  }

  setupEvents() {
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX / window.innerWidth;
      this.mouseY = e.clientY / window.innerHeight;
    });

    document.addEventListener('wheel', (e) => {
      this.speed = Math.max(1, Math.min(50, this.speed + e.deltaY * 0.01));
      document.getElementById('speedSlider').value = this.speed;
    });
  }

  render() {
    // Fade effect based on trail length
    const fadeAmount = Math.max(0.05, 1 - this.trailLength / 100);
    this.ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Center point influenced by mouse
    const centerX = this.canvas.width / 2 + (this.mouseX - 0.5) * 200;
    const centerY = this.canvas.height / 2 + (this.mouseY - 0.5) * 200;

    for (let star of this.stars) {
      star.update(this.speed, centerX, centerY);
      star.draw(this.ctx, centerX, centerY, this.trailLength);
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
  const canvas = document.getElementById('starfield');
  const sim = new Starfield(canvas);

  document.getElementById('speedSlider').addEventListener('input', (e) => {
    sim.speed = parseInt(e.target.value);
  });

  document.getElementById('starsSlider').addEventListener('input', (e) => {
    sim.setStarCount(parseInt(e.target.value));
  });

  document.getElementById('trailSlider').addEventListener('input', (e) => {
    sim.trailLength = parseInt(e.target.value);
  });
});
