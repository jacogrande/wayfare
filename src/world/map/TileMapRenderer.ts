import { CompositeTilemap } from "@pixi/tilemap";
import { Assets, Container, Rectangle, Texture } from "pixi.js";
import type { TextureSource } from "pixi.js";
import type { TileLayer, TileMap, TileId } from "./TileMap";

const OVERWORLD_ATLAS_PATH = "/gfx/Overworld.png";
const TILE_COORDS: Record<TileId, { x: number; y: number }> = {
  grass: { x: 0, y: 0 },
  water: { x: 1, y: 0 },
  path: { x: 2, y: 0 },
};
const CHUNK_TILE_SIZE = 16; // tiles per chunk edge
const CHUNK_VISIBILITY_PADDING = 32; // pixels

type ChunkLayer = {
  name: string;
  layer: TileLayer;
  tilemap: CompositeTilemap;
};

type MapChunk = {
  id: string;
  container: Container;
  layers: ChunkLayer[];
  bounds: Rectangle;
};

export class TileMapRenderer {
  readonly root = new Container();

  private readonly textures = new Map<TileId, Texture>();
  private tilesetSources: TextureSource[] = [];
  private chunks: MapChunk[] = [];
  private initialized = false;

  constructor(private readonly map: TileMap) {
    this.root.sortableChildren = true;
    this.root.zIndex = 0;
  }

  async init() {
    if (this.initialized) return;
    await this.prepareTileset();
    this.buildChunks();
    this.initialized = true;
  }

  updateVisibleChunks(viewBounds: Rectangle) {
    if (!this.initialized) return;
    const padded = new Rectangle(
      viewBounds.x - CHUNK_VISIBILITY_PADDING,
      viewBounds.y - CHUNK_VISIBILITY_PADDING,
      viewBounds.width + CHUNK_VISIBILITY_PADDING * 2,
      viewBounds.height + CHUNK_VISIBILITY_PADDING * 2,
    );
    this.chunks.forEach((chunk) => {
      const visible = this.intersects(padded, chunk.bounds);
      chunk.container.visible = visible;
      chunk.container.renderable = visible;
    });
  }

  private intersects(a: Rectangle, b: Rectangle) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private collectUsedTileIds() {
    const used = new Set<TileId>();
    this.map.forEachLayer((layer) => {
      layer.forEach((tile) => used.add(tile.tileId));
    });
    return used;
  }

  private async prepareTileset() {
    const atlasTexture = await Assets.load(OVERWORLD_ATLAS_PATH);
    atlasTexture.source.scaleMode = "nearest";

    const tileSize = this.map.tileSize;
    const atlasSources = new Set<TextureSource>();
    const usedTiles = this.collectUsedTileIds();

    usedTiles.forEach((tileId) => {
      const coords = TILE_COORDS[tileId];
      if (!coords) {
        throw new Error(
          `Tile "${tileId}" does not have atlas coordinates defined`,
        );
      }
      const frame = new Rectangle(
        coords.x * tileSize,
        coords.y * tileSize,
        tileSize,
        tileSize,
      );
      const texture = new Texture({
        source: atlasTexture.source,
        frame,
      });
      this.textures.set(tileId, texture);
      atlasSources.add(texture.source);
    });

    this.tilesetSources = [...atlasSources];
  }

  private buildChunks() {
    const chunkSizeTiles = CHUNK_TILE_SIZE;
    const tileSize = this.map.tileSize;
    const chunkSizePixels = chunkSizeTiles * tileSize;
    const chunkCols = Math.ceil(this.map.width / chunkSizeTiles);
    const chunkRows = Math.ceil(this.map.height / chunkSizeTiles);

    for (let chunkY = 0; chunkY < chunkRows; chunkY++) {
      for (let chunkX = 0; chunkX < chunkCols; chunkX++) {
        const id = `${chunkX},${chunkY}`;
        const container = new Container();
        container.sortableChildren = true;
        container.position.set(
          chunkX * chunkSizePixels,
          chunkY * chunkSizePixels,
        );
        this.root.addChild(container);

        const startTileX = chunkX * chunkSizeTiles;
        const startTileY = chunkY * chunkSizeTiles;
        const endTileX = Math.min(startTileX + chunkSizeTiles, this.map.width);
        const endTileY = Math.min(startTileY + chunkSizeTiles, this.map.height);

        const chunkLayers: ChunkLayer[] = [];
        this.map.forEachLayer((layer) => {
          const tilemap = new CompositeTilemap(this.tilesetSources);
          tilemap.zIndex = layer.zIndex;
          container.addChild(tilemap);

          tilemap.clear();
          for (let tileY = startTileY; tileY < endTileY; tileY++) {
            for (let tileX = startTileX; tileX < endTileX; tileX++) {
              const tile = layer.getTile(tileX, tileY);
              const texture = this.ensureTexture(tile.tileId);
              const localX = (tileX - startTileX) * tileSize;
              const localY = (tileY - startTileY) * tileSize;
              tilemap.tile(texture, localX, localY);
            }
          }

          chunkLayers.push({
            name: layer.name,
            layer,
            tilemap,
          });
        });

        const bounds = new Rectangle(
          chunkX * chunkSizePixels,
          chunkY * chunkSizePixels,
          Math.min(
            chunkSizePixels,
            this.map.getWorldWidth() - chunkX * chunkSizePixels,
          ),
          Math.min(
            chunkSizePixels,
            this.map.getWorldHeight() - chunkY * chunkSizePixels,
          ),
        );

        this.chunks.push({
          id,
          container,
          layers: chunkLayers,
          bounds,
        });
      }
    }
  }

  private ensureTexture(tileId: TileId) {
    const texture = this.textures.get(tileId);
    if (!texture) {
      throw new Error(
        `Texture for tile "${tileId}" requested before initialization`,
      );
    }
    return texture;
  }
}
