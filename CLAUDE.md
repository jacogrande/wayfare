# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wayfare is a 2D top-down action game built with PixiJS v8 and TypeScript. It features advanced movement mechanics including:
- Stamina-based sprinting system
- SOLID-architected jumping with coyote time and jump buffering
- Air control with momentum preservation
- Height-based collision allowing jumping over obstacles
- Landing assistance to prevent getting stuck
- Directional sprite animation with 4-frame walk cycles
- Precise hitbox collision with wall sliding

## Development Commands

```bash
# Start development server (opens browser at localhost:8080)
npm run dev
# or
npm start

# Build for production (runs linter + TypeScript compiler + Vite build)
npm run build

# Run linter only
npm run lint
```

## Architecture

### Core Game Loop
- Entry point: `src/main.ts` initializes the PixiJS Application and starts the game loop
- The main loop calls `scene.update(dt)` each frame with delta time
- Camera centers on the player by positioning the scene container at screen center and optionally adjusting the world pivot

### Scene System
- Base class: `src/scenes/Scene.ts` provides container management and lifecycle hooks
- Scenes must implement `start()` for initialization and optionally override `update(dt)` for per-frame logic
- `GameScene` (`src/scenes/GameScene.ts`) contains a `world` container for game objects and manages the player entity

### Entity System
- Base class: `src/world/entities/Entity.ts` provides a `root` Container for all visual elements
- Entities implement the `Updatable` interface (from `src/types.ts`) requiring an `update(dt)` method
- Each entity has optional `vx`, `vy` properties for physics-based movement
- `Player` entity (`src/world/entities/Player.ts`) uses acceleration/drag-based movement with:
  - Configurable max speed, acceleration, and drag
  - Stamina system managed by `PlayerStats` class
  - Sprint mechanic (1.5x speed, drains stamina at 20/sec)
  - SOLID jumping system with separate state, physics, and visual components
  - Air control (60% acceleration, 20% drag while airborne)
  - Landing assistance to prevent getting stuck in obstacles

### Input System
- `src/input/Keyboard.ts` is a singleton that tracks key/mouse state globally
- Initializes event listeners automatically and handles Vite HMR cleanup
- Exposes `Keyboard.getKeys()` returning a readonly snapshot of current input state
- `src/input/Intent.ts` translates raw key state into gameplay actions:
  - **move**: WASD/Arrow keys (normalized diagonal movement)
  - **sprint**: Shift key (drains stamina)
  - **jump**: Space key (with press detection, not hold)
  - **roll**: E key (planned)
  - **shoot**: Mouse left / J key (planned)

### Tilemap System
- `src/world/map/TileMap.ts` manages multiple tile layers with collision data
- `src/world/map/TileMapRenderer.ts` provides chunk-based rendering with viewport culling
- Three layers (z-indexed):
  - **ground** (z: 0): Grass, water, etc.
  - **objects** (z: 5): Rocks, trees, logs (collidable)
  - **walls** (z: 10): Border walls
- Height-based collision (`TileHeights.ts`) allows jumping over obstacles:
  - Log: 8px (easily jumpable)
  - Rock: 12px (jumpable)
  - Tree: 16px (requires max jump)
  - Water: 32px (too tall to jump)

### UI System
- `src/scenes/GameScene.ts` contains a fixed HUD container (zIndex: 1000)
- HUD elements are not affected by viewport/camera movement
- Components:
  - `StaminaBar` (`src/ui/StaminaBar.ts`): Displays stamina with rounded borders
  - `FpsCounter` (`src/ui/FpsCounter.ts`): Performance monitoring

### Jumping System (SOLID Architecture)
The jumping system follows SOLID principles with separate responsibilities:

1. **JumpState** (`src/world/entities/jumping/JumpState.ts`)
   - State machine: grounded, rising, falling, landing
   - Coyote time: 150ms grace period after leaving ground
   - Jump buffering: 100ms input memory for landing
   - Landing phase: 100ms squash animation window

2. **JumpPhysics** (`src/world/entities/jumping/JumpPhysics.ts`)
   - Physics calculations (gravity, velocity, height)
   - Gravity: 1200 px/sec²
   - Jump strength: 280 (initial velocity)
   - Max height: 24px (1.5 tiles)
   - Hang time factor: 0.2 (reduced gravity at peak)

3. **JumpVisuals** (`src/world/entities/jumping/JumpVisuals.ts`)
   - Visual effects (shadow scaling, sprite offset, squash)
   - Shadow scales from 100% → 50% during jump
   - Shadow alpha from 30% → 15% at peak
   - Landing squash with elastic ease-out

4. **LandingAssist** (`src/world/entities/jumping/LandingAssist.ts`)
   - Prevents getting stuck in obstacles after landing
   - Spiral search pattern (2px steps, max 16px radius)
   - Smooth interpolation (80ms, cubic ease-out)
   - Snap distance: 6px, Check radius: 16px (1 tile)

