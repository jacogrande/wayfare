import { Application } from "pixi.js";
import { GameScene } from "./scenes/GameScene";

(async () => {
  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ resizeTo: window, backgroundAlpha: 0 });

  // Append the application canvas to the document body
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // --- create & mount scene
  const scene = new GameScene(app);
  await scene.start();
  app.stage.addChild(scene.container);

  // Configure ticker FPS (optional - comment out to use display refresh rate)
  // app.ticker.maxFPS = 60; // Cap at 60 FPS
  // app.ticker.minFPS = 30; // Minimum FPS threshold

  // main loop
  app.ticker.add((dt) => {
    scene.update(dt.deltaTime, dt.deltaMS);
  });
})();
