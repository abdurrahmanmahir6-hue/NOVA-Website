/**
 * AETHER — Animation Loop
 * 
 * Manages the requestAnimationFrame loop.
 * Emits frame events for other modules to hook into.
 * 
 * Future Parts will subscribe to 'animation:frame' to
 * update objects, particles, camera motion, etc.
 */

import { Constants } from '../utils/Constants.js';

export class AnimationLoop {
  constructor({ renderer, scene, camera, eventBus }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.eventBus = eventBus;
    
    this.rafId = null;
    this.isRunning = false;
    this.lastTime = 0;
    this.deltaTime = 0;
    this.elapsedTime = 0;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this._tick(this.lastTime);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  _tick(currentTime) {
    if (!this.isRunning) return;

    // Calculate delta time (in seconds)
    this.deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    this.elapsedTime += this.deltaTime;

    // Cap delta time to prevent large jumps after tab switch
    const safeDelta = Math.min(this.deltaTime, 0.1);

    // Emit frame event with timing data
    // All animation modules subscribe to this event
    this.eventBus.emit(Constants.EVENTS.ANIMATION_FRAME, {
      time: this.elapsedTime,
      delta: safeDelta,
      rawDelta: this.deltaTime,
    });

    // Render the scene
    this.renderer.render(this.scene, this.camera);

    // Queue next frame
    this.rafId = requestAnimationFrame((time) => this._tick(time));
  }

  dispose() {
    this.stop();
  }
}
