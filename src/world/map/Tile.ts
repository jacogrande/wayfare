import { Coordinates } from "../../types";

/**
 * A tile identifier
 */
export type TileId = "grass" | "water" | "log" | "rock" | "tree" | "empty";

/**
 * A single tile in the map
 */
export interface Tile {
  id: TileId;
  height?: number; // Height of obstacle in pixels (for jump collision)
}
