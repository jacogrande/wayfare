import { AnimatedSprite, Sprite } from "pixi.js";
import { Keys } from "../../input/Keyboard";
import { Entity } from "./Entity";
import { getActionIntent } from "../../input/Intent";

export type PlayerOptions = {
  /** Called each frame to read current key state */
  readKeys: () => Keys;

  /** Tunables */
  maxSpeed?: number; // px/sec
  accel?: number; // px/sec^2
  drag?: number; // 0..1 per second
};

export class Player extends Entity {
  private sprite: Sprite | AnimatedSprite;
  private readonly readKeys: () => Keys;
  private lastMoveDir = { x: 1, y: 0 }; // persists when not moving (for sprite management)

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

    this.readKeys = opts.readKeys;

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

    // pixel-perfect snap
    this.setPosition(Math.round(newX), Math.round(newY));
  }
}
