import { TileId } from "./Tile";

/**
 * Configuration for tile variants
 * Defines how many texture variants each tile type has
 */
export interface TileVariantConfig {
  /** Number of variant textures available (e.g., 3 means variants 0, 1, 2) */
  count: number;
  /** Randomization strategy */
  strategy: "random" | "noise" | "checkerboard" | "static";
  /** For noise strategy: scale of noise pattern (higher = larger patches) */
  noiseScale?: number;
}

/**
 * Tile variant registry
 * Manages which tiles have multiple textures and how to select them
 */
export class TileVariants {
  private static readonly configs = new Map<TileId, TileVariantConfig>([
    // TODO: Update counts once variant textures are added to spritesheet
    // For now, all tiles have single texture (count: 1)
    ["grass", { count: 1, strategy: "static" }],
    ["water", { count: 1, strategy: "static" }],
    ["rock", { count: 1, strategy: "static" }],
    ["tree", { count: 1, strategy: "static" }],
    ["log", { count: 1, strategy: "static" }],
    ["empty", { count: 1, strategy: "static" }],

    // Example of how to configure variants once textures are added:
    // ["grass", { count: 4, strategy: "noise", noiseScale: 2.5 }],
    // ["rock", { count: 3, strategy: "random" }],
    // ["tree", { count: 2, strategy: "random" }],
  ]);

  /**
   * Get variant configuration for a tile type
   */
  static getConfig(tileId: TileId): TileVariantConfig {
    return (
      this.configs.get(tileId) ?? {
        count: 1,
        strategy: "static",
      }
    );
  }

  /**
   * Get number of variants for a tile type
   */
  static getVariantCount(tileId: TileId): number {
    return this.getConfig(tileId).count;
  }

  /**
   * Check if a tile has multiple variants
   */
  static hasVariants(tileId: TileId): boolean {
    return this.getVariantCount(tileId) > 1;
  }

  /**
   * Select a variant for a tile at a given position
   * Uses the configured strategy to determine which variant to use
   */
  static selectVariant(tileId: TileId, tileX: number, tileY: number): number {
    const config = this.getConfig(tileId);

    if (config.count <= 1) {
      return 0; // No variants available
    }

    switch (config.strategy) {
      case "random":
        return this.randomVariant(tileX, tileY, config.count);

      case "noise":
        return this.noiseVariant(
          tileX,
          tileY,
          config.count,
          config.noiseScale ?? 2.0,
        );

      case "checkerboard":
        return this.checkerboardVariant(tileX, tileY, config.count);

      case "static":
      default:
        return 0; // Always use first variant
    }
  }

  /**
   * Random variant selection (seeded by position for consistency)
   * Same position always returns same variant
   */
  private static randomVariant(x: number, y: number, count: number): number {
    // Simple hash function for deterministic "randomness"
    const hash = this.hash2D(x, y);
    return Math.abs(hash) % count;
  }

  /**
   * Noise-based variant selection
   * Creates natural-looking patches of variants
   */
  private static noiseVariant(
    x: number,
    y: number,
    count: number,
    scale: number,
  ): number {
    // Simple 2D noise using multiple hash functions
    const sx = x / scale;
    const sy = y / scale;

    // Get fractional parts
    const fx = sx - Math.floor(sx);
    const fy = sy - Math.floor(sy);

    // Sample noise at grid corners
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);

    const n00 = this.hash2D(x0, y0);
    const n10 = this.hash2D(x0 + 1, y0);
    const n01 = this.hash2D(x0, y0 + 1);
    const n11 = this.hash2D(x0 + 1, y0 + 1);

    // Smooth interpolation (cosine interpolation)
    const ix = this.smoothstep(fx);
    const iy = this.smoothstep(fy);

    // Bilinear interpolation
    const nx0 = this.lerp(n00, n10, ix);
    const nx1 = this.lerp(n01, n11, ix);
    const n = this.lerp(nx0, nx1, iy);

    // Map to variant range [0, count-1]
    const normalized = (n + 1) / 2; // Convert from [-1, 1] to [0, 1]
    return Math.floor(normalized * count) % count;
  }

  /**
   * Checkerboard variant selection
   * Alternates variants in a checkerboard pattern
   */
  private static checkerboardVariant(
    x: number,
    y: number,
    count: number,
  ): number {
    const sum = x + y;
    return Math.abs(sum) % count;
  }

  /**
   * Hash function for deterministic "random" values
   * Returns a value in range [-1, 1]
   */
  private static hash2D(x: number, y: number): number {
    // Simple hash function (not cryptographically secure, but good enough for tile variants)
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);

    // Normalize to [-1, 1]
    return ((h & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  }

  /**
   * Smooth interpolation function (smoothstep)
   */
  private static smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  /**
   * Linear interpolation
   */
  private static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Register a custom variant configuration (for mods/extensions)
   */
  static registerVariant(tileId: TileId, config: TileVariantConfig): void {
    this.configs.set(tileId, config);
  }
}
