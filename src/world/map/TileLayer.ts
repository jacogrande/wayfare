import { Tile } from "./Tile";

export class TileLayer {
  public readonly name: string;
  public readonly width: number;
  public readonly height: number;
  public readonly zIndex: number;
  private readonly tiles: Tile[][];

  constructor(name: string, width: number, height: number, zIndex: number = 0) {
    this.name = name;
    this.width = width;
    this.height = height;
    this.zIndex = zIndex;
    this.tiles = new Array(height)
      .fill(null)
      .map(() => new Array(width).fill(null).map(() => ({ id: "empty" })));
  }

  getTile(x: number, y: number) {
    // check bounds
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.tiles[y][x];
  }

  setTile(x: number, y: number, tile: Tile) {
    // check bounds
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    this.tiles[y][x] = tile;
  }

  fill(tile: Tile) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x] = tile;
      }
    }
  }
}
