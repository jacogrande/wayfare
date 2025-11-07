import { TileId } from "./Tile";
import { TileBehaviorRegistry } from "./TileBehavior";

/**
 * Configuration for a tile type
 * Defines behavior and properties separate from tile data
 */
export interface TileProperties {
  /** Display name for the tile */
  name: string;
  /** Does this tile block movement? */
  blocksMovement: boolean;
  /** Height of obstacle in pixels (for jump collision) */
  height: number;
  /** Can this tile be destroyed/interacted with? */
  interactive?: boolean;
  /** Does this tile have custom behavior? (cached for performance) */
  hasBehavior?: boolean;
}

/**
 * Tile configuration registry
 * Follows Single Responsibility Principle: Handles tile behavior, not tile data
 */
export class TileConfig {
  private static readonly configs = new Map<TileId, TileProperties>([
    [
      "grass",
      {
        name: "Grass",
        blocksMovement: false,
        height: 0,
      },
    ],
    [
      "empty",
      {
        name: "Empty",
        blocksMovement: false,
        height: 0,
      },
    ],
    [
      "water",
      {
        name: "Water",
        blocksMovement: true,
        height: 32, // Too tall to jump over
      },
    ],
    [
      "rock",
      {
        name: "Rock",
        blocksMovement: false, // Can walk over rocks (decorative)
        height: 12, // Can jump over
      },
    ],
    [
      "log",
      {
        name: "Log",
        blocksMovement: true, // Logs block movement
        height: 8, // Easy to jump over
      },
    ],
    [
      "tree",
      {
        name: "Tree",
        blocksMovement: true, // Trees block movement
        height: 16, // Requires good jump
        interactive: true, // Could be chopped down, etc.
      },
    ],
  ]);

  /**
   * Get configuration for a tile type
   */
  static getConfig(tileId: TileId): TileProperties {
    const config = this.configs.get(tileId);
    if (!config) {
      throw new Error(`No configuration found for tile: ${tileId}`);
    }
    return config;
  }

  /**
   * Check if a tile blocks movement
   */
  static blocksMovement(tileId: TileId): boolean {
    return this.getConfig(tileId).blocksMovement;
  }

  /**
   * Get height of a tile obstacle
   */
  static getHeight(tileId: TileId): number {
    return this.getConfig(tileId).height;
  }

  /**
   * Check if a tile is interactive
   */
  static isInteractive(tileId: TileId): boolean {
    return this.getConfig(tileId).interactive ?? false;
  }

  /**
   * Get display name for a tile
   */
  static getName(tileId: TileId): string {
    return this.getConfig(tileId).name;
  }

  /**
   * Check if a tile has custom behavior
   */
  static hasBehavior(tileId: TileId): boolean {
    return TileBehaviorRegistry.hasBehavior(tileId);
  }

  /**
   * Get behavior instance for a tile
   */
  static getBehavior(tileId: TileId) {
    return TileBehaviorRegistry.getBehavior(tileId);
  }
}
