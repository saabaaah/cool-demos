// ============================================
// NEURAL NETWORK BACKGROUND
// ============================================
class NeuralBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nodes = [];
    this.connections = [];
    this.animationId = null;
    
    this.resize();
    this.init();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    // Create nodes (neurons)
    const nodeCount = 15;
    for (let i = 0; i < nodeCount; i++) {
      this.nodes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: 3 + Math.random() * 2,
        pulse: Math.random() * Math.PI * 2
      });
    }

    // Create connections
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const distance = Math.sqrt(
          Math.pow(this.nodes[i].x - this.nodes[j].x, 2) +
          Math.pow(this.nodes[i].y - this.nodes[j].y, 2)
        );
        if (distance < 200) {
          this.connections.push({
            from: i,
            to: j,
            distance: distance,
            opacity: 1 - (distance / 200)
          });
        }
      }
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Update nodes
    this.nodes.forEach((node, i) => {
      // Move nodes
      node.x += node.vx;
      node.y += node.vy;
      
      // Bounce off edges
      if (node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
      if (node.y < 0 || node.y > this.canvas.height) node.vy *= -1;
      
      // Keep in bounds
      node.x = Math.max(0, Math.min(this.canvas.width, node.x));
      node.y = Math.max(0, Math.min(this.canvas.height, node.y));
      
      // Pulse animation
      node.pulse += 0.05;
    });

    // Update connections
    this.connections.forEach(conn => {
      const from = this.nodes[conn.from];
      const to = this.nodes[conn.to];
      const distance = Math.sqrt(
        Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2)
      );
      conn.distance = distance;
      conn.opacity = Math.max(0, 1 - (distance / 200));
    });

    // Draw connections
    this.connections.forEach(conn => {
      if (conn.opacity > 0.1) {
        const from = this.nodes[conn.from];
        const to = this.nodes[conn.to];
        
        const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        gradient.addColorStop(0, `rgba(217, 232, 227, ${conn.opacity * 0.4})`);
        gradient.addColorStop(0.5, `rgba(17, 76, 90, ${conn.opacity * 0.6})`);
        gradient.addColorStop(1, `rgba(217, 232, 227, ${conn.opacity * 0.4})`);
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
      }
    });

    // Draw nodes
    this.nodes.forEach(node => {
      const pulseSize = node.radius + Math.sin(node.pulse) * 1.5;
      
      // Outer glow
      const gradient = this.ctx.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, pulseSize * 3
      );
      gradient.addColorStop(0, 'rgba(217, 232, 227, 0.8)');
      gradient.addColorStop(0.5, 'rgba(17, 76, 90, 0.4)');
      gradient.addColorStop(1, 'rgba(217, 232, 227, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, pulseSize * 3, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Node
      this.ctx.fillStyle = 'rgba(217, 232, 227, 1)';
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, pulseSize, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Inner highlight
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.beginPath();
      this.ctx.arc(node.x - pulseSize * 0.3, node.y - pulseSize * 0.3, pulseSize * 0.4, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Outer ring
      this.ctx.strokeStyle = `rgba(17, 76, 90, ${0.6 * (1 - pulseSize / node.radius)})`;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, pulseSize * 1.2, 0, Math.PI * 2);
      this.ctx.stroke();
    });

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  start() {
    this.animate();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// ============================================
// STATE MANAGEMENT
// ============================================
const AppState = {
  current: 'LANDING', // LANDING, CONFIG, SIMULATION
  config: {
    agentsPerSide: 1,
    speed: 'medium',
    theme: 'day-night'
  }
};

// ============================================
// THEME SYSTEM (Modular for future themes)
// ============================================
const THEMES = {
  'day-night': {
    name: 'Day vs Night',
    teams: 2,
    colors: [
      { name: 'Day', color: '#D9E8E3', ballColor: '#114C5A' },
      { name: 'Night', color: '#114C5A', ballColor: '#D9E8E3' }
    ],
    background: 'linear-gradient(to bottom, #172b36 0%, #d9e8e3 100%)',
    style: {
      squareGradient: true,
      glowIntensity: 1.0,
      particleStyle: 'soft'
    }
  },
  'good-evil': {
    name: 'Good vs Evil',
    teams: 2,
    colors: [
      { name: 'Good', color: '#FFFFFF', ballColor: '#0000FF', emoji: '✨' },
      { name: 'Evil', color: '#1a0000', ballColor: '#FF0000', emoji: '🔥' }
    ],
    background: 'linear-gradient(to bottom, #2a2a2a 0%, #ffffff 50%, #1a0000 100%)',
    style: {
      squareGradient: true,
      glowIntensity: 1.5,
      particleStyle: 'fire-sparkles',
      squarePattern: 'good-evil'
    }
  },
  'seasons': {
    name: '4 Seasons',
    teams: 4,
    colors: [
      { name: 'Spring', color: '#FFB6C1', ballColor: '#FF69B4', emoji: '🌸', effect: 'flowers' },
      { name: 'Summer', color: '#FFD700', ballColor: '#FF8C00', emoji: '☀️', effect: 'sun' },
      { name: 'Fall', color: '#FF8C00', ballColor: '#8B4513', emoji: '🍂', effect: 'leaves' },
      { name: 'Winter', color: '#87CEEB', ballColor: '#0000CD', emoji: '❄️', effect: 'snow' }
    ],
    background: 'linear-gradient(135deg, #FFB6C1 0%, #FFD700 25%, #FF8C00 50%, #87CEEB 100%)',
    style: {
      squareGradient: true,
      glowIntensity: 1.2,
      particleStyle: 'seasonal',
      squarePattern: 'seasons'
    }
  },
  'condiments': {
    name: 'Condiments War',
    teams: 3,
    colors: [
      { name: 'Ketchup', color: '#DC143C', ballColor: '#8B0000', emoji: '🍅', effect: 'splash' },
      { name: 'Mayo', color: '#FFFEF7', ballColor: '#2F2F2F', emoji: '🥄', effect: 'splash' },
      { name: 'Mustard', color: '#FFD700', ballColor: '#8B6914', emoji: '🌭', effect: 'splash' }
    ],
    background: 'linear-gradient(120deg, #DC143C 0%, #FFFEF7 50%, #FFD700 100%)',
    style: {
      squareGradient: false,
      glowIntensity: 0.8,
      particleStyle: 'splash',
      squarePattern: 'condiments'
    }
  }
};

// ============================================
// UI CONTROLS
// ============================================
const landingPage = document.getElementById('landingPage');
const configModal = document.getElementById('configModal');
const simulationView = document.getElementById('simulationView');
const startButton = document.getElementById('startButton');
const cancelButton = document.getElementById('cancelButton');
const resetButton = document.getElementById('resetButton');
const newGameButton = document.getElementById('newGameButton');
const configForm = document.getElementById('configForm');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const themeOptions = document.querySelectorAll('.theme-option');

// Speed labels
const speedLabels = ['Very Slow', 'Slow', 'Medium', 'Fast', 'Very Fast'];

// Neural background
let neuralBg = null;

// Initialize neural background
document.addEventListener('DOMContentLoaded', () => {
  const neuralCanvas = document.getElementById('neuralBackground');
  if (neuralCanvas) {
    neuralBg = new NeuralBackground(neuralCanvas);
    neuralBg.start();
  }
});

// Event Listeners
startButton.addEventListener('click', () => {
  showConfig();
});

cancelButton.addEventListener('click', () => {
  hideConfig();
});

resetButton.addEventListener('click', () => {
  resetCurrentGame();
});

newGameButton.addEventListener('click', () => {
  newGame();
});

speedSlider.addEventListener('input', (e) => {
  const value = parseInt(e.target.value);
  speedValue.textContent = speedLabels[value - 1];
});

themeOptions.forEach(option => {
  option.addEventListener('click', () => {
    themeOptions.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
  });
});

configForm.addEventListener('submit', (e) => {
  e.preventDefault();
  AppState.config.agentsPerSide = parseInt(document.getElementById('agentsPerSide').value);
  AppState.config.speed = speedLabels[parseInt(speedSlider.value) - 1].toLowerCase();
  AppState.config.theme = document.querySelector('.theme-option.selected').dataset.theme;
  startSimulation();
});

function showConfig() {
  landingPage.classList.add('hidden');
  setTimeout(() => {
    configModal.classList.add('visible');
  }, 300);
}

function hideConfig() {
  configModal.classList.remove('visible');
  setTimeout(() => {
    landingPage.classList.remove('hidden');
  }, 300);
}

function startSimulation() {
  configModal.classList.remove('visible');
  setTimeout(() => {
    simulationView.classList.add('visible');
    initializeSimulation();
  }, 300);
}

function resetCurrentGame() {
  if (simulation) {
    simulation.reset();
  }
}

function newGame() {
  if (simulation) {
    simulation.stop();
    simulation = null;
  }
  simulationView.classList.remove('visible');
  setTimeout(() => {
    showConfig();
  }, 300);
}

function resetToLanding() {
  if (simulation) {
    simulation.stop();
    simulation = null;
  }
  simulationView.classList.remove('visible');
  setTimeout(() => {
    landingPage.classList.remove('hidden');
  }, 300);
}

// ============================================
// SIMULATION CODE (Modular & Theme-Aware)
// ============================================
let simulation = null;

function initializeSimulation() {
  const theme = THEMES[AppState.config.theme];
  const speedConfig = getSpeedConfig(AppState.config.speed);
  
  // Apply theme background
  document.body.style.background = theme.background;

  simulation = new Simulation({
    agentsPerSide: AppState.config.agentsPerSide,
    minSpeed: speedConfig.min,
    maxSpeed: speedConfig.max,
    theme: theme
  });
  
  simulation.start();
}

function getSpeedConfig(speed) {
  const configs = {
    'very slow': { min: 2, max: 5 },
    'slow': { min: 3, max: 7 },
    'medium': { min: 5, max: 10 },
    'fast': { min: 8, max: 15 },
    'very fast': { min: 12, max: 20 }
  };
  return configs[speed] || configs['medium'];
}

class Simulation {
  constructor(config) {
    this.config = config;
    this.canvas = document.getElementById('pongCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreElement = document.getElementById('score');
    this.paramsElement = document.getElementById('params');
    this.theme = config.theme;
    
    this.SQUARE_SIZE = 25;
    this.numSquaresX = Math.floor(this.canvas.width / this.SQUARE_SIZE);
    this.numSquaresY = Math.floor(this.canvas.height / this.SQUARE_SIZE);
    
    this.scores = {};
    this.squares = [];
    this.squaresTransition = [];
    this.squareIcons = []; // Store icon state for smooth animations
    this.particles = [];
    this.balls = [];
    
    this.iteration = 0;
    this.lastTime = performance.now();
    this.animationId = null;
    
    this.initialize();
  }

  initialize() {
    // Initialize squares based on theme
    this.initializeSquares();
    
    // Initialize balls based on theme
    this.initializeBalls();
  }

  reset() {
    // Reset to initial state
    this.initialize();
  }

  initializeSquares() {
    const teams = this.theme.teams;
    const centerX = this.numSquaresX / 2;
    const centerY = this.numSquaresY / 2;
    
    for (let i = 0; i < this.numSquaresX; i++) {
      this.squares[i] = [];
      this.squaresTransition[i] = [];
      this.squareIcons[i] = [];
      for (let j = 0; j < this.numSquaresY; j++) {
        let teamIndex = 0;
        
        if (teams === 2) {
          // Split left/right
          teamIndex = i < centerX ? 0 : 1;
        } else if (teams === 3) {
          // Triangular split
          const dx = i - centerX;
          const dy = j - centerY;
          const angle = Math.atan2(dy, dx);
          // Adjust angle to start from top
          let adjustedAngle = angle + Math.PI / 2;
          if (adjustedAngle < 0) adjustedAngle += Math.PI * 2;
          
          if (adjustedAngle >= 0 && adjustedAngle < (Math.PI * 2 / 3)) {
            teamIndex = 0; // Top
          } else if (adjustedAngle >= (Math.PI * 2 / 3) && adjustedAngle < (Math.PI * 4 / 3)) {
            teamIndex = 1; // Bottom left
          } else {
            teamIndex = 2; // Bottom right
          }
        } else if (teams === 4) {
          // Four quadrants
          if (i < centerX && j < centerY) {
            teamIndex = 0; // Top-left
          } else if (i >= centerX && j < centerY) {
            teamIndex = 1; // Top-right
          } else if (i < centerX && j >= centerY) {
            teamIndex = 2; // Bottom-left
          } else {
            teamIndex = 3; // Bottom-right
          }
        }
        
        const color = this.theme.colors[teamIndex].color;
        this.squares[i][j] = color;
        this.squaresTransition[i][j] = {
          progress: 1,
          targetColor: color,
          currentColor: color
        };
        
        // Initialize icon state with deterministic positioning
        this.squareIcons[i][j] = this.initializeIconState(i, j, teamIndex);
      }
    }
  }

  initializeIconState(i, j, teamIndex) {
    const themeId = AppState.config.theme;
    // Use deterministic seed based on position for consistent icon placement
    const seed = (i * 7919 + j * 9973) % 100;
    
    if (themeId === 'seasons') {
      // Show icon on ~15% of squares, deterministically placed
      if (seed < 15) {
        return {
          visible: true,
          opacity: 0.6 + (seed % 20) / 50, // Vary opacity between 0.6-1.0
          animationPhase: (i + j) % 100 / 100, // Phase for smooth animation
          x: 5 + (seed % 5), // Slight position variation
          y: 15 + (seed % 3)
        };
      }
    } else if (themeId === 'good-evil' && teamIndex === 0) {
      // Good - sparkles on ~20% of squares
      if (seed < 20) {
        return {
          visible: true,
          opacity: 0.5 + (seed % 20) / 40,
          animationPhase: (i + j) % 100 / 100,
          x: this.SQUARE_SIZE * 0.5,
          y: this.SQUARE_SIZE * 0.5
        };
      }
    } else if (themeId === 'condiments') {
      // No icon effects for condiments
      return { visible: false };
    }
    
    return { visible: false };
  }

  initializeBalls() {
    const numBallsPerTeam = this.config.agentsPerSide;
    const teams = this.theme.teams;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.balls = [];
    this.particles = [];
    
    for (let teamIndex = 0; teamIndex < teams; teamIndex++) {
      const teamColor = this.theme.colors[teamIndex];
      
      for (let i = 0; i < numBallsPerTeam; i++) {
        let x, y, dx, dy;
        
        if (teams === 2) {
          // Left side for team 0, right side for team 1
          const sideX = teamIndex === 0 
            ? this.canvas.width / 4 
            : (this.canvas.width / 4) * 3;
          const angle = (Math.PI * 2 * i) / numBallsPerTeam;
          x = sideX + Math.cos(angle) * 50;
          y = centerY + Math.sin(angle) * 50;
          dx = teamIndex === 0 ? Math.cos(angle) * 8 : -Math.cos(angle) * 8;
          dy = teamIndex === 0 ? Math.sin(angle) * 8 : -Math.sin(angle) * 8;
        } else if (teams === 3) {
          // Triangular formation
          const baseAngle = (teamIndex * Math.PI * 2 / 3) - Math.PI / 2; // Start from top
          const radius = Math.min(this.canvas.width, this.canvas.height) / 3;
          const angle = baseAngle + (i * 0.3);
          x = centerX + Math.cos(angle) * radius;
          y = centerY + Math.sin(angle) * radius;
          dx = Math.cos(angle) * 8;
          dy = Math.sin(angle) * 8;
        } else if (teams === 4) {
          // Four corners
          const cornerX = teamIndex === 0 || teamIndex === 2 
            ? this.canvas.width / 4 
            : (this.canvas.width / 4) * 3;
          const cornerY = teamIndex === 0 || teamIndex === 1 
            ? this.canvas.height / 4 
            : (this.canvas.height / 4) * 3;
          const angle = (Math.PI * 2 * i) / numBallsPerTeam;
          x = cornerX + Math.cos(angle) * 40;
          y = cornerY + Math.sin(angle) * 40;
          dx = Math.cos(angle) * 8;
          dy = Math.sin(angle) * 8;
        }
        
        this.balls.push(this.createBall(
          x, y, dx, dy,
          teamColor.color,
          teamColor.ballColor,
          teamIndex
        ));
      }
    }
  }

  createBall(x, y, dx, dy, reverseColor, ballColor, team) {
    return {
      x, y, dx, dy,
      reverseColor,
      ballColor,
      team,
      radius: 12,
      trail: [],
      rotation: 0,
      lastCollision: 0,
    };
  }

  start() {
    this.animate();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  animate() {
    this.draw();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  draw() {
    const currentTime = performance.now();
    this.lastTime = currentTime;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawSquares();
    this.updateAndDrawParticles();
    this.updateScore();
    this.checkBallCollisions();
    this.updateBalls();
    this.updateParamsDisplay();
    
    this.iteration++;
  }

  drawSquares() {
    // Reset scores
    this.scores = {};
    this.theme.colors.forEach((_, i) => {
      this.scores[i] = 0;
    });

    for (let i = 0; i < this.numSquaresX; i++) {
      for (let j = 0; j < this.numSquaresY; j++) {
        const square = this.squaresTransition[i][j];
        
        // Smooth transitions
        if (square.progress < 1) {
          square.progress = Math.min(1, square.progress + 0.15);
          const color = this.interpolateColor(square.currentColor, square.targetColor, square.progress);
          this.ctx.fillStyle = color;
        } else {
          this.ctx.fillStyle = this.squares[i][j];
        }

        const x = i * this.SQUARE_SIZE;
        const y = j * this.SQUARE_SIZE;
        
        // Apply theme-specific styling
        if (this.theme.style?.squareGradient) {
          const gradient = this.ctx.createLinearGradient(x, y, x + this.SQUARE_SIZE, y + this.SQUARE_SIZE);
          const baseColor = this.squares[i][j];
          gradient.addColorStop(0, baseColor);
          gradient.addColorStop(1, this.adjustBrightness(baseColor, -10));
          this.ctx.fillStyle = gradient;
        } else {
          this.ctx.fillStyle = this.squares[i][j];
        }
        
        this.ctx.fillRect(x, y, this.SQUARE_SIZE, this.SQUARE_SIZE);
        
        // Theme-specific square patterns and update scores
        const teamIndex = this.theme.colors.findIndex(c => c.color === this.squares[i][j]);
        if (teamIndex >= 0) {
          this.drawThemeSquarePattern(x, y, teamIndex);
          this.scores[teamIndex] = (this.scores[teamIndex] || 0) + 1;
        }
      }
    }
  }

  interpolateColor(color1, color2, t) {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  adjustBrightness(color, amount) {
    const r = Math.max(0, Math.min(255, parseInt(color.slice(1, 3), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(color.slice(3, 5), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(color.slice(5, 7), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  updateAndDrawParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].update()) {
        this.particles[i].draw(this.ctx);
      } else {
        this.particles.splice(i, 1);
      }
    }
  }

  updateScore() {
    const total = Object.values(this.scores).reduce((a, b) => a + b, 0);
    let scoreHTML = '';
    
    this.theme.colors.forEach((team, i) => {
      const score = this.scores[i] || 0;
      const percentage = total > 0 ? ((score / total) * 100).toFixed(1) : 0;
      
      // Create contrasting text color (light or dark based on team color)
      const textColor = this.getContrastColor(team.color);
      const bgColor = team.color;
      
      scoreHTML += `
        <div class="score-item" style="background: ${bgColor}88; border: 2px solid ${bgColor};">
          <div class="score-label" style="color: ${textColor};">${team.name}</div>
          <div class="score-value" style="color: ${textColor};">${score}</div>
          <div class="score-percentage" style="color: ${textColor};">${percentage}%</div>
        </div>
      `;
    });
    
    this.scoreElement.innerHTML = scoreHTML;
  }

  getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark colors, black for light colors
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  checkBallCollisions() {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const ball1 = this.balls[i];
        const ball2 = this.balls[j];
        
        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = ball1.radius + ball2.radius;
        
        if (distance < minDistance && distance > 0) {
          const angle = Math.atan2(dy, dx);
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);
          
          const vx1 = ball1.dx * cos + ball1.dy * sin;
          const vy1 = ball1.dy * cos - ball1.dx * sin;
          const vx2 = ball2.dx * cos + ball2.dy * sin;
          const vy2 = ball2.dy * cos - ball2.dx * sin;
          
          const temp = vx1;
          ball1.dx = vx2 * cos - vy1 * sin;
          ball1.dy = vy1 * cos + vx2 * sin;
          ball2.dx = temp * cos - vy2 * sin;
          ball2.dy = vy2 * cos + temp * sin;
          
          const overlap = minDistance - distance;
          const separationX = (dx / distance) * overlap * 0.5;
          const separationY = (dy / distance) * overlap * 0.5;
          ball1.x -= separationX;
          ball1.y -= separationY;
          ball2.x += separationX;
          ball2.y += separationY;
        }
      }
    }
  }

  updateBalls() {
    this.balls.forEach((ball) => {
      this.addTrailParticle(ball);
      this.updateTrail(ball);
      this.checkSquareCollision(ball);
      this.checkBoundaryCollision(ball);
      
      // Apply season targeting if seasons theme
      if (AppState.config.theme === 'seasons') {
        this.applySeasonTargeting(ball);
      } else {
        this.addRandomness(ball);
      }
      
      ball.x += ball.dx;
      ball.y += ball.dy;
      ball.rotation += Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) * 0.1;
      
      this.drawBall(ball);
    });
  }

  applySeasonTargeting(ball) {
    // Each season targets the border between current and next season
    // Seasons: 0=Spring (top-left), 1=Summer (top-right), 2=Fall (bottom-right), 3=Winter (bottom-left)
    const currentSeason = ball.team;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    let targetX, targetY;
    let dxToTarget, dyToTarget;
    
    // Calculate closest point on the border line to the next season
    if (currentSeason === 0) {
      // Spring targets vertical border to Summer (middle vertical line, top half)
      targetX = centerX;
      targetY = Math.max(0, Math.min(centerY, ball.y)); // Clamp to top half
      dxToTarget = targetX - ball.x;
      dyToTarget = targetY - ball.y;
    } else if (currentSeason === 1) {
      // Summer targets horizontal border to Fall (middle horizontal line, right half)
      targetX = Math.max(centerX, Math.min(this.canvas.width, ball.x)); // Clamp to right half
      targetY = centerY;
      dxToTarget = targetX - ball.x;
      dyToTarget = targetY - ball.y;
    } else if (currentSeason === 2) {
      // Fall targets vertical border to Winter (middle vertical line, bottom half)
      targetX = centerX;
      targetY = Math.max(centerY, Math.min(this.canvas.height, ball.y)); // Clamp to bottom half
      dxToTarget = targetX - ball.x;
      dyToTarget = targetY - ball.y;
    } else if (currentSeason === 3) {
      // Winter targets horizontal border to Spring (middle horizontal line, left half)
      targetX = Math.max(0, Math.min(centerX, ball.x)); // Clamp to left half
      targetY = centerY;
      dxToTarget = targetX - ball.x;
      dyToTarget = targetY - ball.y;
    }
    
    const distanceToTarget = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);
    
    // Apply attraction force towards the border
    if (distanceToTarget > 20) {
      const attractionStrength = 0.03;
      const normalizedDx = dxToTarget / (distanceToTarget + 1);
      const normalizedDy = dyToTarget / (distanceToTarget + 1);
      
      ball.dx += normalizedDx * attractionStrength;
      ball.dy += normalizedDy * attractionStrength;
    }
    
    // Add small randomness
    ball.dx += (Math.random() - 0.5) * 0.01;
    ball.dy += (Math.random() - 0.5) * 0.01;
    
    // Limit speed
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    if (speed > this.config.maxSpeed) {
      ball.dx = (ball.dx / speed) * this.config.maxSpeed;
      ball.dy = (ball.dy / speed) * this.config.maxSpeed;
    } else if (speed < this.config.minSpeed) {
      ball.dx = (ball.dx / speed) * this.config.minSpeed;
      ball.dy = (ball.dy / speed) * this.config.minSpeed;
    }
  }

  addTrailParticle(ball) {
    ball.trail.push({ x: ball.x, y: ball.y, life: 1.0 });
    if (ball.trail.length > 15) {
      ball.trail.shift();
    }
  }

  updateTrail(ball) {
    ball.trail.forEach(p => {
      p.life -= 1 / 15;
    });
    ball.trail = ball.trail.filter(p => p.life > 0);
  }

  drawBall(ball) {
    // Draw trail
    if (ball.trail.length > 0) {
      ball.trail.forEach((p) => {
        const alpha = p.life * 0.6;
        const size = ball.radius * p.life;
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = ball.ballColor;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      });
    }

    // Draw glow (theme-aware)
    const glowIntensity = this.theme.style?.glowIntensity || 1.0;
    if (glowIntensity > 0) {
      const gradient = this.ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius * 2);
      gradient.addColorStop(0, ball.ballColor + 'FF');
      gradient.addColorStop(0.5, ball.ballColor + '80');
      gradient.addColorStop(1, ball.ballColor + '00');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, ball.radius * 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw ball
    this.ctx.fillStyle = ball.ballColor;
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw inner highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
  }

  checkSquareCollision(ball) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      const checkX = ball.x + Math.cos(angle) * ball.radius;
      const checkY = ball.y + Math.sin(angle) * ball.radius;

      const i = Math.floor(checkX / this.SQUARE_SIZE);
      const j = Math.floor(checkY / this.SQUARE_SIZE);

      if (i >= 0 && i < this.numSquaresX && j >= 0 && j < this.numSquaresY) {
        if (this.squares[i][j] !== ball.reverseColor) {
          this.squares[i][j] = ball.reverseColor;
          const transition = this.squaresTransition[i][j];
          transition.currentColor = transition.targetColor;
          transition.targetColor = ball.reverseColor;
          transition.progress = 0;

          // Add theme-specific particles
          this.createThemeParticles(ball, ball.x, ball.y);

          if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
            ball.dx = -ball.dx;
          } else {
            ball.dy = -ball.dy;
          }
          
          ball.lastCollision = this.iteration;
          break;
        }
      }
    }
  }

  drawThemeSquarePattern(x, y, patternTeamIndex) {
    const themeId = AppState.config.theme;
    const team = this.theme.colors[patternTeamIndex];
    const i = Math.floor(x / this.SQUARE_SIZE);
    const j = Math.floor(y / this.SQUARE_SIZE);
    
    // Get icon state for this square
    const iconState = this.squareIcons[i] && this.squareIcons[i][j] ? this.squareIcons[i][j] : { visible: false };
    
    if (!iconState.visible) {
      // Still draw non-icon patterns (like evil cracks)
      if (themeId === 'good-evil' && patternTeamIndex === 1) {
        // Evil - dark cracks (always visible, no flicker)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + this.SQUARE_SIZE, y + this.SQUARE_SIZE);
        this.ctx.stroke();
      }
      return;
    }
    
    // Update animation phase for smooth pulsing
    iconState.animationPhase = (iconState.animationPhase || 0) + 0.02;
    if (iconState.animationPhase > 1) iconState.animationPhase -= 1;
    
    // Calculate smooth pulsing opacity
    const pulse = Math.sin(iconState.animationPhase * Math.PI * 2) * 0.15 + 0.85; // Pulse between 0.7 and 1.0
    const finalOpacity = iconState.opacity * pulse;
    
    if (themeId === 'good-evil') {
      // Good - sparkles with smooth animation
      if (patternTeamIndex === 0) {
        this.ctx.save();
        this.ctx.globalAlpha = finalOpacity;
        this.ctx.fillStyle = 'rgba(255, 215, 0, 1)';
        const size = 2 + Math.sin(iconState.animationPhase * Math.PI * 4) * 0.5; // Subtle size pulse
        this.ctx.beginPath();
        this.ctx.arc(x + iconState.x, y + iconState.y, size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    } else if (themeId === 'seasons') {
      // Seasonal effects with smooth fade
      const effects = ['🌸', '☀️', '🍂', '❄️'];
      this.ctx.save();
      this.ctx.globalAlpha = finalOpacity;
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(effects[patternTeamIndex], x + iconState.x, y + iconState.y);
      this.ctx.restore();
    } else if (themeId === 'condiments') {
      // No icon effects for condiments
      return;
    }
  }

  createThemeParticles(ball, x, y) {
    const themeId = AppState.config.theme;
    const teamIndex = ball.team;
    const team = this.theme.colors[teamIndex];
    
    if (themeId === 'good-evil') {
      if (teamIndex === 0) {
        // Good - sparkles
        for (let k = 0; k < 12; k++) {
          const a = Math.random() * Math.PI * 2;
          const s = 1 + Math.random() * 2;
          this.particles.push(new SparkleParticle(
            x, y,
            Math.cos(a) * s,
            Math.sin(a) * s,
            '#FFD700',
            1.0
          ));
        }
      } else {
        // Evil - fire particles
        for (let k = 0; k < 15; k++) {
          const a = Math.random() * Math.PI * 2;
          const s = 1.5 + Math.random() * 3;
          this.particles.push(new FireParticle(
            x, y,
            Math.cos(a) * s,
            Math.sin(a) * s - 1,
            '#FF0000',
            1.2
          ));
        }
      }
    } else if (themeId === 'seasons') {
      const effects = team.effect;
      if (effects === 'snow') {
        for (let k = 0; k < 10; k++) {
          this.particles.push(new SnowParticle(x, y));
        }
      } else if (effects === 'flowers') {
        for (let k = 0; k < 8; k++) {
          const a = Math.random() * Math.PI * 2;
          const s = 1 + Math.random() * 2;
          this.particles.push(new FlowerParticle(
            x, y,
            Math.cos(a) * s,
            Math.sin(a) * s,
            '#FF69B4'
          ));
        }
      } else if (effects === 'leaves') {
        for (let k = 0; k < 6; k++) {
          const a = Math.random() * Math.PI * 2;
          const s = 1 + Math.random() * 2;
          this.particles.push(new LeafParticle(
            x, y,
            Math.cos(a) * s,
            Math.sin(a) * s + 0.5,
            '#8B4513'
          ));
        }
      } else if (effects === 'sun') {
        for (let k = 0; k < 10; k++) {
          const a = Math.random() * Math.PI * 2;
          const s = 2 + Math.random() * 3;
          this.particles.push(new SunRayParticle(
            x, y,
            Math.cos(a) * s,
            Math.sin(a) * s,
            '#FFD700'
          ));
        }
      }
    } else if (themeId === 'condiments') {
      // Splash effect
      for (let k = 0; k < 20; k++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 4;
        this.particles.push(new SplashParticle(
          x, y,
          Math.cos(a) * s,
          Math.sin(a) * s,
          team.ballColor,
          1.0
        ));
      }
    } else {
      // Default particles
      for (let k = 0; k < 8; k++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 3;
        this.particles.push(new Particle(
          x, y,
          Math.cos(a) * s,
          Math.sin(a) * s,
          ball.ballColor,
          0.8 + Math.random() * 0.4
        ));
      }
    }
  }

  checkBoundaryCollision(ball) {
    if (ball.x + ball.dx > this.canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
      ball.dx = -ball.dx;
    }
    if (ball.y + ball.dy > this.canvas.height - ball.radius || ball.y + ball.dy < ball.radius) {
      ball.dy = -ball.dy;
    }
  }

  addRandomness(ball) {
    ball.dx += (Math.random() - 0.5) * 0.03;
    ball.dy += (Math.random() - 0.5) * 0.03;

    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    if (speed > this.config.maxSpeed) {
      ball.dx = (ball.dx / speed) * this.config.maxSpeed;
      ball.dy = (ball.dy / speed) * this.config.maxSpeed;
    } else if (speed < this.config.minSpeed) {
      ball.dx = (ball.dx / speed) * this.config.minSpeed;
      ball.dy = (ball.dy / speed) * this.config.minSpeed;
    }
  }

  updateParamsDisplay() {
    const fps = Math.round(1000 / (performance.now() - this.lastTime));
    this.paramsElement.textContent = `Balls: ${this.balls.length} | FPS: ${fps} | Particles: ${this.particles.length}`;
  }
}

// ============================================
// PARTICLE CLASSES
// ============================================

// Base Particle class
class Particle {
  constructor(x, y, vx, vy, color, life = 1.0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = 2 + Math.random() * 3;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life -= 0.02;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Sparkle Particle (Good theme)
class SparkleParticle extends Particle {
  constructor(x, y, vx, vy, color, life) {
    super(x, y, vx, vy, color, life);
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.2;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Draw sparkle shape
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(0, 0);
      ctx.lineTo(0, this.size * 2);
      ctx.rotate(Math.PI / 2);
    }
    ctx.stroke();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.rotation += this.rotationSpeed;
  }
}

// Fire Particle (Evil theme)
class FireParticle extends Particle {
  constructor(x, y, vx, vy, color, life) {
    super(x, y, vx, vy, color, life);
    this.size = 3 + Math.random() * 4;
    this.vy -= 0.5; // Float upward
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life -= 0.015;
    this.size += 0.1;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
    gradient.addColorStop(0, '#FFFF00');
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, '#8B0000');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Snow Particle (Winter)
class SnowParticle extends Particle {
  constructor(x, y) {
    super(x, y, (Math.random() - 0.5) * 0.5, Math.random() * 0.5 + 0.5, '#FFFFFF', 2.0);
    this.size = 2 + Math.random() * 3;
    this.wobble = Math.random() * Math.PI * 2;
  }

  update() {
    this.x += this.vx + Math.sin(this.wobble) * 0.3;
    this.y += this.vy;
    this.wobble += 0.1;
    this.life -= 0.01;
    return this.life > 0 && this.y < 600;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Flower Particle (Spring)
class FlowerParticle extends Particle {
  constructor(x, y, vx, vy, color) {
    super(x, y, vx, vy, color, 1.5);
    this.petals = 5;
    this.rotation = Math.random() * Math.PI * 2;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    // Draw flower petals
    for (let i = 0; i < this.petals; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -this.size * 1.5, this.size, this.size * 1.5, (i * Math.PI * 2 / this.petals), 0, Math.PI * 2);
      ctx.fill();
    }
    // Center
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.rotation += 0.05;
  }
}

// Leaf Particle (Fall)
class LeafParticle extends Particle {
  constructor(x, y, vx, vy, color) {
    super(x, y, vx, vy, color, 2.0);
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    this.size = 4 + Math.random() * 3;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy += 0.1; // Gravity
    this.rotation += this.rotationSpeed;
    this.life -= 0.01;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    // Draw leaf shape
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Vein
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -this.size * 1.5);
    ctx.lineTo(0, this.size * 1.5);
    ctx.stroke();
    ctx.restore();
  }
}

// Sun Ray Particle (Summer)
class SunRayParticle extends Particle {
  constructor(x, y, vx, vy, color) {
    super(x, y, vx, vy, color, 1.0);
    this.rays = 8;
    this.rotation = Math.random() * Math.PI * 2;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    // Draw sun rays
    for (let i = 0; i < this.rays; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, this.size * 3);
      ctx.stroke();
      ctx.rotate(Math.PI * 2 / this.rays);
    }
    // Center
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.rotation += 0.1;
  }
}

// Splash Particle (Condiments)
class SplashParticle extends Particle {
  constructor(x, y, vx, vy, color, life) {
    super(x, y, vx, vy, color, life);
    this.size = 3 + Math.random() * 5;
    this.gravity = 0.2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.95;
    this.life -= 0.02;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Draw splash blob
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.size, this.size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.3, this.size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

