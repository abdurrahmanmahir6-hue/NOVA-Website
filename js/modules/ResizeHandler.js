/**
 * AETHER — Resize Handler
 * 
 * Handles window resize events with debouncing.
 * Updates renderer size, camera aspect ratio, and
 * notifies other modules of dimension changes.
 */

import { Constants } from '../utils/Constants.js';
import { debounce } from '../utils/Helpers.js';

export class ResizeHandler {
  constructor({ renderer, camera, canvasContainer, device, eventBus }) {
    this.renderer = renderer;
    this.camera = camera;
    this.canvasContainer = canvasContainer;
    this.device = device;
    this.eventBus = eventBus;
    
    this._handleResize = this._handleResize.bind(this);
    this._debouncedResize = debounce(this._handleResize, Constants.TIMING.RESIZE_DEBOUNCE);
  }

  init() {
    window.addEventListener('resize', this._debouncedResize);
    // Initial sizing
    this._handleResize();
  }

  _handleResize() {
    // Update device capabilities cache
    this.device.refresh();

    // Get new container dimensions
    const rect = this.canvasContainer.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Update renderer
    if (this.renderer && this.renderer.getRenderer) {
      this.renderer.updateSize(width, height);
    }

    // Update camera
    if (this.camera && this.camera.updateAspect) {
      this.camera.updateAspect();
    }

    // Notify all modules
    this.eventBus.emit(Constants.EVENTS.RESIZE, {
      width,
      height,
      dpr: this.device.dpr,
      aspectRatio: width / height,
    });
  }

  dispose() {
    window.removeEventListener('resize', this._debouncedResize);
  }
}