### Key Patterns
1. **Entity composition**: Entities have a `root` Container; add sprites/graphics to it via `entity.add(child)`
2. **Dependency injection**: Player receives `readKeys` and `isBlocked` functions rather than direct coupling
3. **Delta time handling**: `dt` from PixiJS ticker is in frames at 60fps; convert to seconds with `dt / 60` and milliseconds with `dtSec * 1000`
4. **Camera follow**: Viewport centers on player by adjusting container position and world pivot
5. **Frame-rate independence**: All physics uses delta time for consistent behavior across refresh rates
   - Acceleration: `vx += accel * dtSec`
   - Exponential drag: `vx *= Math.exp(-drag * dtSec)`
   - Animation timers: Use `dtMs` for millisecond-based timers
6. **Press detection**: Use rising edge detection for single-press actions (not hold):
   ```typescript
   const wasPressed = this.previousState;
   const isPressed = currentState;
   const justPressed = isPressed && !wasPressed;
   this.previousState = isPressed; // Store for next frame
   ```
7. **Smooth interpolation**: Use easing functions for smooth corrections:
   ```typescript
   const eased = 1 - Math.pow(1 - t, 3); // Cubic ease-out
   const value = start + (target - start) * eased;
   ```

## Best Practices

### Code Organization
- **Separate concerns**: Use SOLID principles - each class has one responsibility
- **Composition over inheritance**: Prefer composing systems (like jumping) from multiple focused classes
- **Dependency injection**: Pass dependencies through constructor options, not singletons
- **Type safety**: Use TypeScript interfaces for configuration objects

### Physics & Movement
- **Frame-rate independence**: Always multiply by `dtSec` for velocity/acceleration
- **Exponential drag**: Use `Math.exp(-drag * dtSec)` for smooth, frame-rate independent deceleration
- **Air control**: Reduce acceleration (60%) and drag (20%) while airborne to preserve momentum
- **Max speed enforcement**: Clamp velocity magnitude, not individual components
- **Collision**: Use 8-point hitbox checking with epsilon adjustment at tile boundaries

### Game Feel
- **Sprint multiplier**: 1.5x feels good without being too fast
- **Animation speeds**: 150ms per frame (normal walk), 80ms per frame (sprint)
- **Stamina**: 100 max, regenerate at 10/sec, drain at 20/sec while sprinting
- **Jump timing**: 24px max height, gravity 1200, jump strength 280 for snappy feel
- **Coyote time**: 150ms grace period prevents frustrating missed jumps
- **Jump buffering**: 100ms input memory for responsive landing jumps
- **Landing assistance**: 80ms smooth correction prevents stuck-in-obstacle frustration

### Visual Polish
- **Shadow**: Ellipse (12x6px) at player feet with dynamic scaling during jumps
- **Rounded borders**: 6px border radius on UI elements
- **Easing**: Cubic ease-out for smooth corrections, elastic ease-out for squash
- **Z-indexing**: Ground (0) → Objects (5) → Walls (10) → Player (varies) → HUD (1000)

### Performance
- **Chunk-based rendering**: Use 8-tile chunks with viewport culling
- **Early exit**: Exit search algorithms as soon as valid result found
- **Minimal updates**: Only update visible/active entities
- **Asset loading**: Use PixiJS v8 Assets API for all resources

### Input Handling
- **Press detection**: Use rising edge (wasn't pressed → is pressed) for single actions
- **Hold detection**: Use current state for continuous actions (movement, sprint)
- **Intent translation**: Separate raw input (Keyboard) from game actions (Intent)
- **Normalized diagonal**: Divide diagonal movement by √2 for consistent speed

### Documentation
- Research docs in `docs/research/` explain *why* and reference best practices
- Implementation docs in `docs/implementation/` explain *how* and provide configuration
- Code comments explain *what* for complex algorithms only
- README provides getting started and architecture overview

## TypeScript Configuration
- Strict mode enabled with additional checks (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- Module resolution: bundler mode (Vite)
- Target: ES2020 with DOM APIs

## Common Tuning Parameters

### Player Movement
```typescript
// In src/world/World.ts
maxSpeed: 150,           // Base movement speed (px/sec)
accel: 5000,             // Acceleration (px/sec²)
drag: 12,                // Ground drag coefficient
airControlFactor: 0.6,   // Air acceleration multiplier (0-1)
airDragFactor: 0.2,      // Air drag multiplier (0-1)
```

### Jumping
```typescript
// In src/world/entities/Player.ts
gravity: 1200,           // Gravity (px/sec²)
jumpStrength: 280,       // Initial jump velocity
maxHeight: 24,           // Max jump height (pixels)
hangTimeFactor: 0.2,     // Hang time at peak (0-1)
coyoteTimeMs: 150,       // Grace period (milliseconds)
jumpBufferMs: 100,       // Input memory (milliseconds)
```

### Landing Assistance
```typescript
// In src/world/entities/Player.ts
pushOutEnabled: true,    // Enable landing assistance
snapDistance: 6,         // Auto-snap threshold (pixels)
checkRadius: 16,         // Search radius (pixels)
```

### Stamina
```typescript
// In src/world/entities/PlayerStats.ts
maxStamina: 100,         // Maximum stamina pool
staminaRegenRate: 10,    // Regeneration per second
staminaDrainRate: 20,    // Sprint drain per second
sprintMultiplier: 1.5,   // Sprint speed multiplier
```
