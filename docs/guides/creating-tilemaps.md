# Guide: Creating Tilemaps

## Overview

Tilemaps are stored as JSON files in the `public/maps/` directory. Each map contains multiple layers (ground, walls, objects) represented as 2D arrays of numbers.

## Tile ID Reference

```typescript
0 = empty  (transparent)
1 = grass
2 = water
3 = log
4 = rock
5 = tree
```

## Map File Format

```json
{
  "name": "Map Name",
  "width": 20,
  "height": 20,
  "tileSize": 16,
  "layers": [
    {
      "name": "ground",
      "zIndex": 0,
      "width": 20,
      "height": 20,
      "data": [
        [1, 1, 1, ...],
        [1, 1, 1, ...],
        ...
      ]
    }
  ]
}
```

### Fields

**Top Level:**
- `name`: Display name of the map
- `width`: Number of tiles horizontally
- `height`: Number of tiles vertically
- `tileSize`: Size of each tile in pixels (usually 16)
- `layers`: Array of layer objects

**Layer:**
- `name`: Layer identifier (ground, walls, objects, etc.)
- `zIndex`: Rendering order (0 = bottom, higher = top)
- `width`: Must match map width
- `height`: Must match map height
- `data`: 2D array of tile IDs (data[y][x])

## Layer Recommendations

### Ground Layer (zIndex: 0)
- Base terrain (grass, dirt, sand, water)
- Rendered first (behind everything)
- Usually fills entire map

```json
{
  "name": "ground",
  "zIndex": 0,
  "data": [
    [1, 1, 1, 1],  // All grass
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1]
  ]
}
```

### Objects Layer (zIndex: 5)
- Decorative and interactive objects (rocks, logs, trees)
- Use `0` for empty space
- Objects automatically get collision based on TileConfig

```json
{
  "name": "objects",
  "zIndex": 5,
  "data": [
    [0, 0, 0, 0],
    [0, 4, 0, 5],  // Rock at (1,1), Tree at (3,1)
    [0, 0, 3, 0],  // Log at (2,2)
    [0, 0, 0, 0]
  ]
}
```

### Walls Layer (zIndex: 10)
- Boundaries and barriers (water, walls)
- Rendered on top (in front of objects)
- Usually used for map borders

```json
{
  "name": "walls",
  "zIndex": 10,
  "data": [
    [2, 2, 2, 2],  // Water border
    [2, 0, 0, 2],
    [2, 0, 0, 2],
    [2, 2, 2, 2]
  ]
}
```

## Creating a New Map

### Step 1: Create JSON File

Create a new file in `public/maps/`:

```bash
public/maps/my-level.json
```

### Step 2: Define Map Structure

```json
{
  "name": "My Level",
  "width": 10,
  "height": 10,
  "tileSize": 16,
  "layers": []
}
```

### Step 3: Add Ground Layer

Fill the entire map with grass:

```json
{
  "name": "ground",
  "zIndex": 0,
  "width": 10,
  "height": 10,
  "data": [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ]
}
```

### Step 4: Add Walls Border

Create water border around map:

```json
{
  "name": "walls",
  "zIndex": 10,
  "width": 10,
  "height": 10,
  "data": [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
  ]
}
```

### Step 5: Add Objects

Place trees, rocks, and logs:

```json
{
  "name": "objects",
  "zIndex": 5,
  "width": 10,
  "height": 10,
  "data": [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 5, 0, 0, 0, 0, 5, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 4, 4, 0, 0, 0, 0],
    [0, 0, 0, 0, 4, 4, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 5, 0, 0, 0, 0, 5, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ]
}
```

### Step 6: Load in Game

Update `src/world/World.ts`:

```typescript
this.tileMapData = await TileMapLoader.loadFromFile("/maps/my-level.json");
```

## Tools & Tips

### Manual Map Creation

**Pros:**
- Full control over every tile
- Easy to understand
- Version control friendly (JSON)

