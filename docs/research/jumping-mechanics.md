# Jumping Mechanics in Top-Down 2D Games

## Overview
Jumping is uncommon in top-down 2D games but can add significant depth to gameplay. The core challenge is representing vertical movement (Z-axis) in a 2D top-down perspective where Y-axis represents north/south movement.

## Best Practices from Research

### Visual Representation
The primary method for showing jumping in top-down games is through **shadow manipulation**:

1. **Shadow stays grounded**: The shadow remains at the player's actual ground position while the sprite moves
2. **Shadow size variation**: Shadow shrinks as the player gets higher (smaller = higher off ground)
3. **Shadow opacity changes**: Shadow fades slightly when airborne to reinforce height

### Z-Axis Simulation
The same jumping mechanics used for the Y-axis in platformers can be applied to a Z-axis in top-down games:
- Create a `height` variable to track vertical position
- Apply gravity and velocity to this height
- Offset sprite rendering based on height value
- Keep collision/physics at ground level

### Animation-Focused Approach
Since this is 2D top-down, jumping is more about visual appearance than true 3D physics. The illusion is created through:
- Sprite vertical offset
- Shadow scaling/opacity
- Landing effects (dust particles, camera shake)
- Squash and stretch on landing

## Implementation Design

### Core Physics System

```typescript
// Player properties
private jumpVelocity = 0;       // Current vertical velocity
private height = 0;              // Current height off ground (Z-axis)
private gravity = 800;           // Downward acceleration (px/sec²)
private jumpStrength = 250;      // Initial upward velocity when jumping
private maxJumpHeight = 32;      // Maximum height (2 tiles = 32px)
```

**Jump Arc Calculation:**
- Use parabolic motion: `height += jumpVelocity * dt`
- Apply gravity: `jumpVelocity += gravity * dt`
- When `height <= 0`, player lands (reset to grounded state)

### Jump State Machine

Four distinct states:

1. **Grounded** (`height === 0`)
   - Can initiate jump
   - Normal movement and collision
   - Shadow at 100% size, 30% opacity

2. **Jumping** (`height > 0 && jumpVelocity < 0`)
   - Rising into air
   - Gravity pulling down
   - Shadow shrinking

3. **Falling** (`height > 0 && jumpVelocity >= 0`)
   - Descending
   - Can still control horizontal movement
   - Shadow growing

4. **Landing** (transition frame when `height` reaches 0)
   - Brief moment for effects
   - Squash animation
   - Dust particles
   - Return to grounded

### Visual Feedback System

**Sprite Offset:**
```typescript
sprite.y = -height; // Negative Y moves sprite up visually
```

**Shadow Scaling:**
```typescript
// Scale from 100% (grounded) to 50% (at max height)
const shadowScale = 1.0 - (height / maxJumpHeight) * 0.5;
shadow.scale.set(shadowScale);
```

**Shadow Opacity:**
```typescript
// Fade from 0.3 (grounded) to 0.15 (airborne)
const shadowAlpha = 0.3 - (height / maxJumpHeight) * 0.15;
shadow.alpha = shadowAlpha;
```

**Squash and Stretch (optional):**
```typescript
// On landing, briefly squash sprite
sprite.scale.y = 0.85;
sprite.scale.x = 1.15;
// Then bounce back to normal over a few frames
```

### Input System

**Jump Trigger:**
- Map to Space bar or a gamepad button
- Only allow jump when grounded (or during coyote time)

**Coyote Time** (optional quality-of-life feature):
```typescript
private coyoteTimeMs = 150; // 150ms grace period
private timeSinceGrounded = 0;

// Allow jump slightly after walking off ledge
if (timeSinceGrounded < coyoteTimeMs) {
  canJump = true;
}
```

**Jump Buffering** (optional):
```typescript
private jumpBufferMs = 100;
private jumpBufferTimer = 0;

// Register jump input before landing
// Execute jump immediately upon landing
```

### Collision System Updates

**Basic Collision While Jumping:**
```typescript
// Player can pass over low obstacles when airborne
if (checkCollision(newX, newY)) {
  const obstacle = getObstacleAt(newX, newY);

  if (height > obstacle.height) {
    // Player is high enough - allow movement over obstacle
    allowMove = true;
  } else {
    // Player too low - blocked by obstacle
    allowMove = false;
  }
}
```

