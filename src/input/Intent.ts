import { Keys } from "./Keyboard";

export type MoveIntent = { x: number; y: number };
export type ActionIntent = {
  move: MoveIntent;
  roll: boolean;
  shoot: boolean;
};

export function getActionIntent(keys: Keys): ActionIntent {
  // support WASD + arrows
  const up = keys["KeyW"] || keys["ArrowUp"];
  const down = keys["KeyS"] || keys["ArrowDown"];
  const left = keys["KeyA"] || keys["ArrowLeft"];
  const right = keys["KeyD"] || keys["ArrowRight"];

  let x = 0,
    y = 0;
  if (left) x -= 1;
  if (right) x += 1;
  if (up) y -= 1;
  if (down) y += 1;

  // normalize diagonal to keep speed consistent
  if (x && y) {
    const inv = 1 / Math.sqrt(2);
    x *= inv;
    y *= inv;
  }

  // you can map these to whatever keys you prefer
  const roll = !!keys["ShiftLeft"] || !!keys["Space"];
  const shoot = !!keys["MouseLeft"] || !!keys["KeyJ"]; // example fallback key

  return { move: { x, y }, roll, shoot };
}
