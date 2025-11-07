import { Assets, Container, Sprite } from "pixi.js";
import Keyboard from "../input/Keyboard";
import { Player } from "./entities/Player";
import { TileMap } from "./map/TileMap";
import { TileMapRenderer } from "./map/TileMapRenderer";
import { loadTileset, OVERWORLD_TILESET } from "./map/Tilesets";
import { loadWalkCycleSprites } from "./entities/SpriteLoader";
import { canJumpOver } from "./map/TileHeights";

/**
 * World object responsible for containing maps, entities, viewports
 */
export class World {
  private container = new Container();
  private player!: Player;
  private tileMapRenderer?: TileMapRenderer;
  private tileMapData?: TileMap;

  constructor() {
    this.container.sortableChildren = true;
  }

  //========= GETTERS =========//
  getWorldRoot() {
    return this.container;
  }

  getPlayer() {
    return this.player;
  }

  getPlayerRoot() {
    return this.player.root;
  }

  getPlayerPosition() {
    return this.player.root.position;
  }

  getTileMapRenderer(): TileMapRenderer | undefined {
    return this.tileMapRenderer;
  }

  /**
   * Check if a world position is blocked by collision
   * Takes into account jump height to allow jumping over obstacles
   */
  isBlocked(worldX: number, worldY: number): boolean {
    if (!this.tileMapData) return false;

    const { tx, ty } = this.tileMapData.worldToTile(worldX, worldY);
    const isBlockedTile = this.tileMapData.isBlocked(tx, ty);

    if (!isBlockedTile) return false;

    // Check if player can jump over this obstacle
    const jumpHeight = this.player?.getJumpHeight() ?? 0;
    if (jumpHeight > 0) {
      // Get the tile at this position to check its height
      const tile = this.tileMapData.getTileAt(tx, ty);
      if (tile && canJumpOver(tile.id, jumpHeight)) {
        return false; // Can jump over this obstacle
      }
    }

    return true; // Blocked
  }

  /**
   * Get world size in pixels for viewport clamping
   */
  getWorldSize(): { width: number; height: number } {
    if (!this.tileMapData) {
      return { width: 0, height: 0 };
    }
    return this.tileMapData.getWorldSize();
  }

  //========= INITIALIZATION =========//
  async start() {
    //========= CREATE TILEMAP =========//
    // Load tileset textures
    const tileTextures = await loadTileset(
      "/gfx/Overworld.png",
      OVERWORLD_TILESET,
      16,
    );

    // Create test map (50x50 tiles, 800x800 pixels)
    this.tileMapData = TileMap.createTestMap(50, 50);

    // Create renderer with chunking/culling
    this.tileMapRenderer = new TileMapRenderer(this.tileMapData, tileTextures);

    // Add tilemap to bottom layer
    this.container.addChildAt(this.tileMapRenderer.root, 0);

    //========= CREATE PLAYER =========//
    // Load walk cycle sprites (4x4 grid, each sprite is 16x32)
    // Row order: down, right, up, left (determined by testing)
    const dirFrames = await loadWalkCycleSprites("/gfx/NPC_test2.png", 16, 32, [
      "down", // Row 0: correct
      "right", // Row 1: was showing as "left"
      "up", // Row 2: was showing as "right"
      "left", // Row 3: was showing as "up"
    ]);
    const playerSprite = new Sprite(dirFrames.down[0]);

    // Scale to 1.5 tiles (24px) - adjust based on bunny texture size
    const targetSize = 24; // 1.5 tiles * 16px
    const scale = targetSize / playerSprite.width;
    playerSprite.scale.set(scale);

    this.player = new Player(playerSprite, {
      readKeys: Keyboard.getKeys,
      isBlocked: this.isBlocked.bind(this),
      directionalSprites: dirFrames,
      // Hitbox: smaller than sprite, focused on feet/lower body
      hitboxWidth: 12, // Narrower than sprite (16px scaled to 24px)
      hitboxHeight: 8, // Just the bottom portion for feet
      hitboxOffsetX: 0, // Centered horizontally
      hitboxOffsetY: 8, // Offset down toward feet (half of sprite height / 2)
      maxSpeed: 150,
      drag: 12,
      accel: 5000,
      // Air control for momentum preservation during jumps
      airControlFactor: 0.6, // 60% control in air
      airDragFactor: 0.2, // Much lower drag in air (preserves momentum)
    });
    // Center player in world
    const worldSize = this.getWorldSize();
    this.player.setPosition(worldSize.width / 2, worldSize.height / 2);
    this.container.addChild(this.player.root);
  }

  //========= MAIN UPDATE LOOP =========//
  update(deltaFrames: number) {
    this.player.update(deltaFrames);
  }
}
