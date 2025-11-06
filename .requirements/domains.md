# Codebase Domain Map

*Generated: 2025-11-05*
*Codebase: Wayfare*
*Total Domains: 9*

## Overview

This document provides a comprehensive map of all functional and technical domains in the Wayfare game codebase. Every feature, module, and code path has been categorized into logical domains for analysis and requirements extraction.

Wayfare is a 2D game built with PixiJS v8 and TypeScript, featuring a scene-based architecture with entity-component patterns, keyboard/mouse input handling, and physics-based movement. The project uses Vite as the build tool and development server.

## Domain Summary

| Domain | Category | Complexity | Files | Entry Points |
|--------|----------|------------|-------|--------------|
| Core Game Engine | Core Business | Low | 2 | 1 (main.ts) |
| Scene Management | Core Business | Low | 2 | GameScene |
| Entity System | Core Business | Medium | 2 | Player entity |
| Input & Controls | Technical | Medium | 2 | Keyboard singleton |
| Physics & Movement | Technical | Medium | 1 | Player physics |
| Asset Management | Technical | Low | 2 | PixiJS Assets API |
| Type Definitions | Supporting | Low | 2 | Global types |
| Build & Development Tools | Supporting | Low | 5 | Vite, TypeScript, ESLint |
| UI & Styling | Supporting | Low | 2 | HTML, CSS |

---

## 1. Core Business Domains

### 1.1 Core Game Engine

**Description**: The central game loop and application initialization. Manages the PixiJS Application lifecycle, canvas rendering, and coordinates the main update loop that drives all game logic.

**Scope**:
- PixiJS Application creation and initialization
- Canvas setup and DOM mounting
- Main game loop with delta time calculation
- Scene mounting and lifecycle coordination
- Frame timing and ticker management

**Code Paths**:
- `/Users/jackson/Code/games/wayfare/src/main.ts` (application entry point and main loop)
- `/Users/jackson/Code/games/wayfare/index.html` (HTML structure and canvas container)

**Entry Points**:
- Application: `/src/main.ts` - IIFE that initializes game
- DOM: `#pixi-container` - Canvas mount point
- Main Loop: `app.ticker.add()` - 60fps update callback

**Dependencies**:
- Scene Management (creates and updates GameScene)
- PixiJS library (Application, ticker)

**Complexity**: Low
- Files: 2
- Primary logic: Application initialization, main loop
- External dependencies: PixiJS v8
- Key pattern: Async initialization with ticker-based update loop

---

### 1.2 Scene Management

**Description**: Provides a scene-based architecture for organizing game states and levels. The base Scene class establishes lifecycle hooks (start, update, destroy) and container management, while GameScene implements the main gameplay environment with world container and player management.

**Scope**:
- Scene lifecycle (start, update, destroy)
- Container management and hierarchy
- World container for game objects
- Scene transitions (structure present, not yet implemented)
- Player instantiation and coordination

**Code Paths**:
- `/Users/jackson/Code/games/wayfare/src/scenes/Scene.ts` (base class with lifecycle)
- `/Users/jackson/Code/games/wayfare/src/scenes/GameScene.ts` (main game scene implementation)

**Entry Points**:
- Scene creation: `new GameScene(app)`
- Scene initialization: `scene.start()`
- Scene update: `scene.update(deltaFrames, deltaMs)`
- Scene mounting: `app.stage.addChild(scene.container)`

**Dependencies**:
- Core Game Engine (receives Application reference, called by main loop)
- Entity System (instantiates and updates Player)
- Asset Management (loads textures in GameScene)
- PixiJS Container system

**Complexity**: Low
- Files: 2
- Classes: Scene (abstract base), GameScene (concrete implementation)
- Primary responsibility: Game state organization and coordination
- Architecture pattern: Scene graph with lifecycle hooks

---

### 1.3 Entity System

**Description**: Implements the entity-component pattern for game objects. Provides a base Entity class with position management, container hierarchy, velocity properties, and update lifecycle. The Player entity extends this with physics-based movement and input integration.

**Scope**:
- Entity base class with root container
- Position management (getter/setter)
- Velocity properties (vx, vy)
- Z-index and sorting support
- Entity lifecycle (update, destroy)
- Player-specific movement physics
- Sprite management and rendering
- Input integration via dependency injection

**Code Paths**:
- `/Users/jackson/Code/games/wayfare/src/world/entities/Entity.ts` (abstract base class)
- `/Users/jackson/Code/games/wayfare/src/world/entities/Player.ts` (player implementation with physics)

