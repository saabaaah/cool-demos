// ============================================
// FOURIER DRAWING
// ============================================

class FourierDrawing {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drawing = [];
    this.isDrawing = false;
    this.fourier = [];
    this.time = 0;
    this.path = [];
    this.state = 'draw'; // draw, animate
    this.numCircles = 50;
    this.speed = 3;

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
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width) - this.canvas.width / 2,
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height) - this.canvas.height / 2
    };
  }

  startDrawing(e) {
    if (this.state !== 'draw') return;
    this.isDrawing = true;
    this.drawing = [];
    const pos = this.getPos(e);
    this.drawing.push(pos);
  }

  draw(e) {
    if (!this.isDrawing) return;
    const pos = this.getPos(e);
    this.drawing.push(pos);
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.drawing.length > 10) {
      this.startAnimation();
    }
  }

  startAnimation() {
    // Resample drawing to have consistent points
    const resampled = this.resample(this.drawing, 200);
    this.fourier = this.dft(resampled);
    this.fourier.sort((a, b) => b.amp - a.amp);
    this.time = 0;
    this.path = [];
    this.state = 'animate';
    this.updateCircleCount();
  }

  resample(points, n) {
    const result = [];
    const totalLength = this.pathLength(points);
    const step = totalLength / n;

    let currentDist = 0;
    let pointIndex = 0;

    result.push({ ...points[0] });

    for (let i = 1; i < n; i++) {
      const targetDist = i * step;

      while (pointIndex < points.length - 1) {
        const p1 = points[pointIndex];
        const p2 = points[pointIndex + 1];
        const segmentLength = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);

        if (currentDist + segmentLength >= targetDist) {
          const t = (targetDist - currentDist) / segmentLength;
          result.push({
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y)
          });
          break;
        }

        currentDist += segmentLength;
        pointIndex++;
      }
    }

    return result;
  }

  pathLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  dft(points) {
    const N = points.length;
    const result = [];

    for (let k = 0; k < N; k++) {
      let re = 0;
      let im = 0;

      for (let n = 0; n < N; n++) {
        const phi = (2 * Math.PI * k * n) / N;
        re += points[n].x * Math.cos(phi) + points[n].y * Math.sin(phi);
        im += points[n].y * Math.cos(phi) - points[n].x * Math.sin(phi);
      }

      re /= N;
      im /= N;

      result.push({
        re,
        im,
        freq: k,
        amp: Math.sqrt(re * re + im * im),
        phase: Math.atan2(im, re)
      });
    }

    return result;
  }

  epicycles(x, y, rotation, fourier) {
    const numToUse = Math.min(this.numCircles, fourier.length);

    for (let i = 0; i < numToUse; i++) {
      const prevX = x;
      const prevY = y;

      const { freq, amp, phase } = fourier[i];
      x += amp * Math.cos(freq * this.time + phase + rotation);
      y += amp * Math.sin(freq * this.time + phase + rotation);

      // Draw circle
      this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(prevX + this.canvas.width / 2, prevY + this.canvas.height / 2, amp, 0, Math.PI * 2);
      this.ctx.stroke();

      // Draw radius
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.beginPath();
      this.ctx.moveTo(prevX + this.canvas.width / 2, prevY + this.canvas.height / 2);
      this.ctx.lineTo(x + this.canvas.width / 2, y + this.canvas.height / 2);
      this.ctx.stroke();
    }

    return { x, y };
  }

  updateCircleCount() {
    const el = document.getElementById('circleCount');
    if (el) el.textContent = Math.min(this.numCircles, this.fourier.length);
  }

  clear() {
    this.state = 'draw';
    this.drawing = [];
    this.fourier = [];
    this.path = [];
    this.time = 0;
    document.getElementById('circleCount').textContent = '0';
  }

  loadPreset(type) {
    this.drawing = [];
    const cx = 0;
    const cy = 0;
    const size = Math.min(this.canvas.width, this.canvas.height) * 0.3;

    if (type === 'star') {
      for (let i = 0; i <= 10; i++) {
        const angle = (i * Math.PI * 2) / 10 - Math.PI / 2;
        const r = i % 2 === 0 ? size : size * 0.4;
        this.drawing.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r
        });
      }
    } else if (type === 'heart') {
      for (let t = 0; t <= Math.PI * 2; t += 0.1) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        this.drawing.push({ x: x * (size / 20), y: y * (size / 20) });
      }
    }

    this.startAnimation();
  }

  render() {
    this.ctx.fillStyle = '#0a0a14';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'draw') {
      // Draw current path
      if (this.drawing.length > 1) {
        this.ctx.strokeStyle = '#06b6d4';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(
          this.drawing[0].x + this.canvas.width / 2,
          this.drawing[0].y + this.canvas.height / 2
        );
        for (let i = 1; i < this.drawing.length; i++) {
          this.ctx.lineTo(
            this.drawing[i].x + this.canvas.width / 2,
            this.drawing[i].y + this.canvas.height / 2
          );
        }
        this.ctx.stroke();
      }

      // Hint text
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.font = '16px Space Grotesk';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Draw a shape here', this.canvas.width / 2, this.canvas.height / 2);

    } else if (this.state === 'animate') {
      const v = this.epicycles(0, 0, 0, this.fourier);
      this.path.unshift({ x: v.x, y: v.y });

      // Draw reconstructed path
      this.ctx.strokeStyle = '#f472b6';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      for (let i = 0; i < this.path.length; i++) {
        const p = this.path[i];
        if (i === 0) {
          this.ctx.moveTo(p.x + this.canvas.width / 2, p.y + this.canvas.height / 2);
        } else {
          this.ctx.lineTo(p.x + this.canvas.width / 2, p.y + this.canvas.height / 2);
        }
      }
      this.ctx.stroke();

      // Draw tip
      this.ctx.beginPath();
      this.ctx.arc(v.x + this.canvas.width / 2, v.y + this.canvas.height / 2, 4, 0, Math.PI * 2);
      this.ctx.fillStyle = '#fff';
      this.ctx.fill();

      const dt = (Math.PI * 2) / this.fourier.length;
      this.time += dt * this.speed * 0.1;

      if (this.time > Math.PI * 2) {
        this.time = 0;
        this.path = [];
      }
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
  const canvas = document.getElementById('fourierCanvas');
  const sim = new FourierDrawing(canvas);

  document.getElementById('clearBtn').addEventListener('click', () => sim.clear());
  document.getElementById('presetBtn').addEventListener('click', () => sim.loadPreset('star'));
  document.getElementById('heartBtn').addEventListener('click', () => sim.loadPreset('heart'));

  document.getElementById('circlesSlider').addEventListener('input', (e) => {
    sim.numCircles = parseInt(e.target.value);
    sim.updateCircleCount();
  });

  document.getElementById('speedSlider').addEventListener('input', (e) => {
    sim.speed = parseInt(e.target.value);
  });
});
