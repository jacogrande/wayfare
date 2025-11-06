export type TileId = "grass" | "water" | "path";

export type Tile = {
  tileId: TileId;
};

export type TileLayerOptions = {
  zIndex?: number;
};

export class TileLayer {
  private readonly tiles: Tile[];
  readonly zIndex: number;

  constructor(
    public readonly name: string,
    public readonly width: number,
    public readonly height: number,
    tiles: Tile[],
    options: TileLayerOptions = {},
  ) {
    if (tiles.length !== width * height) {
      throw new Error(
        `TileLayer "${name}" expected ${width * height} tiles, got ${tiles.length}`,
      );
    }
    this.tiles = tiles;
    this.zIndex = options.zIndex ?? 0;
  }

  private index(x: number, y: number) {
    return y * this.width + x;
  }

  inBounds(x: number, y: number) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getTile(x: number, y: number): Tile {
    if (!this.inBounds(x, y)) {
      throw new RangeError(
        `TileLayer "${this.name}" lookup out of bounds: ${x},${y}`,
      );
    }
    return this.tiles[this.index(x, y)];
  }

  forEach(callback: (tile: Tile, x: number, y: number) => void) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        callback(this.tiles[this.index(x, y)], x, y);
      }
    }
  }
}

export class TileMap {
  private readonly layers = new Map<string, TileLayer>();
  private readonly orderedLayers: TileLayer[];
  private readonly collisionGrid: Uint8Array;

  constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly tileSize: number,
    layers: TileLayer[],
    collisionGrid?: Uint8Array,
  ) {
    layers.forEach((layer) => this.layers.set(layer.name, layer));
    this.orderedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    if (collisionGrid && collisionGrid.length !== width * height) {
      throw new Error(
        `Collision grid expected ${width * height} entries, got ${collisionGrid.length}`,
      );
    }
    this.collisionGrid = collisionGrid ?? new Uint8Array(width * height);
  }

  static createUniform(
    width: number,
    height: number,
    tileSize = 16,
    tileId: TileId = "grass",
  ): TileMap {
    const tiles: Tile[] = Array.from({ length: width * height }, () => ({
      tileId,
    }));

    const groundLayer = new TileLayer("ground", width, height, tiles, {
      zIndex: 0,
    });
    const collision = new Uint8Array(width * height); // all passable
    return new TileMap(width, height, tileSize, [groundLayer], collision);
  }

  getLayer(name: string) {
    const layer = this.layers.get(name);
    if (!layer) {
      throw new Error(`Unknown tile layer "${name}" requested`);
    }
    return layer;
  }

  hasLayer(name: string) {
    return this.layers.has(name);
  }

  forEachLayer(callback: (layer: TileLayer) => void) {
    for (const layer of this.orderedLayers) {
      callback(layer);
    }
  }

  inBounds(tileX: number, tileY: number) {
    return (
      tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height
    );
  }

  isBlocked(tileX: number, tileY: number) {
    if (!this.inBounds(tileX, tileY)) return true;
    const idx = tileY * this.width + tileX;
    return !!this.collisionGrid[idx];
  }

  getWorldWidth() {
    return this.width * this.tileSize;
  }

  getWorldHeight() {
    return this.height * this.tileSize;
  }
}
