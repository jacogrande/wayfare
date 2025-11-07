import { Graphics, Sprite } from "pixi.js";
import { JumpPhase } from "./JumpState";

/**
 * Jump visual effects - handles shadow scaling, sprite offset, and animations
 * Follows Single Responsibility Principle: Only visual effects
 */
export interface JumpVisualsConfig {
  shadowScaleMin?: number; // Min shadow scale at peak (0-1)
  shadowAlphaMin?: number; // Min shadow alpha at peak (0-1)
  shadowAlphaMax?: number; // Max shadow alpha when grounded (0-1)
  squashAmount?: number; // Squash factor on landing (0-1)
  squashDuration?: number; // Duration of squash animation (ms)
}

export class JumpVisuals {
  private sprite: Sprite;
  private shadow: Graphics;
  private squashTimer: number = 0;
  private baseScaleX: number = 1;
  private baseScaleY: number = 1;

  // Configuration
  private readonly shadowScaleMin: number;
  private readonly shadowAlphaMin: number;
  private readonly shadowAlphaMax: number;
  private readonly squashAmount: number;
  private readonly squashDuration: number;

  constructor(
    sprite: Sprite,
    shadow: Graphics,
    config: JumpVisualsConfig = {},
  ) {
    this.sprite = sprite;
    this.shadow = shadow;

    // Store base scales
    this.baseScaleX = sprite.scale.x;
    this.baseScaleY = sprite.scale.y;

    // Configuration
    this.shadowScaleMin = config.shadowScaleMin ?? 0.5; // 50% at max height
    this.shadowAlphaMin = config.shadowAlphaMin ?? 0.15;
    this.shadowAlphaMax = config.shadowAlphaMax ?? 0.3;
    this.squashAmount = config.squashAmount ?? 0.15; // 15% squash
    this.squashDuration = config.squashDuration ?? 100; // 100ms
  }

  /**
   * Update visual effects based on jump state
   */
  update(dtMs: number, heightRatio: number, phase: JumpPhase): void {
    // Update sprite vertical offset (negative Y = up)
    const height = heightRatio * 32; // Assuming max height is 32px
    this.sprite.y = -height;

    // Update shadow effects
    this.updateShadow(heightRatio);

    // Update squash animation
    if (this.squashTimer > 0) {
      this.updateSquash(dtMs);
    }

    // Trigger landing squash
    if (phase === JumpPhase.Landing && this.squashTimer === 0) {
      this.triggerLandingSquash();
    }
  }

  /**
   * Update shadow scale and opacity based on height
   */
  private updateShadow(heightRatio: number): void {
    // Shadow shrinks as player goes higher
    const scaleRange = 1.0 - this.shadowScaleMin;
    const scale = 1.0 - heightRatio * scaleRange;
    this.shadow.scale.set(scale);

    // Shadow fades as player goes higher
    const alphaRange = this.shadowAlphaMax - this.shadowAlphaMin;
    const alpha = this.shadowAlphaMax - heightRatio * alphaRange;
    this.shadow.alpha = alpha;
  }

  /**
   * Trigger landing squash animation
   */
  private triggerLandingSquash(): void {
    this.squashTimer = this.squashDuration;

    // Squash sprite vertically, stretch horizontally
    this.sprite.scale.y = this.baseScaleY * (1 - this.squashAmount);
    this.sprite.scale.x = this.baseScaleX * (1 + this.squashAmount);
  }

  /**
   * Update squash animation over time
   */
  private updateSquash(dtMs: number): void {
    this.squashTimer -= dtMs;

    if (this.squashTimer <= 0) {
      // Animation complete - reset to base scale
      this.sprite.scale.x = this.baseScaleX;
      this.sprite.scale.y = this.baseScaleY;
      this.squashTimer = 0;
    } else {
      // Ease back to normal scale
      const progress = 1 - this.squashTimer / this.squashDuration;
      const eased = this.easeOutElastic(progress);

      const scaleY =
        this.baseScaleY * (1 - this.squashAmount) +
        this.squashAmount * this.baseScaleY * eased;
      const scaleX =
        this.baseScaleX * (1 + this.squashAmount) -
        this.squashAmount * this.baseScaleX * eased;

      this.sprite.scale.y = scaleY;
      this.sprite.scale.x = scaleX;
    }
  }

  /**
   * Elastic easing for bounce effect
   */
  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  /**
   * Reset all visual effects to default state
   */
  reset(): void {
    this.sprite.y = 0;
    this.sprite.scale.x = this.baseScaleX;
    this.sprite.scale.y = this.baseScaleY;
    this.shadow.scale.set(1);
    this.shadow.alpha = this.shadowAlphaMax;
    this.squashTimer = 0;
  }
}
