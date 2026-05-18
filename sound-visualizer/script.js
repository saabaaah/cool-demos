// ============================================
// SOUND VISUALIZER
// ============================================

class SoundVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    this.mode = 'bars';
    this.sensitivity = 1.5;
    this.isActive = false;
    this.isDemoMode = false;
    this.demoPhase = 0;
    this.particles = [];
    this.hue = 0;

    this.init();
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

  async startMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.setupAudio(stream);
      this.isActive = true;
      this.isDemoMode = false;
      document.getElementById('startBtn').textContent = 'Stop';
    } catch (err) {
      alert('Microphone access denied. Try Demo Mode instead.');
    }
  }

  stopAudio() {
    if (this.source) {
      if (this.source.mediaStream) {
        this.source.mediaStream.getTracks().forEach(track => track.stop());
      }
      this.source.disconnect();
    }
    this.isActive = false;
    this.isDemoMode = false;
    document.getElementById('startBtn').textContent = 'Start Mic';
  }

  setupAudio(stream) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.mediaStream = stream;
    this.source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
  }

  startDemoMode() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    this.isActive = true;
    this.isDemoMode = true;
    document.getElementById('startBtn').textContent = 'Stop';
  }

  generateDemoData() {
    if (!this.dataArray) return;

    this.demoPhase += 0.02;

    for (let i = 0; i < this.dataArray.length; i++) {
      // Create synthetic audio data with multiple frequencies
      const freq1 = Math.sin(this.demoPhase * 2 + i * 0.1) * 60;
      const freq2 = Math.sin(this.demoPhase * 3.7 + i * 0.15) * 40;
      const freq3 = Math.sin(this.demoPhase * 1.3 + i * 0.05) * 30;
      const bass = i < 10 ? Math.sin(this.demoPhase * 1.5) * 80 : 0;
      const treble = i > 80 ? Math.sin(this.demoPhase * 5 + i * 0.2) * 50 : 0;

      this.dataArray[i] = Math.max(0, Math.min(255,
        128 + freq1 + freq2 + freq3 + bass + treble + Math.random() * 20
      ));
    }
  }

  setMode(mode) {
    this.mode = mode;
    document.getElementById('currentMode').textContent =
      mode.charAt(0).toUpperCase() + mode.slice(1);

    // Update active button
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  render() {
    this.ctx.fillStyle = '#0a0a14';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.isActive || !this.dataArray) {
      this.drawIdleState();
      return;
    }

    // Get frequency data
    if (this.isDemoMode) {
      this.generateDemoData();
    } else {
      this.analyser.getByteFrequencyData(this.dataArray);
    }

    // Update hue for rainbow effects
    this.hue = (this.hue + 0.5) % 360;

    switch (this.mode) {
      case 'bars':
        this.drawBars();
        break;
      case 'circular':
        this.drawCircular();
        break;
      case 'wave':
        this.drawWave();
        break;
      case 'particles':
        this.drawParticles();
        break;
    }
  }

  drawIdleState() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.font = '16px Space Grotesk';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Click Start Mic or Demo Mode', this.canvas.width / 2, this.canvas.height / 2);
  }

  drawBars() {
    const barCount = this.dataArray.length / 2;
    const barWidth = this.canvas.width / barCount;
    const heightScale = (this.canvas.height / 256) * this.sensitivity;

    for (let i = 0; i < barCount; i++) {
      const value = this.dataArray[i];
      const barHeight = value * heightScale;
      const x = i * barWidth;
      const y = this.canvas.height - barHeight;

      // Gradient color based on frequency and value
      const hue = (this.hue + i * 2) % 360;
      const saturation = 80;
      const lightness = 40 + (value / 255) * 30;

      this.ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      this.ctx.fillRect(x, y, barWidth - 1, barHeight);

      // Glow effect for high values
      if (value > 180) {
        this.ctx.shadowColor = `hsl(${hue}, ${saturation}%, 60%)`;
        this.ctx.shadowBlur = 20;
        this.ctx.fillRect(x, y, barWidth - 1, barHeight);
        this.ctx.shadowBlur = 0;
      }
    }
  }

  drawCircular() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const radius = Math.min(cx, cy) * 0.4;
    const barCount = this.dataArray.length / 2;

    // Draw mirrored for symmetry
    for (let half = 0; half < 2; half++) {
      for (let i = 0; i < barCount; i++) {
        const value = this.dataArray[i];
        const barHeight = (value / 255) * radius * this.sensitivity;

        const angle = (i / barCount) * Math.PI + (half * Math.PI);
        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(angle) * (radius + barHeight);
        const y2 = cy + Math.sin(angle) * (radius + barHeight);

        const hue = (this.hue + i * 3) % 360;

        this.ctx.strokeStyle = `hsl(${hue}, 80%, ${50 + (value / 255) * 30}%)`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
    }

    // Inner circle glow
    const avgValue = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
    const glowRadius = radius * 0.8 + (avgValue / 255) * 20;

    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    gradient.addColorStop(0, `hsla(${this.hue}, 80%, 60%, 0.3)`);
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawWave() {
    const sliceWidth = this.canvas.width / this.dataArray.length;

    // Draw multiple waves with different scales
    for (let wave = 0; wave < 3; wave++) {
      this.ctx.beginPath();

      const hue = (this.hue + wave * 40) % 360;
      this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.8 - wave * 0.2})`;
      this.ctx.lineWidth = 3 - wave;

      for (let i = 0; i < this.dataArray.length; i++) {
        const value = this.dataArray[i];
        const x = i * sliceWidth;
        const scale = (0.5 + wave * 0.15) * this.sensitivity;
        const y = this.canvas.height / 2 + ((value - 128) * scale);

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.stroke();
    }

    // Fill area under main wave
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height / 2);

    for (let i = 0; i < this.dataArray.length; i++) {
      const value = this.dataArray[i];
      const x = i * sliceWidth;
      const y = this.canvas.height / 2 + ((value - 128) * 0.5 * this.sensitivity);
      this.ctx.lineTo(x, y);
    }

    this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.lineTo(0, this.canvas.height);
    this.ctx.closePath();

    const gradient = this.ctx.createLinearGradient(0, this.canvas.height / 2, 0, this.canvas.height);
    gradient.addColorStop(0, `hsla(${this.hue}, 80%, 50%, 0.3)`);
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
  }

  drawParticles() {
    // Spawn particles based on audio
    const bassValue = (this.dataArray[0] + this.dataArray[1] + this.dataArray[2]) / 3;
    const trebleValue = (this.dataArray[100] + this.dataArray[101] + this.dataArray[102]) / 3;

    if (bassValue > 150 && this.particles.length < 500) {
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: this.canvas.width / 2,
          y: this.canvas.height / 2,
          vx: (Math.random() - 0.5) * bassValue * 0.1,
          vy: (Math.random() - 0.5) * bassValue * 0.1,
          size: 2 + Math.random() * 4,
          hue: this.hue + Math.random() * 60,
          life: 1
        });
      }
    }

    if (trebleValue > 100 && this.particles.length < 500) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: this.canvas.width / 2 + Math.cos(angle) * 100,
        y: this.canvas.height / 2 + Math.sin(angle) * 100,
        vx: Math.cos(angle) * trebleValue * 0.05,
        vy: Math.sin(angle) * trebleValue * 0.05,
        size: 1 + Math.random() * 2,
        hue: (this.hue + 180) % 360,
        life: 1
      });
    }

    // Update and draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx * this.sensitivity;
      p.y += p.vy * this.sensitivity;
      p.life -= 0.01;
      p.vx *= 0.99;
      p.vy *= 0.99;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.life})`;
      this.ctx.fill();
    }

    // Central glow
    const avgValue = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
    const glowRadius = 50 + (avgValue / 255) * 50 * this.sensitivity;

    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, glowRadius
    );
    gradient.addColorStop(0, `hsla(${this.hue}, 80%, 60%, 0.5)`);
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, glowRadius, 0, Math.PI * 2);
    this.ctx.fill();
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
  const canvas = document.getElementById('visualizerCanvas');
  const visualizer = new SoundVisualizer(canvas);

  const startBtn = document.getElementById('startBtn');
  startBtn.addEventListener('click', () => {
    if (visualizer.isActive) {
      visualizer.stopAudio();
    } else {
      visualizer.startMicrophone();
    }
  });

  document.getElementById('demoBtn').addEventListener('click', () => {
    if (visualizer.isActive) {
      visualizer.stopAudio();
    }
    visualizer.startDemoMode();
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      visualizer.setMode(btn.dataset.mode);
    });
  });

  document.getElementById('sensitivitySlider').addEventListener('input', (e) => {
    visualizer.sensitivity = parseFloat(e.target.value);
  });
});
