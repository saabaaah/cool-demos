# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Cool Demos - A collection of interactive web demos and simulations. Currently features Territory Wars, a strategic territorial conquest simulation with multiple themes and intelligent agents.

## Development

```bash
npx serve          # Start local development server
```

No build step required - pure HTML/CSS/JS.

## Architecture

### Landing Page (`/`)
- `index.html` - Demo gallery with card-based navigation
- `script.js` - ParticleBackground class for animated canvas background
- `styles.css` - Dark theme with CSS animations and hover effects

### Territory Wars (`/territory-wars/`)
Canvas-based simulation where autonomous agents battle for territorial control.

**Key Components in `script.js`:**
- `NeuralBackground` - Animated neural network background for landing page
- `AppState` - Global state management (current view, config)
- `THEMES` - Theme definitions (colors, teams, particle styles)
- `Simulation` - Main game loop, ball physics, collision detection, scoring
- `Particle` classes - Theme-specific particle effects (SparkleParticle, FireParticle, SnowParticle, FlowerParticle, LeafParticle, SunRayParticle, SplashParticle)

**Game Flow:** Landing → Config Modal → Simulation

**Adding New Themes:** Add entry to `THEMES` object with:
- `name`, `teams`, `colors` (with optional emoji/effect)
- `background` gradient
- `style` options (squareGradient, glowIntensity, particleStyle)

Then create corresponding particle class if needed.
