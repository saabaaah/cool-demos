// ============================================
// SORTING ALGORITHMS VISUALIZER
// ============================================

class SortVisualizer {
  constructor(canvas, nameEl, statsEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nameEl = nameEl;
    this.statsEl = statsEl;
    this.array = [];
    this.comparisons = 0;
    this.swaps = 0;
    this.sorting = false;
    this.sorted = false;
    this.comparing = [];
    this.swapping = [];
    this.sorted_indices = [];
  }

  resize(size) {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = 200;
  }

  generateArray(size) {
    this.array = [];
    for (let i = 0; i < size; i++) {
      this.array.push(Math.random() * 0.9 + 0.1);
    }
    this.comparisons = 0;
    this.swaps = 0;
    this.comparing = [];
    this.swapping = [];
    this.sorted_indices = [];
    this.sorted = false;
    this.updateStats();
    this.render();
  }

  updateStats() {
    this.statsEl.textContent = `${this.comparisons} comparisons, ${this.swaps} swaps`;
  }

  setName(name) {
    this.nameEl.textContent = name;
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    const barWidth = w / this.array.length;
    const gap = Math.max(1, barWidth * 0.1);

    for (let i = 0; i < this.array.length; i++) {
      const barHeight = this.array[i] * (h - 10);
      const x = i * barWidth;
      const y = h - barHeight;

      let color = '#f43f5e';

      if (this.sorted_indices.includes(i)) {
        color = '#22c55e';
      } else if (this.swapping.includes(i)) {
        color = '#fbbf24';
      } else if (this.comparing.includes(i)) {
        color = '#3b82f6';
      }

      ctx.fillStyle = color;
      ctx.fillRect(x + gap / 2, y, barWidth - gap, barHeight);
    }
  }

