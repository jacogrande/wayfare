# Tile Variants & Textured Randomness

## Problem Statement

When rendering a large map with a single grass texture repeated, it looks monotonous and artificial. **Textured randomness** creates natural-looking variation by using multiple texture variants for the same tile type.

## Solution: Tile Variant System

The variant system allows tiles to have multiple textures while maintaining the same gameplay properties (collision, height, behavior).

## Architecture

### 1. Tile Interface (Data)

```typescript
interface Tile {
  id: TileId;
  variant?: number; // Optional: explicit variant index
  height?: number;
}
```

### 2. TileVariants (Selection Strategy)

Manages how variants are selected for each tile position:

```typescript
class TileVariants {
  // Configuration: how many variants and which strategy
  static configs = new Map<TileId, TileVariantConfig>([
    ["grass", { count: 4, strategy: "noise", noiseScale: 2.5 }],
    ["rock", { count: 3, strategy: "random" }],
    ["tree", { count: 2, strategy: "random" }],
  ]);

  // Select variant based on position and strategy
  static selectVariant(tileId: TileId, tileX: number, tileY: number): number;
}
```

### 3. TileMapRenderer (Rendering)

Uses variants when drawing tiles:

```typescript
const variantIndex = tile.variant ?? TileVariants.selectVariant(tile.id, x, y);
const texture = textures[variantIndex];
chunk.tilemap.tile(texture, x * tileSize, y * tileSize);
```

### 4. Tileset Loading (Texture Management)

Now supports loading multiple textures per tile:

```typescript
const OVERWORLD_TILESET: TilesetMapping = new Map([
  // Grass has 4 variants
  ["grass", [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ]],
]);
```

## Variant Selection Strategies

### 1. Random Strategy

**Use case**: Decorative objects with distinct appearances (rocks, flowers)

```typescript
["rock", { count: 3, strategy: "random" }]
```

**How it works**:
- Uses deterministic hash of tile position
- Same position always returns same variant (stable across sessions)
- Completely random distribution

**Result**: Evenly distributed variants, no visible patterns

```
Rock map (variants 0, 1, 2):
2 0 1 2 0
1 2 0 1 2
0 1 2 0 1
```

### 2. Noise Strategy (Recommended)

**Use case**: Natural-looking terrain (grass, dirt, sand)

```typescript
["grass", { count: 4, strategy: "noise", noiseScale: 2.5 }]
```

**How it works**:
- Uses 2D Perlin-like noise function
- Creates smooth patches of variants
- `noiseScale` controls patch size (higher = larger patches)

**Result**: Natural-looking variation with smooth transitions

```
Grass map (variants 0-3):
0 0 1 1 2
0 1 1 2 2
1 1 2 2 3
```

**Tuning noiseScale**:
- `1.0`: Very small patches (1-2 tiles)
- `2.5`: Medium patches (3-5 tiles) - **recommended**
- `5.0`: Large patches (8-12 tiles)
- `10.0`: Very large patches (entire regions)

### 3. Checkerboard Strategy

**Use case**: Deliberate patterns (floors, tiles)

```typescript
["floor", { count: 2, strategy: "checkerboard" }]
```

**How it works**:
- Alternates variants based on `(x + y) % count`
- Creates predictable checkerboard pattern

**Result**: Regular alternating pattern

```
Checkerboard (variants 0, 1):
0 1 0 1 0
1 0 1 0 1
0 1 0 1 0
```

### 4. Static Strategy

**Use case**: Animated tiles, special tiles with single texture

```typescript
["water", { count: 4, strategy: "static" }]
```

**How it works**:
- Always returns variant 0 (unless manually specified)
- Variant selection controlled by animation or manual override

**Result**: Same texture everywhere (control via tile.variant)

## Implementation Details

### Deterministic "Randomness"

The random strategy uses a hash function to ensure **stability**:

```typescript
// Hash position to get deterministic random value
private static hash2D(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h & 0x7fffffff) / 0x7fffffff) * 2 - 1;
}
```

**Benefits**:
- Same position always returns same variant
- No need to store variant in tile data
- Works across save/load
- Deterministic for debugging/testing

