import { AnimatedSprite, Graphics, Sprite } from "pixi.js";
import { Keys } from "../../input/Keyboard";
import { Entity } from "./Entity";
import { getActionIntent } from "../../input/Intent";
import { Direction, DirectionalFrames } from "./SpriteLoader";
import { vectorToDirection } from "./DirectionHelper";
import { PlayerStats } from "./PlayerStats";
import { JumpState } from "./jumping/JumpState";
import { JumpPhysics } from "./jumping/JumpPhysics";
import { JumpVisuals } from "./jumping/JumpVisuals";

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

  /** Air control (while jumping) */
  airControlFactor?: number; // 0-1, multiplier for acceleration in air (default: 0.6)
  airDragFactor?: number; // 0-1, multiplier for drag in air (default: 0.67)
};

export class Player extends Entity {
  public readonly stats = new PlayerStats();

  // Jump system (SOLID composition)
  private readonly jumpState: JumpState;
  private readonly jumpPhysics: JumpPhysics;
  private readonly jumpVisuals: JumpVisuals;

  private shadow: Graphics;
  private sprite: Sprite | AnimatedSprite;
  private directionalSprites?: DirectionalFrames;
  private readonly readKeys: () => Keys;
  private readonly isBlocked?: (worldX: number, worldY: number) => boolean;
  private lastMoveDir = { x: 1, y: 0 }; // persists when not moving (for sprite management)
  private currentDirection: Direction = "down";
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private readonly animationSpeedNormalMs: number = 150; // Normal walk animation
  private readonly animationSpeedSprintMs: number = 80; // Faster when sprinting
  private isMoving: boolean = false;
  private isSprinting: boolean = false;
  private wasJumpPressed: boolean = false; // Track previous frame's jump input

  // Hitbox configuration
  private readonly hitboxWidth: number;
  private readonly hitboxHeight: number;
  private readonly hitboxOffsetX: number;
  private readonly hitboxOffsetY: number;

  // tuning
  private maxSpeed: number;
  private accel: number;
  private drag: number;

  // air control
  private readonly airControlFactor: number; // Reduced acceleration in air
  private readonly airDragFactor: number; // Reduced drag in air

  // sprint
  private readonly sprintMultiplier = 1.5;
  private readonly staminaDrainRate = 20; // stamina per second while sprinting

  constructor(sprite: Sprite | AnimatedSprite, opts: PlayerOptions) {
    const zIndex = 10;
    super(zIndex);

    // Create shadow (ellipse underneath the sprite)
    this.shadow = new Graphics();
    this.shadow.ellipse(0, 0, 6, 3); // 12px wide, 6px tall ellipse
    this.shadow.fill({ color: 0x000000, alpha: 0.3 });
    this.shadow.y = 14; // Position shadow below sprite center (at feet)
    this.add(this.shadow);

    // Add sprite on top of shadow
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

    // Air control configuration (balanced feel)
    this.airControlFactor = opts.airControlFactor ?? 0.6; // 60% accel in air
    this.airDragFactor = opts.airDragFactor ?? 0.67; // 67% drag in air

    // Initialize jump system
    this.jumpState = new JumpState();
    this.jumpPhysics = new JumpPhysics({
      gravity: 1200, // Increased from 800 for faster fall
      jumpStrength: 280, // Slightly increased to compensate
      maxHeight: 24, // Reduced from 32 (1.5 tiles instead of 2)
      hangTimeFactor: 0.2, // Reduced from 0.3 for less hang time
    });
    this.jumpVisuals = new JumpVisuals(this.sprite, this.shadow, {
      shadowScaleMin: 0.5,
      shadowAlphaMin: 0.15,
      shadowAlphaMax: 0.3,
      squashAmount: 0.15,
      squashDuration: 100,
    });
  }

  update(dt: number) {
    const keys = this.readKeys();
    const intent = getActionIntent(keys);

    const dtSec = dt / 60;
    const dtMs = dtSec * 1000;

    const { x: moveX, y: moveY } = intent.move;
    if (moveX || moveY) this.lastMoveDir = { x: moveX, y: moveY };

    // Determine if player is moving
    const isMoving = moveX !== 0 || moveY !== 0;

    // Handle jump input
    this.handleJumpInput(intent.jump);

    // Update jump physics
    this.jumpPhysics.update(dtSec, this.jumpState.getPhase());
    this.jumpState.update(
      dtMs,
      this.jumpPhysics.getHeight(),
      this.jumpPhysics.getVelocity(),
    );

    // Update jump visuals
    this.jumpVisuals.update(
      dtMs,
      this.jumpPhysics.getHeightRatio(),
      this.jumpState.getPhase(),
    );

    // Handle sprinting and stamina
    let isSprinting = false;
    if (intent.sprint && isMoving && this.stats.currentStamina > 0) {
      isSprinting = true;
      // Drain stamina while sprinting
      this.stats.currentStamina = Math.max(
        0,
        this.stats.currentStamina - this.staminaDrainRate * dtSec,
      );
    } else {
      // Regenerate stamina when not sprinting
      this.stats.regenerateStamina(dtSec);
    }

    // Store sprint state for animation
    this.isSprinting = isSprinting;

    // Update animation
    this.updateAnimation(isMoving, dtSec);

    // Apply air control modifiers when jumping
    const isAirborne = this.jumpState.isAirborne();
    const accelMultiplier = isAirborne ? this.airControlFactor : 1.0;
    const dragMultiplier = isAirborne ? this.airDragFactor : 1.0;

    // accelerate toward intent (reduced in air)
    const effectiveAccel = this.accel * accelMultiplier;
    const ax = moveX * effectiveAccel * dtSec;
    const ay = moveY * effectiveAccel * dtSec;
    this.vx += ax;
    this.vy += ay;

    // apply drag (reduced in air for momentum preservation)
    const effectiveDrag = this.drag * dragMultiplier;
    const dragFactor = Math.exp(-effectiveDrag * dtSec); // frame-rate independent
    this.vx *= dragFactor;
    this.vy *= dragFactor;

    // clamp max speed (doubled when sprinting)
    const effectiveMaxSpeed = isSprinting
      ? this.maxSpeed * this.sprintMultiplier
      : this.maxSpeed;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > effectiveMaxSpeed) {
      const s = effectiveMaxSpeed / speed;
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
   * Handle jump input with buffering and coyote time
   * Only jumps on initial press, not while held
   */
  private handleJumpInput(jumpPressed: boolean): void {
    // Detect jump press (rising edge - wasn't pressed last frame, is pressed now)
    const jumpJustPressed = jumpPressed && !this.wasJumpPressed;

    if (jumpJustPressed) {
      if (this.jumpState.canJump()) {
        // Initiate jump
        this.jumpPhysics.jump();
        this.jumpState.startJump();
      } else if (this.jumpState.isAirborne()) {
        // Buffer jump for landing
        this.jumpState.bufferJump();
      }
    }

    // Execute buffered jump on landing (only if still pressing)
    if (
      this.jumpState.isGrounded() &&
      this.jumpState.hasBufferedJump() &&
      jumpPressed
    ) {
      this.jumpPhysics.jump();
      this.jumpState.startJump();
    }

    // Store current state for next frame
    this.wasJumpPressed = jumpPressed;
  }

  /**
   * Get current jump height (for collision checking)
   */
  public getJumpHeight(): number {
    return this.jumpPhysics.getHeight();
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

      // Choose animation speed based on sprint state
      const animationSpeed = this.isSprinting
        ? this.animationSpeedSprintMs
        : this.animationSpeedNormalMs;

      // Advance to next frame after delay
      if (this.animationTimer >= animationSpeed) {
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
