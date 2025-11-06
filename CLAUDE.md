# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wayfare is a 2D game built with PixiJS v8 and TypeScript. It uses Vite as the build tool and development server. The game features a player entity that can move around with keyboard controls in a scene-based architecture.

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
- Base class: `src/entities/Entity.ts` provides a `root` Container for all visual elements
- Entities implement the `Updatable` interface (from `src/types.ts`) requiring an `update(dt)` method
- Each entity has optional `vx`, `vy` properties for physics-based movement
- `Player` entity (`src/entities/Player.ts`) uses acceleration/drag-based movement with configurable max speed

### Input System
- `src/input/Keyboard.ts` is a singleton that tracks key/mouse state globally
- Initializes event listeners automatically and handles Vite HMR cleanup
- Exposes `Keyboard.getKeys()` returning a readonly snapshot of current input state
- `src/input/Intent.ts` translates raw key state into gameplay actions (move, roll, shoot)
- Movement normalizes diagonal input to maintain consistent speed

### Key Patterns
1. **Entity composition**: Entities have a `root` Container; add sprites/graphics to it via `entity.add(child)`
2. **Dependency injection**: Player receives `readKeys` function rather than directly coupling to Keyboard
3. **Delta time handling**: `dt` from PixiJS ticker is in frames at 60fps; convert to seconds with `dt / 60`
4. **Camera follow**: Adjust `world.pivot` to the player position to keep player centered (currently commented out in GameScene)
5. **Frame-rate independence**: Physics uses exponential drag (`Math.exp(-drag * dtSec)`) for smooth, frame-rate independent motion

## TypeScript Configuration
- Strict mode enabled with additional checks (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- Module resolution: bundler mode (Vite)
- Target: ES2020 with DOM APIs
