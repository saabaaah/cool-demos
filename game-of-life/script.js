// ============================================
// GAME OF LIFE
// ============================================

class GameOfLife {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridSize = 50;
    this.cellSize = 0;
    this.grid = [];
    this.isPlaying = false;
    this.generation = 0;
    this.fps = 15;
    this.lastFrameTime = 0;
    this.isDrawing = false;
    this.drawMode = true; // true = draw, false = erase

    this.colors = {
      alive: '#00ff88',
      aliveGlow: 'rgba(0, 255, 136, 0.3)',
      dead: 'rgba(255, 255, 255, 0.02)',
      grid: 'rgba(255, 255, 255, 0.03)'
    };

    this.init();
    this.setupEvents();
    this.animate();
  }

  init() {
    this.resize();
    this.createGrid();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const maxSize = Math.min(window.innerWidth - 40, 700);
    this.canvas.width = maxSize;
    this.canvas.height = maxSize;
    this.cellSize = this.canvas.width / this.gridSize;
    this.render();
  }

  createGrid() {
    this.grid = [];
    for (let i = 0; i < this.gridSize; i++) {
      this.grid[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        this.grid[i][j] = 0;
      }
    }
    this.generation = 0;
    this.updateGenerationDisplay();
  }

  setGridSize(size) {
    this.gridSize = size;
    this.cellSize = this.canvas.width / this.gridSize;
    this.createGrid();
    this.render();
  }

  setupEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.isDrawing = false);
    this.canvas.addEventListener('mouseleave', () => this.isDrawing = false);

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', () => this.isDrawing = false);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.step();
      }
    });
  }

  handleMouseDown(e) {
    const { x, y } = this.getGridPos(e);
    if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
      this.drawMode = !this.grid[x][y];
      this.isDrawing = true;
      this.toggleCell(x, y);
    }
  }

  handleMouseMove(e) {
    if (!this.isDrawing) return;
    const { x, y } = this.getGridPos(e);
    if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
      this.grid[x][y] = this.drawMode ? 1 : 0;
      this.render();
    }
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const { x, y } = this.getGridPosFromCoords(touch.clientX - rect.left, touch.clientY - rect.top);
    if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
      this.drawMode = !this.grid[x][y];
      this.isDrawing = true;
      this.toggleCell(x, y);
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    if (!this.isDrawing) return;
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const { x, y } = this.getGridPosFromCoords(touch.clientX - rect.left, touch.clientY - rect.top);
    if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
      this.grid[x][y] = this.drawMode ? 1 : 0;
      this.render();
    }
  }

  getGridPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return this.getGridPosFromCoords(e.clientX - rect.left, e.clientY - rect.top);
  }

  getGridPosFromCoords(canvasX, canvasY) {
    const scaleX = this.canvas.width / this.canvas.offsetWidth;
    const scaleY = this.canvas.height / this.canvas.offsetHeight;
    return {
      x: Math.floor((canvasX * scaleX) / this.cellSize),
      y: Math.floor((canvasY * scaleY) / this.cellSize)
    };
  }

  toggleCell(x, y) {
    this.grid[x][y] = this.drawMode ? 1 : 0;
    this.render();
  }

  // Game logic
  step() {
    const newGrid = [];
    for (let i = 0; i < this.gridSize; i++) {
      newGrid[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        const neighbors = this.countNeighbors(i, j);
        const alive = this.grid[i][j];

        if (alive && (neighbors === 2 || neighbors === 3)) {
          newGrid[i][j] = 1;
        } else if (!alive && neighbors === 3) {
          newGrid[i][j] = 1;
        } else {
          newGrid[i][j] = 0;
        }
      }
    }
    this.grid = newGrid;
    this.generation++;
    this.updateGenerationDisplay();
    this.render();
  }

  countNeighbors(x, y) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const nx = (x + i + this.gridSize) % this.gridSize;
        const ny = (y + j + this.gridSize) % this.gridSize;
        count += this.grid[nx][ny];
      }
    }
    return count;
  }

  // Controls
  togglePlay() {
    this.isPlaying = !this.isPlaying;
    document.getElementById('playPauseBtn').classList.toggle('playing', this.isPlaying);
  }

  clear() {
    this.isPlaying = false;
    document.getElementById('playPauseBtn').classList.remove('playing');
    this.createGrid();
    this.render();
  }

  randomize() {
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        this.grid[i][j] = Math.random() > 0.75 ? 1 : 0;
      }
    }
    this.generation = 0;
    this.updateGenerationDisplay();
    this.render();
  }

  setFps(fps) {
    this.fps = fps;
  }

  updateGenerationDisplay() {
    document.getElementById('generation').textContent = this.generation;
  }

  // Patterns
  placePattern(pattern) {
    const centerX = Math.floor(this.gridSize / 2);
    const centerY = Math.floor(this.gridSize / 2);

    pattern.forEach(([dx, dy]) => {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
        this.grid[x][y] = 1;
      }
    });
    this.render();
  }

  // Rendering
  render() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid lines
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 0.5;
    for (let i = 0; i <= this.gridSize; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.cellSize, 0);
      this.ctx.lineTo(i * this.cellSize, this.canvas.height);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.cellSize);
      this.ctx.lineTo(this.canvas.width, i * this.cellSize);
      this.ctx.stroke();
    }

    // Draw cells
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const x = i * this.cellSize;
        const y = j * this.cellSize;

        if (this.grid[i][j]) {
          // Glow effect
          this.ctx.shadowColor = this.colors.alive;
          this.ctx.shadowBlur = 8;
          this.ctx.fillStyle = this.colors.alive;
          this.ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
          this.ctx.shadowBlur = 0;
        }
      }
    }
  }

  animate(timestamp = 0) {
    const frameInterval = 1000 / this.fps;

    if (this.isPlaying && timestamp - this.lastFrameTime >= frameInterval) {
      this.step();
      this.lastFrameTime = timestamp;
    }

    requestAnimationFrame((t) => this.animate(t));
  }
}

