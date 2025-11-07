# Directional Sprite System in Pixi.js v8

This tutorial guides you through implementing a sprite system that changes based on the player's movement direction. You'll learn to load a spritesheet, extract individual direction frames, and switch them dynamically.

## Table of Contents

1. [Sprite Sheet Structure](#sprite-sheet-structure)
2. [Loading & Slicing the Spritesheet](#loading-slicing)
3. [Direction Tracking](#direction-tracking)
4. [Sprite Switching Logic](#sprite-switching)
5. [Integration with Player](#integration)
6. [Complete Example](#complete-example)

---

## Sprite Sheet Structure

### Common Layouts

Directional spritesheets typically use one of these layouts:

**4×4 Grid with Walk Animation (Your Layout):**
```
┌──────┬──────┬──────┬──────┐
│ ↓ 0  │ ↓ 1  │ ↓ 2  │ ↓ 3  │  Row 0: Down (idle, step, idle, step)
├──────┼──────┼──────┼──────┤
│ ←  0 │ ←  1 │ ←  2 │ ←  3 │  Row 1: Left (idle, step, idle, step)
├──────┼──────┼──────┼──────┤
│ →  0 │ →  1 │ →  2 │ →  3 │  Row 2: Right (idle, step, idle, step)
├──────┼──────┼──────┼──────┤
│ ↑  0 │ ↑  1 │ ↑  2 │ ↑  3 │  Row 3: Up (idle, step, idle, step)
└──────┴──────┴──────┴──────┘
```

**Animation Pattern:**
- Column 0: Idle/standing frame
- Column 1: Walking frame (left foot forward)
- Column 2: Idle/standing frame (same as column 0)
- Column 3: Walking frame (right foot forward)

**Horizontal Strip (Less Common):**
```
┌────┬────┬────┬────┐
│ ↓  │ ←  │ →  │ ↑  │  (Down, Left, Right, Up)
└────┴────┴────┴────┘
```

**Vertical Strip:**
```
┌────┐
│ ↓  │
├────┤
│ ←  │
├────┤
│ →  │
├────┤
│ ↑  │
└────┘
```

### Determine Your Layout

1. Open your spritesheet image in an image viewer
2. Identify the sprite order and animation pattern
3. Measure one sprite's width and height in pixels
4. Count total sprites (16 for 4-direction walk cycles, 4 for static directional)

---

## Loading & Slicing

### Create a Sprite Loader Utility

**File:** `src/world/entities/SpriteLoader.ts`

```typescript
import { Assets, Texture, Rectangle } from "pixi.js";

export type Direction = "down" | "left" | "right" | "up";

export interface DirectionalFrames {
  down: Texture[];
  left: Texture[];
  right: Texture[];
  up: Texture[];
}

/**
 * Load a 4×4 grid spritesheet with walk animation
 * Each row = one direction (down, left, right, up)
 * Each column = animation frame (idle, step, idle, step)
 */
export async function loadWalkCycleSprites(
  spritesheetPath: string,
  frameWidth: number,
  frameHeight: number,
  rowOrder: Direction[] = ["down", "left", "right", "up"]
): Promise<DirectionalFrames> {
  // Load base texture
  const baseTexture = await Assets.load(spritesheetPath);
  baseTexture.source.scaleMode = "nearest"; // Crisp pixel art

  const frames: Partial<DirectionalFrames> = {};

  // Extract each row (direction)
  for (let row = 0; row < rowOrder.length; row++) {
    const direction = rowOrder[row];
    const directionFrames: Texture[] = [];

    // Extract each column (animation frame) in this row
    for (let col = 0; col < 4; col++) {
      const frame = new Texture({
        source: baseTexture.source,
        frame: new Rectangle(
          col * frameWidth,      // X position
          row * frameHeight,     // Y position
          frameWidth,
          frameHeight
        ),
      });
      directionFrames.push(frame);
    }

    frames[direction] = directionFrames;
  }

  return frames as DirectionalFrames;
}

/**
 * Load a simple horizontal strip (4 sprites, no animation)
 */
export async function loadDirectionalSprites(
  spritesheetPath: string,
  frameWidth: number,
  frameHeight: number,
  order: Direction[] = ["down", "left", "right", "up"]
): Promise<Record<Direction, Texture>> {
  // Load base texture
  const baseTexture = await Assets.load(spritesheetPath);
  baseTexture.source.scaleMode = "nearest"; // Crisp pixel art

  const frames: Partial<Record<Direction, Texture>> = {};

  // Extract each frame based on order
  for (let i = 0; i < order.length; i++) {
    const direction = order[i];
    const frame = new Texture({
      source: baseTexture.source,
      frame: new Rectangle(
        i * frameWidth,     // X position
        0,                  // Y position (row 0 for horizontal)
        frameWidth,
        frameHeight
      ),
    });
    frames[direction] = frame;
  }

  return frames as Record<Direction, Texture>;
}

```

### Key Concepts

- **Rectangle(x, y, width, height)**: Defines the region to extract from the texture
- **scaleMode = "nearest"**: Essential for pixel art to prevent blurry scaling
- **Row/Column indexing**: `col * frameWidth` and `row * frameHeight` calculate pixel positions
- **Texture.source**: The underlying GPU texture; all frames share the same source
- **Animation frames array**: Each direction has 4 frames: `[idle, step-left, idle, step-right]`

### Walk Cycle Animation Pattern

The 4-frame walk cycle follows this pattern:

```
Frame 0 (column 0): Idle/standing
Frame 1 (column 1): Left foot forward
Frame 2 (column 2): Idle/standing (center position)
Frame 3 (column 3): Right foot forward
```

**Animation sequence**: `0 → 1 → 2 → 3 → repeat`
- Animates smoothly when cycling through frames
- Frame 0 and 2 are both idle (creates a "bob" effect)
- Use frame 0 when player is standing still

---

## Direction Tracking

### Understanding Movement Vectors

Your player already tracks movement direction through `lastMoveDir`:

```typescript
private lastMoveDir = { x: 1, y: 0 }; // Persists when not moving
```

This vector represents:
- `{ x: 0, y: 1 }` → Down
- `{ x: -1, y: 0 }` → Left
- `{ x: 1, y: 0 }` → Right
- `{ x: 0, y: -1 }` → Up
- `{ x: 1, y: 1 }` → Down-Right (diagonal)

### Convert Vector to Direction

**File:** `src/world/entities/DirectionHelper.ts`

```typescript
export type Direction = "down" | "left" | "right" | "up";

/**
 * Convert a movement vector to the nearest cardinal direction
 */
export function vectorToDirection(x: number, y: number): Direction {
  // Handle no movement - return a default
  if (x === 0 && y === 0) {
    return "down";
  }

  // Determine primary axis (horizontal vs vertical)
  const absX = Math.abs(x);
  const absY = Math.abs(y);

  if (absY > absX) {
    // Vertical movement dominates
    return y > 0 ? "down" : "up";
  } else {
    // Horizontal movement dominates (or equal)
    return x > 0 ? "right" : "left";
  }
}

/**
 * Convert a movement vector to 8-directional (if you want diagonals)
 */
export type Direction8 =
  | "down" | "left" | "right" | "up"
  | "down-left" | "down-right" | "up-left" | "up-right";

export function vectorToDirection8(x: number, y: number): Direction8 {
  if (x === 0 && y === 0) return "down";

  // Normalize for comparison
  const angle = Math.atan2(y, x) * (180 / Math.PI);

  // Map angle to direction (0° = right, 90° = down in screen coords)
  if (angle >= -22.5 && angle < 22.5) return "right";
  if (angle >= 22.5 && angle < 67.5) return "down-right";
  if (angle >= 67.5 && angle < 112.5) return "down";
  if (angle >= 112.5 && angle < 157.5) return "down-left";
  if (angle >= 157.5 || angle < -157.5) return "left";
  if (angle >= -157.5 && angle < -112.5) return "up-left";
  if (angle >= -112.5 && angle < -67.5) return "up";
  return "up-right";
}
```

### Why Track Direction?

Direction tracking allows:
- Sprite changes based on last movement
- Character continues "facing" a direction when idle
- Smoother visual feedback (sprite doesn't flicker when stopping)

---

## Sprite Switching & Animation

### Update Player to Support Walk Cycle Animation

**Modifications needed in `Player.ts`:**

**1. Store directional frames and animation state:**
```typescript
private directionalSprites?: DirectionalFrames;
private currentDirection: Direction = "down";
private animationFrame: number = 0;
private animationTimer: number = 0;
private readonly animationSpeed: number = 0.15; // seconds per frame
private isMoving: boolean = false;
```

**2. Accept frames in constructor:**
```typescript
export type PlayerOptions = {
  readKeys: () => Keys;
  isBlocked?: (worldX: number, worldY: number) => boolean;

  // NEW: Optional walk cycle sprites
  directionalSprites?: DirectionalFrames;

  maxSpeed?: number;
  accel?: number;
  drag?: number;
};

constructor(sprite: Sprite | AnimatedSprite, opts: PlayerOptions) {
  super(10);
  this.sprite = sprite;
  this.sprite.anchor.set(0.5);
  this.add(this.sprite);

  this.directionalSprites = opts.directionalSprites;
  // ... rest of initialization
}
```

**3. Update animation in `update()` method:**

Add this after updating `lastMoveDir` (around line 46):

```typescript
const dtSec = dt / 60;

// Determine if player is moving
const isMoving = moveX !== 0 || moveY !== 0;

// Update animation
if (this.directionalSprites && this.sprite instanceof Sprite) {
  const newDirection = vectorToDirection(this.lastMoveDir.x, this.lastMoveDir.y);

  // Direction changed - reset animation
  if (newDirection !== this.currentDirection) {
    this.currentDirection = newDirection;
    this.animationFrame = 0;
    this.animationTimer = 0;
  }

  // Animate walk cycle when moving
  if (isMoving) {
    this.animationTimer += dtSec;

    // Advance to next frame
    if (this.animationTimer >= this.animationSpeed) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % 4; // 0,1,2,3
    }
  } else {
    // Standing still - use idle frame (frame 0)
    this.animationFrame = 0;
    this.animationTimer = 0;
  }

  // Update sprite texture
  const frames = this.directionalSprites[this.currentDirection];
  if (frames && frames[this.animationFrame]) {
    this.sprite.texture = frames[this.animationFrame];
  }
}
```

### How the Animation Works

**When Moving:**
1. Timer accumulates delta time
2. Every 0.15 seconds, advance to next frame (0→1→2→3→0)
3. Creates smooth walking animation

**When Idle:**
1. Reset to frame 0 (idle/standing pose)
2. Player "faces" the last direction moved

**Direction Changes:**
1. Immediately switch to new direction's frame 0
2. Reset animation timer to sync cycle

### Why This Approach?

- **Time-based**: Uses delta time, not frame count (frame-rate independent)
- **Simple**: Just cycles through 4 frames
- **Responsive**: Direction changes are instant, animation is smooth
- **Performance**: Only updates texture when frame changes

---

## Integration

### Update World.ts to Load Walk Cycle Sprites

Replace your player creation code:

```typescript
//========= CREATE PLAYER =========//
const texture = await Assets.load("/assets/bunny.png");
texture.source.scaleMode = "nearest";
const playerSprite = new Sprite(texture);

// Scale to 1.5 tiles (24px)
const targetSize = 24;
const scale = targetSize / playerSprite.width;
playerSprite.scale.set(scale);

this.player = new Player(playerSprite, {
  readKeys: Keyboard.getKeys,
  isBlocked: this.isBlocked.bind(this),
  maxSpeed: 200,
  drag: 12,
  accel: 5000,
});
```

**With:**

```typescript
//========= CREATE PLAYER =========//
// Load walk cycle sprites (4×4 grid)
const dirFrames = await loadWalkCycleSprites(
  "/gfx/character.png",  // Your spritesheet path
  16,                    // Frame width (measure your sprite!)
  16,                    // Frame height
  ["down", "left", "right", "up"]  // Row order (top to bottom)
);

// Create sprite using the initial frame (down, idle)
const playerSprite = new Sprite(dirFrames.down[0]);

// Scale to 1.5 tiles (24px)
const targetSize = 24;
const scale = targetSize / playerSprite.width;
playerSprite.scale.set(scale);

this.player = new Player(playerSprite, {
  readKeys: Keyboard.getKeys,
  isBlocked: this.isBlocked.bind(this),
  directionalSprites: dirFrames,  // Pass the animation frames
  maxSpeed: 200,
  drag: 12,
  accel: 5000,
});
```

### Important: Import the Helpers

At the top of `World.ts`:

```typescript
import { loadWalkCycleSprites } from "./entities/SpriteLoader";
```

At the top of `Player.ts`:

```typescript
import { vectorToDirection, type Direction } from "./DirectionHelper";
import type { DirectionalFrames } from "./SpriteLoader";
```

### Row Order Configuration

If your spritesheet rows are in a different order, adjust the array:

```typescript
// Standard order (most common)
["down", "left", "right", "up"]

// Alternative order
["down", "up", "left", "right"]

// Custom order - match your sprite sheet!
["up", "down", "left", "right"]
```

---

## Complete Example

### File Structure

```
src/world/entities/
├── Entity.ts              # Base entity (existing)
├── Player.ts              # Player with directional support
├── SpriteLoader.ts        # NEW: Frame extraction utilities
└── DirectionHelper.ts     # NEW: Vector → direction conversion
```

### Minimal Working Implementation with Walk Animation

**1. Create `DirectionHelper.ts`:**
```typescript
export type Direction = "down" | "left" | "right" | "up";

export function vectorToDirection(x: number, y: number): Direction {
  if (x === 0 && y === 0) return "down";

  if (Math.abs(y) > Math.abs(x)) {
    return y > 0 ? "down" : "up";
  } else {
    return x > 0 ? "right" : "left";
  }
}
```

**2. Create `SpriteLoader.ts`:**
```typescript
import { Assets, Texture, Rectangle } from "pixi.js";

export type Direction = "down" | "left" | "right" | "up";

export interface DirectionalFrames {
  down: Texture[];
  left: Texture[];
  right: Texture[];
  up: Texture[];
}

export async function loadWalkCycleSprites(
  path: string,
  frameWidth: number,
  frameHeight: number,
  rowOrder: Direction[] = ["down", "left", "right", "up"]
): Promise<DirectionalFrames> {
  const baseTexture = await Assets.load(path);
  baseTexture.source.scaleMode = "nearest";

  const frames: any = {};

  for (let row = 0; row < rowOrder.length; row++) {
    const direction = rowOrder[row];
    const directionFrames: Texture[] = [];

    for (let col = 0; col < 4; col++) {
      directionFrames.push(
        new Texture({
          source: baseTexture.source,
          frame: new Rectangle(
            col * frameWidth,
            row * frameHeight,
            frameWidth,
            frameHeight
          ),
        })
      );
    }

    frames[direction] = directionFrames;
  }

  return frames;
}
```

**3. Update `Player.ts`:**

Add imports:
```typescript
import { vectorToDirection, type Direction } from "./DirectionHelper";
import type { DirectionalFrames } from "./SpriteLoader";
```

Add to `PlayerOptions`:
```typescript
directionalSprites?: DirectionalFrames;
```

Add to Player class:
```typescript
private directionalSprites?: DirectionalFrames;
private currentDirection: Direction = "down";
private animationFrame: number = 0;
private animationTimer: number = 0;
private readonly animationSpeed: number = 0.15;
```

Store in constructor:
```typescript
this.directionalSprites = opts.directionalSprites;
```

In `update()` method, after calculating movement:
```typescript
const dtSec = dt / 60;
const { x: moveX, y: moveY } = intent.move;
const isMoving = moveX !== 0 || moveY !== 0;

// Update direction and animation
if (this.directionalSprites && this.sprite instanceof Sprite) {
  const newDir = vectorToDirection(this.lastMoveDir.x, this.lastMoveDir.y);

  if (newDir !== this.currentDirection) {
    this.currentDirection = newDir;
    this.animationFrame = 0;
    this.animationTimer = 0;
  }

  if (isMoving) {
    this.animationTimer += dtSec;
    if (this.animationTimer >= this.animationSpeed) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % 4;
    }
  } else {
    this.animationFrame = 0;
    this.animationTimer = 0;
  }

  const frames = this.directionalSprites[this.currentDirection];
  if (frames && frames[this.animationFrame]) {
    this.sprite.texture = frames[this.animationFrame];
  }
}
```

**4. Update `World.ts` player creation:**
```typescript
const dirFrames = await loadWalkCycleSprites(
  "/gfx/character.png",
  16,  // Your sprite width
  16   // Your sprite height
);

const playerSprite = new Sprite(dirFrames.down[0]);
const targetSize = 24;
const scale = targetSize / playerSprite.width;
playerSprite.scale.set(scale);

this.player = new Player(playerSprite, {
  readKeys: Keyboard.getKeys,
  isBlocked: this.isBlocked.bind(this),
  directionalSprites: dirFrames,
  maxSpeed: 200,
  drag: 12,
  accel: 5000,
});
```

---

## Testing Checklist

- ✅ Player sprite changes direction when moving up/down/left/right
- ✅ Walk animation cycles smoothly (4 frames) when moving
- ✅ Player returns to idle pose (frame 0) when stopped
- ✅ Sprite "faces" the last direction moved
- ✅ No flickering or rapid texture swapping
- ✅ Animation speed feels natural (adjust `animationSpeed` if needed)
- ✅ Sprite renders with correct scale (1.5 tiles)
- ✅ Pixel art remains crisp (no blurring)

---

## Troubleshooting

### Sprite appears blurry
**Solution:** Ensure `baseTexture.source.scaleMode = "nearest"` is set in `loadWalkCycleSprites`

### Wrong sprite shows for a direction
**Solution:** Check your `rowOrder` array matches your spritesheet rows (top to bottom)

### Sprite is wrong size
**Solution:** Measure your frame dimensions carefully. Use an image viewer to check pixel dimensions.

### Animation doesn't play
**Solution:**
- Verify `directionalSprites` is passed to Player
- Check that `isMoving` is true when moving (add `console.log(isMoving)`)
- Ensure animation timer is incrementing (`console.log(this.animationTimer)`)

### Animation too fast/slow
**Solution:** Adjust `animationSpeed` in Player class (0.15 = ~6.6 fps, 0.1 = ~10 fps)

### Sprite shows wrong row
**Solution:** Your row order may differ. Try different orders:
```typescript
["down", "left", "right", "up"]  // Standard
["up", "left", "down", "right"]  // Alternative
```

### Diagonal movement shows wrong sprite
**Solution:** `vectorToDirection` picks the dominant axis. This is intentional for 4-way sprites.

### Player faces wrong direction when idle
**Solution:** Ensure `lastMoveDir` persists correctly and isn't reset to (0,0)

---

## Next Steps

Once walk animation works:

1. **Tune animation speed**: Adjust to match your game's feel
2. **Add running**: Different animation speed when holding shift
3. **Add attack animations**: New row in spritesheet for combat
4. **Diagonal sprites**: Expand to 8 directions (requires 8-row spritesheet)
5. **State machine**: Idle, walk, run, attack states with transitions

---

## References

- [Pixi.js Texture API](https://pixijs.com/8.x/guides/components/textures)
- [Pixi.js Assets Guide](https://pixijs.com/8.x/guides/components/assets)
- [Rectangle Frame Slicing](https://api.pixijs.io/classes/geometry.Rectangle.html)
