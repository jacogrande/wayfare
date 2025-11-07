import { Assets } from "pixi.js";
import { TileMap } from "./TileMap";
import { TileLayer } from "./TileLayer";
import {
  TileMapData,
  TileMapLayerData,
  numberArray2DToTileIds,
} from "./TileMapData";

/**
 * Loads tilemaps from JSON files
 * Follows Single Responsibility Principle: only handles loading/parsing
 */
export class TileMapLoader {
  /**
   * Load a tilemap from a JSON file
   */
  static async loadFromFile(path: string): Promise<TileMap> {
    // Load JSON data
    const data: TileMapData = await Assets.load(path);

    return this.parseMapData(data);
  }

  /**
   * Parse tilemap data and create TileMap instance
   */
  static parseMapData(data: TileMapData): TileMap {
    const tileMap = new TileMap(data.width, data.height, data.tileSize);

    // Parse each layer
    for (const layerData of data.layers) {
      const layer = this.parseLayer(layerData);
      tileMap.addLayer(layer);
    }

    // Sync collision grid based on tile properties
    tileMap.syncCollisionFromTiles();

    return tileMap;
  }

  /**
   * Parse a single layer
   */
  private static parseLayer(layerData: TileMapLayerData): TileLayer {
    const layer = new TileLayer(
      layerData.name,
      layerData.width,
      layerData.height,
      layerData.zIndex,
    );

    // Convert data format if needed (numbers to TileIds)
    let tileData: (import("./Tile").TileId | null)[][];

    // Check if data is already TileIds or needs conversion
    if (
      typeof layerData.data[0]?.[0] === "number" ||
      layerData.data[0]?.[0] === null
    ) {
      // Data is numbers, convert to TileIds
      tileData = numberArray2DToTileIds(
        layerData.data as unknown as number[][],
      );
    } else {
      // Data is already TileIds
      tileData = layerData.data as (import("./Tile").TileId | null)[][];
    }

    // Fill layer with tiles
    for (let y = 0; y < layerData.height; y++) {
      for (let x = 0; x < layerData.width; x++) {
        const tileId = tileData[y]?.[x];
        if (tileId && tileId !== "empty") {
          layer.setTile(x, y, { id: tileId });
        }
      }
    }

    return layer;
  }

  /**
   * Create a tilemap from inline data (for testing)
   */
  static fromInlineData(data: TileMapData): TileMap {
    return this.parseMapData(data);
  }

  /**
   * List all available maps in a directory
   * Note: This requires build-time processing or manual registry
   */
  static getAvailableMaps(): string[] {
    // In a real implementation, this would scan the maps directory
    // For now, return a hardcoded list
    return ["test-map", "village", "forest", "dungeon"];
  }

  /**
   * Validate map data structure
   */
  static validateMapData(data: TileMapData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.name) errors.push("Map name is required");
    if (!data.width || data.width <= 0)
      errors.push("Invalid width: must be > 0");
    if (!data.height || data.height <= 0)
      errors.push("Invalid height: must be > 0");
    if (!data.tileSize || data.tileSize <= 0)
      errors.push("Invalid tileSize: must be > 0");
    if (!data.layers || data.layers.length === 0)
      errors.push("Map must have at least one layer");

    // Validate each layer
    for (const layer of data.layers || []) {
      if (!layer.name) errors.push(`Layer missing name`);
      if (layer.width !== data.width)
        errors.push(`Layer ${layer.name} width mismatch`);
      if (layer.height !== data.height)
        errors.push(`Layer ${layer.name} height mismatch`);
      if (!layer.data || layer.data.length !== data.height)
        errors.push(`Layer ${layer.name} has invalid data dimensions`);

      // Check each row
      for (let y = 0; y < layer.data.length; y++) {
        if (layer.data[y].length !== data.width) {
          errors.push(
            `Layer ${layer.name} row ${y} has incorrect width (expected ${data.width}, got ${layer.data[y].length})`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export a TileMap back to JSON data format
   * Useful for map editors or saving modified maps
   */
  static exportToData(tileMap: TileMap): TileMapData {
    const layers: TileMapLayerData[] = [];

    for (const layer of tileMap.getAllLayers()) {
      const data: (import("./Tile").TileId | null)[][] = [];

      // Extract tile data
      for (let y = 0; y < layer.height; y++) {
        const row: (import("./Tile").TileId | null)[] = [];
        for (let x = 0; x < layer.width; x++) {
          const tile = layer.getTile(x, y);
          row.push(tile ? tile.id : null);
        }
        data.push(row);
      }

      layers.push({
        name: layer.name,
        zIndex: layer.zIndex,
        width: layer.width,
        height: layer.height,
        data,
      });
    }

    return {
      name: "exported-map",
      width: layers[0].width,
      height: layers[0].height,
      tileSize: tileMap.tileSizePx,
      layers,
    };
  }
}
