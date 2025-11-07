import { Direction } from "./SpriteLoader";

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
