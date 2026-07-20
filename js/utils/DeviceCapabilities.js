/**
 * AETHER — Device Capabilities Detection
 * 
 * Detects and caches device features for adaptive rendering.
 * Used by RendererManager and CameraManager for optimization.
 */

export class DeviceCapabilities {
  constructor() {
    this._cache = new Map();
    this.refresh();
  }

  /**
   * Refresh all capability detections.
   * Call this on resize or orientation change if needed.
   */
  refresh() {
    this._cache.set('dpr', Math.min(window.devicePixelRatio || 1, 2));
    this._cache.set('isTouch', 'ontouchstart' in window || navigator.maxTouchPoints > 0);
    this._cache.set('isMobile', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    this._cache.set('isReducedMotion', window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this._cache.set('isHighDPI', window.devicePixelRatio > 1);
    this._cache.set('screenWidth', window.innerWidth);
    this._cache.set('screenHeight', window.innerHeight);
    this._cache.set('aspectRatio', window.innerWidth / window.innerHeight);
    this._cache.set('supportsWebGL2', this._checkWebGL2());
    this._cache.set('supportsWebGPU', 'gpu' in navigator);
  }

  _checkWebGL2() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
    } catch {
      return false;
    }
  }

  // ── Getters ────────────────────────────────
  get dpr() { return this._cache.get('dpr'); }
  get isTouch() { return this._cache.get('isTouch'); }
  get isMobile() { return this._cache.get('isMobile'); }
  get isReducedMotion() { return this._cache.get('isReducedMotion'); }
  get isHighDPI() { return this._cache.get('isHighDPI'); }
  get screenWidth() { return this._cache.get('screenWidth'); }
  get screenHeight() { return this._cache.get('screenHeight'); }
  get aspectRatio() { return this._cache.get('aspectRatio'); }
  get supportsWebGL2() { return this._cache.get('supportsWebGL2'); }
  get supportsWebGPU() { return this._cache.get('supportsWebGPU'); }

  /**
   * Get optimal pixel ratio for the renderer.
   * Caps at 2 for desktop, 1.5 for mobile to save battery.
   */
  getOptimalPixelRatio() {
    const dpr = this.dpr;
    if (this.isMobile) return Math.min(dpr, 1.5);
    return Math.min(dpr, 2);
  }
}
