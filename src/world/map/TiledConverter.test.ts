import { describe, expect, it } from "bun:test";

import { TiledConverter } from "./TiledConverter";

const TILE_SIZE = 16;

function createBaseMap() {
  return {
    width: 2,
    height: 2,
    tilewidth: TILE_SIZE,
    tileheight: TILE_SIZE,
    tilesets: [
      {
        firstgid: 1,
        name: "terrain",
        tilecount: 2,
        tilewidth: TILE_SIZE,
        tileheight: TILE_SIZE,
        columns: 2,
        tiles: [
          {
            id: 0,
            properties: [{ name: "tileId", type: "string", value: "water" }],
          },
          {
            id: 1,
            properties: [
              { name: "tileId", type: "string", value: "path" },
              { name: "collides", type: "bool", value: true },
            ],
          },
        ],
      },
    ],
    layers: [
      {
        id: 1,
        name: "ground",
        type: "tilelayer" as const,
        width: 2,
        height: 2,
        opacity: 1,
        visible: true,
        data: [1, 0, 0, 0],
        properties: [{ name: "wayfare:kind", type: "string", value: "tile" }],
      },
      {
        id: 2,
        name: "obstacles",
        type: "tilelayer" as const,
        width: 2,
        height: 2,
        opacity: 1,
        visible: true,
        data: [0, 0, 0, 2],
        properties: [
          { name: "wayfare:kind", type: "string", value: "tile" },
          { name: "wayfare:zIndex", type: "int", value: 5 },
        ],
      },
      {
        id: 3,
        name: "collision",
        type: "tilelayer" as const,
        width: 2,
        height: 2,
        opacity: 1,
        visible: true,
        data: [2, 0, 0, 0],
        properties: [
          { name: "wayfare:kind", type: "string", value: "collision" },
        ],
      },
    ],
  };
}

describe("TiledConverter", () => {
  it("converts tile layers, preserves z-order, and populates collision grid", () => {
    const mapData = createBaseMap();
    const map = TiledConverter.fromJSON(mapData, { defaultTileId: "grass" });

    expect(map.width).toBe(2);
    expect(map.height).toBe(2);
    expect(map.tileSize).toBe(TILE_SIZE);

    const ground = map.getLayer("ground");
    const obstacles = map.getLayer("obstacles");

    expect(ground.zIndex).toBe(0);
    expect(obstacles.zIndex).toBe(5);

    expect(ground.getTile(0, 0).tileId).toBe("water");
    expect(ground.getTile(1, 1).tileId).toBe("grass");

    expect(obstacles.getTile(1, 1).tileId).toBe("path");
    expect(map.isBlocked(1, 1)).toBe(true);
    expect(map.isBlocked(0, 0)).toBe(true); // collision layer marks this cell
    expect(map.isBlocked(1, 0)).toBe(false);

    expect(() => map.getLayer("collision")).toThrow(
      /Unknown tile layer "collision"/,
    );
  });

  it("allows overriding layer behavior via options", () => {
    const mapData = createBaseMap();
    mapData.layers[1].properties = [
      { name: "wayfare:kind", type: "string", value: "tile" },
    ];

    const mapWithOverrides = TiledConverter.fromJSON(mapData, {
      defaultTileId: "grass",
      layerOverrides: {
        obstacles: { zIndex: 7, collides: true },
      },
    });

    const overridden = mapWithOverrides.getLayer("obstacles");
    expect(overridden.zIndex).toBe(7);
    expect(mapWithOverrides.isBlocked(1, 1)).toBe(true);

    const ignored = TiledConverter.fromJSON(createBaseMap(), {
      defaultTileId: "grass",
      layerOverrides: {
        obstacles: { kind: "ignore" },
      },
    });

    expect(() => ignored.getLayer("obstacles")).toThrow(
      /Unknown tile layer "obstacles"/,
    );
  });

  it("throws when encountering flipped tiles", () => {
    const mapData = createBaseMap();
    const flipped = (0x80000000 | 1) >>> 0;
    mapData.layers[0] = {
      ...mapData.layers[0],
      data: [flipped, 0, 0, 0],
    };

    expect(() =>
      TiledConverter.fromJSON(mapData, { defaultTileId: "grass" }),
    ).toThrow(/flipped\/rotated tile/i);
  });
});