### Noise-Based Selection

Uses simplified Perlin noise with bilinear interpolation:

```typescript
private static noiseVariant(x: number, y: number, count: number, scale: number): number {
  // Scale position by noise scale
  const sx = x / scale;
  const sy = y / scale;

  // Get fractional parts
  const fx = sx - Math.floor(sx);
  const fy = sy - Math.floor(sy);

  // Sample noise at grid corners
  const n00 = hash2D(floor(sx), floor(sy));
  const n10 = hash2D(floor(sx) + 1, floor(sy));
  const n01 = hash2D(floor(sx), floor(sy) + 1);
  const n11 = hash2D(floor(sx) + 1, floor(sy) + 1);

  // Bilinear interpolation with smoothstep
  const ix = smoothstep(fx);
  const iy = smoothstep(fy);
  const nx0 = lerp(n00, n10, ix);
  const nx1 = lerp(n01, n11, ix);
  const n = lerp(nx0, nx1, iy);

  // Map to variant range
  return floor((n + 1) / 2 * count) % count;
}
```

### Explicit Variant Override

You can manually set a variant for special cases:

```typescript
// Place specific grass variant
layer.setTile(x, y, { id: "grass", variant: 2 });

// Renderer respects explicit variant
const variantIndex = tile.variant ?? TileVariants.selectVariant(tile.id, x, y);
```

**Use cases**:
- Hand-placed decorative tiles
- Custom patterns (paths, borders)
- Animated tiles (water, lava)

## Usage Examples

### Example 1: Natural Grass

```typescript
// In TileVariants.ts
TileVariants.registerVariant("grass", {
  count: 4,
  strategy: "noise",
  noiseScale: 2.5, // Medium patches
});

// In Tilesets.ts
["grass", [
  { x: 0, y: 0 }, // Variant 0
  { x: 1, y: 0 }, // Variant 1
  { x: 2, y: 0 }, // Variant 2
  { x: 3, y: 0 }, // Variant 3
]]
```

**Result**: Natural-looking grass with smooth patches of variation

### Example 2: Random Rocks

```typescript
// In TileVariants.ts
TileVariants.registerVariant("rock", {
  count: 3,
  strategy: "random",
});

// In Tilesets.ts
["rock", [
  { x: 6, y: 5 }, // Small rock
  { x: 7, y: 5 }, // Medium rock
  { x: 8, y: 5 }, // Large rock
]]
```

**Result**: Rocks randomly distributed, each position gets consistent rock size

### Example 3: Animated Water

```typescript
// Water uses static strategy (animation controls variant)
TileVariants.registerVariant("water", {
  count: 4,
  strategy: "static", // No auto-selection
});

// In WaterBehavior.onUpdate()
private animationFrame = 0;

onUpdate(dtSec: number) {
  this.animationFrame = (this.animationFrame + dtSec * 4) % 4;
  // Update tile variant manually
  const variant = Math.floor(this.animationFrame);
  tile.variant = variant;
  // Trigger re-render
}
```

**Result**: Animated water cycling through 4 frames

## Configuration

### Adding New Variant Configurations

```typescript
// 1. Register variant config
TileVariants.registerVariant("sand", {
  count: 3,
  strategy: "noise",
  noiseScale: 3.0, // Slightly larger patches than grass
});

// 2. Add textures to tileset
const OVERWORLD_TILESET: TilesetMapping = new Map([
  ["sand", [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ]],
]);

// 3. Add tile type
export type TileId = "grass" | "sand" | ...;

// 4. Add to TileConfig
TileConfig.configs.set("sand", {
  name: "Sand",
  blocksMovement: false,
  height: 0,
});
```

### Tuning Noise Scale

```typescript
// Test different scales to find best look
const scales = [1.0, 2.0, 3.0, 5.0, 10.0];

for (const scale of scales) {
  TileVariants.registerVariant("grass", {
    count: 4,
    strategy: "noise",
    noiseScale: scale,
  });
  // Observe which looks most natural
}
```

**Guidelines**:
- **1.0-2.0**: High frequency, small patches (busy/noisy)
- **2.5-4.0**: Medium frequency, natural patches (recommended)
- **5.0-10.0**: Low frequency, large patches (smooth/bland)

