# Theme Samples & Ideas

## 🍔 Condiments Theme (3 Teams) - Ketchup / Mayo / Mustard

This is a **brilliant** idea! Fun, playful, and visually distinct. Here's how it would work:

### Color Scheme
```javascript
'condiments': {
  name: 'Condiments War',
  teams: 3,
  colors: [
    { 
      name: 'Ketchup', 
      color: '#DC143C',      // Classic ketchup red
      ballColor: '#8B0000',   // Darker red for contrast
      emoji: '🍅'
    },
    { 
      name: 'Mayo', 
      color: '#FFFEF7',       // Creamy white
      ballColor: '#2F2F2F',   // Dark gray/black for contrast
      emoji: '🥄'
    },
    { 
      name: 'Mustard', 
      color: '#FFD700',       // Bright yellow mustard
      ballColor: '#8B6914',   // Darker yellow/brown
      emoji: '🌭'
    }
  ],
  background: 'linear-gradient(120deg, #DC143C 0%, #FFFEF7 50%, #FFD700 100%)'
}
```

### Territory Division (3-Way Split)
For 3 teams, we can split the canvas in several ways:

#### Option 1: Triangular (Recommended)
```
        Ketchup
           /\
          /  \
         /    \
    Mayo/______\Mustard
```
- Ketchup: Top section
- Mayo: Bottom-left section  
- Mustard: Bottom-right section

#### Option 2: Vertical Stripes
```
| Ketchup | Mayo | Mustard |
```
- Three equal vertical sections

#### Option 3: Pie Chart Style
- Divide canvas into 3 equal pie slices (120° each)
- More dynamic, circular division

### Visual Appeal
- **High contrast**: Red, white, yellow are very distinct
- **Playful theme**: Everyone can relate to condiments!
- **Clear boundaries**: Easy to see which team controls what
- **Fun emojis**: Can add condiment emojis to UI

---

## 🎨 More 3-Team Theme Ideas

### 1. **Primary Colors** (Red / Blue / Yellow)
```javascript
'primary-colors': {
  name: 'Primary Colors',
  teams: 3,
  colors: [
    { name: 'Red', color: '#FF0000', ballColor: '#8B0000' },
    { name: 'Blue', color: '#0000FF', ballColor: '#00008B' },
    { name: 'Yellow', color: '#FFFF00', ballColor: '#FFD700' }
  ]
}
```

### 2. **Traffic Lights** (Red / Yellow / Green)
```javascript
'traffic-lights': {
  name: 'Traffic Lights',
  teams: 3,
  colors: [
    { name: 'Red', color: '#FF0000', ballColor: '#FFFFFF' },
    { name: 'Yellow', color: '#FFD700', ballColor: '#000000' },
    { name: 'Green', color: '#00FF00', ballColor: '#FFFFFF' }
  ]
}
```

### 3. **Fire / Water / Earth**
```javascript
'elements': {
  name: 'Elements',
  teams: 3,
  colors: [
    { name: 'Fire', color: '#FF4500', ballColor: '#FFFF00', emoji: '🔥' },
    { name: 'Water', color: '#1E90FF', ballColor: '#FFFFFF', emoji: '💧' },
    { name: 'Earth', color: '#8B4513', ballColor: '#228B22', emoji: '🌍' }
  ]
}
```

### 4. **Rock / Paper / Scissors**
```javascript
'rps': {
  name: 'Rock Paper Scissors',
  teams: 3,
  colors: [
    { name: 'Rock', color: '#696969', ballColor: '#2F2F2F', emoji: '🪨' },
    { name: 'Paper', color: '#FFFFFF', ballColor: '#000000', emoji: '📄' },
    { name: 'Scissors', color: '#C0C0C0', ballColor: '#000000', emoji: '✂️' }
  ]
}
```

