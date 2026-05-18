// ============================================
// CLOTH SIMULATION
// ============================================

class Point {
  constructor(x, y, pinned = false) {
    this.x = x;
    this.y = y;
    this.oldX = x;
    this.oldY = y;
    this.pinned = pinned;
  }
}

class Stick {
  constructor(p1, p2, length) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = length;
    this.broken = false;
  }
}

class ClothSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.points = [];
    this.sticks = [];
    this.gravity = 0.5;
    this.stiffness = 0.9;
    this.friction = 0.99;
    this.tearDistance = 50;
    this.mouse = { x: 0, y: 0, isDown: false, prevX: 0, prevY: 0 };
    this.windActive = false;
    this.windTime = 0;

    this.init();
    this.setupEvents();
    this.animate();
  }

  init() {
    this.resize();
    this.createCloth();
    window.addEventListener('resize', () => {
      this.resize();
      this.createCloth();
    });
  }

  resize() {
    const availableHeight = window.innerHeight - 300;
    const availableWidth = window.innerWidth - 40;
    this.canvas.width = Math.min(availableWidth, 700);
    this.canvas.height = Math.min(availableHeight, 450);
  }

  createCloth() {
    this.points = [];
    this.sticks = [];

    const cols = 25;
    const rows = 15;
    const spacing = Math.min(this.canvas.width / (cols + 2), 25);
    const startX = (this.canvas.width - cols * spacing) / 2;
    const startY = 30;

    // Create points
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const pinned = y === 0 && x % 3 === 0;
        this.points.push(new Point(
          startX + x * spacing,
          startY + y * spacing,
          pinned
        ));
      }
    }

    // Create horizontal sticks
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols - 1; x++) {
        const i = y * cols + x;
        this.sticks.push(new Stick(
          this.points[i],
          this.points[i + 1],
          spacing
        ));
      }
    }

    // Create vertical sticks
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        this.sticks.push(new Stick(
          this.points[i],
          this.points[i + cols],
          spacing
        ));
      }
    }

    this.updateCount();
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onMouseDown(e.touches[0]);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.onMouseMove(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', () => this.onMouseUp());
  }

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  onMouseDown(e) {
    const pos = this.getPos(e);
    this.mouse.isDown = true;
    this.mouse.x = pos.x;
    this.mouse.y = pos.y;
    this.mouse.prevX = pos.x;
    this.mouse.prevY = pos.y;
  }

  onMouseMove(e) {
    const pos = this.getPos(e);
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
    this.mouse.x = pos.x;
    this.mouse.y = pos.y;
  }

  onMouseUp() {
    this.mouse.isDown = false;
  }

  release() {
    for (let point of this.points) {
      point.pinned = false;
    }
  }

  toggleWind() {
    this.windActive = !this.windActive;
  }

  updateCount() {
    const activeSticks = this.sticks.filter(s => !s.broken).length;
    document.getElementById('pointCount').textContent = this.points.length;
  }

  update() {
    this.windTime += 0.05;

    // Apply forces to points
    for (let point of this.points) {
      if (point.pinned) continue;

      const vx = (point.x - point.oldX) * this.friction;
      const vy = (point.y - point.oldY) * this.friction;

      point.oldX = point.x;
      point.oldY = point.y;

      point.x += vx;
      point.y += vy + this.gravity;

      // Wind
      if (this.windActive) {
        const wind = Math.sin(this.windTime + point.y * 0.05) * 2;
        point.x += wind;
      }

      // Mouse interaction
      if (this.mouse.isDown) {
        const dx = point.x - this.mouse.x;
        const dy = point.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 50) {
          const force = (50 - dist) / 50;
          point.x += (this.mouse.x - this.mouse.prevX) * force * 0.5;
          point.y += (this.mouse.y - this.mouse.prevY) * force * 0.5;
        }
      }

      // Bounds
      if (point.y > this.canvas.height) {
        point.y = this.canvas.height;
        point.oldY = point.y + vy * 0.5;
      }
      if (point.x < 0) {
        point.x = 0;
        point.oldX = vx * 0.5;
      }
      if (point.x > this.canvas.width) {
        point.x = this.canvas.width;
        point.oldX = this.canvas.width + vx * 0.5;
      }
    }

    // Solve constraints (multiple iterations for stability)
    for (let iter = 0; iter < 3; iter++) {
      for (let stick of this.sticks) {
        if (stick.broken) continue;

        const dx = stick.p2.x - stick.p1.x;
        const dy = stick.p2.y - stick.p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check for tearing
        if (dist > this.tearDistance) {
          stick.broken = true;
          continue;
        }

        const diff = (dist - stick.length) / dist;
        const offsetX = dx * diff * 0.5 * this.stiffness;
        const offsetY = dy * diff * 0.5 * this.stiffness;

        if (!stick.p1.pinned) {
          stick.p1.x += offsetX;
          stick.p1.y += offsetY;
        }
        if (!stick.p2.pinned) {
          stick.p2.x -= offsetX;
          stick.p2.y -= offsetY;
        }
      }
    }
  }

  render() {
    this.ctx.fillStyle = '#0a0a14';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw sticks
    this.ctx.strokeStyle = '#2dd4bf';
    this.ctx.lineWidth = 1.5;

    for (let stick of this.sticks) {
      if (stick.broken) continue;

      const tension = Math.min(1, Math.abs(
        Math.sqrt((stick.p2.x - stick.p1.x) ** 2 + (stick.p2.y - stick.p1.y) ** 2) -
        stick.length
      ) / 20);

      // Color based on tension
      const r = Math.floor(45 + tension * 200);
      const g = Math.floor(212 - tension * 150);
      const b = Math.floor(191 - tension * 100);

      this.ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      this.ctx.beginPath();
      this.ctx.moveTo(stick.p1.x, stick.p1.y);
      this.ctx.lineTo(stick.p2.x, stick.p2.y);
      this.ctx.stroke();
    }

    // Draw pinned points
    this.ctx.fillStyle = '#fff';
    for (let point of this.points) {
      if (point.pinned) {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Draw mouse interaction area
    if (this.mouse.isDown) {
      const gradient = this.ctx.createRadialGradient(
        this.mouse.x, this.mouse.y, 0,
        this.mouse.x, this.mouse.y, 50
      );
      gradient.addColorStop(0, 'rgba(45, 212, 191, 0.3)');
      gradient.addColorStop(1, 'transparent');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(this.mouse.x, this.mouse.y, 50, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Wind indicator
    if (this.windActive) {
      this.ctx.fillStyle = 'rgba(45, 212, 191, 0.5)';
      this.ctx.font = '12px Space Grotesk';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('Wind Active', 10, 20);
    }
  }

  animate() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.animate());
  }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('clothCanvas');
  const sim = new ClothSimulation(canvas);

  document.getElementById('resetBtn').addEventListener('click', () => sim.createCloth());
  document.getElementById('releaseBtn').addEventListener('click', () => sim.release());
  document.getElementById('windBtn').addEventListener('click', () => sim.toggleWind());

  document.getElementById('gravitySlider').addEventListener('input', (e) => {
    sim.gravity = parseFloat(e.target.value);
  });

  document.getElementById('stiffnessSlider').addEventListener('input', (e) => {
    sim.stiffness = parseFloat(e.target.value);
  });
});
