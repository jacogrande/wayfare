import { Assets, Rectangle, Texture } from "pixi.js";
import { Coordinates } from "../../types";
import { DEFAULTS } from "./constants";
import { TileId } from "./Tile";

/**
 * A way to map tile ids to sprite positions
 */
export type TilesetMapping = Map<TileId, Coordinates>;

export const loadTileset = async (
  atlasPath: string,
  mapping: TilesetMapping,
  tileSize: number = DEFAULTS.TILE_SIZE,
): Promise<Map<TileId, Texture>> => {
  const baseTexture: Texture = await Assets.load(atlasPath);
  // Set scale mode to nearest for crisp pixel art
  baseTexture.source.scaleMode = "nearest";
  const tileTextures = new Map<TileId, Texture>();
  for (const [tileId, spritePosition] of mapping.entries()) {
    const sprite = new Texture({
      source: baseTexture.source,
      frame: new Rectangle(
        spritePosition.x * tileSize,
        spritePosition.y * tileSize,
        tileSize,
        tileSize,
      ),
    });
    tileTextures.set(tileId, sprite);
  }
  return tileTextures;
};

export const OVERWORLD_TILESET: TilesetMapping = new Map([
  ["grass", { x: 0, y: 0 }],
  ["water", { x: 3, y: 7 }],
]);
