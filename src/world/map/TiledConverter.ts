import { TileLayer, TileMap, type TileId, type Tile } from "./TileMap";

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
const FLIPPED_VERTICALLY_FLAG = 0x40000000;
const FLIPPED_DIAGONALLY_FLAG = 0x20000000;
const FLIPPED_BITS_MASK =
  FLIPPED_HORIZONTALLY_FLAG | FLIPPED_VERTICALLY_FLAG | FLIPPED_DIAGONALLY_FLAG;

type TiledProperty =
  | {
      name: string;
      type: "string";
      value: string;
    }
  | {
      name: string;
      type: "int" | "float";
      value: number;
    }
  | {
      name: string;
      type: "bool";
      value: boolean;
    };

type TiledTile = {
  id: number;
  properties?: TiledProperty[];
};

type TiledTileset = {
  firstgid: number;
  name: string;
  tilecount: number;
  tilewidth: number;
  tileheight: number;
  tiles?: TiledTile[];
  columns: number;
  source?: string;
};

type TiledLayerBase = {
  id: number;
  name: string;
  type: "tilelayer" | "objectgroup" | "imagelayer" | "group";
  opacity: number;
  visible: boolean;
  properties?: TiledProperty[];
};

type TiledTileLayer = TiledLayerBase & {
  type: "tilelayer";
  width: number;
  height: number;
  data: number[];
};

type RawTiledLayer = TiledLayerBase | TiledTileLayer;

type TiledMap = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: RawTiledLayer[];
  tilesets: TiledTileset[];
};

type TileMetadata = {
  tileId: TileId;
  collides: boolean;
};

type LayerKind = "tile" | "collision" | "ignore";

type LayerConfig = {
  kind?: LayerKind;
  zIndex?: number;
  collides?: boolean;
};

export type TiledConverterOptions = {
  /**
   * Default tile id for empty cells (gid 0).
   */
  defaultTileId: TileId;
  /**
   * Property name attached to Tiled tiles that stores the engine tile id.
   * Defaults to `tileId`.
   */
  tileIdProperty?: string;
  /**
   * Property name attached to Tiled tiles that marks collidable tiles.
   * Defaults to `collides`.
   */
  collidesProperty?: string;
  /**
   * Property name attached to Tiled layers that defines their kind.
   * Supported values: `tile`, `collision`, `ignore`.
   * Defaults to `wayfare:kind`.
   */
  layerKindProperty?: string;
  /**
   * Property name attached to Tiled layers that overrides z-index ordering.
   * Defaults to `wayfare:zIndex`.
   */
  layerZIndexProperty?: string;
  /**
   * Optional per-layer overrides keyed by layer name.
   */
  layerOverrides?: Record<string, LayerConfig>;
};

const DEFAULT_OPTIONS: Required<
  Omit<TiledConverterOptions, "defaultTileId" | "layerOverrides">
> = {
  tileIdProperty: "tileId",
  collidesProperty: "collides",
  layerKindProperty: "wayfare:kind",
  layerZIndexProperty: "wayfare:zIndex",
};

export class TiledConverter {
  static fromJSON(
    json: string | TiledMap,
    options: TiledConverterOptions,
  ): TileMap {
    if (typeof json === "string") {
      return this.fromJSON(JSON.parse(json) as TiledMap, options);
    }
    return this.fromTiled(json, options);
  }

  private static fromTiled(
    data: TiledMap,
    options: TiledConverterOptions,
  ): TileMap {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (opts.layerOverrides) {
      // no-op, typed for clarity
    }

    if (data.tilewidth !== data.tileheight) {
      throw new Error(
        `Expected square tiles, got ${data.tilewidth}x${data.tileheight}`,
      );
    }

    const tileMetadata = this.buildTileMetadata(
      data,
      opts.tileIdProperty,
      opts.collidesProperty,
    );

    const collisionGrid = new Uint8Array(data.width * data.height);
    const tileLayers: TileLayer[] = [];

    data.layers.forEach((layer, index) => {
      if (layer.type !== "tilelayer") {
        return;
      }
      if (!layer.visible) return;

      const override = opts.layerOverrides?.[layer.name];
      const layerKind = this.resolveLayerKind(
        layer,
        opts.layerKindProperty,
        override?.kind,
      );

      if (layerKind === "ignore") {
        return;
      }

      const zIndex =
        override?.zIndex ??
        this.resolveLayerZIndex(layer, opts.layerZIndexProperty, index);
      const collides = override?.collides ?? layerKind === "collision";

      const tiles = this.convertLayerTiles(
        layer,
        data.width,
        opts.defaultTileId,
        tileMetadata,
        collisionGrid,
        collides,
        opts.tileIdProperty,
      );

      if (layerKind === "tile") {
        tileLayers.push(
          new TileLayer(layer.name, data.width, data.height, tiles, { zIndex }),
        );
      }
    });

    if (!tileLayers.length) {
      throw new Error(
        "No visible tile layers were converted from the Tiled map",
      );
    }

    return new TileMap(
      data.width,
      data.height,
      data.tilewidth,
      tileLayers,
      collisionGrid,
    );
  }

