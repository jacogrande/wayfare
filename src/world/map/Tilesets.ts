import { Assets, Rectangle, Texture } from "pixi.js";
import { Coordinates } from "../../types";
import { DEFAULTS } from "./constants";
import { TileId } from "./Tile";

/**
 * A way to map tile ids to sprite positions
 * Now supports multiple coordinates per tile for variants
 */
export type TilesetMapping = Map<TileId, Coordinates | Coordinates[]>;

export const loadTileset = async (
  atlasPath: string,
  mapping: TilesetMapping,
  tileSize: number = DEFAULTS.TILE_SIZE,
): Promise<Map<TileId, Texture[]>> => {
  const baseTexture: Texture = await Assets.load(atlasPath);
  // Set scale mode to nearest for crisp pixel art
  baseTexture.source.scaleMode = "nearest";
  const tileTextures = new Map<TileId, Texture[]>();

  for (const [tileId, spritePositions] of mapping.entries()) {
    // Convert single coordinate to array for uniform handling
    const positions = Array.isArray(spritePositions)
      ? spritePositions
      : [spritePositions];

    const textures: Texture[] = [];

    for (const pos of positions) {
      const sprite = new Texture({
        source: baseTexture.source,
        frame: new Rectangle(
          pos.x * tileSize,
          pos.y * tileSize,
          tileSize,
          tileSize,
        ),
      });
      textures.push(sprite);
    }

    tileTextures.set(tileId, textures);
  }

  return tileTextures;
};

export const OVERWORLD_TILESET: TilesetMapping = new Map([
  ["grass", [{ x: 0, y: 0 }]],
  ["water", { x: 3, y: 7 }],
  ["log", { x: 3, y: 5 }],
  ["rock", { x: 6, y: 5 }],
  ["tree", { x: 0, y: 4 }],
]);