**Entry Points**:
- Entity creation: `new Player(sprite, options)`
- Position setting: `player.setPosition(x, y)`
- Update loop: `player.update(deltaMs)`
- Add to scene: `world.addChild(player.root)`

**Dependencies**:
- Input & Controls (Player reads keyboard state via readKeys callback)
- Physics & Movement (Player implements physics calculations)
- PixiJS Container and Sprite systems
- Type Definitions (implements Updatable interface)

**Complexity**: Medium
- Files: 2
- Classes: Entity (abstract base), Player (concrete)
- Primary features:
  - Component-based architecture (root Container)
  - Physics integration (acceleration, drag, max speed)
  - Input-driven movement
  - Frame-rate independent motion
- Design patterns:
  - Composition over inheritance (root Container)
  - Dependency injection (readKeys callback)

---

## 2. Technical Domains

### 2.1 Input & Controls

**Description**: Manages all user input (keyboard and mouse) through a centralized singleton pattern. Tracks key/button state globally, handles browser events, and provides intent translation from raw input to gameplay actions. Includes Vite HMR cleanup for development.

**Scope**:
- Keyboard event listening (keydown, keyup)
- Mouse event listening (mousedown, mouseup)
- Key state management (pressed/released)
- Window blur handling (prevents stuck keys)
- Input intent translation (movement, actions)
- Diagonal movement normalization
- Vite HMR cleanup and reinitialization
- Readonly key state access

**Code Paths**:
- `/Users/jackson/Code/games/wayfare/src/input/Keyboard.ts` (singleton for raw input tracking)
- `/Users/jackson/Code/games/wayfare/src/input/Intent.ts` (intent translation and normalization)

**Entry Points**:
- Singleton access: `Keyboard.getKeys()` - Returns current key state
- Intent parsing: `getActionIntent(keys)` - Translates keys to actions
- Auto-initialization: Keyboard initializes on module load

**Supported Inputs**:
- Movement: WASD + Arrow keys
- Actions: Shift, Space (roll), Mouse Left, J (shoot)

**Dependencies**:
- Browser DOM events (window.addEventListener)
- Vite HMR API (for hot reload cleanup)

**Complexity**: Medium
- Files: 2
- Key features:
  - Singleton pattern with lazy initialization
  - Multi-key support (WASD + arrows)
  - Diagonal normalization (maintains consistent speed)
  - HMR-safe event listener management
  - Readonly state exposure (prevents external mutation)
- Event handlers: 5 (keydown, keyup, mousedown, mouseup, blur)

---

### 2.2 Physics & Movement

**Description**: Implements physics calculations for entity movement within the Player class. Uses acceleration-based movement with exponential drag for smooth, frame-rate independent motion. Includes velocity clamping and pixel-perfect positioning.

**Scope**:
- Acceleration-based movement (input → acceleration → velocity)
- Exponential drag application (frame-rate independent)
- Max speed clamping
- Velocity vector calculations
- Delta time conversion (frames to seconds)
- Pixel-perfect position snapping

**Code Paths**:
- `/Users/jackson/Code/games/wayfare/src/world/entities/Player.ts` (update method, lines 40-74)
  - Input processing (lines 41-46)
  - Acceleration application (lines 48-52)
  - Drag calculation (lines 54-57)
  - Speed clamping (lines 59-65)
  - Position update (lines 66-73)

**Entry Points**:
- Physics update: `player.update(dt)` - Called every frame
- Configuration: `PlayerOptions` - Tunable physics parameters

**Physics Parameters**:
- `maxSpeed`: Maximum velocity (px/sec) - default 150
- `accel`: Acceleration rate (px/sec²) - default 2000
- `drag`: Drag coefficient (per second) - default 8

**Dependencies**:
- Entity System (extends Entity, uses vx/vy properties)
- Input & Controls (reads intent for acceleration direction)
- Core Game Engine (receives delta time from ticker)

**Complexity**: Medium
- Lines of code: ~35 in update method
- Key algorithms:
  - Frame-rate independence: `Math.exp(-drag * dtSec)`
  - Vector normalization for diagonal movement
  - Speed clamping via hypot and scalar multiplication
- Physics approach: Acceleration-based with exponential drag
- Design pattern: Component-style physics within entity

---

### 2.3 Asset Management

**Description**: Handles loading and configuration of game assets (textures, sprites) using the PixiJS Assets API. Currently manages the player sprite texture with nearest-neighbor scaling for pixel-art rendering.

**Scope**:
- Texture loading via PixiJS Assets API
- Texture configuration (scale mode)
- Sprite creation from textures
- Asset path management
- Public asset folder structure

