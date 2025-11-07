import { AnimatedSprite, Sprite } from "pixi.js";
import { Keys } from "../../input/Keyboard";
import { Entity } from "./Entity";
import { getActionIntent } from "../../input/Intent";
import { Direction, DirectionalFrames } from "./SpriteLoader";
import { vectorToDirection } from "./DirectionHelper";

export type PlayerOptions = {
  /** Called each frame to read current key state */
  readKeys: () => Keys;

  /** Sprite management */
  directionalSprites?: DirectionalFrames;

  /** Check if a world position is blocked */
  isBlocked?: (worldX: number, worldY: number) => boolean;

  /** Hitbox dimensions (defaults to sprite size) */
  hitboxWidth?: number;
  hitboxHeight?: number;
  /** Hitbox offset from center (defaults to centered) */
  hitboxOffsetX?: number;
  hitboxOffsetY?: number;

  /** Tunables */
  maxSpeed?: number; // px/sec
  accel?: number; // px/sec^2
  drag?: number; // 0..1 per second
};

export class Player extends Entity {
  private sprite: Sprite | AnimatedSprite;
  private directionalSprites?: DirectionalFrames;
  private readonly readKeys: () => Keys;
  private readonly isBlocked?: (worldX: number, worldY: number) => boolean;
  private lastMoveDir = { x: 1, y: 0 }; // persists when not moving (for sprite management)
  private currentDirection: Direction = "down";
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private readonly animationSpeedMs: number = 100;
  private isMoving: boolean = false;

  // Hitbox configuration
  private readonly hitboxWidth: number;
  private readonly hitboxHeight: number;
  private readonly hitboxOffsetX: number;
  private readonly hitboxOffsetY: number;

  // tuning
  private maxSpeed: number;
  private accel: number;
  private drag: number;

  constructor(sprite: Sprite | AnimatedSprite, opts: PlayerOptions) {
    const zIndex = 10;
    super(zIndex);
    this.sprite = sprite;
    this.sprite.anchor.set(0.5); // centered
    this.add(this.sprite);

    this.directionalSprites = opts.directionalSprites;

    this.readKeys = opts.readKeys;
    this.isBlocked = opts.isBlocked;

    // Set up hitbox (defaults to sprite dimensions)
    this.hitboxWidth = opts.hitboxWidth ?? this.sprite.width;
    this.hitboxHeight = opts.hitboxHeight ?? this.sprite.height;
    this.hitboxOffsetX = opts.hitboxOffsetX ?? 0;
    this.hitboxOffsetY = opts.hitboxOffsetY ?? 0;

    this.maxSpeed = opts.maxSpeed ?? 150; // px/sec
    this.accel = opts.accel ?? 2000; // px/sec^2
    this.drag = opts.drag ?? 8; // per second
  }

  update(dt: number) {
    const keys = this.readKeys();
    const intent = getActionIntent(keys);

    const dtSec = dt / 60;
    const { x: moveX, y: moveY } = intent.move;
    if (moveX || moveY) this.lastMoveDir = { x: moveX, y: moveY };

    // Determine if player is moving
    const isMoving = moveX !== 0 || moveY !== 0;

    // Update animation
    this.updateAnimation(isMoving, dtSec);

    // accelerate toward intent
    const ax = moveX * this.accel * dtSec;
    const ay = moveY * this.accel * dtSec;
    this.vx += ax;
    this.vy += ay;

    // apply drag
    const dragFactor = Math.exp(-this.drag * dtSec); // frame-rate independent
    this.vx *= dragFactor;
    this.vy *= dragFactor;

    // clamp max speed
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > this.maxSpeed) {
      const s = this.maxSpeed / speed;
      this.vx *= s;
      this.vy *= s;
    }
    // propose movement
    const dx = this.vx * dtSec;
    const dy = this.vy * dtSec;
    const newX = this.x + dx;
    const newY = this.y + dy;

