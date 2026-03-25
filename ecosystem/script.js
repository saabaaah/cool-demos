// ============================================
// ECOSYSTEM SIMULATION
// ============================================

class Creature {
  constructor(x, y, type, canvas) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.canvas = canvas;
    this.angle = Math.random() * Math.PI * 2;
    this.energy = type === 'predator' ? 150 : 100;
    this.maxEnergy = type === 'predator' ? 150 : 100;
    this.speed = type === 'predator' ? 2.5 : 2;
    this.size = type === 'predator' ? 8 : 5;
    this.reproductionThreshold = type === 'predator' ? 120 : 80;
  }

  update(creatures, plants, speedMultiplier) {
    // Find target
    let target = null;
    let minDist = Infinity;

    if (this.type === 'predator') {
      // Hunt prey
      for (let c of creatures) {
        if (c.type === 'prey') {
          const d = this.distance(c);
          if (d < minDist && d < 150) {
            minDist = d;
            target = c;
          }
        }
      }
    } else {
      // Prey seeks plants
      for (let p of plants) {
        const d = this.distance(p);
        if (d < minDist && d < 100) {
          minDist = d;
          target = p;
        }
      }

      // Also flee from predators
      for (let c of creatures) {
        if (c.type === 'predator') {
          const d = this.distance(c);
          if (d < 80) {
            // Flee
            this.angle = Math.atan2(this.y - c.y, this.x - c.x);
            target = null;
            break;
          }
        }
      }
    }

    // Move towards target or wander
    if (target) {
      const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
      const angleDiff = targetAngle - this.angle;
      this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.1);
    } else {
      this.angle += (Math.random() - 0.5) * 0.3;
    }

    // Move
    this.x += Math.cos(this.angle) * this.speed * speedMultiplier;
    this.y += Math.sin(this.angle) * this.speed * speedMultiplier;

    // Wrap around
    if (this.x < 0) this.x = this.canvas.width;
    if (this.x > this.canvas.width) this.x = 0;
    if (this.y < 0) this.y = this.canvas.height;
    if (this.y > this.canvas.height) this.y = 0;

    // Lose energy
    this.energy -= 0.1 * speedMultiplier;

    return this.energy > 0;
  }

  distance(other) {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }

  draw(ctx) {
    const energyRatio = this.energy / this.maxEnergy;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Body
    ctx.beginPath();
    if (this.type === 'predator') {
      // Triangle for predator
      ctx.moveTo(this.size, 0);
      ctx.lineTo(-this.size, -this.size * 0.7);
      ctx.lineTo(-this.size, this.size * 0.7);
      ctx.closePath();
      ctx.fillStyle = `rgba(248, 113, 113, ${0.5 + energyRatio * 0.5})`;
    } else {
      // Circle for prey
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(74, 222, 128, ${0.5 + energyRatio * 0.5})`;
    }
    ctx.fill();

    ctx.restore();
  }
}

class Plant {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 3;
    this.energy = 30;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.fill();
  }
}

class Ecosystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.creatures = [];
    this.plants = [];
    this.paused = false;
    this.speedMultiplier = 2;
    this.initialPrey = 50;
    this.initialPredators = 5;

    this.init();
    this.animate();
  }

  init() {
    this.resize();
    this.reset();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const availableHeight = window.innerHeight - 300;
    const availableWidth = window.innerWidth - 40;
    this.canvas.width = Math.min(availableWidth, 700);
    this.canvas.height = Math.min(availableHeight, 450);
  }

  reset() {
    this.creatures = [];
    this.plants = [];

    // Create prey
    for (let i = 0; i < this.initialPrey; i++) {
      this.creatures.push(new Creature(
        Math.random() * this.canvas.width,
        Math.random() * this.canvas.height,
        'prey',
        this.canvas
      ));
    }

    // Create predators
    for (let i = 0; i < this.initialPredators; i++) {
      this.creatures.push(new Creature(
        Math.random() * this.canvas.width,
        Math.random() * this.canvas.height,
        'predator',
        this.canvas
      ));
    }

    // Create plants
    for (let i = 0; i < 100; i++) {
      this.plants.push(new Plant(
        Math.random() * this.canvas.width,
        Math.random() * this.canvas.height
      ));
    }
  }

  update() {
    if (this.paused) return;

    // Update creatures
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      if (!c.update(this.creatures, this.plants, this.speedMultiplier)) {
        this.creatures.splice(i, 1);
        continue;
      }

      // Check eating
      if (c.type === 'predator') {
        for (let j = this.creatures.length - 1; j >= 0; j--) {
          const prey = this.creatures[j];
          if (prey.type === 'prey' && c.distance(prey) < c.size + prey.size) {
            c.energy = Math.min(c.maxEnergy, c.energy + 50);
            this.creatures.splice(j, 1);
            if (j < i) i--;
          }
        }
      } else {
        for (let j = this.plants.length - 1; j >= 0; j--) {
          const plant = this.plants[j];
          if (c.distance(plant) < c.size + plant.size) {
            c.energy = Math.min(c.maxEnergy, c.energy + plant.energy);
            this.plants.splice(j, 1);
          }
        }
      }

      // Reproduction
      if (c.energy > c.reproductionThreshold && Math.random() < 0.01) {
        c.energy /= 2;
        const offspring = new Creature(
          c.x + (Math.random() - 0.5) * 20,
          c.y + (Math.random() - 0.5) * 20,
          c.type,
          this.canvas
        );
        offspring.energy = c.energy;
        this.creatures.push(offspring);
      }
    }

    // Regrow plants
    if (this.plants.length < 150 && Math.random() < 0.05) {
      this.plants.push(new Plant(
        Math.random() * this.canvas.width,
        Math.random() * this.canvas.height
      ));
    }

    this.updateStats();
  }

  updateStats() {
    const prey = this.creatures.filter(c => c.type === 'prey').length;
    const predators = this.creatures.filter(c => c.type === 'predator').length;

    document.getElementById('preyCount').textContent = prey;
    document.getElementById('predatorCount').textContent = predators;
    document.getElementById('plantCount').textContent = this.plants.length;
  }

  render() {
    this.ctx.fillStyle = '#0a1a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw plants
    for (let p of this.plants) {
      p.draw(this.ctx);
    }

    // Draw creatures
    for (let c of this.creatures) {
      c.draw(this.ctx);
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
  const canvas = document.getElementById('ecoCanvas');
  const sim = new Ecosystem(canvas);

  document.getElementById('resetBtn').addEventListener('click', () => sim.reset());

  const pauseBtn = document.getElementById('pauseBtn');
  pauseBtn.addEventListener('click', () => {
    sim.paused = !sim.paused;
    pauseBtn.textContent = sim.paused ? 'Play' : 'Pause';
  });

  document.getElementById('preySlider').addEventListener('input', (e) => {
    sim.initialPrey = parseInt(e.target.value);
  });

  document.getElementById('predatorSlider').addEventListener('input', (e) => {
    sim.initialPredators = parseInt(e.target.value);
  });

  document.getElementById('speedSlider').addEventListener('input', (e) => {
    sim.speedMultiplier = parseInt(e.target.value);
  });
});
