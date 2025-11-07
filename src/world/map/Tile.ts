/**
 * A tile identifier
 */
export type TileId = "grass" | "water" | "log" | "rock" | "tree" | "empty";

/**
 * A single tile in the map
 */
export interface Tile {
  id: TileId;
  /** Optional variant index for tiles with multiple textures (e.g., grass_0, grass_1, grass_2) */
  variant?: number;
  height?: number; // Height of obstacle in pixels (for jump collision)
}
