/**
 * Player stats and attributes
 */
export class PlayerStats {
  // Stamina
  public maxStamina: number = 100;
  public currentStamina: number = 100;
  public staminaRegenRate: number = 10; // per second

  /**
   * Attempt to consume stamina
   * @returns true if stamina was consumed, false if insufficient
   */
  consumeStamina(amount: number): boolean {
    if (this.currentStamina >= amount) {
      this.currentStamina -= amount;
      return true;
    }
    return false;
  }

  /**
   * Regenerate stamina over time
   */
  regenerateStamina(dtSec: number): void {
    this.currentStamina = Math.min(
      this.maxStamina,
      this.currentStamina + this.staminaRegenRate * dtSec,
    );
  }

  /**
   * Get stamina as a ratio (0-1)
   */
  getStaminaRatio(): number {
    return this.currentStamina / this.maxStamina;
  }
}
