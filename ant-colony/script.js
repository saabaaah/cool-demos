// ============================================
// ANT COLONY SIMULATION
// ============================================

class Ant {
  constructor(x, y, colony) {
    this.x = x;
    this.y = y;
    this.colony = colony;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 2;
    this.hasFood = false;
    this.wanderStrength = 0.3;
  }

  update(grid, width, height) {
    // Sense pheromones in front
    const senseAngle = 0.5;
    const senseDist = 10;

    const leftAngle = this.angle - senseAngle;
    const rightAngle = this.angle + senseAngle;

    const frontX = Math.floor(this.x + Math.cos(this.angle) * senseDist);
    const frontY = Math.floor(this.y + Math.sin(this.angle) * senseDist);
    const leftX = Math.floor(this.x + Math.cos(leftAngle) * senseDist);
    const leftY = Math.floor(this.y + Math.sin(leftAngle) * senseDist);
    const rightX = Math.floor(this.x + Math.cos(rightAngle) * senseDist);
    const rightY = Math.floor(this.y + Math.sin(rightAngle) * senseDist);

    const pheromoneType = this.hasFood ? 'home' : 'food';

    const front = this.getPheromone(grid, frontX, frontY, width, height, pheromoneType);
    const left = this.getPheromone(grid, leftX, leftY, width, height, pheromoneType);
    const right = this.getPheromone(grid, rightX, rightY, width, height, pheromoneType);

    // Steer towards strongest pheromone
    if (front >= left && front >= right) {
      // Keep going straight
    } else if (left > right) {
      this.angle -= 0.2;
    } else if (right > left) {
      this.angle += 0.2;
    }

    // Random wandering
    this.angle += (Math.random() - 0.5) * this.wanderStrength;

    // Move
    const newX = this.x + Math.cos(this.angle) * this.speed;
    const newY = this.y + Math.sin(this.angle) * this.speed;

    // Check walls
    const gridX = Math.floor(newX);
    const gridY = Math.floor(newY);
    if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
      if (grid[gridY * width + gridX].wall) {
        this.angle += Math.PI + (Math.random() - 0.5);
        return;
      }
    }

    // Boundary bounce
    if (newX < 0 || newX >= width) this.angle = Math.PI - this.angle;
    if (newY < 0 || newY >= height) this.angle = -this.angle;

    this.x = Math.max(0, Math.min(width - 1, newX));
    this.y = Math.max(0, Math.min(height - 1, newY));