**Code Paths**:
- `/Users/jackson/Code/games/wayfare/src/scenes/GameScene.ts` (lines 19-21, asset loading)
- `/Users/jackson/Code/games/wayfare/public/assets/bunny.png` (player sprite texture)
- `/Users/jackson/Code/games/wayfare/public/assets/logo.svg` (unused logo asset)

**Entry Points**:
- Texture loading: `await Assets.load("/assets/bunny.png")`
- Scale mode config: `texture.source.scaleMode = "nearest"`
- Sprite creation: `new Sprite(texture)`

**Asset Structure**:
- `/public/assets/` - Asset directory
  - `bunny.png` - Player sprite (active)
  - `logo.svg` - Logo asset (unused)
- `/public/favicon.png` - Browser favicon

**Dependencies**:
- PixiJS Assets API and Sprite system
- Scene Management (assets loaded in GameScene.start())
- Vite public directory handling

**Complexity**: Low
- Files: 2 (3 including favicon)
- Assets: 1 active texture
- Loading: Async/await pattern
- Configuration: Scale mode for pixel-art
- Future expansion: Asset manifest, loading screens, sprite sheets

---

## 3. Supporting Domains

### 3.1 Type Definitions

**Description**: Defines shared TypeScript interfaces and types used across the codebase. Establishes contracts for updatable objects, dimension representations, and provides Vite environment type references.

**Scope**:
- Updatable interface for game loop objects
- Dimension type for width/height pairs
- Vite environment type declarations
- Type safety for delta time handling

**Code Paths**:
- `/Users/jackson/Code/games/wayfare/src/types.ts` (global type definitions)
- `/Users/jackson/Code/games/wayfare/src/vite-env.d.ts` (Vite client types)

**Type Definitions**:
- `Updatable`: Interface requiring `update(dt: number)` method
- `Dimensions`: Interface with `width` and `height` properties
- Vite types: Reference to `vite/client` for HMR and env support

**Dependencies**:
- None (provides types to other domains)

**Used By**:
- Entity System (Entity implements Updatable)
- Scene Management (Scene has optional update method)
- Input & Controls (Vite HMR types)
- Core Game Engine (delta time conventions)

**Complexity**: Low
- Files: 2
- Types: 2 interfaces + Vite references
- Purpose: Type safety and contracts
- Maintenance: Central location for shared types

---

### 3.2 Build & Development Tools

**Description**: Configuration and tooling for the development workflow, including Vite build system, TypeScript compiler, ESLint linting, and package management. Provides development server, production builds, and code quality enforcement.

**Scope**:
- Build system configuration (Vite)
- TypeScript compiler settings
- Linting rules and formatting (ESLint + Prettier)
- Package dependencies and scripts
- Development server setup (port 8080, auto-open)
- Production build pipeline
- Git ignore rules

**Code Paths**:
- `/Users/jackson/Code/games/wayfare/vite.config.ts` (Vite configuration)
- `/Users/jackson/Code/games/wayfare/tsconfig.json` (TypeScript configuration)
- `/Users/jackson/Code/games/wayfare/eslint.config.mjs` (ESLint configuration)
- `/Users/jackson/Code/games/wayfare/package.json` (dependencies and scripts)
- `/Users/jackson/Code/games/wayfare/.gitignore` (version control exclusions)

**Entry Points**:
- Dev server: `npm run dev` or `npm start` → Opens localhost:8080
- Production build: `npm run build` → Lints, compiles, builds to `/dist`
- Linting: `npm run lint` → Runs ESLint

**Configuration Highlights**:

*TypeScript*:
- Target: ES2020
- Strict mode enabled
- Additional checks: noUnusedLocals, noUnusedParameters
- Module resolution: bundler mode
- No emit (handled by Vite)

*Vite*:
- Dev server: port 8080, auto-open browser
- Build: TypeScript + bundling
- Public directory: `/public`

*ESLint*:
- Extends: ESLint recommended, TypeScript recommended, Prettier
- File types: `.ts`, `.tsx`
- Ignores: `/dist`

**Dependencies**:
- **Runtime**: pixi.js (^8.8.1), pixi-viewport (^6.0.3)
- **Dev Tools**: vite (^6.2.0), typescript (~5.7.3), eslint (^9.21.0)
- **Linting**: typescript-eslint, prettier, eslint plugins

**Complexity**: Low
- Files: 5
- Build stages: Lint → TypeScript check → Vite build
- Scripts: 4 (start, dev, build, lint)
- Maintenance: Standard configuration, minimal custom setup

