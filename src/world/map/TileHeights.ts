import { TileId } from "./Tile";

/**
 * Obstacle height configuration
 * Defines how tall each obstacle is for jump collision
 */
export const TILE_HEIGHTS: Map<TileId, number> = new Map([
  // Ground tiles (no height)
  ["grass", 0],
  ["empty", 0],

  // Water (ground level, cannot jump over)
  ["water", 32], // Too tall to jump

  // Objects (can jump over if height < 16px)
  ["rock", 12], // Can jump over
  ["log", 8], // Can jump over
  ["tree", 16], // Base of tree - can jump over at max height
]);

/**
 * Get the height of a tile
 */
export function getTileHeight(tileId: TileId): number {
  return TILE_HEIGHTS.get(tileId) ?? 0;
}

/**
 * Check if a tile can be jumped over at a given jump height
 */
export function canJumpOver(
  tileId: TileId,
  jumpHeight: number,
  tolerance: number = 0.9,
): boolean {
  const obstacleHeight = getTileHeight(tileId);
  if (obstacleHeight === 0) return true; // No obstacle
  return jumpHeight >= obstacleHeight * tolerance;
}
