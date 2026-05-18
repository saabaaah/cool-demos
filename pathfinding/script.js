// ============================================
// PATHFINDING VISUALIZER
// ============================================

class PathfindingVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = 15;
    this.grid = [];
    this.cols = 0;
    this.rows = 0;
    this.start = null;
    this.end = null;
    this.tool = 'wall';
    this.isDrawing = false;
    this.running = false;
    this.speed = 50;

    this.colors = {
      empty: '#0f0f14',
      wall: '#374151',
      start: '#22c55e',
      end: '#ef4444',
      visited: '#3b82f6',
      path: '#eab308',
      current: '#a855f7'
    };

    this.init();
    this.setupEvents();
  }

  init() {
    this.resize();
    this.createGrid();
    this.setDefaultPoints();
    this.render();
    window.addEventListener('resize', () => {
      this.resize();
      this.createGrid();
      this.setDefaultPoints();
      this.render();
    });
  }

  resize() {
    const availableHeight = window.innerHeight - 300;
    const availableWidth = window.innerWidth - 40;
    this.canvas.width = Math.min(availableWidth, 700);
    this.canvas.height = Math.min(availableHeight, 400);
    this.cols = Math.floor(this.canvas.width / this.cellSize);
    this.rows = Math.floor(this.canvas.height / this.cellSize);
  }

  createGrid() {
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x] = {
          x, y,
          wall: false,
          visited: false,
          path: false,
          g: Infinity,
          h: 0,
          f: Infinity,
          parent: null
        };
      }
    }
  }

  setDefaultPoints() {
    this.start = { x: Math.floor(this.cols * 0.2), y: Math.floor(this.rows / 2) };
    this.end = { x: Math.floor(this.cols * 0.8), y: Math.floor(this.rows / 2) };
  }

  clearPath() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x].visited = false;
        this.grid[y][x].path = false;
        this.grid[y][x].g = Infinity;
        this.grid[y][x].h = 0;
        this.grid[y][x].f = Infinity;
        this.grid[y][x].parent = null;
      }
    }
    this.updateStats(0, 0);
    this.render();
  }

  clearAll() {
    this.createGrid();
    this.setDefaultPoints();
    this.updateStats(0, 0);
    this.render();
  }

  generateMaze() {
    this.clearAll();
    // Recursive division maze
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (Math.random() < 0.3) {
          if (!this.isStart(x, y) && !this.isEnd(x, y)) {
            this.grid[y][x].wall = true;
          }
        }
      }
    }
    this.render();
  }

  isStart(x, y) {
    return this.start && this.start.x === x && this.start.y === y;
  }

  isEnd(x, y) {
    return this.end && this.end.x === x && this.end.y === y;
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDrawing = true;
      this.handleDraw(e);
    });
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDrawing) this.handleDraw(e);
    });
    this.canvas.addEventListener('mouseup', () => this.isDrawing = false);
    this.canvas.addEventListener('mouseleave', () => this.isDrawing = false);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isDrawing = true;
      this.handleTouch(e);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.isDrawing) this.handleTouch(e);
    });
    this.canvas.addEventListener('touchend', () => this.isDrawing = false);
  }

  getGridPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.cellSize);
    const y = Math.floor((e.clientY - rect.top) / this.cellSize);
    return { x, y };
  }

  handleDraw(e) {
    if (this.running) return;
    const pos = this.getGridPos(e);
    this.applyTool(pos.x, pos.y);
  }

  handleTouch(e) {
    if (this.running) return;
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.floor((touch.clientX - rect.left) / this.cellSize);
    const y = Math.floor((touch.clientY - rect.top) / this.cellSize);
    this.applyTool(x, y);
  }

  applyTool(x, y) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;

    switch (this.tool) {
      case 'start':
        this.start = { x, y };
        this.grid[y][x].wall = false;
        break;
      case 'end':
        this.end = { x, y };
        this.grid[y][x].wall = false;
        break;
      case 'wall':
        if (!this.isStart(x, y) && !this.isEnd(x, y)) {
          this.grid[y][x].wall = true;
        }
        break;
      case 'erase':
        this.grid[y][x].wall = false;
        break;
    }
    this.render();
  }

  updateStats(visited, pathLength) {
    document.getElementById('visitedCount').textContent = visited;
    document.getElementById('pathLength').textContent = pathLength;
  }

  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  getNeighbors(node) {
    const neighbors = [];
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];

    for (let [dx, dy] of dirs) {
      const nx = node.x + dx;
      const ny = node.y + dy;
      if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
        if (!this.grid[ny][nx].wall) {
          neighbors.push(this.grid[ny][nx]);
        }
      }
    }
    return neighbors;
  }

  async findPath(algorithm) {
    if (this.running || !this.start || !this.end) return;
    this.running = true;
    this.clearPath();

    const algorithms = {
      astar: () => this.astar(),
      dijkstra: () => this.dijkstra(),
      bfs: () => this.bfs(),
      dfs: () => this.dfs()
    };

    await algorithms[algorithm]();
    this.running = false;
  }

  async astar() {
    const startNode = this.grid[this.start.y][this.start.x];
    const endNode = this.grid[this.end.y][this.end.x];

    startNode.g = 0;
    startNode.h = this.heuristic(startNode, endNode);
    startNode.f = startNode.h;

    const openSet = [startNode];
    let visited = 0;

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();

      if (current === endNode) {
        await this.reconstructPath(endNode, visited);
        return;
      }

      current.visited = true;
      visited++;
      this.updateStats(visited, 0);
      this.render();
      await this.delay();

      for (let neighbor of this.getNeighbors(current)) {
        if (neighbor.visited) continue;

        const tentativeG = current.g + 1;

        if (tentativeG < neighbor.g) {
          neighbor.parent = current;
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, endNode);
          neighbor.f = neighbor.g + neighbor.h;

          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      }
    }
  }

  async dijkstra() {
    const startNode = this.grid[this.start.y][this.start.x];
    const endNode = this.grid[this.end.y][this.end.x];

    startNode.g = 0;
    const unvisited = [];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        unvisited.push(this.grid[y][x]);
      }
    }

    let visited = 0;

    while (unvisited.length > 0) {
      unvisited.sort((a, b) => a.g - b.g);
      const current = unvisited.shift();

      if (current.g === Infinity) break;
      if (current === endNode) {
        await this.reconstructPath(endNode, visited);
        return;
      }

      current.visited = true;
      visited++;
      this.updateStats(visited, 0);
      this.render();
      await this.delay();

      for (let neighbor of this.getNeighbors(current)) {
        if (neighbor.visited) continue;

        const alt = current.g + 1;
        if (alt < neighbor.g) {
          neighbor.g = alt;
          neighbor.parent = current;
        }
      }
    }
  }

  async bfs() {
    const startNode = this.grid[this.start.y][this.start.x];
    const endNode = this.grid[this.end.y][this.end.x];

    const queue = [startNode];
    startNode.visited = true;
    let visited = 0;

    while (queue.length > 0) {
      const current = queue.shift();
      visited++;
      this.updateStats(visited, 0);
      this.render();
      await this.delay();

      if (current === endNode) {
        await this.reconstructPath(endNode, visited);
        return;
      }

      for (let neighbor of this.getNeighbors(current)) {
        if (!neighbor.visited) {
          neighbor.visited = true;
          neighbor.parent = current;
          queue.push(neighbor);
        }
      }
    }
  }

  async dfs() {
    const startNode = this.grid[this.start.y][this.start.x];
    const endNode = this.grid[this.end.y][this.end.x];

    const stack = [startNode];
    let visited = 0;

    while (stack.length > 0) {
      const current = stack.pop();

      if (current.visited) continue;
      current.visited = true;
      visited++;
      this.updateStats(visited, 0);
      this.render();
      await this.delay();

      if (current === endNode) {
        await this.reconstructPath(endNode, visited);
        return;
      }

      for (let neighbor of this.getNeighbors(current)) {
        if (!neighbor.visited) {
          neighbor.parent = current;
          stack.push(neighbor);
        }
      }
    }
  }

  async reconstructPath(endNode, visited) {
    const path = [];
    let current = endNode;

    while (current) {
      path.unshift(current);
      current = current.parent;
    }

    for (let node of path) {
      node.path = true;
      this.updateStats(visited, path.length);
      this.render();
      await this.delay();
    }
  }

  delay() {
    return new Promise(resolve => setTimeout(resolve, Math.max(1, 101 - this.speed)));
  }

  render() {
    this.ctx.fillStyle = this.colors.empty;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        const px = x * this.cellSize;
        const py = y * this.cellSize;

        let color = this.colors.empty;

        if (cell.wall) {
          color = this.colors.wall;
        } else if (cell.path) {
          color = this.colors.path;
        } else if (cell.visited) {
          color = this.colors.visited;
        }

        if (color !== this.colors.empty) {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);
        }
      }
    }

    // Draw start
    if (this.start) {
      this.ctx.fillStyle = this.colors.start;
      this.ctx.beginPath();
      this.ctx.arc(
        this.start.x * this.cellSize + this.cellSize / 2,
        this.start.y * this.cellSize + this.cellSize / 2,
        this.cellSize / 2 - 2, 0, Math.PI * 2
      );
      this.ctx.fill();
    }

    // Draw end
    if (this.end) {
      this.ctx.fillStyle = this.colors.end;
      this.ctx.beginPath();
      this.ctx.arc(
        this.end.x * this.cellSize + this.cellSize / 2,
        this.end.y * this.cellSize + this.cellSize / 2,
        this.cellSize / 2 - 2, 0, Math.PI * 2
      );
      this.ctx.fill();
    }

    // Grid lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.cols; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.cellSize, 0);
      this.ctx.lineTo(x * this.cellSize, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.cellSize);
      this.ctx.lineTo(this.canvas.width, y * this.cellSize);
      this.ctx.stroke();
    }
  }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('pathCanvas');
  const viz = new PathfindingVisualizer(canvas);

  document.getElementById('startBtn').addEventListener('click', () => {
    const algo = document.getElementById('algoSelect').value;
    viz.findPath(algo);
  });

  document.getElementById('clearPathBtn').addEventListener('click', () => viz.clearPath());
  document.getElementById('clearAllBtn').addEventListener('click', () => viz.clearAll());
  document.getElementById('mazeBtn').addEventListener('click', () => viz.generateMaze());

  document.getElementById('speedSlider').addEventListener('input', (e) => {
    viz.speed = parseInt(e.target.value);
  });

  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      viz.tool = btn.dataset.tool;
    });
  });
});