    // check collision with hitbox - try sliding along walls
    if (this.isBlocked) {
      let finalX = newX;
      let finalY = newY;
      let blockedX = false;
      let blockedY = false;

      // Check if diagonal movement is blocked
      if (this.checkCollision(newX, newY)) {
        // Try moving only horizontally
        if (!this.checkCollision(newX, this.y)) {
          finalX = newX;
          finalY = this.y;
          blockedY = true;
        }
        // Try moving only vertically
        else if (!this.checkCollision(this.x, newY)) {
          finalX = this.x;
          finalY = newY;
          blockedX = true;
        }
        // Completely blocked - can't move in either direction
        else {
          finalX = this.x;
          finalY = this.y;
          blockedX = true;
          blockedY = true;
        }
      }

      // Only zero velocity if we actually hit something
      if (blockedX) {
        this.vx = 0;
      }
      if (blockedY) {
        this.vy = 0;
      }

      // pixel-perfect snap
      this.setPosition(Math.round(finalX), Math.round(finalY));
    } else {
      // No collision checking - move freely
      this.setPosition(Math.round(newX), Math.round(newY));
    }
  }

  /**
   * Check if the hitbox at the given position collides with any blocked tiles
   */
  private checkCollision(worldX: number, worldY: number): boolean {
    if (!this.isBlocked) return false;

    // Small epsilon to avoid floating point issues at tile boundaries
    const epsilon = 0.1;

    // Calculate hitbox bounds (shrink slightly inward)
    const left = worldX + this.hitboxOffsetX - this.hitboxWidth / 2 + epsilon;
    const right = worldX + this.hitboxOffsetX + this.hitboxWidth / 2 - epsilon;
    const top = worldY + this.hitboxOffsetY - this.hitboxHeight / 2 + epsilon;
    const bottom = worldY + this.hitboxOffsetY + this.hitboxHeight / 2 - epsilon;

    // Check all four corners and edges
    const checkPoints = [
      { x: left, y: top },      // Top-left
      { x: right, y: top },     // Top-right
      { x: left, y: bottom },   // Bottom-left
      { x: right, y: bottom },  // Bottom-right
      { x: worldX, y: top },    // Top-center
      { x: worldX, y: bottom }, // Bottom-center
      { x: left, y: worldY },   // Left-center
      { x: right, y: worldY },  // Right-center
    ];

    // If any point is blocked, the hitbox collides
    for (const point of checkPoints) {
      if (this.isBlocked(point.x, point.y)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get hitbox bounds for debugging or other systems
   */
  public getHitbox(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  } {
    const worldX = this.x;
    const worldY = this.y;

    return {
      left: worldX + this.hitboxOffsetX - this.hitboxWidth / 2,
      right: worldX + this.hitboxOffsetX + this.hitboxWidth / 2,
      top: worldY + this.hitboxOffsetY - this.hitboxHeight / 2,
      bottom: worldY + this.hitboxOffsetY + this.hitboxHeight / 2,
      width: this.hitboxWidth,
      height: this.hitboxHeight,
    };
  }

  private updateAnimation(isMoving: boolean, dtSec: number) {
    if (!this.directionalSprites || !(this.sprite instanceof Sprite)) return;

    const newDirection = vectorToDirection(
      this.lastMoveDir.x,
      this.lastMoveDir.y,
    );

    // Direction changed - reset animation
    if (newDirection !== this.currentDirection) {
      this.animationFrame = 0;
      this.animationTimer = 0;
      this.currentDirection = newDirection;
    }

    if (!isMoving) {
      // Standing still - use idle frame (frame 0)
      this.animationTimer = 0;
      this.animationFrame = 0;
    } else {
      // Walking - animate through frames
      this.animationTimer += dtSec * 1000; // Convert seconds to milliseconds

      // Advance to next frame after delay
      if (this.animationTimer >= this.animationSpeedMs) {
        this.animationTimer = 0;
        this.animationFrame = (this.animationFrame + 1) % 4; // Cycle: 0→1→2→3→0
      }
    }

    // Update sprite texture
    const frames = this.directionalSprites[this.currentDirection];
    if (frames && frames[this.animationFrame]) {
      this.sprite.texture = frames[this.animationFrame];
    }
  }
}
