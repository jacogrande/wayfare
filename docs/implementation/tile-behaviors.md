# Tile Behaviors System

## Overview

The tile behaviors system allows tiles to have custom logic (animation, damage, healing, etc.) while maintaining SOLID principles through the **Strategy Pattern**.

## Architecture

### Separation of Concerns

1. **Tile** (interface): Pure data - what IS a tile
2. **TileConfig** (class): Static properties - how tiles BEHAVE (collision, height)
3. **TileBehavior** (interface): Dynamic logic - what tiles DO (animate, damage, heal)

This follows the **Strategy Pattern**: Different tiles can have different behaviors without changing the tile data structure.

## Components

### ITileBehavior Interface

Defines the contract for tile-specific logic:

```typescript
export interface ITileBehavior {
  // Called every frame when player stands on tile
  onPlayerStand?(context: TileBehaviorContext): boolean;

  // Called once when player enters tile
  onPlayerEnter?(context: TileBehaviorContext): void;

  // Called once when player leaves tile
  onPlayerLeave?(context: TileBehaviorContext): void;

  // Called every frame for animations (regardless of player)
  onUpdate?(dtSec: number, tileX: number, tileY: number): void;
}
```

### TileBehaviorContext

Provides access to game state without tight coupling:

```typescript
export interface TileBehaviorContext {
  playerX: number;
  playerY: number;
  dtSec: number;
  damagePlayer?: (amount: number) => void;
  healPlayer?: (amount: number) => void;
  applyEffect?: (effect: string, duration: number) => void;
}
```

### Built-in Behaviors

**DefaultBehavior**: No-op for tiles without special logic
- Grass, rocks, logs, trees use this

**WaterBehavior**: Animated water effect
- Updates animation timer
- Plays splash effect on enter

**LavaBehavior**: Damages player over time
- 10 damage per second
- Applies "burning" status effect
- Damages at 0.5 second intervals

**IceBehavior**: Reduces player control
- Could modify player drag/acceleration
- Slippery movement

**HealingSpringBehavior**: Restores health
- 5 HP per second
- Heals at 1 second intervals

## Implementation Example

### 1. Create a Custom Behavior

```typescript
export class TeleportPadBehavior implements ITileBehavior {
  private readonly targetX: number;
  private readonly targetY: number;

  constructor(targetX: number, targetY: number) {
    this.targetX = targetX;
    this.targetY = targetY;
  }

  onPlayerEnter(context: TileBehaviorContext): void {
    // Teleport player to target location
    console.log(`Teleporting to (${this.targetX}, ${this.targetY})`);
    // In real implementation:
    // context.teleportPlayer(this.targetX, this.targetY);
  }
}
```

### 2. Register the Behavior

```typescript
// In TileBehaviorRegistry
TileBehaviorRegistry.registerBehavior(
  "teleport_pad",
  new TeleportPadBehavior(100, 100)
);
```

### 3. Add to TileConfig

```typescript
// In TileConfig.configs
["teleport_pad", {
  name: "Teleport Pad",
  blocksMovement: false,
  height: 0,
  interactive: true,
}]
```

### 4. Integrate with World/Player

```typescript
// In World.update() or Player.update()
update(dt: number) {
  const dtSec = dt / 60;

  // Get tile player is standing on
  const { tx, ty } = this.tileMapData.worldToTile(this.player.x, this.player.y);
  const tile = this.tileMapData.getTileAt(tx, ty);

  if (tile && TileConfig.hasBehavior(tile.id)) {
    const behavior = TileConfig.getBehavior(tile.id);

    // Check if player just entered this tile
    if (this.lastPlayerTile !== tile) {
      behavior.onPlayerEnter?.({
        playerX: this.player.x,
        playerY: this.player.y,
        dtSec,
        damagePlayer: (dmg) => this.player.stats.damage(dmg),
        healPlayer: (heal) => this.player.stats.heal(heal),
      });
      this.lastPlayerTile = tile;
    }

    // Update behavior while standing
    behavior.onPlayerStand?.({
      playerX: this.player.x,
      playerY: this.player.y,
      dtSec,
      damagePlayer: (dmg) => this.player.stats.damage(dmg),
      healPlayer: (heal) => this.player.stats.heal(heal),
    });
  }

  // Update all animated tiles (water, etc.)
  this.updateAnimatedTiles(dtSec);
}

private updateAnimatedTiles(dtSec: number) {
  // Only update tiles with onUpdate behavior
  const animatedTiles = ["water"]; // Could cache this list

  for (const tileId of animatedTiles) {
    const behavior = TileConfig.getBehavior(tileId);
    if (behavior.onUpdate) {
      // Update all visible tiles of this type
      // (In real implementation, iterate visible chunks only)
      behavior.onUpdate(dtSec, 0, 0);
    }
  }
}
```

## SOLID Principles

### Single Responsibility
- **Tile**: Holds data (id, optional height)
- **TileConfig**: Manages static properties (collision, height)
- **TileBehavior**: Implements dynamic logic (damage, animation)
- **TileBehaviorRegistry**: Maps tiles to behaviors

### Open/Closed
- Open for extension: Add new behaviors without modifying existing code
- Closed for modification: Core tile system doesn't change

