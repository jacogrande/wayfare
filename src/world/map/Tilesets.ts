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
  // Grass has 4 variants for textured randomness (row 0, columns 0-3)
  [
    "grass",
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ],
  ],
  // Water has 4 variants for animation (row 7, columns 3-6)
  [
    "water",
    [
      { x: 3, y: 7 },
      { x: 4, y: 7 },
      { x: 5, y: 7 },
      { x: 6, y: 7 },
    ],
  ],
  // Log has single texture
  ["log", { x: 3, y: 5 }],
  // Rock has 3 variants (row 5, columns 6-8)
  [
    "rock",
    [
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 8, y: 5 },
    ],
  ],
  // Tree has 2 variants (row 4, columns 0-1)
  [
    "tree",
    [
      { x: 0, y: 4 },
      { x: 1, y: 4 },
    ],
  ],
]);
