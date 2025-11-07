import { JumpPhase } from "./JumpState";

/**
 * Jump physics calculator - handles velocity, gravity, and height
 * Follows Single Responsibility Principle: Only physics calculations
 */
export interface JumpPhysicsConfig {
  gravity?: number; // px/sec²
  jumpStrength?: number; // Initial upward velocity (px/sec)
  maxHeight?: number; // Maximum jump height in pixels
  hangTimeFactor?: number; // Slowdown at peak (0-1, higher = more hang time)
}

export class JumpPhysics {
  private height: number = 0;
  private velocity: number = 0;

  // Configuration (can be tuned for game feel)
  private readonly gravity: number;
  private readonly jumpStrength: number;
  private readonly maxHeight: number;
  private readonly hangTimeFactor: number;

  constructor(config: JumpPhysicsConfig = {}) {
    this.gravity = config.gravity ?? 800; // px/sec²
    this.jumpStrength = config.jumpStrength ?? 250; // px/sec
    this.maxHeight = config.maxHeight ?? 32; // 2 tiles
    this.hangTimeFactor = config.hangTimeFactor ?? 0.3; // 30% slowdown at peak
  }

  /**
   * Get current height
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * Get current velocity
   */
  getVelocity(): number {
    return this.velocity;
  }

  /**
   * Initiate a jump
   */
  jump(): void {
    this.velocity = -this.jumpStrength; // Negative = upward
  }

  /**
   * Update physics for one frame
   */
  update(dtSec: number, phase: JumpPhase): void {
    if (phase === JumpPhase.Grounded || phase === JumpPhase.Landing) {
      this.height = 0;
      this.velocity = 0;
      return;
    }

    // Apply gravity
    this.velocity += this.gravity * dtSec;

    // Apply "hang time" at peak of jump
    if (this.isNearPeak() && this.velocity > 0) {
      this.velocity *= 1 - this.hangTimeFactor;
    }

    // Update height
    this.height -= this.velocity * dtSec; // Negative velocity = going up

    // Clamp to ground
    if (this.height < 0) {
      this.height = 0;
      this.velocity = 0;
    }

    // Clamp to max height
    if (this.height > this.maxHeight) {
      this.height = this.maxHeight;
      this.velocity = Math.max(0, this.velocity); // Start falling
    }
  }

  /**
   * Cut jump short (for variable jump height)
   */
  cancelRise(): void {
    if (this.velocity < 0) {
      this.velocity *= 0.5; // Cut upward velocity in half
    }
  }

  /**
   * Reset physics state
   */
  reset(): void {
    this.height = 0;
    this.velocity = 0;
  }

  /**
   * Check if near peak of jump (for hang time effect)
   */
  private isNearPeak(): boolean {
    return this.height >= this.maxHeight * 0.85;
  }

  /**
   * Get jump progress as ratio (0 = ground, 1 = max height)
   */
  getHeightRatio(): number {
    return Math.min(1, this.height / this.maxHeight);
  }

  /**
   * Check if player can clear an obstacle of given height
   */
  canClearObstacle(obstacleHeight: number, tolerance: number = 0.9): boolean {
    return this.height >= obstacleHeight * tolerance;
  }
}
