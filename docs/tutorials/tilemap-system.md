# Building a Tilemap System in Pixi.js v8 with TypeScript

This guide will walk you through the architecture and key decisions for building a high-performance tilemap system. You'll implement a system using simple 2D arrays of tile IDs, support multiple layers, and add efficient rendering with chunking and culling.

**Approach**: This tutorial provides the architecture, type definitions, and hints—but you'll implement the logic yourself. Code snippets are provided only for tricky parts or important API usage.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tile Data Model](#tile-data-model)
3. [Asset Loading with Pixi v8](#asset-loading)
4. [Rendering with @pixi/tilemap](#rendering)
5. [Performance: Chunking & Culling](#performance)
6. [World Integration](#world-integration)
7. [Complete Example](#complete-example)

---

## Architecture Overview

### The Mental Model

A tilemap system has three core responsibilities:

1. **Data storage** - What tiles exist and where
2. **Rendering** - Drawing tiles efficiently to the screen
3. **Gameplay queries** - Answering "is this position blocked?" or "what tile is here?"

To keep these concerns separate, we split the system into three components:

```
┌─────────┐         ┌─────────────┐         ┌──────────────────┐
│  Tile   │───────> │   TileMap   │───────> │ TileMapRenderer  │
│ (data)  │         │  (model)    │         │     (view)       │
└─────────┘         └─────────────┘         └──────────────────┘
                           │
                           └──> Collision Grid
```

### Core Components

**Tile**: A lightweight data record containing only a tile ID (e.g., "grass", "water", "wall"). Not a Pixi DisplayObject.

**TileMap**: The data model that stores:

- Multiple layers (ground, walls, decoration) as 2D arrays
- A separate collision grid for gameplay queries
- Map dimensions and metadata

**TileMapRenderer**: The rendering engine that:

- Converts tile data into Pixi.js visuals using `@pixi/tilemap`
- Implements chunking for large maps
- Culls invisible chunks based on camera position
- Batches tiles for optimal GPU performance

### Why Separate Data from Rendering?

Keeping tiles as plain data (not DisplayObjects) prevents performance issues with large maps. A 100×100 tile map has 10,000 tiles across multiple layers—creating 30,000+ DisplayObjects would crush performance. Instead, we store tiles as data and use `@pixi/tilemap` to batch them into a few draw calls.

---

## Tile Data Model

### Type Definitions

Start by defining your core types:

```typescript
// src/world/map/types.ts

/**
 * A tile identifier - simple string IDs like "grass", "water", "wall"
 */
export type TileId = string;

/**
 * A single tile in the map
 */
export interface Tile {
  id: TileId;
}

/**
 * Mapping from tile IDs to atlas frame coordinates
 */
export interface TilesetMapping {
  [tileId: TileId]: {
    x: number; // X position in tiles (not pixels)
    y: number; // Y position in tiles (not pixels)
  };
}
```

### TileLayer Class

Each layer wraps a 2D array of tiles with metadata.

**File**: `src/world/map/TileLayer.ts`

**Properties you'll need**:

```typescript
public readonly name: string;
public readonly width: number;
public readonly height: number;
public readonly zIndex: number;
private readonly tiles: Tile[][];
```

**Methods to implement**:

```typescript
constructor(name: string, width: number, height: number, zIndex: number = 0)
getTile(tx: number, ty: number): Tile | null
setTile(tx: number, ty: number, tile: Tile): void
fill(tileId: string): void
fillRect(x: number, y: number, width: number, height: number, tileId: string): void
```

**Hints**:

- Initialize the 2D array with `Array(height).fill(null).map(() => Array(width)...)`
- Remember: `tiles[y][x]`, not `tiles[x][y]` (row-major order)
- Bounds checking in `getTile`/`setTile` prevents crashes
- `fill()` and `fillRect()` are convenience methods for testing

### TileMap Class

The TileMap manages multiple layers and collision.

**File**: `src/world/map/TileMap.ts`

**Properties you'll need**:

```typescript
public readonly width: number;        // in tiles
public readonly height: number;       // in tiles
public readonly tileSize: number;     // in pixels
private readonly layers: Map<string, TileLayer>;
private readonly collisionGrid: Uint8Array;
```

**Core methods to implement**:

```typescript
constructor(width: number, height: number, tileSize: number = 16)
addLayer(layer: TileLayer): void
getLayer(name: string): TileLayer | undefined
getAllLayers(): TileLayer[]           // sorted by z-index
isBlocked(tx: number, ty: number): boolean
setCollision(tx: number, ty: number, blocked: boolean): void
worldToTile(worldX: number, worldY: number): { tx: number; ty: number }
tileToWorld(tx: number, ty: number): { x: number; y: number }
getWorldSize(): { width: number; height: number }
```

**Hints**:

- Store collision in a flat `Uint8Array` of size `width * height`
- Convert 2D tile coords to 1D array index: `index = ty * width + tx`
- `worldToTile` uses `Math.floor(worldX / tileSize)`
- `tileToWorld` returns the **center** of the tile: `tx * tileSize + tileSize / 2`
- Out-of-bounds tiles should be considered blocked
- Optional: Add a static `createTestMap()` factory for quick testing

---

## Asset Loading

### Pixi v8 Assets API

Pixi v8 uses the `Assets` API for modern Promise-based loading. You'll create a function that loads an atlas and slices it into individual tile textures.

**File**: `src/world/map/assets.ts`

**Function signature**:

```typescript
export async function loadTileset(
  atlasPath: string,
  mapping: TilesetMapping,
  tileSize: number = 16,
): Promise<Map<string, Texture>>;
```

**Implementation steps**:

1. Load the base texture with `await Assets.load(atlasPath)`
2. For each entry in the `mapping`, create a `new Texture()` with a frame rectangle
3. Convert tile coordinates to pixel coordinates: `x * tileSize`, `y * tileSize`
4. Return a `Map<string, Texture>` keyed by tile ID

**Key Pixi v8 API**:

```typescript
import { Assets, Texture } from "pixi.js";

const baseTexture = await Assets.load("/path/to/atlas.png");

const frame = new Texture({
  source: baseTexture.source,
  frame: { x: 0, y: 0, width: 16, height: 16 },
});
```

**Example tileset mapping**:

```typescript
export const BASIC_TILESET: TilesetMapping = {
  grass: { x: 0, y: 0 },
  dirt: { x: 1, y: 0 },
  water: { x: 2, y: 0 },
  wall: { x: 0, y: 1 },
  empty: { x: 3, y: 1 }, // Transparent tile
};
```

**Best Practices**:

- Keep all tiles in a single atlas for optimal batching
- `Assets.load()` automatically caches (repeated calls are free)
- Use power-of-two atlas dimensions (256×256, 512×512) for best GPU performance

---

## Rendering

### TileMapRenderer with @pixi/tilemap

The `@pixi/tilemap` library provides `CompositeTilemap`, a highly optimized renderer for rectangular tile grids that batches tiles into very few draw calls.

**File**: `src/world/map/TileMapRenderer.ts`

**Properties you'll need**:

```typescript
public readonly root: Container;
private readonly tileMap: TileMap;
private readonly textures: Map<string, Texture>;
private readonly layerRenderers: Map<string, CompositeTilemap>;
```

**Methods to implement**:

```typescript
constructor(tileMap: TileMap, textures: Map<string, Texture>)
private buildLayers(): void
private renderLayer(tilemap: CompositeTilemap, layer: TileLayer): void
public rebuildLayer(layerName: string): void
public rebuildAll(): void
```

**How it works**:

1. Create a root `Container` with `sortableChildren = true` for z-indexing
2. For each layer in the map, create a `CompositeTilemap` instance
3. Set each tilemap's `zIndex` to match its layer's zIndex
4. Loop through all tiles and call `tilemap.tile(texture, x, y)` for non-empty tiles
5. Add each tilemap to the root container

**Key @pixi/tilemap API**:

```typescript
import { CompositeTilemap } from "@pixi/tilemap";

const tilemap = new CompositeTilemap();
tilemap.tile(texture, x * tileSize, y * tileSize); // Add a tile
tilemap.clear(); // Remove all tiles
```

**Hints**:

- Skip tiles with id `'empty'` to avoid rendering transparent tiles
- Use `console.warn()` if a tile ID has no matching texture
- Store `CompositeTilemap` instances in a `Map<string, CompositeTilemap>` keyed by layer name
- Rebuild methods: call `clear()` then re-render affected layers
- This is the **simple** renderer; we'll add chunking/culling next

---

## Performance: Chunking & Culling

### The Problem with Naive Rendering

Rendering every tile in a large map is wasteful:

```
100×100 map = 10,000 tiles
3 layers = 30,000 tiles
Even batched, that's expensive!
```

Solution: **Only render what the camera can see.**

### Chunking System

Break the map into fixed-size chunks (e.g., 16×16 tiles):

```
┌────┬────┬────┬────┐
│ C1 │ C2 │ C3 │ C4 │
├────┼────┼────┼────┤
│ C5 │ C6 │ C7 │ C8 │  Camera sees C6, C7, C10, C11
├────┼────┼────┼────┤  → Only render these 4 chunks
│ C9 │C10 │C11 │C12 │
├────┼────┼────┼────┤
│C13 │C14 │C15 │C16 │
└────┴────┴────┴────┘
```

### Chunked TileMapRenderer (Advanced)

Enhance your renderer to support chunking and culling.

**Additional properties**:

```typescript
const CHUNK_SIZE = 16;  // 16×16 tiles per chunk

interface Chunk {
  chunkX: number;
  chunkY: number;
  tilemap: CompositeTilemap;
  isDirty: boolean;  // Needs re-render?
}

private readonly chunks: Map<string, Map<string, Chunk>>;  // layer -> chunks
private readonly visibleChunks: Set<string>;               // chunk keys
```

**New methods to add**:

```typescript
private buildChunks(): void
private renderChunk(chunk: Chunk, layer: TileLayer): void
public updateCulling(cameraBounds: Rectangle): void
public markTileDirty(layerName: string, tx: number, ty: number): void
```

**Key algorithm: Calculate visible chunks** (this is the tricky part!)

```typescript
public updateCulling(cameraBounds: Rectangle): void {
  const tileSize = this.tileMap.tileSize;

  // Convert camera bounds (world pixels) to chunk coordinates
  const minChunkX = Math.floor(cameraBounds.left / (CHUNK_SIZE * tileSize));
  const maxChunkX = Math.ceil(cameraBounds.right / (CHUNK_SIZE * tileSize));
  const minChunkY = Math.floor(cameraBounds.top / (CHUNK_SIZE * tileSize));
  const maxChunkY = Math.ceil(cameraBounds.bottom / (CHUNK_SIZE * tileSize));

  // Add 1-chunk buffer to prevent pop-in
  const buffer = 1;

  // Build set of visible chunk keys
  // Loop from (minChunkY - buffer) to (maxChunkY + buffer)
  // Collect chunk keys like "3,5" into newVisibleChunks

  // Compare newVisibleChunks with this.visibleChunks:
  // - Chunks that became visible: render if dirty, set visible = true
  // - Chunks that became invisible: set visible = false
  // Update this.visibleChunks = newVisibleChunks
}
```

**Implementation hints**:

- Store chunks as `Map<layerName, Map<chunkKey, Chunk>>`
- Use chunk key format: `"${chunkX},${chunkY}"`
- Calculate total chunks: `Math.ceil(layer.width / CHUNK_SIZE)`
- When rendering a chunk, only loop over its tile range (startX to endX)
- Use `chunk.isDirty` flag to avoid redundant rebuilds
- Use `tilemap.visible` property to show/hide chunks (don't destroy them!)
- `markTileDirty()` lets gameplay code trigger re-renders when tiles change

**Performance tips**:

1. **Chunk size**: 16×16 tiles is optimal. Smaller = more overhead, larger = more wasted rendering
2. **Buffer zone**: Render 1 chunk beyond camera to prevent pop-in
3. **Lazy rendering**: Only rebuild chunks when visible or dirty
4. **Static maps**: If tiles never change, render once and hide/show as needed

---

## World Integration

### Adding TileMap to World

Update your `World` class (`src/world/World.ts`) to own the tilemap.

**New fields to add**:

```typescript
private tilemap?: TileMapRenderer;
private tileMapData?: TileMap;
```

**In `async start()`**:

1. Load tileset using `loadTileset('/gfx/Overworld.png', BASIC_TILESET, 16)`
2. Create a `TileMap` (use a factory method or build manually)
3. Create a `TileMapRenderer(tileMapData, textures)`
4. Add tilemap root to the world container: `this.container.addChild(this.tilemap.root)`

**New methods to expose**:

```typescript
isBlocked(worldX: number, worldY: number): boolean {
  // Convert world coords to tile coords, check collision grid
}

getWorldSize(): { width: number; height: number } {
  // Return tileMapData.getWorldSize() or {0, 0} if no map
}
```

### Updating Culling from GameScene

In `GameScene` (`src/scenes/GameScene.ts`), call `updateCulling()` each frame.

**In `update()`**:

```typescript
// Get visible bounds from viewport
const bounds = this.viewport.getVisibleBounds();

// Pass to tilemap renderer (you'll need to expose it from World)
this.world.getTileMapRenderer()?.updateCulling(bounds);
```

**In `async start()`** (after world loads):

```typescript
// Enable viewport clamping to world bounds
const worldSize = this.world.getWorldSize();
this.viewport.clamp({
  left: 0,
  top: 0,
  right: worldSize.width,
  bottom: worldSize.height,
});
```

### Using Collision in Player Movement

Update your `Player` entity to check collision before moving.

**Concept**:

1. Calculate next position: `nextX = this.root.x + this.vx * dtSec`
2. Check: `if (!world.isBlocked(nextX, nextY))`
3. Move only if not blocked, otherwise stop velocity

**Note**: You'll need to pass a reference to `World` (or just the `isBlocked` function) to your Player entity.

---

## Implementation Checklist

### File Structure

Create these files in `src/world/map/`:

```
src/world/map/
├── types.ts           # TileId, Tile, TilesetMapping interfaces
├── TileLayer.ts       # Layer wrapper for 2D tile array
├── TileMap.ts         # Multi-layer map + collision grid
├── TileMapRenderer.ts # Rendering with @pixi/tilemap (and optional chunking)
├── assets.ts          # loadTileset() function + BASIC_TILESET constant
└── index.ts           # Public exports
```

### Implementation Order

**1. Start with data (no rendering yet)**

- Define types in `types.ts`
- Implement `TileLayer` with getTile/setTile/fill methods
- Implement `TileMap` with layer management and collision grid
- Add coordinate conversion methods (worldToTile, tileToWorld)

**2. Add asset loading**

- Implement `loadTileset()` using Pixi v8 Assets API
- Create texture frames by slicing the atlas
- Test loading in your scene's `start()` method

**3. Build basic renderer (no chunking yet)**

- Implement `TileMapRenderer` with simple layer rendering
- Create one `CompositeTilemap` per layer
- Loop through all tiles and call `tilemap.tile()`
- Test with a small map (e.g., 20×20 tiles)

**4. Integrate with World**

- Add tilemap fields to `World` class
- Load and initialize in `World.start()`
- Expose `isBlocked()` and `getWorldSize()` methods
- Add viewport clamping in `GameScene`

**5. Add chunking (optional, for large maps)**

- Refactor renderer to use chunks instead of whole layers
- Implement `buildChunks()` and `renderChunk()`
- Add `updateCulling()` with visibility management
- Call culling from `GameScene.update()`

**6. Test with collision**

- Update Player to check `world.isBlocked()` before moving
- Create a test map with walls
- Verify collision works correctly

### Quick Start Example

For a minimal working tilemap:

1. Create a 50×50 test map with a grass ground layer
2. Add border walls on all edges
3. Set collision on wall tiles
4. Render with the simple (non-chunked) renderer
5. Add to your viewport and verify it displays
6. Test player collision with walls

Once that works, you can add:

- Multiple decorative layers (objects, decals)
- Chunking/culling for better performance
- Dynamic tile updates (doors opening, terrain destruction)
- Procedural map generation

---

## Summary

This guide covered the architecture and key decisions for building a performant tilemap system:

**Core Concepts**

- Separation of data (Tile/TileMap) from rendering (TileMapRenderer)
- Layer-based architecture with z-indexing
- Separate collision grid for gameplay queries
- Simple string-based tile IDs, no complex formats

**Key Techniques**

- Pixi v8 Assets API for loading and slicing texture atlases
- `@pixi/tilemap` CompositeTilemap for efficient batching
- Optional chunking (16×16 tiles) for large maps
- Viewport-based culling to only render visible regions

**Integration Points**

- World class owns the tilemap and exposes collision/size queries
- GameScene passes viewport bounds for culling
- Player entities check collision before moving

### Next Steps

Enhance your tilemap system with:

- Tile variants (random grass variations)
- Animated tiles (water, fire)
- Procedural map generation
- Multiple decorative layers
- Dynamic updates (destructible terrain, doors)
- Save/load system for map data

### Performance Guidelines

- Single atlas texture for all tiles (maximizes batching)
- 16×16 tile chunks (good balance)
- 1-chunk buffer zone (prevents pop-in)
- Integer zoom for pixel art (2×, 3×, 4×)
- Rebuild only when tiles change
- Use `tilemap.visible` instead of destroying chunks

---

## References

- [Pixi.js v8 Documentation](https://pixijs.com/8.x/guides)
- [Pixi.js Assets Guide](https://pixijs.com/8.x/guides/components/assets)
- [@pixi/tilemap GitHub](https://github.com/pixijs/tilemap)
- [Pixi.js Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips)
- [pixi-viewport Documentation](https://viewport.pixijs.io/)
