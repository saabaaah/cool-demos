// ============================================
// TREE GENERATOR
// ============================================

class TreeGenerator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.depth = 9;
    this.angle = 25;
    this.lengthRatio = 0.7;
    this.season = 'summer';
    this.branches = [];
    this.animating = false;

    this.seasons = {
      summer: {
        trunk: '#4a3728',
        leaves: ['#228B22', '#32CD32', '#006400', '#2E8B57'],
        leafChance: 0.9
      },
      autumn: {
        trunk: '#4a3728',
        leaves: ['#FF6B35', '#F7C548', '#E63946', '#BC6C25'],
        leafChance: 0.7
      },
      winter: {
        trunk: '#3d3d3d',
        leaves: [],
        leafChance: 0
      },
      spring: {
        trunk: '#5a4a3a',
        leaves: ['#FFB7C5', '#FF69B4', '#98D8C8', '#90EE90'],
        leafChance: 0.6
      }
    };

    this.init();
  }

  init() {
    this.resize();
    this.generate();
    window.addEventListener('resize', () => {
      this.resize();
      this.generate();
    });
  }

  resize() {
    const availableHeight = window.innerHeight - 300;
    const availableWidth = window.innerWidth - 40;
    this.canvas.width = Math.min(availableWidth, 700);
    this.canvas.height = Math.min(availableHeight, 450);
  }

  generate() {
    this.branches = [];
    const startX = this.canvas.width / 2;
    const startY = this.canvas.height;
    const length = this.canvas.height * 0.25;

    this.generateBranches(startX, startY, length, -90, this.depth);
    this.render();
  }

  generateBranches(x, y, length, angle, depth) {
    if (depth === 0 || length < 2) return;

    const rad = angle * Math.PI / 180;
    const endX = x + Math.cos(rad) * length;
    const endY = y + Math.sin(rad) * length;

    // Add randomness
    const angleVariation = (Math.random() - 0.5) * 10;
    const lengthVariation = 0.9 + Math.random() * 0.2;

    this.branches.push({
      x1: x,
      y1: y,
      x2: endX,
      y2: endY,
      depth: depth,
      maxDepth: this.depth
    });

    // Left branch
    this.generateBranches(
      endX, endY,
      length * this.lengthRatio * lengthVariation,
      angle - this.angle + angleVariation,
      depth - 1
    );

    // Right branch
    this.generateBranches(
      endX, endY,
      length * this.lengthRatio * lengthVariation,
      angle + this.angle + angleVariation,
      depth - 1
    );

    // Sometimes add middle branch
    if (depth > 3 && Math.random() < 0.3) {
      this.generateBranches(
        endX, endY,
        length * this.lengthRatio * 0.8,
        angle + angleVariation,
        depth - 2
      );
    }
  }

  render() {
    const season = this.seasons[this.season];

    // Sky gradient
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    if (this.season === 'winter') {
      skyGradient.addColorStop(0, '#1a1a2e');
      skyGradient.addColorStop(1, '#16213e');
    } else if (this.season === 'autumn') {
      skyGradient.addColorStop(0, '#1a0f0a');
      skyGradient.addColorStop(1, '#2d1810');
    } else {
      skyGradient.addColorStop(0, '#0a1628');
      skyGradient.addColorStop(1, '#0f1f12');
    }
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Ground
    this.ctx.fillStyle = this.season === 'winter' ? '#1a1a1a' : '#1a2f1a';
    this.ctx.fillRect(0, this.canvas.height - 20, this.canvas.width, 20);

    // Draw branches
    for (let branch of this.branches) {
      const thickness = Math.max(1, (branch.depth / branch.maxDepth) * 15);
      const isLeafBranch = branch.depth <= 2;

      this.ctx.beginPath();
      this.ctx.moveTo(branch.x1, branch.y1);
      this.ctx.lineTo(branch.x2, branch.y2);
      this.ctx.strokeStyle = isLeafBranch && season.leaves.length > 0
        ? season.leaves[Math.floor(Math.random() * season.leaves.length)]
        : season.trunk;
      this.ctx.lineWidth = thickness;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();

      // Leaves
      if (isLeafBranch && Math.random() < season.leafChance && season.leaves.length > 0) {
        const leafColor = season.leaves[Math.floor(Math.random() * season.leaves.length)];
        this.ctx.beginPath();
        this.ctx.arc(branch.x2, branch.y2, 3 + Math.random() * 4, 0, Math.PI * 2);
        this.ctx.fillStyle = leafColor;
        this.ctx.fill();
      }
    }
  }

  async animate() {
    if (this.animating) return;
    this.animating = true;

    this.branches = [];
    const startX = this.canvas.width / 2;
    const startY = this.canvas.height;
    const length = this.canvas.height * 0.25;

    await this.animateBranch(startX, startY, length, -90, this.depth);

    this.animating = false;
  }

  async animateBranch(x, y, length, angle, depth) {
    if (depth === 0 || length < 2) return;

    const rad = angle * Math.PI / 180;
    const endX = x + Math.cos(rad) * length;
    const endY = y + Math.sin(rad) * length;

    const angleVariation = (Math.random() - 0.5) * 10;
    const lengthVariation = 0.9 + Math.random() * 0.2;

    // Animate drawing this branch
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const currentX = x + (endX - x) * progress;
      const currentY = y + (endY - y) * progress;

      this.branches.push({
        x1: x + (endX - x) * ((i - 1) / steps),
        y1: y + (endY - y) * ((i - 1) / steps),
        x2: currentX,
        y2: currentY,
        depth: depth,
        maxDepth: this.depth
      });

      this.render();
      await new Promise(r => setTimeout(r, 5));
    }

    // Recursively animate child branches
    await Promise.all([
      this.animateBranch(
        endX, endY,
        length * this.lengthRatio * lengthVariation,
        angle - this.angle + angleVariation,
        depth - 1
      ),
      this.animateBranch(
        endX, endY,
        length * this.lengthRatio * lengthVariation,
        angle + this.angle + angleVariation,
        depth - 1
      )
    ]);
  }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('treeCanvas');
  const tree = new TreeGenerator(canvas);

  document.getElementById('generateBtn').addEventListener('click', () => tree.generate());
  document.getElementById('animateBtn').addEventListener('click', () => tree.animate());

  const depthSlider = document.getElementById('depthSlider');
  const depthValue = document.getElementById('depthValue');
  depthSlider.addEventListener('input', (e) => {
    tree.depth = parseInt(e.target.value);
    depthValue.textContent = tree.depth;
  });

  const angleSlider = document.getElementById('angleSlider');
  const angleValue = document.getElementById('angleValue');
  angleSlider.addEventListener('input', (e) => {
    tree.angle = parseInt(e.target.value);
    angleValue.textContent = tree.angle + '°';
  });

  document.getElementById('lengthSlider').addEventListener('input', (e) => {
    tree.lengthRatio = parseFloat(e.target.value);
  });

  document.getElementById('seasonSelect').addEventListener('change', (e) => {
    tree.season = e.target.value;
    tree.generate();
  });
});
