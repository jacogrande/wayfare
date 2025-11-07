import { Container, Texture, Rectangle } from "pixi.js";
import { CompositeTilemap } from "@pixi/tilemap";
import { TileId } from "./Tile";
import { TileMap } from "./TileMap";
import { TileLayer } from "./TileLayer";

const CHUNK_SIZE = 16; // 16×16 tiles per chunk

interface Chunk {
  chunkX: number;
  chunkY: number;
  tilemap: CompositeTilemap;
  isDirty: boolean;
}

export class TileMapRenderer {
  public readonly root: Container;
  private readonly tileMap: TileMap;
  private readonly textures: Map<TileId, Texture>;
  private readonly chunks: Map<string, Map<string, Chunk>>;
  private readonly visibleChunks: Set<string>;

  constructor(tileMap: TileMap, textures: Map<TileId, Texture>) {
    this.root = new Container();
    this.root.sortableChildren = true;

    this.tileMap = tileMap;
    this.textures = textures;
    this.chunks = new Map();
    this.visibleChunks = new Set();

    this.buildChunks();
  }

  /**
   * Build all chunks for all layers
   */
  private buildChunks(): void {
    const layers = this.tileMap.getAllLayers();

    for (const layer of layers) {
      const layerChunks = new Map<string, Chunk>();

      // Calculate chunk dimensions
      const chunksX = Math.ceil(layer.width / CHUNK_SIZE);
      const chunksY = Math.ceil(layer.height / CHUNK_SIZE);

      // Create a chunk for each region
      for (let cy = 0; cy < chunksY; cy++) {
        for (let cx = 0; cx < chunksX; cx++) {
          const chunkKey = `${cx},${cy}`;
          const tilemap = new CompositeTilemap();
          tilemap.zIndex = layer.zIndex;

          const chunk: Chunk = {
            chunkX: cx,
            chunkY: cy,
            tilemap,
            isDirty: true,
          };

          layerChunks.set(chunkKey, chunk);
          this.root.addChild(tilemap);
        }
      }

      this.chunks.set(layer.name, layerChunks);
    }
  }

  /**
   * Render a single chunk
   */
  private renderChunk(chunk: Chunk, layer: TileLayer): void {
    const tileSize = this.tileMap.tileSizePx;
    const startX = chunk.chunkX * CHUNK_SIZE;
    const startY = chunk.chunkY * CHUNK_SIZE;
    const endX = Math.min(startX + CHUNK_SIZE, layer.width);
    const endY = Math.min(startY + CHUNK_SIZE, layer.height);

    chunk.tilemap.clear();

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = layer.getTile(x, y);

        if (!tile || tile.id === "empty") {
          continue;
        }

        const texture = this.textures.get(tile.id);

        if (!texture) {
          console.warn(`Missing texture for tile ID: ${tile.id}`);
          continue;
        }

        chunk.tilemap.tile(texture, x * tileSize, y * tileSize);
      }
    }

    chunk.isDirty = false;
  }

  /**
   * Update visible chunks based on camera bounds
   */
  public updateCulling(cameraBounds: Rectangle): void {
    const tileSize = this.tileMap.tileSizePx;
    const newVisibleChunks = new Set<string>();

    // Calculate which chunks intersect the camera
    const minChunkX = Math.floor(cameraBounds.left / (CHUNK_SIZE * tileSize));
    const maxChunkX = Math.ceil(cameraBounds.right / (CHUNK_SIZE * tileSize));
    const minChunkY = Math.floor(cameraBounds.top / (CHUNK_SIZE * tileSize));
    const maxChunkY = Math.ceil(cameraBounds.bottom / (CHUNK_SIZE * tileSize));

    // Add a 1-chunk buffer to prevent pop-in
    const buffer = 1;

    for (let cy = minChunkY - buffer; cy <= maxChunkY + buffer; cy++) {
      for (let cx = minChunkX - buffer; cx <= maxChunkX + buffer; cx++) {
        const chunkKey = `${cx},${cy}`;
        newVisibleChunks.add(chunkKey);
      }
    }

    // Show newly visible chunks, hide newly invisible chunks
    for (const [layerName, layerChunks] of this.chunks.entries()) {
      const layer = this.tileMap.getLayer(layerName);
      if (!layer) continue;

      for (const [chunkKey, chunk] of layerChunks.entries()) {
        const isVisible = newVisibleChunks.has(chunkKey);
        const wasVisible = this.visibleChunks.has(chunkKey);

        if (isVisible && !wasVisible) {
          // Chunk became visible
          if (chunk.isDirty) {
            this.renderChunk(chunk, layer);
          }
          chunk.tilemap.visible = true;
        } else if (!isVisible && wasVisible) {
          // Chunk became invisible
          chunk.tilemap.visible = false;
        }
      }
    }

    // Update visible chunks set (clear and repopulate)
    this.visibleChunks.clear();
    for (const chunkKey of newVisibleChunks) {
      this.visibleChunks.add(chunkKey);
    }
  }

  /**
   * Mark a tile as dirty (needs re-render)
   */
  public markTileDirty(layerName: string, tx: number, ty: number): void {
    const layerChunks = this.chunks.get(layerName);
    if (!layerChunks) return;

    const chunkX = Math.floor(tx / CHUNK_SIZE);
    const chunkY = Math.floor(ty / CHUNK_SIZE);
    const chunkKey = `${chunkX},${chunkY}`;

    const chunk = layerChunks.get(chunkKey);
    if (chunk) {
      chunk.isDirty = true;

      // Re-render immediately if visible
      if (this.visibleChunks.has(chunkKey)) {
        const layer = this.tileMap.getLayer(layerName);
        if (layer) {
          this.renderChunk(chunk, layer);
        }
      }
    }
  }

  /**
   * Rebuild a specific layer (when tiles change)
   */
  public rebuildLayer(layerName: string): void {
    const layerChunks = this.chunks.get(layerName);
    const layer = this.tileMap.getLayer(layerName);

    if (!layerChunks || !layer) {
      return;
    }

    // Mark all chunks as dirty and re-render visible ones
    for (const [chunkKey, chunk] of layerChunks.entries()) {
      chunk.isDirty = true;
      if (this.visibleChunks.has(chunkKey)) {
        this.renderChunk(chunk, layer);
      }
    }
  }

  /**
   * Rebuild all layers
   */
  public rebuildAll(): void {
    for (const layerName of this.chunks.keys()) {
      this.rebuildLayer(layerName);
    }
  }
}