  // Sorting Algorithms as Generators
  *bubbleSort() {
    const arr = this.array;
    const n = arr.length;

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        this.comparing = [j, j + 1];
        this.comparisons++;
        yield;

        if (arr[j] > arr[j + 1]) {
          this.swapping = [j, j + 1];
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          this.swaps++;
          yield;
          this.swapping = [];
        }
      }
      this.sorted_indices.push(n - i - 1);
    }
    this.sorted_indices.push(0);
    this.comparing = [];
  }

  *selectionSort() {
    const arr = this.array;
    const n = arr.length;

    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        this.comparing = [minIdx, j];
        this.comparisons++;
        yield;

        if (arr[j] < arr[minIdx]) {
          minIdx = j;
        }
      }

      if (minIdx !== i) {
        this.swapping = [i, minIdx];
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
        this.swaps++;
        yield;
        this.swapping = [];
      }
      this.sorted_indices.push(i);
    }
    this.sorted_indices.push(n - 1);
    this.comparing = [];
  }

  *insertionSort() {
    const arr = this.array;
    const n = arr.length;

    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) {
        this.comparing = [j - 1, j];
        this.comparisons++;
        yield;

        if (arr[j - 1] > arr[j]) {
          this.swapping = [j - 1, j];
          [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
          this.swaps++;
          yield;
          this.swapping = [];
          j--;
        } else {
          break;
        }
      }
    }
    this.sorted_indices = [...Array(n).keys()];
    this.comparing = [];
  }

  *quickSort(low = 0, high = this.array.length - 1) {
    if (low < high) {
      const pivotGen = this.partition(low, high);
      let result = pivotGen.next();
      while (!result.done) {
        yield;
        result = pivotGen.next();
      }
      const pi = result.value;

      yield* this.quickSort(low, pi - 1);
      yield* this.quickSort(pi + 1, high);
    } else if (low >= 0 && low < this.array.length) {
      this.sorted_indices.push(low);
    }
  }

  *partition(low, high) {
    const arr = this.array;
    const pivot = arr[high];
    let i = low - 1;

    for (let j = low; j < high; j++) {
      this.comparing = [j, high];
      this.comparisons++;
      yield;

      if (arr[j] < pivot) {
        i++;
        if (i !== j) {
          this.swapping = [i, j];
          [arr[i], arr[j]] = [arr[j], arr[i]];
          this.swaps++;
          yield;
          this.swapping = [];
        }
      }
    }

    if (i + 1 !== high) {
      this.swapping = [i + 1, high];
      [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
      this.swaps++;
      yield;
      this.swapping = [];
    }

    this.sorted_indices.push(i + 1);
    this.comparing = [];
    return i + 1;
  }

  *mergeSort(left = 0, right = this.array.length - 1) {
    if (left < right) {
      const mid = Math.floor((left + right) / 2);
      yield* this.mergeSort(left, mid);
      yield* this.mergeSort(mid + 1, right);
      yield* this.merge(left, mid, right);
    }
  }

  *merge(left, mid, right) {
    const arr = this.array;
    const leftArr = arr.slice(left, mid + 1);
    const rightArr = arr.slice(mid + 1, right + 1);

    let i = 0, j = 0, k = left;

    while (i < leftArr.length && j < rightArr.length) {
      this.comparing = [left + i, mid + 1 + j];
      this.comparisons++;
      yield;

      if (leftArr[i] <= rightArr[j]) {
        arr[k] = leftArr[i];
        this.swapping = [k];
        i++;
      } else {
        arr[k] = rightArr[j];
        this.swapping = [k];
        this.swaps++;
        j++;
      }
      yield;
      this.swapping = [];
      k++;
    }

    while (i < leftArr.length) {
      arr[k] = leftArr[i];
      this.swapping = [k];
      yield;
      this.swapping = [];
      i++;
      k++;
    }

    while (j < rightArr.length) {
      arr[k] = rightArr[j];
      this.swapping = [k];
      yield;
      this.swapping = [];
      j++;
      k++;
    }

    for (let idx = left; idx <= right; idx++) {
      if (!this.sorted_indices.includes(idx) && right - left + 1 === this.array.length) {
        this.sorted_indices.push(idx);
      }
    }
    this.comparing = [];
  }

  *heapSort() {
    const arr = this.array;
    const n = arr.length;

    // Build heap
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      yield* this.heapify(n, i);
    }

    // Extract elements
    for (let i = n - 1; i > 0; i--) {
      this.swapping = [0, i];
      [arr[0], arr[i]] = [arr[i], arr[0]];
      this.swaps++;
      yield;
      this.swapping = [];
      this.sorted_indices.push(i);

      yield* this.heapify(i, 0);
    }
    this.sorted_indices.push(0);
    this.comparing = [];
  }

  *heapify(n, i) {
    const arr = this.array;
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    if (left < n) {
      this.comparing = [largest, left];
      this.comparisons++;
      yield;
      if (arr[left] > arr[largest]) {
        largest = left;
      }
    }

    if (right < n) {
      this.comparing = [largest, right];
      this.comparisons++;
      yield;
      if (arr[right] > arr[largest]) {
        largest = right;
      }
    }

    if (largest !== i) {
      this.swapping = [i, largest];
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      this.swaps++;
      yield;
      this.swapping = [];

      yield* this.heapify(n, largest);
    }
  }

  getAlgorithm(name) {
    const algorithms = {
      bubble: () => this.bubbleSort(),
      selection: () => this.selectionSort(),
      insertion: () => this.insertionSort(),
      quick: () => this.quickSort(),
      merge: () => this.mergeSort(),
      heap: () => this.heapSort()
    };
    return algorithms[name]();
  }

  getAlgorithmName(name) {
    const names = {
      bubble: 'Bubble Sort',
      selection: 'Selection Sort',
      insertion: 'Insertion Sort',
      quick: 'Quick Sort',
      merge: 'Merge Sort',
      heap: 'Heap Sort'
    };
    return names[name];
  }
}

// ============================================
// MAIN CONTROLLER
// ============================================