---

### 3.3 UI & Styling

**Description**: Provides the HTML structure and CSS styling for the game container and canvas. Establishes a full-screen black background with centered canvas layout.

**Scope**:
- HTML document structure
- Canvas container element
- Page styling (dark theme)
- Layout (flexbox centering)
- Viewport configuration
- Favicon and metadata

**Code Paths**:
- `/Users/jackson/Code/games/wayfare/index.html` (HTML document)
- `/Users/jackson/Code/games/wayfare/public/style.css` (global styles)
- `/Users/jackson/Code/games/wayfare/public/favicon.png` (browser icon)

**UI Structure**:
```html
<body>
  <div id="app">
    <div id="pixi-container"></div>  <!-- Canvas mount point -->
  </div>
</body>
```

**Styling Features**:
- Full viewport height (100vh)
- Black background (#000000)
- White text (rgba(255, 255, 255, 0.87))
- Centered flexbox layout
- No margin/padding
- Overflow hidden

**Entry Points**:
- Canvas mount: `document.getElementById("pixi-container")`
- Stylesheet: `/style.css` (Vite public directory)
- Title: "Wayfare"

**Dependencies**:
- Core Game Engine (mounts canvas to #pixi-container)
- Vite (serves HTML and processes assets)

**Complexity**: Low
- Files: 3
- Styling: Minimal, functional dark theme
- Layout: Simple flexbox centering
- Purpose: Canvas container and basic page structure

---

## Appendix A: Domain Dependency Graph

```
Core Game Engine (main.ts)
  ├─→ Scene Management (creates GameScene, calls update)
  └─→ PixiJS Application

Scene Management
  ├─→ Entity System (creates Player)
  ├─→ Asset Management (loads textures)
  └─→ Core Game Engine (lifecycle managed by main)

Entity System
  ├─→ Input & Controls (reads keyboard state)
  ├─→ Physics & Movement (implements physics)
  ├─→ Type Definitions (implements Updatable)
  └─→ PixiJS Container/Sprite

Input & Controls
  ├─→ Browser DOM events
  └─→ Vite HMR (for cleanup)

Physics & Movement
  ├─→ Entity System (extends Entity)
  └─→ Input & Controls (reads intent)

Asset Management
  ├─→ PixiJS Assets API
  └─→ Scene Management (called during scene.start)

Type Definitions
  └─→ (no dependencies, provides types to all domains)

Build & Development Tools
  └─→ (orchestrates all domains, no runtime dependencies)

UI & Styling
  └─→ Core Game Engine (provides canvas mount point)
```

---

## Appendix B: File-to-Domain Mapping

### Source Code (src/)
| File | Primary Domain | Secondary Domains |
|------|----------------|-------------------|
| `src/main.ts` | Core Game Engine | Scene Management |
| `src/types.ts` | Type Definitions | - |
| `src/vite-env.d.ts` | Type Definitions | Build & Development Tools |
| `src/scenes/Scene.ts` | Scene Management | Type Definitions |
| `src/scenes/GameScene.ts` | Scene Management | Entity System, Asset Management |
| `src/world/entities/Entity.ts` | Entity System | Type Definitions |
| `src/world/entities/Player.ts` | Entity System | Input & Controls, Physics & Movement |
| `src/input/Keyboard.ts` | Input & Controls | Build & Development Tools (HMR) |
| `src/input/Intent.ts` | Input & Controls | - |

### Public Assets (public/)
| File | Primary Domain |
|------|----------------|
| `public/assets/bunny.png` | Asset Management |
| `public/assets/logo.svg` | Asset Management |
| `public/favicon.png` | UI & Styling |
| `public/style.css` | UI & Styling |

### Configuration & Build
| File | Primary Domain |
|------|----------------|
| `package.json` | Build & Development Tools |
| `tsconfig.json` | Build & Development Tools |
| `vite.config.ts` | Build & Development Tools |
| `eslint.config.mjs` | Build & Development Tools |
| `.gitignore` | Build & Development Tools |
| `bun.lockb` | Build & Development Tools |

### Documentation & Project Files
| File | Primary Domain |
|------|----------------|
| `index.html` | UI & Styling, Core Game Engine |
| `CLAUDE.md` | Documentation (all domains) |

### Claude Code Configuration
| File | Purpose |
|------|---------|
| `.claude/agents/codebase-domain-mapper.md` | Agent definition (not part of game) |
| `.claude/commands/map-domains.md` | Command definition (not part of game) |
| `.claude/settings.local.json` | Local settings (not part of game) |

---

## Appendix C: Coverage Statistics

**Project Statistics**:
- Total files in project: 24 (excluding node_modules)
- Files mapped to domains: 24
- Coverage: 100%

**Source Code Breakdown**:
- TypeScript files: 9
- Configuration files: 6
- HTML/CSS files: 2
- Assets: 3
- Documentation: 1
- Claude Code config: 3

**Domain Distribution**:
- Core Business Domains: 3 (Engine, Scenes, Entities)
- Technical Domains: 3 (Input, Physics, Assets)
- Supporting Domains: 3 (Types, Build Tools, UI)

**Code Organization**:
- Entry points: 1 (`src/main.ts`)
- Scene types: 1 (GameScene) + 1 abstract base
- Entity types: 1 (Player) + 1 abstract base
- Input systems: 2 (Keyboard, Intent)
- Configuration files: 6 (Vite, TS, ESLint, package.json, .gitignore, lockfile)

**Complexity Assessment**:
- Low complexity domains: 6 (Engine, Scenes, Assets, Types, Build Tools, UI)
- Medium complexity domains: 3 (Entities, Input, Physics)
- High complexity domains: 0

**Future Expansion Areas** (not yet present):
- Combat system
- Enemy entities
- Level/tile system
- Camera follow implementation
- UI/HUD elements
- Sound system
- Save/load system
- Additional scenes (menus, game over, etc.)

---

## Appendix D: Architecture Patterns

**Design Patterns Identified**:

1. **Scene Graph Pattern**
   - Domains: Scene Management, Core Game Engine
   - Implementation: PixiJS Container hierarchy
   - Purpose: Organize game objects and state

2. **Entity-Component Pattern**
   - Domains: Entity System
   - Implementation: Base Entity with root Container, composition over inheritance
   - Purpose: Flexible game object architecture

3. **Singleton Pattern**
   - Domains: Input & Controls
   - Implementation: Keyboard module with single instance
   - Purpose: Centralized input state management

4. **Dependency Injection**
   - Domains: Entity System, Input & Controls
   - Implementation: Player receives `readKeys` callback
   - Purpose: Decouple input handling from entity logic

5. **Game Loop Pattern**
   - Domains: Core Game Engine
   - Implementation: PixiJS ticker with delta time
   - Purpose: Frame-rate independent updates

6. **Frame-Rate Independence**
   - Domains: Physics & Movement
   - Implementation: Delta time scaling, exponential drag
   - Purpose: Consistent behavior across different frame rates

**Architectural Principles**:
- Clear separation of concerns (input, physics, rendering)
- Async initialization with sync update loops
- Type-safe interfaces and contracts
- Module-based organization
- Hot Module Replacement support

---

## Appendix E: Technology Stack

**Core Technologies**:
- **Game Engine**: PixiJS v8.8.1 (WebGL 2D rendering)
- **Viewport**: pixi-viewport v6.0.3 (camera/viewport utilities, not yet used)
- **Language**: TypeScript 5.7.3
- **Build Tool**: Vite 6.2.0
- **Package Manager**: Bun (lockfile present) / npm compatible

**Development Tools**:
- **Linter**: ESLint 9.21.0 with TypeScript support
- **Formatter**: Prettier 3.5.3
- **Type Checker**: TypeScript compiler

**Browser APIs**:
- Canvas API (via PixiJS)
- DOM Events (keyboard, mouse, window)
- requestAnimationFrame (via PixiJS ticker)

**Module System**:
- ES Modules (ESM)
- Vite bundler mode
- Dynamic imports supported

---

## Notes

**Project Stage**: Early development
- Core systems in place (engine, scenes, entities, input, physics)
- Single scene and entity type implemented
- Asset loading demonstrated but minimal assets
- Camera follow logic mentioned but not implemented
- Ready for expansion with new entities, scenes, and features

**Code Quality**:
- TypeScript strict mode enabled
- ESLint with recommended rules
- Prettier formatting
- Comprehensive type definitions
- Clean architectural patterns

**Development Experience**:
- Hot Module Replacement (HMR) supported
- Auto-opening dev server (localhost:8080)
- Fast rebuild with Vite
- Clear documentation in CLAUDE.md

**Next Steps for Requirements Extraction**:
1. Core Game Engine: Understand initialization and lifecycle requirements
2. Entity System: Extract patterns for new entity types
3. Physics & Movement: Document tuning parameters and constraints
4. Input & Controls: Plan for new input actions and mappings
5. Scene Management: Design additional scenes (menus, levels)
6. Asset Management: Plan asset pipeline and loading strategies
