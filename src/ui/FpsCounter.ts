import { Container, Text } from "pixi.js";

export class FpsCounter {
  public readonly root = new Container();
  private label: Text;
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 0;

  constructor() {
    // FPS text label
    this.label = new Text({
      text: "FPS: 60",
      style: {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
      },
    });
    this.root.addChild(this.label);
  }

  /**
   * Update FPS calculation and display
   */
  update(): void {
    this.frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;

    // Update FPS counter every 500ms
    if (elapsed >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.label.text = `FPS: ${this.fps}`;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }

  /**
   * Set the position of the FPS counter
   */
  setPosition(x: number, y: number): void {
    this.root.position.set(x, y);
  }
}