// ============================================
// PATTERNS
// ============================================

const PATTERNS = {
  glider: [
    [0, -1], [1, 0], [-1, 1], [0, 1], [1, 1]
  ],
  lwss: [ // Lightweight spaceship
    [0, 0], [3, 0], [4, 1], [0, 2], [4, 2], [1, 3], [2, 3], [3, 3], [4, 3]
  ],
  pulsar: [
    // Top
    [-4, -6], [-3, -6], [-2, -6], [2, -6], [3, -6], [4, -6],
    [-4, -1], [-3, -1], [-2, -1], [2, -1], [3, -1], [4, -1],
    // Bottom
    [-4, 1], [-3, 1], [-2, 1], [2, 1], [3, 1], [4, 1],
    [-4, 6], [-3, 6], [-2, 6], [2, 6], [3, 6], [4, 6],
    // Left
    [-6, -4], [-6, -3], [-6, -2], [-6, 2], [-6, 3], [-6, 4],
    [-1, -4], [-1, -3], [-1, -2], [-1, 2], [-1, 3], [-1, 4],
    // Right
    [1, -4], [1, -3], [1, -2], [1, 2], [1, 3], [1, 4],
    [6, -4], [6, -3], [6, -2], [6, 2], [6, 3], [6, 4]
  ],
  pentadecathlon: [
    [0, -4], [0, -3], [-1, -2], [1, -2], [0, -1], [0, 0],
    [0, 1], [0, 2], [-1, 3], [1, 3], [0, 4], [0, 5]
  ],
  gosper: [ // Gosper Glider Gun (offset to top-left)
    // Left square
    [-18, 0], [-18, 1], [-17, 0], [-17, 1],
    // Left structure
    [-8, 0], [-8, 1], [-8, 2], [-7, -1], [-7, 3], [-6, -2], [-6, 4],
    [-5, -2], [-5, 4], [-4, 1], [-3, -1], [-3, 3], [-2, 0], [-2, 1], [-2, 2],
    [-1, 1],
    // Right structure
    [2, -2], [2, -1], [2, 0], [3, -2], [3, -1], [3, 0],
    [4, -3], [4, 1], [6, -4], [6, -3], [6, 1], [6, 2],
    // Right square
    [16, -2], [16, -1], [17, -2], [17, -1]
  ]
};

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new GameOfLife(canvas);

  // Play/Pause
  document.getElementById('playPauseBtn').addEventListener('click', () => {
    game.togglePlay();
  });

  // Step
  document.getElementById('stepBtn').addEventListener('click', () => {
    game.step();
  });

  // Clear
  document.getElementById('clearBtn').addEventListener('click', () => {
    game.clear();
  });

  // Random
  document.getElementById('randomBtn').addEventListener('click', () => {
    game.randomize();
  });

  // Speed
  const speedSlider = document.getElementById('speedSlider');
  const speedValue = document.getElementById('speedValue');
  speedSlider.addEventListener('input', (e) => {
    const fps = parseInt(e.target.value);
    game.setFps(fps);
    speedValue.textContent = `${fps} fps`;
  });

  // Grid size
  document.getElementById('gridSize').addEventListener('change', (e) => {
    game.setGridSize(parseInt(e.target.value));
  });

  // Patterns
  document.querySelectorAll('[data-pattern]').forEach(btn => {
    btn.addEventListener('click', () => {
      const patternName = btn.dataset.pattern;
      if (PATTERNS[patternName]) {
        game.placePattern(PATTERNS[patternName]);
      }
    });
  });
});
