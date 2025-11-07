import { Container, Graphics, Text } from "pixi.js";
import { PlayerStats } from "../world/entities/PlayerStats";

export class StaminaBar {
  public readonly root = new Container();
  private background: Graphics;
  private border: Graphics;
  private fill: Graphics;
  private label: Text;
  private stats: PlayerStats;

  private readonly barWidth = 200;
  private readonly barHeight = 20;
  private readonly padding = 2;
  private readonly borderRadius = 6;
  private readonly borderWidth = 2;

  constructor(stats: PlayerStats) {
    this.stats = stats;

    // Background (dark gray with rounded corners)
    this.background = new Graphics()
      .roundRect(0, 0, this.barWidth, this.barHeight, this.borderRadius)
      .fill({ color: 0x333333 });
    this.root.addChild(this.background);

    // Fill (green stamina bar)
    this.fill = new Graphics();
    this.root.addChild(this.fill);

    // Border (white outline)
    this.border = new Graphics()
      .roundRect(0, 0, this.barWidth, this.barHeight, this.borderRadius)
      .stroke({ color: 0xffffff, width: this.borderWidth });
    this.root.addChild(this.border);

    // Label text
    this.label = new Text({
      text: "",
      style: {
        fontFamily: "Arial",
        fontSize: 12,
        fill: 0xffffff,
      },
    });
    this.label.x = this.barWidth + 8;
    this.label.y = 2;
    this.root.addChild(this.label);

    // Initial update
    this.update();
  }

  /**
   * Update the visual display based on current stamina
   */
  update(): void {
    const ratio = this.stats.getStaminaRatio();
    const fillWidth = (this.barWidth - this.padding * 2) * ratio;

    // Update fill graphics (rounded corners, clipped to background)
    this.fill.clear();
    if (fillWidth > 0) {
      this.fill
        .roundRect(
          this.padding,
          this.padding,
          fillWidth,
          this.barHeight - this.padding * 2,
          this.borderRadius - this.padding,
        )
        .fill({ color: 0x44aa44 });
    }

    // Update text label
    const current = Math.ceil(this.stats.currentStamina);
    const max = this.stats.maxStamina;
    this.label.text = `${current}/${max}`;
  }

  /**
   * Set the position of the stamina bar
   */
  setPosition(x: number, y: number): void {
    this.root.position.set(x, y);
  }
}
