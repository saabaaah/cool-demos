// ============================================
// PARTICLE BACKGROUND
// ============================================
class ParticleBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: 0, y: 0 };
    this.animationId = null;

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
  }

  init() {
    const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 20000);

    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((particle, i) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;

      particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
      particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));

      // Mouse interaction
      const dx = this.mouse.x - particle.x;
      const dy = this.mouse.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 150) {
        const force = (150 - distance) / 150;
        particle.vx -= (dx / distance) * force * 0.01;
        particle.vy -= (dy / distance) * force * 0.01;
      }

      particle.pulse += 0.02;
      const pulseSize = particle.radius + Math.sin(particle.pulse) * 0.3;

      // Draw particle
      this.ctx.save();
      this.ctx.globalAlpha = particle.opacity;
      const gradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, pulseSize * 3
      );
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.3)');
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, pulseSize * 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      // Draw connections
      this.particles.slice(i + 1).forEach(otherParticle => {
        const dx = otherParticle.x - particle.x;
        const dy = otherParticle.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          const opacity = (1 - distance / 150) * 0.15;
          this.ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.beginPath();
          this.ctx.moveTo(particle.x, particle.y);
          this.ctx.lineTo(otherParticle.x, otherParticle.y);
          this.ctx.stroke();
        }
      });
    });

    this.animationId = requestAnimationFrame(() => this.animate());
  }
}

// ============================================
// CARD SPOTLIGHT EFFECT
// ============================================
function initCardSpotlight() {
  const cards = document.querySelectorAll('.demo-card:not(.coming-soon)');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });
}

// ============================================
// FILTER FUNCTIONALITY
// ============================================
function initFilters() {
  const filterTabs = document.querySelectorAll('.filter-tab');
  const cards = document.querySelectorAll('.demo-card');

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;

      // Update active tab
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Filter cards with animation
      cards.forEach((card, index) => {
        const category = card.dataset.category;
        const shouldShow = filter === 'all' || category === filter;

        if (shouldShow) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = card.classList.contains('coming-soon') ? '0.5' : '1';
            card.style.transform = 'translateY(0) scale(1)';
          }, index * 30);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px) scale(0.95)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });
}

// ============================================
// SCROLL REVEAL ANIMATION
// ============================================
function initScrollReveal() {
  const cards = document.querySelectorAll('.demo-card');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('revealed');
        }, index * 80);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  cards.forEach(card => observer.observe(card));
}

// ============================================
// SHARE FUNCTIONALITY
// ============================================
function shareDemo(title, path) {
  const url = new URL(path, window.location.href).href;

  if (navigator.share) {
    navigator.share({
      title: title + ' - Cool Demos',
      text: 'Check out this cool demo: ' + title,
      url: url
    }).catch(() => {
      copyToClipboard(url);
    });
  } else {
    copyToClipboard(url);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Link copied to clipboard!');
  }).catch(() => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('Link copied to clipboard!');
  });
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
  }, 2500);
}

// ============================================
// SMOOTH HOVER TRANSITIONS
// ============================================
function initSmoothHovers() {
  const socialLinks = document.querySelectorAll('.social-link');

  socialLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
      link.style.transform = 'translateY(-4px) scale(1.05)';
    });
    link.addEventListener('mouseleave', () => {
      link.style.transform = 'translateY(0) scale(1)';
    });
  });
}

// ============================================
// KEYBOARD NAVIGATION
// ============================================
function initKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    // Number keys 1-5 for filter tabs
    if (e.key >= '1' && e.key <= '5') {
      const tabs = document.querySelectorAll('.filter-tab');
      const index = parseInt(e.key) - 1;
      if (tabs[index]) {
        tabs[index].click();
      }
    }
  });
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize particle background
  const canvas = document.getElementById('particleCanvas');
  if (canvas) {
    new ParticleBackground(canvas);
  }

  // Initialize all features
  initCardSpotlight();
  initFilters();
  initScrollReveal();
  initSmoothHovers();
  initKeyboardNav();
});