    // Deposit pheromones
    const gx = Math.floor(this.x);
    const gy = Math.floor(this.y);
    if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
      const cell = grid[gy * width + gx];
      if (this.hasFood) {
        cell.foodPheromone = Math.min(1, cell.foodPheromone + 0.1);
      } else {
        cell.homePheromone = Math.min(1, cell.homePheromone + 0.05);
      }
    }
  }

  getPheromone(grid, x, y, width, height, type) {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    const cell = grid[y * width + x];
    if (cell.wall) return -1;
    return type === 'food' ? cell.foodPheromone : cell.homePheromone;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Body
    ctx.fillStyle = this.hasFood ? '#22c55e' : '#1f1f1f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#1f1f1f';
    ctx.beginPath();
    ctx.arc(3, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class AntColony {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridScale = 4;
    this.grid = [];
    this.ants = [];
    this.foods = [];
    this.nestX = 0;
    this.nestY = 0;
    this.decay = 0.99;
    this.speed = 2;
    this.placementMode = 'food';
    this.foodCollected = 0;

    this.init();
    this.setupEvents();
    this.animate();
  }

  init() {
    this.resize();
    this.createGrid();
    this.createAnts(100);
    this.addInitialFood();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const availableHeight = window.innerHeight - 280;
    const availableWidth = window.innerWidth - 40;
    this.canvas.width = Math.min(availableWidth, 600);
    this.canvas.height = Math.min(availableHeight, 450);
    this.gridWidth = Math.floor(this.canvas.width / this.gridScale);
    this.gridHeight = Math.floor(this.canvas.height / this.gridScale);
    this.nestX = this.canvas.width / 2;
    this.nestY = this.canvas.height / 2;
  }

  createGrid() {
    this.grid = [];
    for (let i = 0; i < this.gridWidth * this.gridHeight; i++) {
      this.grid.push({
        foodPheromone: 0,
        homePheromone: 0,
        wall: false
      });
    }
  }

  createAnts(count) {
    this.ants = [];
    for (let i = 0; i < count; i++) {
      this.ants.push(new Ant(this.nestX, this.nestY, this));
    }
    this.updateStats();
  }

  setAntCount(count) {
    while (this.ants.length < count) {
      this.ants.push(new Ant(this.nestX, this.nestY, this));
    }
    while (this.ants.length > count) {
      this.ants.pop();
    }
    this.updateStats();
  }

  addInitialFood() {
    this.addFood(100, 100, 30);
    this.addFood(this.canvas.width - 100, 100, 30);
    this.addFood(100, this.canvas.height - 100, 30);
    this.addFood(this.canvas.width - 100, this.canvas.height - 100, 30);
  }

  addFood(x, y, amount = 20) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 20;
      this.foods.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist
      });
    }
    this.updateStats();
  }

  addWall(x, y) {
    const gx = Math.floor(x / this.gridScale);
    const gy = Math.floor(y / this.gridScale);
    const radius = 2;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
          this.grid[ny * this.gridWidth + nx].wall = true;
        }
      }
    }
  }

  reset() {
    this.createGrid();
    this.foods = [];
    this.foodCollected = 0;
    this.addInitialFood();
    this.ants.forEach(ant => {
      ant.x = this.nestX;
      ant.y = this.nestY;
      ant.hasFood = false;
      ant.angle = Math.random() * Math.PI * 2;
    });
    this.updateStats();
  }

  updateStats() {
    const antEl = document.getElementById('antCount');
    const foodEl = document.getElementById('foodCount');
    if (antEl) antEl.textContent = this.ants.length;
    if (foodEl) foodEl.textContent = this.foods.length;
  }

  setupEvents() {
    let isDrawing = false;

    this.canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      this.handleClick(e);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (isDrawing) this.handleClick(e);
    });

    this.canvas.addEventListener('mouseup', () => isDrawing = false);
    this.canvas.addEventListener('mouseleave', () => isDrawing = false);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isDrawing = true;
      this.handleTouch(e);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (isDrawing) this.handleTouch(e);
    });

    this.canvas.addEventListener('touchend', () => isDrawing = false);
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    if (this.placementMode === 'food') {
      this.addFood(x, y, 10);
    } else {
      this.addWall(x, y);
    }
  }

  handleTouch(e) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);

    if (this.placementMode === 'food') {
      this.addFood(x, y, 5);
    } else {
      this.addWall(x, y);
    }
  }

  update() {
    for (let step = 0; step < this.speed; step++) {
      // Update ants
      for (let ant of this.ants) {
        ant.update(this.grid, this.gridWidth, this.gridHeight);

        // Check for food pickup
        if (!ant.hasFood) {
          for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            const dx = ant.x - food.x;
            const dy = ant.y - food.y;
            if (dx * dx + dy * dy < 25) {
              ant.hasFood = true;
              ant.angle += Math.PI;
              this.foods.splice(i, 1);
              this.updateStats();
              break;
            }
          }
        }

        // Check for nest return
        if (ant.hasFood) {
          const dx = ant.x - this.nestX;
          const dy = ant.y - this.nestY;
          if (dx * dx + dy * dy < 400) {
            ant.hasFood = false;
            ant.angle += Math.PI;
            this.foodCollected++;
          }
        }
      }

      // Decay pheromones
      for (let cell of this.grid) {
        cell.foodPheromone *= this.decay;
        cell.homePheromone *= this.decay;
      }
    }
  }

  render() {
    this.ctx.fillStyle = '#1a1510';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw pheromones
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = this.grid[y * this.gridWidth + x];

        if (cell.wall) {
          this.ctx.fillStyle = '#3d3020';
          this.ctx.fillRect(x * this.gridScale, y * this.gridScale, this.gridScale, this.gridScale);
        } else {
          const food = cell.foodPheromone;
          const home = cell.homePheromone;

          if (food > 0.01 || home > 0.01) {
            const r = Math.floor(home * 100);
            const g = Math.floor(food * 200);
            const b = Math.floor(home * 150);
            this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
            this.ctx.fillRect(x * this.gridScale, y * this.gridScale, this.gridScale, this.gridScale);
          }
        }
      }
    }

    // Draw nest
    this.ctx.beginPath();
    this.ctx.arc(this.nestX, this.nestY, 20, 0, Math.PI * 2);
    this.ctx.fillStyle = '#8b4513';
    this.ctx.fill();
    this.ctx.strokeStyle = '#f59e0b';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw food
    this.ctx.fillStyle = '#22c55e';
    for (let food of this.foods) {
      this.ctx.beginPath();
      this.ctx.arc(food.x, food.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw ants
    for (let ant of this.ants) {
      ant.draw(this.ctx);
    }

    // Draw collected count
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.font = '12px JetBrains Mono';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.foodCollected, this.nestX, this.nestY + 4);
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
  const canvas = document.getElementById('antCanvas');
  const sim = new AntColony(canvas);

  document.getElementById('resetBtn').addEventListener('click', () => sim.reset());

  const foodBtn = document.getElementById('foodBtn');
  const wallBtn = document.getElementById('wallBtn');

  foodBtn.addEventListener('click', () => {
    sim.placementMode = 'food';
    foodBtn.classList.add('active');
    wallBtn.classList.remove('active');
  });

  wallBtn.addEventListener('click', () => {
    sim.placementMode = 'wall';
    wallBtn.classList.add('active');
    foodBtn.classList.remove('active');
  });

  const antSlider = document.getElementById('antSlider');
  const antValue = document.getElementById('antValue');
  antSlider.addEventListener('input', (e) => {
    const count = parseInt(e.target.value);
    sim.setAntCount(count);
    antValue.textContent = count;
  });

  document.getElementById('pheromoneSlider').addEventListener('input', (e) => {
    sim.decay = parseFloat(e.target.value);
  });

  document.getElementById('speedSlider').addEventListener('input', (e) => {
    sim.speed = parseInt(e.target.value);
  });
});
