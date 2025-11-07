# Guide: Adding Tile Variants to Your Spritesheet

## Current Status

The tile variant **system** is fully implemented, but the **spritesheet** only has single textures per tile. To enable textured randomness, you need to add variant textures to your spritesheet.

## Quick Start: 3 Steps

### 1. Add Variant Textures to Spritesheet

Edit your spritesheet (e.g., `public/gfx/Overworld.png`) to include multiple textures for each tile type.

**Example layout for grass variants:**
```
Row 0: [Grass0][Grass1][Grass2][Grass3][Rock][Tree]...
Row 1: [Sand0][Sand1][Sand2][Sand3][Water]...
```

**Tips:**
- Keep variants in consecutive columns for easy reference
- Use same row for related variants
- Maintain 16x16 tile size
- Variants should be visually similar (same terrain type) but with slight differences

### 2. Update Tileset Coordinates

Edit `src/world/map/Tilesets.ts`:

```typescript
export const OVERWORLD_TILESET: TilesetMapping = new Map([
  // Change from single coordinate to array of coordinates
  ["grass", [
    { x: 0, y: 0 }, // Grass variant 0
    { x: 1, y: 0 }, // Grass variant 1
    { x: 2, y: 0 }, // Grass variant 2
    { x: 3, y: 0 }, // Grass variant 3
  ]],

  // Single texture tiles stay the same
  ["log", { x: 3, y: 5 }],
]);
```

### 3. Configure Variant Strategy

Edit `src/world/map/TileVariants.ts`:

```typescript
private static readonly configs = new Map<TileId, TileVariantConfig>([
  // Change from count: 1 to actual count and choose strategy
  ["grass", {
    count: 4,
    strategy: "noise",    // Creates natural patches
    noiseScale: 2.5,
  }],

  ["rock", {
    count: 3,
    strategy: "random",   // Evenly distributed
  }],
]);
```

## Complete Example: Adding Grass Variants

### Step 1: Create Variant Textures

Create 4 slightly different grass textures in your pixel art editor:

- **Grass0**: Base grass (original)
- **Grass1**: Add small flower
- **Grass2**: Slightly darker shade
- **Grass3**: Add small rocks/pebbles

**Placement in spritesheet (row 0, columns 0-3):**
```
[🟩][🌼][🟫][🪨]...
 0   1   2   3
```

### Step 2: Update Tilesets.ts

```typescript
export const OVERWORLD_TILESET: TilesetMapping = new Map([
  // Before (single texture):
  // ["grass", { x: 0, y: 0 }],

  // After (4 variants):
  ["grass", [
    { x: 0, y: 0 }, // Base grass
    { x: 1, y: 0 }, // Grass with flower
    { x: 2, y: 0 }, // Dark grass
    { x: 3, y: 0 }, // Grass with rocks
  ]],

  // Other tiles...
  ["water", { x: 3, y: 7 }],
  ["log", { x: 3, y: 5 }],
]);
```

### Step 3: Update TileVariants.ts

```typescript
private static readonly configs = new Map<TileId, TileVariantConfig>([
  // Before:
  // ["grass", { count: 1, strategy: "static" }],

  // After:
  ["grass", {
    count: 4,              // Now have 4 variants
    strategy: "noise",     // Use noise for natural patches
    noiseScale: 2.5,       // Medium-sized patches
  }],

  // Other tiles still single texture
  ["water", { count: 1, strategy: "static" }],
  ["log", { count: 1, strategy: "static" }],
]);
```

### Result

Your grass tiles will now render with natural-looking variation:
- Smooth patches of different grass types
- No repetitive tiled appearance
- Deterministic (same every time you load the game)

## Strategy Recommendations

### Terrain (Grass, Dirt, Sand)
```typescript
{
  count: 4,
  strategy: "noise",
  noiseScale: 2.5,
}
```
**Why**: Creates natural-looking patches with smooth transitions

### Decorative Objects (Rocks, Flowers)
```typescript
{
  count: 3,
  strategy: "random",
}
```
**Why**: Evenly distributes different object types, looks organic

### Structured Tiles (Floors, Paths)
```typescript
{
  count: 2,
  strategy: "checkerboard",
}
```
**Why**: Creates deliberate patterns for man-made structures

### Animated Tiles (Water, Lava)
```typescript
{
  count: 4,
  strategy: "static",
}
```
**Why**: Animation system controls which variant to show

## Tuning Noise Scale

The `noiseScale` parameter controls patch size:

```typescript
// Small patches (busy, detailed)
noiseScale: 1.5

// Medium patches (natural) ⭐ RECOMMENDED
noiseScale: 2.5

// Large patches (smooth, subtle)
noiseScale: 5.0

// Very large patches (biome-like regions)
noiseScale: 10.0
```

**Test different values** to find what looks best for your art style.

## Testing Variants

### Visual Test
1. Build and run: `bun run dev`
2. Look at grass tiles
3. Should see varied textures in smooth patches

### Console Test
If you see errors like:
```
Texture undefined for tile grass at (5, 10), variant 2, textures.length: 1
```

**Problem**: Configured 4 variants but only loaded 1 texture
**Fix**: Check that tileset coordinates array has 4 entries

## Common Issues

### Issue 1: All Tiles Look the Same

**Symptom**: No variation visible

**Causes**:
1. Variant count is still `1` in TileVariants.ts
2. Tileset only has single coordinate (not array)
3. Variant textures look too similar

**Fix**:
- Check TileVariants config has `count > 1`
- Check Tilesets has array of coordinates
- Make variant textures more distinct (for testing)

### Issue 2: "Texture undefined" Error

**Symptom**: Game crashes or console errors

**Causes**:
1. Configured more variants than textures loaded
2. Spritesheet coordinates point to empty space
3. Spritesheet file missing/corrupted

**Fix**:
- Match `count` in TileVariants to array length in Tilesets
- Verify coordinates point to actual tiles in spritesheet
- Check browser dev tools network tab for asset loading

### Issue 3: Repetitive Patterns Visible

**Symptom**: Can see noise pattern repeating

**Causes**:
1. Noise scale too small
2. Not enough variant textures
3. Variants too similar

**Fix**:
- Increase `noiseScale` (try 3.0 or 4.0)
- Add more variant textures (4+ recommended)
- Make variants more visually distinct

## Advanced: Per-Tile Variant Override

For special cases, you can manually set a tile's variant:

```typescript
// In TileMap or TileLayer
layer.setTile(x, y, {
  id: "grass",
  variant: 2,  // Force use of variant 2
});
```

**Use cases**:
- Hand-placed decorative elements
- Custom paths or patterns
- Special landmarks
- Animated tiles (water, lava)

## Performance Note

**Variant selection has ZERO runtime cost!**

- Calculated once during chunk rendering
- Cached in chunk tilemap
- No per-frame overhead
- Same performance as single-texture tiles

## Summary Checklist

To enable tile variants:

- [ ] Create variant textures in spritesheet (keep them similar but distinct)
- [ ] Update Tilesets.ts with array of coordinates
- [ ] Update TileVariants.ts with count and strategy
- [ ] Test in game (`bun run dev`)
- [ ] Tune `noiseScale` for best visual result
- [ ] Check console for errors

Once configured, your terrain will look **natural and varied** instead of repetitively tiled!
