/**
 * AETHER — Asset Loader
 * 
 * Manages loading of textures, models, and other assets.
 * Provides a simulation mode for the Foundation phase.
 * 
 * Future Parts will load actual 3D models, HDRIs, and textures.
 */

import { Constants } from '../utils/Constants.js';
import { wait } from '../utils/Helpers.js';

export class AssetLoader {
  constructor({ loadingManager, eventBus }) {
    this.loadingManager = loadingManager;
    this.eventBus = eventBus;
    this.assets = new Map();
    this.isLoaded = false;
  }

  /**
   * Simulate asset loading with progress callbacks.
   * In production, this will be replaced with actual asset loading.
   */
  async simulateLoading(onProgress) {
    const steps = 20;
    const stepDuration = Constants.TIMING.LOADING_MIN_DURATION / steps;

    for (let i = 1; i <= steps; i++) {
      await wait(stepDuration);
      const progress = i / steps;
      onProgress(progress);
      this.eventBus.emit(Constants.EVENTS.LOADING_PROGRESS, { progress });
    }

    this.isLoaded = true;
    this.eventBus.emit(Constants.EVENTS.LOADING_COMPLETE, { assets: this.assets });
  }

  /**
   * Register an asset for future loading.
   * @param {string} name - Asset identifier
   * @param {string} url - Asset URL
   * @param {string} type - Asset type (texture, model, etc.)
   */
  registerAsset(name, url, type) {
    this.assets.set(name, { url, type, loaded: false, data: null });
  }

  /**
   * Load a single texture (prepared for Part 2).
   */
  async loadTexture(url) {
    // Will be implemented with THREE.TextureLoader in Part 2
    console.log(`
