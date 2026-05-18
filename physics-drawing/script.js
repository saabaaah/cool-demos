// ============================================
// PHYSICS DRAWING
// ============================================

class PhysicsObject {
  constructor(points, canvas) {
    this.points = points.map(p => ({ ...p }));
    this.canvas = canvas;
    this.frozen = true;

    // Calculate center and bounding box
    this.calculateBounds();

    // Physics properties
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVel = 0;
    this.mass = this.width * this.height * 0.001;

    // Color
    this.hue = Math.random() * 360;
  }

  calculateBounds() {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let p of this.points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    this.cx = (minX + maxX) / 2;
    this.cy = (minY + maxY) / 2;
    this.width = maxX - minX;
    this.height = maxY - minY;

    // Convert points to local coordinates
    this.localPoints = this.points.map(p => ({
      x: p.x - this.cx,
      y: p.y - this.cy
    }));
  }

  unfreeze() {
    this.frozen = false;
  }

  update(gravity, bounce, friction) {
    if (this.frozen) return;

    // Apply gravity
    this.vy += gravity;

    // Apply velocity
    this.cx += this.vx;
    this.cy += this.vy;

    // Apply angular velocity
    this.angle += this.angularVel;
    this.angularVel *= 0.98;

    // Floor collision
    const bottom = this.cy + this.height / 2;
    if (bottom > this.canvas.height) {
      this.cy = this.canvas.height - this.height / 2;
      this.vy *= -bounce;
      this.vx *= friction;
      this.angularVel += this.vx * 0.01;

      // Stop if barely moving
      if (Math.abs(this.vy) < 0.5) {
        this.vy = 0;
      }
    }

    // Wall collisions
    const left = this.cx - this.width / 2;
    const right = this.cx + this.width / 2;

    if (left < 0) {
      this.cx = this.width / 2;
      this.vx *= -bounce;
      this.angularVel -= this.vy * 0.01;
    }
    if (right > this.canvas.width) {
      this.cx = this.canvas.width - this.width / 2;
      this.vx *= -bounce;
      this.angularVel += this.vy * 0.01;
    }

    // Ceiling
    const top = this.cy - this.height / 2;
    if (top < 0) {
      this.cy = this.height / 2;
      this.vy *= -bounce;
    }

    // Air friction
    this.vx *= 0.999;
    this.vy *= 0.999;
  }

  applyForce(fx, fy) {
    this.vx += fx / this.mass;
    this.vy += fy / this.mass;
  }

  getTransformedPoints() {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    return this.localPoints.map(p => ({
      x: this.cx + p.x * cos - p.y * sin,
      y: this.cy + p.x * sin + p.y * cos
    }));
  }

  draw(ctx) {
    const points = this.getTransformedPoints();
    if (points.length < 2) return;

    const saturation = this.frozen ? 50 : 80;
    const lightness = this.frozen ? 40 : 55;

    ctx.strokeStyle = `hsl(${this.hue}, ${saturation}%, ${lightness}%)`;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Glow effect when moving
    if (!this.frozen && (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1)) {
      ctx.shadowColor = `hsl(${this.hue}, 80%, 60%)`;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}

class PhysicsDrawing {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.objects = [];
    this.currentPath = [];
    this.isDrawing = false;
    this.gravity = 0.5;
    this.bounce = 0.6;
    this.friction = 0.8;

    this.init();
    this.setupEvents();
    this.animate();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const availableHeight = window.innerHeight - 300;
    const availableWidth = window.innerWidth - 40;
    this.canvas.width = Math.min(availableWidth, 700);
    this.canvas.height = Math.min(availableHeight, 450);
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseleave', () => this.stopDrawing());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDrawing(e.touches[0]);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', () => this.stopDrawing());
  }

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  startDrawing(e) {
    this.isDrawing = true;
    this.currentPath = [];
    const pos = this.getPos(e);
    this.currentPath.push(pos);
  }