**Cons:**
- Tedious for large maps
- Hard to visualize while editing

### Using a Helper Script

Create a simple Node.js script to generate maps:

```typescript
// scripts/generate-map.ts
const map = {
  name: "Generated Map",
  width: 20,
  height: 20,
  tileSize: 16,
  layers: [
    {
      name: "ground",
      zIndex: 0,
      width: 20,
      height: 20,
      data: Array(20).fill(Array(20).fill(1)), // All grass
    },
  ],
};

console.log(JSON.stringify(map, null, 2));
```

### Future: Tiled Editor Integration

For visual map editing, you can use [Tiled](https://www.mapeditor.org/) and create a converter:

1. Create map in Tiled (.tmx file)
2. Export as JSON
3. Write converter script to transform to our format
4. Load in game

## Collision Handling

**Automatic Collision:**

Collision is automatically determined by `TileConfig`:

```typescript
// In TileConfig.ts
["water", { blocksMovement: true }],  // Water blocks
["rock", { blocksMovement: false }],  // Rocks don't block (decorative)
["tree", { blocksMovement: true }],   // Trees block
["log", { blocksMovement: true }],    // Logs block
```

**No manual collision needed!** Just place tiles and collision works.

## Validation

The system validates maps automatically:

```typescript
const validation = TileMapLoader.validateMapData(mapData);
if (!validation.valid) {
  console.error("Map errors:", validation.errors);
}
```

**Common Errors:**
- Width/height mismatch between layers
- Missing required fields
- Invalid tile IDs
- Incorrect data dimensions

## Examples

### Small Test Map (5x5)

```json
{
  "name": "Tiny Test",
  "width": 5,
  "height": 5,
  "tileSize": 16,
  "layers": [
    {
      "name": "ground",
      "zIndex": 0,
      "width": 5,
      "height": 5,
      "data": [
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1]
      ]
    }
  ]
}
```

### Large Map (50x50)

For large maps, consider generating programmatically or using a map editor.

### Multi-Biome Map

Use different ground tiles in different areas:

```json
{
  "name": "ground",
  "data": [
    [1, 1, 1, 2, 2, 2],  // Grass transitions to water
    [1, 1, 1, 2, 2, 2],
    [1, 1, 1, 2, 2, 2]
  ]
}
```

## Best Practices

1. **Keep layers organized**: Use consistent naming (ground, walls, objects)
2. **Use zIndex wisely**: 0 = ground, 5 = objects, 10 = walls
3. **Empty = 0**: Use 0 for transparent tiles, not null
4. **Square maps**: Easier to work with (20x20, 30x30, 50x50)
5. **Test early**: Load small test maps before creating huge ones
6. **Version control**: Commit map files to git
7. **Comments**: Add descriptive names to identify maps easily

## Troubleshooting

### Map Not Loading

**Check:**
- File path is correct (`/maps/name.json`)
- JSON is valid (no syntax errors)
- Width/height match in all layers
- All required fields present

### Tiles Not Rendering

**Check:**
- Tile IDs are valid (0-5)
- Layer zIndex is set
- Layer has correct width/height

### Collision Not Working

**Check:**
- TileConfig has correct `blocksMovement` settings
- `syncCollisionFromTiles()` is called (automatic in loader)
- Tile IDs match config

### Variants Not Showing

**Check:**
- TileVariants count matches number of textures
- Tilesets has array of coordinates for variant tiles
- See `docs/guides/adding-tile-variants.md`

## Summary

Creating tilemaps:
1. ✅ Create JSON file in `public/maps/`
2. ✅ Define width, height, tileSize
3. ✅ Add layers (ground, objects, walls)
4. ✅ Fill layers with tile IDs (0-5)
5. ✅ Load in World.ts with `TileMapLoader`
6. ✅ Collision automatic based on TileConfig

Your map will render with proper layering, collision, and variants! 🗺️
