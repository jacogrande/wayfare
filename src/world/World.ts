import { Assets, Container, Rectangle, Sprite } from "pixi.js";
import { Player } from "./entities/Player";
import Keyboard from "../input/Keyboard";
import { TileMap } from "./map/TileMap";
import { TileMapRenderer } from "./map/TileMapRenderer";

/**
 * World object responsible for containing maps, entities, viewports
 */
export class World {
  private container = new Container();
  private player!: Player;
  private tileMap!: TileMap;
  private tileMapView!: TileMapRenderer;

  constructor() {
    this.container.sortableChildren = true;
  }

  //========= GETTERS =========//
  getWorldRoot() {
    return this.container;
  }

  getPlayerRoot() {
    return this.player.root;
  }

  getPlayerPosition() {
    return this.player.root.position;
  }

  getWorldSize() {
    return {
      width: this.tileMap.getWorldWidth(),
      height: this.tileMap.getWorldHeight(),
    };
  }

  //========= INITIALIZATION =========//
  async start() {
    //========= BUILD WORLD MAP =========//
    const tilesWide = 64;
    const tilesHigh = 64;
    const tileSize = 16;
    this.tileMap = TileMap.createUniform(
      tilesWide,
      tilesHigh,
      tileSize,
      "grass",
    );
    this.tileMapView = new TileMapRenderer(this.tileMap);
    this.container.addChild(this.tileMapView.root);
    await this.tileMapView.init();

    //========= CREATE PLAYER =========//
    const texture = await Assets.load("/assets/bunny.png");
    texture.source.scaleMode = "nearest";
    const playerSprite = new Sprite(texture);
    this.player = new Player(playerSprite, {
      readKeys: Keyboard.getKeys,
      maxSpeed: 200,
      drag: 12,
      accel: 5000,
    });
    const startX = tileSize * 2 + tileSize / 2;
    const startY = tileSize * 2 + tileSize / 2;
    this.player.setPosition(startX, startY);
    this.container.addChild(this.player.root);
  }

  //========= MAIN UPDATE LOOP =========//
  update(deltaFrames: number) {
    this.player.update(deltaFrames);
    this.constrainPlayerToWorld();
  }

  updateViewArea(viewBounds: Rectangle) {
    this.tileMapView.updateVisibleChunks(viewBounds);
  }

  private constrainPlayerToWorld() {
    const worldWidth = this.tileMap.getWorldWidth();
    const worldHeight = this.tileMap.getWorldHeight();
    const margin = this.tileMap.tileSize / 2;

    const clampedX = Math.min(
      Math.max(this.player.x, margin),
      worldWidth - margin,
    );
    const clampedY = Math.min(
      Math.max(this.player.y, margin),
      worldHeight - margin,
    );

    if (clampedX !== this.player.x || clampedY !== this.player.y) {
      this.player.setPosition(clampedX, clampedY);
    }
  }
}