**Obstacle Height Property:**
Every obstacle needs a height value:
- Rocks, logs: 8-12px (can jump over)
- Trees: Split into base (collision) and canopy (visual only)
- Walls: Full height (cannot jump over)

### Landing Effects (Polish)

1. **Dust Particles:**
   - Spawn 3-5 small particles on landing
   - Particles fade out and move outward
   - Color matches ground tile

2. **Camera Shake:**
   - Subtle 2-3px shake on landing
   - Dampens quickly (50-100ms)

3. **Sound Effects:**
   - Jump: Light "whoosh" sound
   - Landing: Soft "thud" (volume based on fall distance)

## Reference Games

Games with excellent top-down jumping mechanics:

- **Hyper Light Drifter**: Dash mechanic has jump-like feel with clear shadow separation
- **Nuclear Throne**: Clear shadow system shows height
- **Enter the Gungeon**: Dodge roll uses similar height/shadow mechanics
- **CrossCode**: Excellent z-axis implementation with jumping puzzles
- **Zelda: Link's Awakening**: Classic example of jumping in top-down perspective

## Implementation Roadmap

### Phase 1: Core Mechanics
1. Add `height` and `jumpVelocity` to Player
2. Implement jump physics (gravity, velocity)
3. Add jump input handling (Space bar)
4. Offset sprite Y based on height

### Phase 2: Visual Feedback
1. Animate shadow size based on height
2. Animate shadow opacity
3. Add sprite squash/stretch on landing
4. Visual state indicators (dust particles)

### Phase 3: Collision Integration
1. Add height property to obstacles
2. Update collision system to check height vs obstacle height
3. Test jumping over 1-tile obstacles
4. Fine-tune jump arc and max height

### Phase 4: Polish
1. Add coyote time for better feel
2. Implement jump buffering
3. Landing particles and effects
4. Sound effects
5. Camera shake on landing
6. Playtesting and iteration

## Technical Considerations

### Performance
- Shadow scaling/opacity changes every frame while jumping
- Keep particle systems lightweight (max 5-10 particles per landing)
- Use object pooling for particles if needed

### Balance
- Jump cooldown: Prevent spam jumping (100-200ms between jumps)
- Stamina cost: Consider small stamina drain for jumping
- Movement speed: Reduce air control slightly (80-90% of ground speed)

### Accessibility
- Visual indicators for jump height (arc trail, dust while in air)
- Clear audio feedback for jump and landing
- Colorblind-friendly particle effects

## Data Structures

### Player Jump State
```typescript
interface JumpState {
  height: number;           // Current height off ground
  jumpVelocity: number;     // Vertical velocity
  isJumping: boolean;       // In air vs grounded
  timeSinceGrounded: number; // For coyote time
  jumpBufferTimer: number;  // For jump buffering
}
```

### Obstacle Height Data
```typescript
interface ObstacleData {
  tileId: TileId;
  height: number;           // Height in pixels
  blocksMovement: boolean;  // Can player pass through?
}

const OBSTACLE_HEIGHTS: Map<TileId, number> = new Map([
  ["rock", 12],
  ["log", 8],
  ["tree_base", 16],        // Bottom tile
  ["tree_canopy", 0],       // Top tile (no collision)
  ["water", 0],             // Ground level
  ["wall", 32],             // Too tall to jump
]);
```

## Open Questions

1. **Multi-tile obstacles**: How to handle trees that span multiple tiles where only the base should collide?
2. **Jump trajectory control**: Should player have full movement control while jumping?
3. **Jump height variance**: Single fixed height or variable based on button hold duration?
4. **Combat integration**: Can player attack while jumping? Does it affect damage/hitboxes?

## Resources

- [GameDev StackExchange: Top-down depth](https://gamedev.stackexchange.com/questions/178888/how-to-give-depth-to-a-top-down-shooter)
- [Unity Forum: Jump functionality in 2D top-down](https://discussions.unity.com/t/how-do-you-make-jumps-in-top-down-2d-games/924995)
- [Godot Forum: 2D top-down jumping](https://forum.godotengine.org/t/2d-top-down-how-to-handle-jumping/70704)
- [GDevelop: Top-down jumping example](https://forum.gdevelop.io/t/example-2d-topdown-jumping/30920)
