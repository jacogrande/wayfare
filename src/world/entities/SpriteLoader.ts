import { Assets, Rectangle, Texture } from "pixi.js";

export type Direction = "down" | "left" | "right" | "up";

export interface DirectionalFrames {
  down: Texture[];
  left: Texture[];
  right: Texture[];
  up: Texture[];
}

/**
 * Load a 4x4 grid spritesheet with walk animation
 * Each row = one direction
 * Each column = one frame
 */
export const loadWalkCycleSprites = async (
  spritesheetPath: string,
  frameWidth: number,
  frameHeight: number,
  rowOrder: Direction[] = ["down", "left", "right", "up"], // default spritesheet order
): Promise<DirectionalFrames> => {
  const baseTexture = await Assets.load(spritesheetPath);
  baseTexture.source.scaleMode = "nearest";

  const frames: Partial<DirectionalFrames> = {};

  // extract each row (direction)
  for (let row = 0; row < 4; row++) {
    const direction = rowOrder[row];
    const directionFrames: Texture[] = [];
    for (let col = 0; col < 4; col++) {
      const frame = new Texture({
        source: baseTexture.source,
        frame: new Rectangle(
          col * frameWidth,
          row * frameHeight,
          frameWidth,
          frameHeight,
        ),
      });
      directionFrames.push(frame);
    }
    frames[direction] = directionFrames;
  }
  return frames as DirectionalFrames;
};
