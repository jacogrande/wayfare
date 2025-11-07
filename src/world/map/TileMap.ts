import { DEFAULTS } from "./constants";
import { TileLayer } from "./TileLayer";

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
    // Create ground layer
    const ground = new TileLayer("ground", width, height, 0);
    ground.fill({ id: "grass" });
    map.addLayer(ground);
    // Create walls layer
    const walls = new TileLayer("water", width, height, 10);
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
    return map;
  }
}
