import { Viewport } from "pixi-viewport";
import { Application, Container } from "pixi.js";
import { World } from "../world/World";
import { Scene } from "./Scene";
import { StaminaBar } from "../ui/StaminaBar";
import { FpsCounter } from "../ui/FpsCounter";

export class GameScene extends Scene {
  private readonly world: World;
  private readonly viewport: Viewport;
  private readonly hud: Container;
  private staminaBar!: StaminaBar;
  private fpsCounter!: FpsCounter;
  private readonly deadzone = { width: 180, height: 120 };
  private lastViewportSize = { width: 0, height: 0 };

  constructor(private readonly app: Application) {
    super();
    this.viewport = new Viewport({
      events: this.app.renderer.events,
      ticker: this.app.ticker,
      screenWidth: this.app.renderer.width,
      screenHeight: this.app.renderer.height,
    });
    this.container.addChild(this.viewport);
    this.world = new World();

    // Create HUD layer (fixed on screen, not affected by viewport)
    this.hud = new Container();
    this.hud.zIndex = 1000; // Always on top
    this.container.addChild(this.hud);
  }

  async start() {
    await this.world.start();
    this.viewport.addChild(this.world.getWorldRoot());

    // Clamp viewport to world bounds
    const worldSize = this.world.getWorldSize();
    this.viewport.clamp({
      left: 0,
      top: 0,
      right: worldSize.width,
      bottom: worldSize.height,
    });

    const playerPos = this.world.getPlayerPosition();
    this.viewport.setZoom(3);
    this.viewport.moveCenter(playerPos.x, playerPos.y);
    this.lastViewportSize = {
      width: this.app.renderer.width,
      height: this.app.renderer.height,
    };

    // Create HUD elements
    const player = this.world.getPlayer();
    this.staminaBar = new StaminaBar(player.stats);
    this.staminaBar.setPosition(10, 10);
    this.hud.addChild(this.staminaBar.root);

    this.fpsCounter = new FpsCounter();
    this.fpsCounter.setPosition(10, 40);
    this.hud.addChild(this.fpsCounter.root);
  }

  //========= MAIN UPDATE LOOP =========//
  update(deltaFrames: number, deltaMs: number) {
    void deltaMs;
    this.world.update(deltaFrames);

    // Update HUD
    this.staminaBar.update();
    this.fpsCounter.update();

    // Update tilemap culling based on visible viewport
    const tileMapRenderer = this.world.getTileMapRenderer();
    if (tileMapRenderer) {
      const visibleBounds = this.viewport.getVisibleBounds();
      tileMapRenderer.updateCulling(visibleBounds);
    }

    this.ensureViewportMatchesRenderer();
    this.keepPlayerInDeadzone();
  }

  private ensureViewportMatchesRenderer() {
    const rendererWidth = this.app.renderer.width;
    const rendererHeight = this.app.renderer.height;
    if (
      this.lastViewportSize.width !== rendererWidth ||
      this.lastViewportSize.height !== rendererHeight
    ) {
      this.viewport.resize(rendererWidth, rendererHeight);
      this.lastViewportSize = {
        width: rendererWidth,
        height: rendererHeight,
      };
    }
  }

  private keepPlayerInDeadzone() {
    const playerPos = this.world.getPlayerPosition();
    const center = this.viewport.center;
    const halfWidth = this.deadzone.width / 2;
    const halfHeight = this.deadzone.height / 2;

    let targetCenterX = center.x;
    let targetCenterY = center.y;

    if (playerPos.x < center.x - halfWidth) {
      targetCenterX = playerPos.x + halfWidth;
    } else if (playerPos.x > center.x + halfWidth) {
      targetCenterX = playerPos.x - halfWidth;
    }

    if (playerPos.y < center.y - halfHeight) {
      targetCenterY = playerPos.y + halfHeight;
    } else if (playerPos.y > center.y + halfHeight) {
      targetCenterY = playerPos.y - halfHeight;
    }

    if (targetCenterX !== center.x || targetCenterY !== center.y) {
      this.viewport.moveCenter(targetCenterX, targetCenterY);
    }
  }
}