  private static buildTileMetadata(
    data: TiledMap,
    tileIdProperty: string,
    collidesProperty: string,
  ): Map<number, TileMetadata> {
    const metadata = new Map<number, TileMetadata>();

    data.tilesets.forEach((tileset) => {
      if (tileset.source) {
        throw new Error(
          `Tileset "${tileset.name}" is referenced via "${tileset.source}". Enable "Embed tilesets" in Tiled before exporting.`,
        );
      }
      if (!tileset.tiles) return;

      tileset.tiles.forEach((tile) => {
        if (!tile.properties) return;
        const tileIdValue = this.getProperty<string>(
          tile.properties,
          tileIdProperty,
        );
        if (!tileIdValue) {
          throw new Error(
            `Tileset "${tileset.name}" tile ${tile.id} is missing property "${tileIdProperty}"`,
          );
        }

        const collidesValue =
          this.getProperty<boolean>(tile.properties, collidesProperty) ?? false;

        const gid = tileset.firstgid + tile.id;
        metadata.set(gid, {
          tileId: tileIdValue as TileId,
          collides: collidesValue,
        });
      });
    });

    return metadata;
  }

  private static resolveLayerKind(
    layer: TiledTileLayer,
    propertyName: string,
    override?: LayerKind,
  ): LayerKind {
    if (override) return override;
    const property = layer.properties
      ? this.getProperty<string>(layer.properties, propertyName)
      : undefined;
    if (!property) return "tile";
    if (
      property === "tile" ||
      property === "collision" ||
      property === "ignore"
    ) {
      return property;
    }
    throw new Error(
      `Layer "${layer.name}" has unsupported kind "${property}". Expected "tile", "collision", or "ignore".`,
    );
  }

  private static resolveLayerZIndex(
    layer: TiledTileLayer,
    propertyName: string,
    fallbackIndex: number,
  ): number {
    if (!layer.properties) return fallbackIndex;
    const value = this.getProperty<number>(layer.properties, propertyName);
    if (value === undefined) return fallbackIndex;
    return value;
  }

  private static convertLayerTiles(
    layer: TiledTileLayer,
    mapWidth: number,
    defaultTileId: TileId,
    metadata: Map<number, TileMetadata>,
    collisionGrid: Uint8Array,
    markLayerCollision: boolean,
    tileIdProperty: string,
  ): Tile[] {
    if (layer.data.length !== layer.width * layer.height) {
      throw new Error(
        `Layer "${layer.name}" expected ${layer.width * layer.height} tiles, got ${layer.data.length}`,
      );
    }

    const tiles: Tile[] = new Array(layer.data.length);

    layer.data.forEach((gidWithFlags, index) => {
      const baseGid = gidWithFlags & ~FLIPPED_BITS_MASK;

      if (baseGid === 0) {
        tiles[index] = { tileId: defaultTileId };
        return;
      }

      const tileMeta = metadata.get(baseGid);
      if (!tileMeta) {
        throw new Error(
          `Layer "${layer.name}" references tile GID ${baseGid} with no metadata mapping. Did you set the "${tileIdProperty}" property on that tile?`,
        );
      }
      if ((gidWithFlags & FLIPPED_BITS_MASK) !== 0) {
        throw new Error(
          `Layer "${layer.name}" uses flipped/rotated tile GID ${gidWithFlags}, which is not supported yet.`,
        );
      }

      tiles[index] = { tileId: tileMeta.tileId };

      if (markLayerCollision || tileMeta.collides) {
        const collisionIndex = index;
        collisionGrid[collisionIndex] = 1;
      }
    });

    if (layer.width !== mapWidth) {
      throw new Error(
        `Layer "${layer.name}" width ${layer.width} does not match map width ${mapWidth}`,
      );
    }

    return tiles;
  }

  private static getProperty<T>(
    properties: TiledProperty[],
    name: string,
  ): T | undefined {
    const prop = properties.find((p) => p.name === name);
    if (!prop) return undefined;
    return prop.value as T;
  }
}