  draw(e) {
    if (!this.isDrawing) return;
    const pos = this.getPos(e);

    // Only add if moved enough distance
    const last = this.currentPath[this.currentPath.length - 1];
    const dist = Math.sqrt((pos.x - last.x) ** 2 + (pos.y - last.y) ** 2);
    if (dist > 5) {
      this.currentPath.push(pos);
    }
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentPath.length > 3) {
      // Simplify path
      const simplified = this.simplifyPath(this.currentPath, 3);
      const obj = new PhysicsObject(simplified, this.canvas);
      this.objects.push(obj);

      // Auto-drop after delay
      setTimeout(() => obj.unfreeze(), 500);

      this.updateCount();
    }

    this.currentPath = [];
  }

  simplifyPath(points, tolerance) {
    if (points.length < 3) return points;

    const result = [points[0]];
    let prevPoint = points[0];

    for (let i = 1; i < points.length - 1; i++) {
      const dist = Math.sqrt(
        (points[i].x - prevPoint.x) ** 2 +
        (points[i].y - prevPoint.y) ** 2
      );
      if (dist > tolerance) {
        result.push(points[i]);
        prevPoint = points[i];
      }
    }

    result.push(points[points.length - 1]);
    return result;
  }

  dropAll() {
    for (let obj of this.objects) {
      obj.unfreeze();
    }
  }

  shake() {
    for (let obj of this.objects) {
      obj.unfreeze();
      obj.applyForce(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50 - 20
      );
      obj.angularVel += (Math.random() - 0.5) * 0.3;
    }
  }

  clear() {
    this.objects = [];
    this.updateCount();
  }

  updateCount() {
    document.getElementById('objectCount').textContent = this.objects.length;
  }

  update() {
    for (let obj of this.objects) {
      obj.update(this.gravity, this.bounce, this.friction);
    }

    // Simple collision between objects
    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        this.collideObjects(this.objects[i], this.objects[j]);
      }
    }
  }

  collideObjects(a, b) {
    if (a.frozen && b.frozen) return;

    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = (a.width + b.width) / 4 + (a.height + b.height) / 4;

    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      // Separate objects
      if (!a.frozen) {
        a.cx -= nx * overlap * 0.5;
        a.cy -= ny * overlap * 0.5;
      }
      if (!b.frozen) {
        b.cx += nx * overlap * 0.5;
        b.cy += ny * overlap * 0.5;
      }

      // Exchange velocity
      const relVx = b.vx - a.vx;
      const relVy = b.vy - a.vy;
      const relVel = relVx * nx + relVy * ny;

      if (relVel < 0) {
        const impulse = relVel * this.bounce;
        if (!a.frozen) {
          a.vx += impulse * nx;
          a.vy += impulse * ny;
        }
        if (!b.frozen) {
          b.vx -= impulse * nx;
          b.vy -= impulse * ny;
        }
      }
    }
  }

  render() {
    this.ctx.fillStyle = '#0a0a14';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw ground line
    this.ctx.strokeStyle = 'rgba(251, 146, 60, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height - 1);
    this.ctx.lineTo(this.canvas.width, this.canvas.height - 1);
    this.ctx.stroke();

    // Draw objects
    for (let obj of this.objects) {
      obj.draw(this.ctx);
    }

    // Draw current path
    if (this.currentPath.length > 1) {
      this.ctx.strokeStyle = 'rgba(251, 146, 60, 0.8)';
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      this.ctx.beginPath();
      this.ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
      for (let i = 1; i < this.currentPath.length; i++) {
        this.ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
      }
      this.ctx.stroke();
    }

    // Hint text
    if (this.objects.length === 0 && this.currentPath.length === 0) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.font = '16px Space Grotesk';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Draw a shape!', this.canvas.width / 2, this.canvas.height / 2);
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
  const canvas = document.getElementById('physicsCanvas');
  const sim = new PhysicsDrawing(canvas);

  document.getElementById('clearBtn').addEventListener('click', () => sim.clear());
  document.getElementById('dropBtn').addEventListener('click', () => sim.dropAll());
  document.getElementById('shakeBtn').addEventListener('click', () => sim.shake());

  document.getElementById('gravitySlider').addEventListener('input', (e) => {
    sim.gravity = parseFloat(e.target.value);
  });

  document.getElementById('bounceSlider').addEventListener('input', (e) => {
    sim.bounce = parseFloat(e.target.value);
  });
});
