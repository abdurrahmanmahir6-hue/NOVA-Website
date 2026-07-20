/**
 * AETHER — Camera Manager
 * 
 * Creates and manages the Three.js Camera.
 * Handles responsive FOV and aspect ratio updates.
 * 
 * Future Part 3 will add: mouse-driven parallax, 
 * scroll-based camera motion, and GSAP-driven animations.
 */

import * as THREE from 'three';
import { Constants } from '../utils/Constants.js';

export class CameraManager {
  constructor({ canvasContainer, device, eventBus }) {
    this.canvasContainer = canvasContainer;
    this.device = device;
    this.eventBus = eventBus;
    this.camera = null;
    this.defaultPosition = Constants.THREE.CAMERA_POSITION;
  }

  init() {
    const { width, height } = this._getContainerSize();

    // Create PerspectiveCamera
    this.camera = new THREE.PerspectiveCamera(
      Constants.THREE.FOV,
      width / height,
      Constants.THREE.NEAR,
      Constants.THREE.FAR
    );

    // Set initial position
    this.camera.position.set(
      this.defaultPosition.x,
      this.defaultPosition.y,
      this.defaultPosition.z
    );

    // Look at origin
    this.camera.lookAt(0, 0, 0);

    this.eventBus.emit(Constants.EVENTS.CAMERA_READY, { camera: this.camera });
  }

  /**
   * Update camera aspect ratio and projection matrix.
   * Called by ResizeHandler on window resize.
   */
  updateAspect() {
    if (!this.camera) return;
    
    const { width, height } = this._getContainerSize();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Get the raw Three.js camera.
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Get container dimensions.
   */
  _getContainerSize() {
    const rect = this.canvasContainer.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  }

  dispose() {
    this.camera = null;
  }
}
