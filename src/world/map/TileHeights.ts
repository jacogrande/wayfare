import { TileId } from "./Tile";
import { TileConfig } from "./TileConfig";

/**
 * Obstacle height utilities
 * Uses TileConfig as single source of truth for tile properties
 */

/**
 * Get the height of a tile
 * @deprecated Use TileConfig.getHeight() directly
 */
export function getTileHeight(tileId: TileId): number {
  return TileConfig.getHeight(tileId);
}

/**
 * Check if a tile can be jumped over at a given jump height
 */
export function canJumpOver(
  tileId: TileId,
  jumpHeight: number,
  tolerance: number = 0.9,
): boolean {
  const obstacleHeight = TileConfig.getHeight(tileId);
  if (obstacleHeight === 0) return true; // No obstacle
  return jumpHeight >= obstacleHeight * tolerance;
}
