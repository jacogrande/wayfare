import { Coordinates } from "../../types";

/**
 * A tile identifier
 */
export type TileId = "grass" | "water" | "empty";

/**
 * A single tile in the map
 */
export interface Tile {
  id: TileId;
}
