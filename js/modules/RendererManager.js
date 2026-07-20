/**
 * AETHER — Renderer Manager
 * 
 * Creates and configures the Three.js WebGL Renderer.
 * Handles tone mapping, color management, pixel ratio,
 * and prepares for future post-processing.
 */

import * as THREE from 'three';
import { Constants } from '../utils/Constants.js';

export class RendererManager {
  constructor({ canvas, device, eventBus }) {
    this.canvas = canvas;
    this.device = device;
    this.eventBus = eventBus;
    this.renderer = null;
  }

  init() {
    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    // ── Color Management ─────────────────────
    // Modern Three.js color management for accurate colors
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = Constants.THREE.TONE_MAPPING_EXPOSURE;

    // ── Pixel Ratio ──────────────────────────
    // Cap at optimal DPR for performance
    const optimalDPR = this.device.getOptimalPixelRatio();
    this.renderer.setPixelRatio(optimalDPR);

    // ── Size ─────────────────────────────────
    const { width, height } = this._getCanvasSize();
    this.renderer.setSize(width, height, false);

    // ── Performance Optimizations ────────────
    this.renderer.shadowMap.enabled = false; // Enable in Part 2 if needed
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.sortObjects = true;

    // ── Prepare for Post-Processing (Part 3) ─
    // These settings ensure compatibility with EffectComposer
    this.renderer.autoClear = true;
    this.renderer.autoClearColor = true;
    this.renderer.autoClearDepth = true;
    this.renderer.autoClearStencil = false;

    this.eventBus.emit(Constants.EVENTS.RENDERER_READY, { renderer: this.renderer });
  }

  /**
   * Render a frame.
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  render(scene, camera) {
    if (!this.renderer) return;
    this.renderer.render(scene, camera);
  }

  /**
   * Update renderer size.
   * Called by ResizeHandler.
   */
  updateSize(width, height) {
    if (!this.renderer) return;
    this.renderer.setSize(width, height, false);
  }

  /**
   * Get the raw Three.js renderer.
   */
  getRenderer() {
    return this.renderer;
  }

  /**
   * Get canvas dimensions.
   */
  _getCanvasSize() {
    const parent = this.canvas.parentElement;
    if (!parent) return { width: window.innerWidth, height: window.innerHeight };
    
    const rect = parent.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
    this.renderer = null;
  }
}
