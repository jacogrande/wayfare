import { DEFAULTS } from "./constants";
import { TileLayer } from "./TileLayer";
import { TileConfig } from "./TileConfig";
import { Tile } from "./Tile";

export class TileMap {
  private readonly width: number;
  private readonly height: number;
  public readonly tileSizePx: number;
  private readonly layers: Map<string, TileLayer>;
  private readonly collisionGrid: Uint8Array;

  constructor(
    width: number,
    height: number,
    tileSize: number = DEFAULTS.TILE_SIZE,
  ) {
    this.width = width;
    this.height = height;
    this.tileSizePx = tileSize;
    this.layers = new Map();
    this.collisionGrid = new Uint8Array(width * height);
  }

  /** Add a layer to the map */
  addLayer(layer: TileLayer): void {
    this.layers.set(layer.name, layer);
  }

  /** Get a layer by name */
  getLayer(name: string): TileLayer | undefined {
    return this.layers.get(name);
  }

  /** Get all layers sorted by z-index */
  getAllLayers(): TileLayer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  /** Check if a tile position is blocked */
  isBlocked(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) {
      return true; // Out of bounds = blocked
    }
    const index = ty * this.width + tx;
    // Check collision grid
    return this.collisionGrid[index] !== 0;
  }

  /** Get the tile at a specific position (checks all layers, returns first non-empty) */
  getTileAt(tx: number, ty: number): Tile | null {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) {
      return null;
    }

    // Check layers from top to bottom (highest z-index first)
    const layers = this.getAllLayers().reverse();
    for (const layer of layers) {
      const tile = layer.getTile(tx, ty);
      if (tile && tile.id !== "empty") {
        return tile;
      }
    }

    return null;
  }

  /**
   * Update collision grid based on tile configuration
   * Call this after placing/removing tiles to sync collision
   */
  syncCollisionFromTiles(): void {
    // Clear collision grid
    this.collisionGrid.fill(0);

    // Iterate through all tiles and set collision based on tile config
    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        const tile = this.getTileAt(tx, ty);
        if (tile && TileConfig.blocksMovement(tile.id)) {
          this.setCollision(tx, ty, true);
        }
      }
    }
  }

  /** Set collision at tile position */
  setCollision(tx: number, ty: number, blocked: boolean): void {
    if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
      const index = ty * this.width + tx;
      this.collisionGrid[index] = blocked ? 1 : 0;
    }
  }

  /**
   * Convert world position to tile coordinates
   */
  worldToTile(worldX: number, worldY: number): { tx: number; ty: number } {
    return {
      tx: Math.floor(worldX / this.tileSizePx),
      ty: Math.floor(worldY / this.tileSizePx),
    };
  }

  /**
   * Convert tile coordinates to world position (center of tile)
   */
  tileToWorld(tx: number, ty: number): { x: number; y: number } {
    return {
      x: tx * this.tileSizePx + this.tileSizePx / 2,
      y: ty * this.tileSizePx + this.tileSizePx / 2,
    };
  }

  /**
   * Get world size in pixels
   */
  getWorldSize(): { width: number; height: number } {
    return {
      width: this.width * this.tileSizePx,
      height: this.height * this.tileSizePx,
    };
  }

  static createTestMap(width: number, height: number): TileMap {
    const map = new TileMap(width, height, 16);

    // Create ground layer (z-index: 0)
    const ground = new TileLayer("ground", width, height, 0);
    ground.fill({ id: "grass" });
    map.addLayer(ground);

    // Create walls layer (z-index: 10)
    const walls = new TileLayer("walls", width, height, 10);
    // Add border walls
    for (let x = 0; x < width; x++) {
      walls.setTile(x, 0, { id: "water" });
      walls.setTile(x, height - 1, { id: "water" });
      map.setCollision(x, 0, true);
      map.setCollision(x, height - 1, true);
    }
    for (let y = 0; y < height; y++) {
      walls.setTile(0, y, { id: "water" });
      walls.setTile(width - 1, y, { id: "water" });
      map.setCollision(0, y, true);
      map.setCollision(width - 1, y, true);
    }
    map.addLayer(walls);

    // Create objects layer (z-index: 5 - renders above ground, below walls)
    const objects = new TileLayer("objects", width, height, 5);
    // Add some example objects (rocks and trees scattered around)
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * (width - 4)) + 2;
      const y = Math.floor(Math.random() * (height - 4)) + 2;
      const tileType = Math.random() > 0.5 ? "rock" : "tree";
      objects.setTile(x, y, { id: tileType });
      // Collision is determined by TileConfig, not set manually
    }
    // Add a few logs
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.random() * (width - 4)) + 2;
      const y = Math.floor(Math.random() * (height - 4)) + 2;
      objects.setTile(x, y, { id: "log" });
      // Collision is determined by TileConfig, not set manually
    }
    map.addLayer(objects);

    // Sync collision grid from tile configuration
    map.syncCollisionFromTiles();

    return map;
  }
}
