/**
 * Landing assistance - helps player land safely without getting stuck
 * Follows Single Responsibility Principle: Only handles landing position correction
 */

export interface LandingAssistConfig {
  pushOutEnabled?: boolean; // Push player out of obstacles on landing
  snapDistance?: number; // Distance to snap to valid positions (pixels)
  checkRadius?: number; // How far to search for valid landing spots
}

export class LandingAssist {
  private readonly pushOutEnabled: boolean;
  private readonly snapDistance: number;
  private readonly checkRadius: number;

  constructor(config: LandingAssistConfig = {}) {
    this.pushOutEnabled = config.pushOutEnabled ?? true;
    this.snapDistance = config.snapDistance ?? 6; // 6px snap tolerance
    this.checkRadius = config.checkRadius ?? 16; // Check 1 tile around
  }

  /**
   * Check if a position is valid (not blocked)
   */
  private isValidPosition(
    x: number,
    y: number,
    checkCollision: (x: number, y: number) => boolean,
  ): boolean {
    return !checkCollision(x, y);
  }

  /**
   * Find the nearest valid landing position
   * Checks in a spiral pattern outward from current position
   */
  findNearestValidPosition(
    currentX: number,
    currentY: number,
    checkCollision: (x: number, y: number) => boolean,
  ): { x: number; y: number } | null {
    // First check if current position is valid
    if (this.isValidPosition(currentX, currentY, checkCollision)) {
      return { x: currentX, y: currentY };
    }

    if (!this.pushOutEnabled) {
      return null; // Don't assist, let player stay stuck
    }

    // Search in expanding square pattern
    const searchStep = 2; // Check every 2 pixels
    const maxDistance = this.checkRadius;

    let closestValid: { x: number; y: number; dist: number } | null = null;

    // Check positions in a spiral/grid pattern
    for (let radius = searchStep; radius <= maxDistance; radius += searchStep) {
      // Check 8 directions at this radius
      const positions = [
        { x: currentX + radius, y: currentY }, // Right
        { x: currentX - radius, y: currentY }, // Left
        { x: currentX, y: currentY + radius }, // Down
        { x: currentX, y: currentY - radius }, // Up
        { x: currentX + radius, y: currentY + radius }, // Down-Right
        { x: currentX - radius, y: currentY + radius }, // Down-Left
        { x: currentX + radius, y: currentY - radius }, // Up-Right
        { x: currentX - radius, y: currentY - radius }, // Up-Left
      ];

      for (const pos of positions) {
        if (this.isValidPosition(pos.x, pos.y, checkCollision)) {
          const dist = Math.hypot(pos.x - currentX, pos.y - currentY);

          if (!closestValid || dist < closestValid.dist) {
            closestValid = { x: pos.x, y: pos.y, dist };
          }
        }
      }

      // If we found a valid position within snap distance, use it immediately
      const current = closestValid;
      if (current && current.dist <= this.snapDistance) {
        return { x: current.x, y: current.y };
      }
    }

    // Return closest valid position found, or null
    return closestValid ? { x: closestValid.x, y: closestValid.y } : null;
  }

  /**
   * Assist landing by correcting position if needed
   * Returns corrected position or null if no correction needed
   */
  assistLanding(
    landingX: number,
    landingY: number,
    checkCollision: (x: number, y: number) => boolean,
  ): { x: number; y: number } | null {
    // Check if landing position is blocked
    if (!checkCollision(landingX, landingY)) {
      return null; // Position is valid, no assistance needed
    }

    // Find nearest valid position
    const validPos = this.findNearestValidPosition(
      landingX,
      landingY,
      checkCollision,
    );

    if (!validPos) {
      return null; // No valid position found, player stays where they are
    }

    // Only assist if within reasonable distance
    const distance = Math.hypot(validPos.x - landingX, validPos.y - landingY);
    if (distance > this.checkRadius) {
      return null; // Too far to assist
    }

    return validPos;
  }

  /**
   * Check if player will land in a valid position
   * Used for predictive assistance during jump
   */
  willLandSafely(
    futureX: number,
    futureY: number,
    checkCollision: (x: number, y: number) => boolean,
  ): boolean {
    return !checkCollision(futureX, futureY);
  }
}
