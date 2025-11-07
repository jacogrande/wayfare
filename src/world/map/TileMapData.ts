import { TileId } from "./Tile";

/**
 * Raw tilemap data format (loaded from JSON files)
 * Represents a single layer as a 2D array of tile IDs
 */
export interface TileMapLayerData {
  name: string;
  zIndex: number;
  width: number;
  height: number;
  /** 2D array: data[y][x] = tileId or null for empty */
  data: (TileId | null)[][];
}

/**
 * Complete tilemap data (can have multiple layers)
 */
export interface TileMapData {
  name: string;
  width: number;
  height: number;
  tileSize: number;
  layers: TileMapLayerData[];
}

/**
 * Tile ID to number mapping for compact storage
 * Allows using small numbers in JSON instead of strings
 */
export const TILE_ID_MAP: Record<number, TileId> = {
  0: "empty",
  1: "grass",
  2: "water",
  3: "log",
  4: "rock",
  5: "tree",
};

/**
 * Reverse mapping: TileId to number
 */
export const TILE_NUMBER_MAP: Record<TileId, number> = {
  empty: 0,
  grass: 1,
  water: 2,
  log: 3,
  rock: 4,
  tree: 5,
};

/**
 * Convert number array to TileId array
 */
export function numberArrayToTileIds(numbers: number[]): (TileId | null)[] {
  return numbers.map((n) => TILE_ID_MAP[n] ?? null);
}

/**
 * Convert 2D number array to 2D TileId array
 */
export function numberArray2DToTileIds(
  numbers: number[][],
): (TileId | null)[][] {
  return numbers.map((row) => numberArrayToTileIds(row));
}
