/**
 * Jump state machine - manages the current state of jumping
 * Follows Single Responsibility Principle: Only tracks state, no physics/visuals
 */
export enum JumpPhase {
  Grounded = "grounded",
  Rising = "rising",
  Falling = "falling",
  Landing = "landing",
}

export class JumpState {
  private phase: JumpPhase = JumpPhase.Grounded;
  private height: number = 0;
  private velocity: number = 0;
  private timeSinceGrounded: number = 0;
  private jumpBufferTimer: number = 0;
  private landingTimer: number = 0;

  // Configuration
  private readonly coyoteTimeMs = 150; // Grace period after leaving ground
  private readonly jumpBufferMs = 100; // Input buffering window
  private readonly landingDurationMs = 100; // How long landing state lasts

  /**
   * Get current jump phase
   */
  getPhase(): JumpPhase {
    return this.phase;
  }

  /**
   * Get current height off ground
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * Get current vertical velocity
   */
  getVelocity(): number {
    return this.velocity;
  }

  /**
   * Check if player is grounded
   */
  isGrounded(): boolean {
    return this.phase === JumpPhase.Grounded;
  }

  /**
   * Check if player is in the air
   */
  isAirborne(): boolean {
    return (
      this.phase === JumpPhase.Rising || this.phase === JumpPhase.Falling
    );
  }

  /**
   * Check if player can initiate a jump (includes coyote time)
   */
  canJump(): boolean {
    return (
      this.phase === JumpPhase.Grounded ||
      this.timeSinceGrounded < this.coyoteTimeMs
    );
  }

  /**
   * Check if a buffered jump input is active
   */
  hasBufferedJump(): boolean {
    return this.jumpBufferTimer > 0;
  }

  /**
   * Update state based on current physics
   */
  update(dtMs: number, height: number, velocity: number): void {
    this.height = height;
    this.velocity = velocity;

    // Update timers
    if (this.phase !== JumpPhase.Grounded) {
      this.timeSinceGrounded += dtMs;
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dtMs;
    }

    if (this.phase === JumpPhase.Landing) {
      this.landingTimer -= dtMs;
      if (this.landingTimer <= 0) {
        this.setGrounded();
      }
      return;
    }

    // Determine phase based on height and velocity
    if (height <= 0) {
      if (this.phase !== JumpPhase.Grounded) {
        this.startLanding();
      }
    } else if (velocity < 0) {
      this.phase = JumpPhase.Rising;
    } else {
      this.phase = JumpPhase.Falling;
    }
  }

  /**
   * Initiate a jump
   */
  startJump(): void {
    this.phase = JumpPhase.Rising;
    this.timeSinceGrounded = 0;
    this.jumpBufferTimer = 0;
  }

  /**
   * Buffer a jump input for later execution
   */
  bufferJump(): void {
    this.jumpBufferTimer = this.jumpBufferMs;
  }

  /**
   * Clear buffered jump
   */
  clearBuffer(): void {
    this.jumpBufferTimer = 0;
  }

  /**
   * Start landing phase
   */
  private startLanding(): void {
    this.phase = JumpPhase.Landing;
    this.landingTimer = this.landingDurationMs;
    this.height = 0;
    this.velocity = 0;
  }

  /**
   * Return to grounded state
   */
  private setGrounded(): void {
    this.phase = JumpPhase.Grounded;
    this.timeSinceGrounded = 0;
    this.height = 0;
    this.velocity = 0;
  }

  /**
   * Force grounded state (for external use like teleporting)
   */
  forceGrounded(): void {
    this.setGrounded();
  }
}
