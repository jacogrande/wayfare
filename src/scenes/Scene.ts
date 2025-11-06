import { Container } from "pixi.js";

export abstract class Scene {
  container = new Container();
  abstract start(): void | Promise<void>;
  update(_deltaFrames: number, _deltaMs: number) {
    void _deltaFrames;
    void _deltaMs;
  }
  destroy() {
    this.container.destroy({ children: true });
  }
}
