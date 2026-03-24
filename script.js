// ============================================
// CUSTOM CURSOR
// ============================================
const cursor = document.querySelector('.cursor');
const cursorDot = document.querySelector('.cursor-dot');
let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top = mouseY + 'px';
});

function animateCursor() {
  cursorX += (mouseX - cursorX) * 0.15;
  cursorY += (mouseY - cursorY) * 0.15;
  cursor.style.left = cursorX + 'px';
  cursor.style.top = cursorY + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();

// Cursor hover states
document.querySelectorAll('a, button, .demo-card:not(.coming-soon)').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

document.addEventListener('mousedown', () => cursor.classList.add('click'));
document.addEventListener('mouseup', () => cursor.classList.remove('click'));

// ============================================
// LOADING SCREEN
// ============================================
window.addEventListener('load', () => {
  setTimeout(() => {
    document.querySelector('.loader').classList.add('hidden');
  }, 1500);
});

// ============================================
// PARTICLE BACKGROUND
// ============================================
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: 0, y: 0, radius: 150 };

    this.resize();
    this.init();
    this.animate();

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.init();
  }

  init() {
    this.particles = [];
    const count = Math.floor((this.canvas.width * this.canvas.height) / 15000);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
        color: `hsl(${180 + Math.random() * 60}, 100%, 50%)`
      });
    }
  }

  animate() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((p, i) => {
      // Mouse repulsion
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.mouse.radius) {
        const force = (this.mouse.radius - dist) / this.mouse.radius;
        p.vx -= (dx / dist) * force * 0.5;
        p.vy -= (dy / dist) * force * 0.5;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.vy *= 0.99;

      // Wrap around
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Draw
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx2 = p2.x - p.x;
        const dy2 = p2.y - p.y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        if (dist2 < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 * (1 - dist2 / 100)})`;
          this.ctx.stroke();
        }
      }
    });

    requestAnimationFrame(() => this.animate());
  }
}

// ============================================
// MAGNETIC BUTTONS
// ============================================
function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(el => {
    const strength = parseFloat(el.dataset.strength) || 20;

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      el.style.transform = `translate(${x / strength}px, ${y / strength}px)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0, 0)';
    });
  });
}

// ============================================
// 3D CARD TILT
// ============================================
function init3DCards() {
  document.querySelectorAll('.demo-card:not(.coming-soon)').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
    });
  });
}

// ============================================
// SCROLL REVEAL
// ============================================
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('active');
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  reveals.forEach(el => observer.observe(el));
}

// ============================================
// FILTER
// ============================================
function initFilter() {
  const btns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.demo-card');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      cards.forEach((card, i) => {
        const category = card.dataset.category;
        const match = filter === 'all' || category === filter;

        if (match) {
          card.style.display = 'block';
          setTimeout(() => {
            card.style.opacity = card.classList.contains('coming-soon') ? '0.4' : '1';
            card.style.transform = 'translateY(0)';
          }, i * 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(30px)';
          setTimeout(() => card.style.display = 'none', 300);
        }
      });
    });
  });
}

// ============================================
// GLITCH TEXT EFFECT
// ============================================
function initGlitchText() {
  const words = document.querySelectorAll('.hero-title .word');

  words.forEach(word => {
    word.addEventListener('mouseenter', () => {
      word.classList.add('glitching');
      setTimeout(() => word.classList.remove('glitching'), 500);
    });
  });
}

// ============================================
// SHARE FUNCTIONALITY
// ============================================
function shareDemo(title, path) {
  const url = new URL(path, window.location.href).href;

  if (navigator.share) {
    navigator.share({ title, url }).catch(() => copyToClipboard(url));
  } else {
    copyToClipboard(url);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Link copied!'));
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ============================================
// PARALLAX SCROLL
// ============================================
function initParallax() {
  const hero = document.querySelector('.hero');

  window.addEventListener('scroll', () => {
    const scroll = window.scrollY;
    if (hero) {
      hero.style.transform = `translateY(${scroll * 0.3}px)`;
      hero.style.opacity = 1 - scroll / 700;
    }
  });
}

// ============================================
// INIT ALL
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Particle background
  const canvas = document.getElementById('particleCanvas');
  if (canvas) new ParticleSystem(canvas);

  // Initialize all effects
  initMagnetic();
  init3DCards();
  initScrollReveal();
  initFilter();
  initGlitchText();
  initParallax();
});