```typescript
// Easy to add new tiles with custom behavior
class PoisonGasBehavior implements ITileBehavior {
  onPlayerStand(context: TileBehaviorContext): boolean {
    context.damagePlayer?.(1);
    context.applyEffect?.("poisoned", 5);
    return true;
  }
}
```

### Liskov Substitution
- All behaviors implement `ITileBehavior`
- Can be swapped without breaking the system

### Interface Segregation
- Behaviors only implement methods they need
- Optional methods: `onPlayerStand?`, `onUpdate?`, etc.

### Dependency Inversion
- World depends on `ITileBehavior` abstraction
- Not coupled to specific behavior implementations

## Performance Considerations

### 1. Caching

```typescript
// Cache which tiles have behaviors
private tilesWithBehaviors = new Set<TileId>();

constructor() {
  for (const tileId of ALL_TILE_IDS) {
    if (TileConfig.hasBehavior(tileId)) {
      this.tilesWithBehaviors.add(tileId);
    }
  }
}
```

### 2. Only Check Visible Tiles

```typescript
// Only update behaviors for tiles in visible chunks
for (const chunkKey of this.visibleChunks) {
  const chunk = this.getChunk(chunkKey);
  for (const tile of chunk.tiles) {
    if (this.tilesWithBehaviors.has(tile.id)) {
      // Update behavior
    }
  }
}
```

### 3. Shared Behavior Instances

- Use singleton pattern for behaviors
- One `WaterBehavior` instance for all water tiles
- Stateless behaviors are most efficient

### 4. Event-Driven Updates

```typescript
// Only check onPlayerStand when player moves
private lastPlayerTilePos = { tx: -1, ty: -1 };

if (playerTilePos.tx !== lastPlayerTilePos.tx ||
    playerTilePos.ty !== lastPlayerTilePos.ty) {
  // Player moved to new tile
  this.handleTileEnter(currentTile);
  this.handleTileLeave(previousTile);
}
```

## Examples by Use Case

### Animated Tiles (Water, Fire)

```typescript
class WaterBehavior implements ITileBehavior {
  private frame = 0;

  onUpdate(dtSec: number, tileX: number, tileY: number): void {
    this.frame = (this.frame + dtSec * 4) % 4;
    // Update sprite texture: waterFrames[Math.floor(this.frame)]
  }
}
```

### Hazard Tiles (Lava, Spikes)

```typescript
class SpikeBehavior implements ITileBehavior {
  private timer = 0;
  private readonly damageInterval = 1.0;

  onPlayerStand(context: TileBehaviorContext): boolean {
    this.timer += context.dtSec;
    if (this.timer >= this.damageInterval) {
      this.timer = 0;
      context.damagePlayer?.(15);
      return true;
    }
    return false;
  }
}
```

### Utility Tiles (Healing, Speed Boost)

```typescript
class SpeedBoostBehavior implements ITileBehavior {
  onPlayerEnter(context: TileBehaviorContext): void {
    context.applyEffect?.("speed_boost", 5);
  }

  onPlayerLeave(context: TileBehaviorContext): void {
    // Effect naturally expires after 5 seconds
  }
}
```

### Interactive Tiles (Doors, Switches)

```typescript
class DoorBehavior implements ITileBehavior {
  private isOpen = false;

  onPlayerEnter(context: TileBehaviorContext): void {
    if (!this.isOpen && context.hasKey?.("door_key")) {
      this.isOpen = true;
      // Open door: change collision, update sprite
    }
  }
}
```

## Testing

```typescript
describe("LavaBehavior", () => {
  it("damages player over time", () => {
    const behavior = new LavaBehavior();
    let totalDamage = 0;

    const context: TileBehaviorContext = {
      playerX: 100,
      playerY: 100,
      dtSec: 0.5,
      damagePlayer: (dmg) => { totalDamage += dmg; },
    };

    behavior.onPlayerStand(context);

    expect(totalDamage).toBe(5); // 10 dmg/sec * 0.5 sec
  });
});
```

## Future Enhancements

1. **Tile Variants**: Same tile, different behavior instances
   - `new LavaBehavior(20)` for extra-hot lava
   - `new WaterBehavior("fast")` for rapids

2. **Behavior Composition**: Combine multiple behaviors
   ```typescript
   class CompositeBehavior implements ITileBehavior {
     constructor(private behaviors: ITileBehavior[]) {}

     onPlayerStand(context: TileBehaviorContext) {
       for (const b of this.behaviors) {
         b.onPlayerStand?.(context);
       }
     }
   }
   ```

3. **State Machines**: Tiles with multiple states
   ```typescript
   class GeyserBehavior implements ITileBehavior {
     private state: "dormant" | "charging" | "erupting" = "dormant";
     // Transition between states over time
   }
   ```

4. **Tile Effects System**: Visual/audio feedback
   ```typescript
   context.playSound?.("splash");
   context.spawnParticles?.("water", playerX, playerY);
   ```

## Summary

The tile behaviors system allows rich, tile-specific interactions while maintaining:
- ✅ SOLID principles (Strategy Pattern)
- ✅ Separation of data and logic
- ✅ Easy extensibility (add new behaviors without modifying core)
- ✅ Performance (optional methods, caching, event-driven)
- ✅ Testability (behaviors are independent, context is injectable)

To add a new tile behavior:
1. Implement `ITileBehavior` interface
2. Register in `TileBehaviorRegistry`
3. Add tile properties to `TileConfig`
4. No changes to core tile system needed!
