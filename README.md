# Wayfare

A 2D top-down action game built with PixiJS v8 and TypeScript featuring advanced movement mechanics, jumping, and stamina-based sprinting.

## Features

### Movement & Controls
- **WASD/Arrow Keys**: 8-directional movement with smooth acceleration and drag
- **Shift**: Sprint at 1.5x speed (consumes stamina)
- **Space**: Jump over obstacles
- **E**: Roll (planned)

### Advanced Mechanics
- **Stamina System**: 100 stamina pool with regeneration (10/sec) and sprint drain (20/sec)
- **Jumping System**: SOLID-architected jumping with:
  - Coyote time (150ms grace period after leaving ground)
  - Jump buffering (100ms input memory for landing)
  - Height-based collision (jump over rocks, logs, trees but not water)
  - Air control with momentum preservation (60% acceleration, 20% drag in air)
  - Landing assistance to prevent getting stuck in obstacles
- **Directional Sprites**: 4-frame walk cycle animation (idle, step-left, idle, step-right)
- **Hitbox System**: Precise 8-point collision detection with wall sliding
- **Visual Polish**: Dynamic shadow, sprint animation speed, smooth landing corrections

### Technical Highlights
- **Frame-rate independent physics**: All movement uses delta time
- **SOLID architecture**: Separate classes for jump state, physics, and visuals
- **Optimized rendering**: Chunk-based tile culling for large maps
- **HUD System**: Fixed UI layer with stamina bar and FPS counter

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or bun

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
# or
npm start
```

Opens browser at `http://localhost:8080` with hot module reloading.

### Build

```bash
npm run build
```

Runs linter, TypeScript compiler, and Vite build. Output in `dist/`.

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── main.ts                 # Entry point, PixiJS app initialization
├── scenes/
│   ├── Scene.ts            # Base scene class
│   └── GameScene.ts        # Main game scene with world and HUD
├── world/
│   ├── World.ts            # World container, player, tilemap management
│   ├── entities/
│   │   ├── Entity.ts       # Base entity class
│   │   ├── Player.ts       # Player entity with movement, jumping, stamina
│   │   ├── PlayerStats.ts  # Stats management (stamina, etc.)
│   │   ├── DirectionHelper.ts   # Direction calculation utilities
│   │   ├── SpriteLoader.ts      # Sprite sheet loading
│   │   └── jumping/
│   │       ├── JumpState.ts     # Jump state machine
│   │       ├── JumpPhysics.ts   # Jump physics calculations
│   │       ├── JumpVisuals.ts   # Jump visual effects
│   │       └── LandingAssist.ts # Landing position correction
│   └── map/
│       ├── TileMap.ts           # Tile data structure
│       ├── TileMapRenderer.ts   # Chunked rendering system
│       ├── Tile.ts              # Tile type definitions
│       ├── TileLayer.ts         # Layer management
│       ├── Tilesets.ts          # Tileset configuration
│       ├── TileHeights.ts       # Obstacle height config
│       └── constants.ts         # Tile constants
├── ui/
│   ├── StaminaBar.ts       # Stamina bar UI component
│   └── FpsCounter.ts       # FPS display component
└── input/
    ├── Keyboard.ts         # Keyboard input singleton
    └── Intent.ts           # Input → action translation

docs/
├── research/
│   ├── jumping-mechanics.md      # Jumping research
│   └── air-control-mechanics.md  # Air control research
└── implementation/
    ├── jumping-system.md          # Jump system docs
    └── landing-assistance.md      # Landing assist docs
```

## Configuration

### Player Tuning

Edit `src/world/World.ts`:

```typescript
this.player = new Player(playerSprite, {
  maxSpeed: 150,              // Base movement speed (px/sec)
  accel: 5000,                // Acceleration (px/sec²)
  drag: 12,                   // Drag coefficient (higher = stops faster)
  airControlFactor: 0.6,      // Air acceleration multiplier (0-1)
  airDragFactor: 0.2,         // Air drag multiplier (0-1)
  hitboxWidth: 12,            // Collision box width
  hitboxHeight: 8,            // Collision box height
  hitboxOffsetY: 8,           // Hitbox offset (feet)
});
```

### Jump Tuning

Edit `src/world/entities/Player.ts`:

```typescript
this.jumpPhysics = new JumpPhysics({
  gravity: 1200,              // Gravity (px/sec²)
  jumpStrength: 280,          // Initial jump velocity
  maxHeight: 24,              // Max jump height (pixels)
  hangTimeFactor: 0.2,        // Hang time at peak (0-1)
});

this.landingAssist = new LandingAssist({
  pushOutEnabled: true,       // Enable landing assistance
  snapDistance: 6,            // Snap threshold (pixels)
  checkRadius: 16,            // Search radius (pixels)
});
```

### FPS Configuration

Edit `src/main.ts`:

```typescript
// Uncomment to cap FPS
// app.ticker.maxFPS = 60;
// app.ticker.minFPS = 30;
```

## Architecture Patterns

### SOLID Jumping System

The jumping system follows SOLID principles with separate responsibilities:

1. **JumpState**: State machine (grounded, rising, falling, landing)
2. **JumpPhysics**: Physics calculations (gravity, velocity, height)
3. **JumpVisuals**: Visual effects (shadow, sprite offset, squash)
4. **LandingAssist**: Position correction to prevent getting stuck

### Dependency Injection

Entities receive dependencies through constructor options:

```typescript
new Player(sprite, {
  readKeys: Keyboard.getKeys,        // Input provider
  isBlocked: this.isBlocked.bind(this), // Collision checker
});
```

### Frame-Rate Independence

All physics uses delta time for consistent behavior:

```typescript
const dtSec = dt / 60;  // Convert frames to seconds
vx += accel * dtSec;    // Frame-independent acceleration
vx *= Math.exp(-drag * dtSec); // Exponential drag
```

## Game Design

### Obstacle Heights

- **Grass/Empty**: 0px (no collision)
- **Log**: 8px (easily jumpable)
- **Rock**: 12px (jumpable)
- **Tree**: 16px (requires max jump height)
- **Water**: 32px (cannot jump over)

### Sprint Feel

- **Speed**: 1.5x base speed (150 → 225 px/sec)
- **Stamina**: Drains at 20/sec, regenerates at 10/sec
- **Animation**: 150ms per frame (normal) → 80ms per frame (sprint)
- **Air Control**: Maintains 60% control while jumping

### Landing Assistance

When landing inside an obstacle:
1. Searches in spiral pattern (2px steps, max 16px radius)
2. Finds nearest valid position
3. Smoothly interpolates over 80ms with cubic ease-out
4. Prevents player from getting stuck

## Development Notes

### Vite HMR

The game handles hot module reloading:
- Keyboard singleton cleans up listeners on reload
- Scenes can be hot-reloaded without memory leaks

### Asset Loading

Assets are loaded via PixiJS v8 Assets API:
```typescript
await Assets.load('/gfx/tileset.png');
```

### Performance

- Tile rendering uses chunking with 8-tile chunks
- Viewport culling only renders visible chunks
- FPS counter available for monitoring (renders at 10, 40)

## License

[Your License Here]

## Credits

Built with:
- [PixiJS v8](https://pixijs.com/) - 2D rendering engine
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Vite](https://vitejs.dev/) - Build tool and dev server