## Performance Considerations

### 1. Caching

Variant selection is deterministic, so results can be cached:

```typescript
private variantCache = new Map<string, number>();

selectVariantCached(tileId: TileId, x: number, y: number): number {
  const key = `${tileId}_${x}_${y}`;
  if (!this.variantCache.has(key)) {
    this.variantCache.set(key, TileVariants.selectVariant(tileId, x, y));
  }
  return this.variantCache.get(key)!;
}
```

**Trade-off**: Memory vs CPU (only needed for very large maps)

### 2. Texture Atlas Packing

Pack variants close together in spritesheet for better cache locality:

```
Spritesheet layout (good):
[Grass0][Grass1][Grass2][Grass3]
[Sand0][Sand1][Sand2]...

vs (bad):
[Grass0]...lots of other tiles...[Grass1]
```

### 3. Chunk Rendering

Variants are calculated during chunk rendering, not every frame:

```typescript
// Called once when chunk becomes visible
renderChunk(chunk) {
  for (tile of chunk.tiles) {
    const variant = TileVariants.selectVariant(tile.id, x, y);
    // Cache in chunk tilemap
  }
}
```

**Result**: Zero per-frame overhead for variant selection

## Visual Examples

### Before (Single Texture)

```
[🟩][🟩][🟩][🟩][🟩]
[🟩][🟩][🟩][🟩][🟩]
[🟩][🟩][🟩][🟩][🟩]
```
*Monotonous, artificial, "tiled" look*

### After (Noise Strategy, 4 Variants)

```
[🟩][🟩][🌿][🌿][🌾]
[🟩][🌿][🌿][🌾][🌾]
[🌿][🌿][🌾][🌾][🌳]
```
*Natural variation, smooth patches, organic feel*

## Advanced Techniques

### 1. Biome-Based Variants

```typescript
// Different grass variants for different biomes
const biome = getBiome(x, y);
const variantConfig = biomeVariants.get(biome);
const variant = TileVariants.selectVariant("grass", x, y, variantConfig);
```

### 2. Height-Based Variants

```typescript
// Use elevation to influence variant selection
const elevation = getElevation(x, y);
const adjustedNoise = noise + elevation * 0.5;
const variant = mapToVariantRange(adjustedNoise, count);
```

### 3. Directional Variants

```typescript
// Grass leaning in wind direction
const windDirection = getWindDirection();
const baseVariant = TileVariants.selectVariant("grass", x, y);
const directedVariant = (baseVariant + windDirection) % count;
```

### 4. Seasonal Variants

```typescript
// Different grass colors per season
const season = getCurrentSeason();
const seasonalOffset = seasonOffsets.get(season);
const variant = (baseVariant + seasonalOffset) % count;
```

## Testing

```typescript
describe("TileVariants", () => {
  it("returns consistent variant for same position", () => {
    const v1 = TileVariants.selectVariant("grass", 5, 10);
    const v2 = TileVariants.selectVariant("grass", 5, 10);
    expect(v1).toBe(v2);
  });

  it("noise strategy creates smooth patches", () => {
    const variants = [];
    for (let x = 0; x < 10; x++) {
      const v = TileVariants.selectVariant("grass", x, 0);
      variants.push(v);
    }
    // Should have some repetition (patches)
    const unique = new Set(variants).size;
    expect(unique).toBeLessThan(variants.length);
  });

  it("respects variant count", () => {
    for (let i = 0; i < 100; i++) {
      const v = TileVariants.selectVariant("grass", i, 0);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(4); // Grass has 4 variants
    }
  });
});
```

## Summary

The tile variant system provides **textured randomness** through:

✅ **Multiple strategies**: random, noise, checkerboard, static
✅ **Deterministic selection**: same position = same variant
✅ **Explicit overrides**: manual variant setting when needed
✅ **Natural patterns**: noise creates organic-looking variation
✅ **Zero runtime cost**: calculated during chunk rendering
✅ **Easy configuration**: add variants without code changes

**Result**: Maps look natural and varied instead of monotonous and tiled.
