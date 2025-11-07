import { TileId } from "./Tile";

/**
 * Context for tile behavior callbacks
 * Provides access to game state without tight coupling
 */
export interface TileBehaviorContext {
  /** Player's current world position */
  playerX: number;
  playerY: number;
  /** Delta time in seconds */
  dtSec: number;
  /** Damage player (for hazards like lava) */
  damagePlayer?: (amount: number) => void;
  /** Heal player (for healing tiles) */
  healPlayer?: (amount: number) => void;
  /** Apply status effect */
  applyEffect?: (effect: string, duration: number) => void;
}

/**
 * Tile behavior interface
 * Follows Strategy Pattern: Different tiles can have different behaviors
 */
export interface ITileBehavior {
  /**
   * Called every frame when player is standing on this tile
   * @returns true if behavior was triggered, false otherwise
   */
  onPlayerStand?(context: TileBehaviorContext): boolean;

  /**
   * Called once when player enters this tile
   */
  onPlayerEnter?(context: TileBehaviorContext): void;

  /**
   * Called once when player leaves this tile
   */
  onPlayerLeave?(context: TileBehaviorContext): void;

  /**
   * Called every frame for animation updates (regardless of player position)
   */
  onUpdate?(dtSec: number, tileX: number, tileY: number): void;
}

/**
 * No-op behavior for tiles without special logic
 */
export class DefaultBehavior implements ITileBehavior {
  // No special behavior - tiles just exist
}

/**
 * Water tile behavior - animated water effect
 */
export class WaterBehavior implements ITileBehavior {
  private animationTimer: number = 0;
  private readonly animationSpeed: number = 2; // Cycles per second

  onUpdate(dtSec: number): void {
    // Update animation timer
    this.animationTimer += dtSec * this.animationSpeed;
    if (this.animationTimer >= 1) {
      this.animationTimer -= 1;
    }

    // In a real implementation, you'd update the texture/sprite here
    // For now, this is a placeholder for animation logic
    // Example: tile.sprite.texture = waterFrames[Math.floor(this.animationTimer * 4)];
  }
}

/**
 * Lava tile behavior - damages player when standing on it
 */
export class LavaBehavior implements ITileBehavior {
  private readonly damagePerSecond: number = 10;
  private readonly damageInterval: number = 0.5; // Damage every 0.5 seconds
  private damageTimer: number = 0;

  onPlayerStand(context: TileBehaviorContext): boolean {
    this.damageTimer += context.dtSec;

    // Apply damage at intervals
    if (this.damageTimer >= this.damageInterval) {
      this.damageTimer -= this.damageInterval;

      if (context.damagePlayer) {
        const damage = this.damagePerSecond * this.damageInterval;
        context.damagePlayer(damage);
        console.log(`Lava damage: ${damage}`);
        return true; // Behavior was triggered
      }
    }

    return false;
  }

  onPlayerEnter(): void {
    // Reset timer when entering
    this.damageTimer = 0;
  }

  onPlayerLeave(): void {
    // Reset timer when leaving
    this.damageTimer = 0;
  }
}

/**
 * Ice tile behavior - reduces player control
 */
export class IceBehavior implements ITileBehavior {
  onPlayerEnter(): void {
    // In real implementation, you'd modify player physics:
    // - Increase drag coefficient
    // - Reduce acceleration
    // - Add "sliding" status effect
  }

  onPlayerLeave(): void {
    // Restore normal physics
  }
}

/**
 * Healing spring tile behavior - restores health over time
 */
export class HealingSpringBehavior implements ITileBehavior {
  private readonly healPerSecond: number = 5;
  private readonly healInterval: number = 1.0;
  private healTimer: number = 0;

  onPlayerStand(context: TileBehaviorContext): boolean {
    this.healTimer += context.dtSec;

    if (this.healTimer >= this.healInterval) {
      this.healTimer -= this.healInterval;

      if (context.healPlayer) {
        const heal = this.healPerSecond * this.healInterval;
        context.healPlayer(heal);
        console.log(`Healing spring: +${heal} HP`);
        return true;
      }
    }

    return false;
  }

  onPlayerEnter(): void {
    this.healTimer = 0;
  }

  onPlayerLeave(): void {
    this.healTimer = 0;
  }
}

/**
 * Tile behavior registry
 * Maps tile IDs to their behavior implementations
 */
export class TileBehaviorRegistry {
  private static readonly behaviors = new Map<TileId, ITileBehavior>([
    ["grass", new DefaultBehavior()],
    ["empty", new DefaultBehavior()],
    ["water", new WaterBehavior()],
    ["rock", new DefaultBehavior()],
    ["log", new DefaultBehavior()],
    ["tree", new DefaultBehavior()],
    // Example of how to add new tiles with behaviors:
    // ["lava", new LavaBehavior()],
    // ["ice", new IceBehavior()],
    // ["healing_spring", new HealingSpringBehavior()],
  ]);

  /**
   * Get behavior for a tile type
   */
  static getBehavior(tileId: TileId): ITileBehavior {
    const behavior = this.behaviors.get(tileId);
    if (!behavior) {
      // Return default behavior if not found
      return new DefaultBehavior();
    }
    return behavior;
  }

  /**
   * Check if a tile has custom behavior
   */
  static hasBehavior(tileId: TileId): boolean {
    const behavior = this.behaviors.get(tileId);
    return (
      behavior !== undefined &&
      !(behavior instanceof DefaultBehavior) &&
      (behavior.onPlayerStand !== undefined ||
        behavior.onPlayerEnter !== undefined ||
        behavior.onPlayerLeave !== undefined ||
        behavior.onUpdate !== undefined)
    );
  }

  /**
   * Register a custom behavior for a tile (for mods/extensions)
   */
  static registerBehavior(tileId: TileId, behavior: ITileBehavior): void {
    this.behaviors.set(tileId, behavior);
  }
}