### 5. **Coffee / Tea / Hot Chocolate**
```javascript
'hot-drinks': {
  name: 'Hot Drinks',
  teams: 3,
  colors: [
    { name: 'Coffee', color: '#3E2723', ballColor: '#FFFFFF', emoji: '☕' },
    { name: 'Tea', color: '#8B4513', ballColor: '#FFFFFF', emoji: '🫖' },
    { name: 'Hot Chocolate', color: '#6F4E37', ballColor: '#FFFFFF', emoji: '🍫' }
  ]
}
```

---

## 🎯 Implementation for 3 Teams

### Canvas Division Logic

#### Triangular Split (Recommended)
```javascript
function initializeTerritory3Teams(squares, numSquaresX, numSquaresY, teams) {
  const centerX = numSquaresX / 2;
  const centerY = numSquaresY / 2;
  
  for (let i = 0; i < numSquaresX; i++) {
    for (let j = 0; j < numSquaresY; j++) {
      const dx = i - centerX;
      const dy = j - centerY;
      const angle = Math.atan2(dy, dx);
      
      // Divide into 3 sections (120° each)
      if (angle >= -Math.PI/2 && angle < Math.PI/6) {
        squares[i][j] = teams[0].color; // Team 1
      } else if (angle >= Math.PI/6 && angle < 5*Math.PI/6) {
        squares[i][j] = teams[1].color; // Team 2
      } else {
        squares[i][j] = teams[2].color; // Team 3
      }
    }
  }
}
```

#### Vertical Stripes
```javascript
function initializeTerritory3TeamsVertical(squares, numSquaresX, numSquaresY, teams) {
  const sectionWidth = numSquaresX / 3;
  
  for (let i = 0; i < numSquaresX; i++) {
    for (let j = 0; j < numSquaresY; j++) {
      if (i < sectionWidth) {
        squares[i][j] = teams[0].color;
      } else if (i < sectionWidth * 2) {
        squares[i][j] = teams[1].color;
      } else {
        squares[i][j] = teams[2].color;
      }
    }
  }
}
```

### Ball Placement
```javascript
function placeBalls3Teams(canvas, numBallsPerTeam) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) / 3;
  
  const balls = [];
  
  // Place balls in triangular formation
  for (let team = 0; team < 3; team++) {
    for (let i = 0; i < numBallsPerTeam; i++) {
      const angle = (team * Math.PI * 2 / 3) + (i * 0.3); // 120° apart
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      balls.push({
        x, y,
        dx: Math.cos(angle) * 8,
        dy: Math.sin(angle) * 8,
        team: team,
        // ... other properties
      });
    }
  }
  
  return balls;
}
```

---

## 💡 Why Condiments Theme is Great

1. **Universal Appeal**: Everyone knows ketchup, mayo, and mustard
2. **High Contrast**: Red, white, yellow are very distinct
3. **Playful**: Adds humor and fun to the simulation
4. **Memorable**: Easy to remember and talk about
5. **Visual Clarity**: Easy to see which condiment is "winning"

---

## 🎨 Updated Theme List

### 2-Team Themes
- Day vs Night
- Good vs Evil
- Fire vs Ice
- Light vs Dark

### 3-Team Themes
- **Condiments** (Ketchup / Mayo / Mustard) ⭐
- Primary Colors (Red / Blue / Yellow)
- Traffic Lights (Red / Yellow / Green)
- Elements (Fire / Water / Earth)
- Rock / Paper / Scissors

### 4-Team Themes
- 4 Seasons (Spring / Summer / Fall / Winter)
- Cardinal Directions (North / South / East / West)
- Elements Extended (Fire / Water / Earth / Air)

---

## 🚀 Recommendation

**Start with Condiments theme!** It's:
- ✅ Fun and relatable
- ✅ Visually distinct
- ✅ Easy to understand
- ✅ Memorable
- ✅ Perfect for 3-way battles

The triangular territory division would look amazing with the red/white/yellow colors spreading across the canvas!

