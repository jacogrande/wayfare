import { Container } from "pixi.js";
import { Updatable } from "../../types";

export abstract class Entity implements Updatable {
  /** Put sprites/graphics here so moving the entity moves all of its parts */
  public root: Container = new Container();

  /** Optional: lightweight velocity if your entity moves */
  public vx = 0;
  public vy = 0;

  constructor(public zIndex = 0) {
    this.root.zIndex = zIndex;
    this.root.sortableChildren = true;
  }

  setPosition(x: number, y: number) {
    this.root.position.set(x, y);
  }
  get x() {
    return this.root.position.x;
  }
  get y() {
    return this.root.position.y;
  }

  add(child: Container) {
    this.root.addChild(child);
  }

  abstract update(dt: number): void;

  destroy() {
    this.root.destroy({ children: true });
  }
}