class SortingRace {
  constructor() {
    this.viz1 = new SortVisualizer(
      document.getElementById('canvas1'),
      document.getElementById('algoName1'),
      document.getElementById('algoStats1')
    );
    this.viz2 = new SortVisualizer(
      document.getElementById('canvas2'),
      document.getElementById('algoName2'),
      document.getElementById('algoStats2')
    );

    this.size = 50;
    this.speed = 50;
    this.running = false;
    this.algo1 = 'quick';
    this.algo2 = 'bubble';

    this.init();
  }

  init() {
    this.viz1.resize(this.size);
    this.viz2.resize(this.size);
    this.reset();
    window.addEventListener('resize', () => {
      this.viz1.resize(this.size);
      this.viz2.resize(this.size);
      this.viz1.render();
      this.viz2.render();
    });
  }

  reset() {
    this.running = false;
    // Generate same array for both
    const baseArray = [];
    for (let i = 0; i < this.size; i++) {
      baseArray.push(Math.random() * 0.9 + 0.1);
    }

    this.viz1.array = [...baseArray];
    this.viz1.comparisons = 0;
    this.viz1.swaps = 0;
    this.viz1.comparing = [];
    this.viz1.swapping = [];
    this.viz1.sorted_indices = [];
    this.viz1.sorted = false;
    this.viz1.setName(this.viz1.getAlgorithmName(this.algo1));
    this.viz1.updateStats();
    this.viz1.render();

    this.viz2.array = [...baseArray];
    this.viz2.comparisons = 0;
    this.viz2.swaps = 0;
    this.viz2.comparing = [];
    this.viz2.swapping = [];
    this.viz2.sorted_indices = [];
    this.viz2.sorted = false;
    this.viz2.setName(this.viz2.getAlgorithmName(this.algo2));
    this.viz2.updateStats();
    this.viz2.render();

    document.getElementById('startBtn').disabled = false;
    document.getElementById('startBtn').textContent = 'Start Race';
  }

  async start() {
    if (this.running) return;
    this.running = true;

    document.getElementById('startBtn').disabled = true;
    document.getElementById('startBtn').textContent = 'Racing...';

    const gen1 = this.viz1.getAlgorithm(this.algo1);
    const gen2 = this.viz2.getAlgorithm(this.algo2);

    let done1 = false;
    let done2 = false;

    const delay = () => new Promise(resolve => setTimeout(resolve, Math.max(1, 101 - this.speed)));

    while ((!done1 || !done2) && this.running) {
      if (!done1) {
        const result = gen1.next();
        done1 = result.done;
        this.viz1.updateStats();
        this.viz1.render();
      }

      if (!done2) {
        const result = gen2.next();
        done2 = result.done;
        this.viz2.updateStats();
        this.viz2.render();
      }

      await delay();
    }

    if (this.running) {
      this.viz1.sorted_indices = [...Array(this.size).keys()];
      this.viz2.sorted_indices = [...Array(this.size).keys()];
      this.viz1.comparing = [];
      this.viz2.comparing = [];
      this.viz1.render();
      this.viz2.render();
    }

    document.getElementById('startBtn').textContent = 'Done!';
    this.running = false;
  }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const race = new SortingRace();

  document.getElementById('startBtn').addEventListener('click', () => race.start());
  document.getElementById('resetBtn').addEventListener('click', () => race.reset());

  document.getElementById('algo1').addEventListener('change', (e) => {
    race.algo1 = e.target.value;
    race.reset();
  });

  document.getElementById('algo2').addEventListener('change', (e) => {
    race.algo2 = e.target.value;
    race.reset();
  });

  const sizeSlider = document.getElementById('sizeSlider');
  const sizeValue = document.getElementById('sizeValue');
  sizeSlider.addEventListener('input', (e) => {
    race.size = parseInt(e.target.value);
    sizeValue.textContent = race.size;
    race.reset();
  });

  document.getElementById('speedSlider').addEventListener('input', (e) => {
    race.speed = parseInt(e.target.value);
  });

  // Set initial algorithm display
  document.getElementById('algo1').value = 'quick';
  document.getElementById('algo2').value = 'bubble';
});
