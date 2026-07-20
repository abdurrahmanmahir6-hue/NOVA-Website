/**
 * AETHER — PART 3A: Scroll Engine
 * 
 * Cinematic scroll-driven experience controller.
 * Manages: camera transitions, scene progression, dynamic object
 * movement, layered parallax, and depth illusion.
 * 
 * Uses a virtual scroll progress (0.0 to 1.0) mapped to scene
 * states. All transitions are interpolated with configurable
 * easing for cinematic feel.
 * 
 * Integrates with: MotionSystem, EventBus, Constants, LayoutSystem
 */

import { Constants } from '../utils/Constants.js';
import { clamp, mapRange, lerp } from '../utils/Helpers.js';

export class ScrollEngine {
  constructor({ eventBus, motionSystem, layoutSystem, device }) {
    this.eventBus = eventBus;
    this.motionSystem = motionSystem;
    this.layoutSystem = layoutSystem;
    this.device = device;
    
    // ── Scroll State ─────────────────────────
    this.state = {
      progress: 0,        // 0.0 to 1.0 (entire page)
      sectionProgress: 0, // 0.0 to 1.0 (current section)
      velocity: 0,
      direction: 'none',
      isScrolling: false,
      scrollTimeout: null,
    };
    
    // ── Camera Path ──────────────────────────
    this.cameraPath = [];
    this.currentCameraState = {
      position: { x: 0, y: 0, z: 5 },
      lookAt: { x: 0, y: 0, z: 0 },
      fov: 45,
    };
    
    // ── Scene States ─────────────────────────
    this.sceneStates = new Map();
    
    // ── Parallax Layers ──────────────────────
    this.parallaxLayers = [];
    
    // ── Object Animations ────────────────────
    this.objectAnimations = new Map();
    
    this.unsubscribers = [];
    this.isInitialized = false;
  }

  init() {
    this._setupCameraPath();
    this._setupSceneStates();
    this._setupParallaxLayers();
    this._bindEvents();
    this._createScrollValues();
    this.isInitialized = true;
  }

  // ═══════════════════════════════════════════
  // CAMERA PATH SETUP
  // ═══════════════════════════════════════════

  _setupCameraPath() {
    // Define key camera positions along the scroll journey
    // Each point has: progress (0-1), position, lookAt, fov, easing
    this.cameraPath = [
      {
        progress: 0.0,
        position: { x: 0, y: 0, z: 5 },
        lookAt: { x: 0, y: 0, z: 0 },
        fov: 45,
        easing: 'easeOut',
      },
      {
        progress: 0.15,
        position: { x: 0.5, y: 0.3, z: 4.5 },
        lookAt: { x: 0.2, y: 0.1, z: 0 },
        fov: 48,
        easing: 'easeInOut',
      },
      {
        progress: 0.35,
        position: { x: -0.3, y: -0.2, z: 4 },
        lookAt: { x: -0.1, y: 0, z: 0 },
        fov: 50,
        easing: 'easeInOut',
      },
      {
        progress: 0.55,
        position: { x: 0.2, y: 0.5, z: 3.5 },
        lookAt: { x: 0, y: 0.2, z: 0 },
        fov: 52,
        easing: 'easeInOut',
      },
      {
        progress: 0.75,
        position: { x: -0.5, y: 0, z: 3 },
        lookAt: { x: -0.2, y: -0.1, z: 0 },
        fov: 48,
        easing: 'easeInOut',
      },
      {
        progress: 1.0,
        position: { x: 0, y: -0.3, z: 4 },
        lookAt: { x: 0, y: 0, z: 0 },
        fov: 45,
        easing: 'easeOut',
      },
    ];
  }

  // ═══════════════════════════════════════════
  // SCENE STATES
  // ═══════════════════════════════════════════

  _setupSceneStates() {
    // Define what happens to scene elements at different scroll positions
    // Future: lights intensity, object visibility, material properties
    this.sceneStates.set('lights', {
      intensity: [
        { progress: 0.0, value: 1.0 },
        { progress: 0.3, value: 1.5 },
        { progress: 0.6, value: 0.8 },
        { progress: 1.0, value: 1.2 },
      ],
    });
    
    this.sceneStates.set('fog', {
      density: [
        { progress: 0.0, value: 0.02 },
        { progress: 0.5, value: 0.015 },
        { progress: 1.0, value: 0.025 },
      ],
    });
  }

  // ═══════════════════════════════════════════
  // PARALLAX LAYERS
  // ═══════════════════════════════════════════

  _setupParallaxLayers() {
    // Layer configurations for depth illusion
    // speed: multiplier for scroll movement (negative = moves opposite)
    this.parallaxLayers = [
      { name: 'background', speed: 0.1, depth: -10 },
      { name: 'midground', speed: 0.3, depth: -5 },
      { name: 'foreground', speed: 0.6, depth: -2 },
      { name: 'near', speed: 1.0, depth: 0 },
      { name: 'overlay', speed: 1.3, depth: 2 },
    ];
  }

  // ═══════════════════════════════════════════
  // SCROLL VALUE TRACKING
  // ═══════════════════════════════════════════

  _createScrollValues() {
    // Create motion-tracked values for smooth interpolation
    this.scrollProgressValue = this.motionSystem.createValue('scrollProgress', 0, {
      damping: 3.0,
      precision: 0.0001,
    });
    
    this.scrollVelocityValue = this.motionSystem.createValue('scrollVelocity', 0, {
      damping: 8.0,
      precision: 0.001,
    });
    
    this.cameraX = this.motionSystem.createValue('cameraX', 0, {
      damping: 2.5,
      precision: 0.001,
    });
    
    this.cameraY = this.motionSystem.createValue('cameraY', 0, {
      damping: 2.5,
      precision: 0.001,
    });
    
    this.cameraZ = this.motionSystem.createValue('cameraZ', 5, {
      damping: 2.0,
      precision: 0.001,
    });
    
    this.cameraLookX = this.motionSystem.createValue('cameraLookX', 0, {
      damping: 3.0,
      precision: 0.001,
    });
    
    this.cameraLookY = this.motionSystem.createValue('cameraLookY', 0, {
      damping: 3.0,
      precision: 0.001,
    });
    
    this.cameraFov = this.motionSystem.createValue('cameraFov', 45, {
      damping: 4.0,
      precision: 0.01,
    });
  }

  // ═══════════════════════════════════════════
  // EVENT BINDING
  // ═══════════════════════════════════════════

  _bindEvents() {
    // Listen to raw scroll events from LayoutSystem
    const unsubScroll = this.eventBus.on(Constants.EVENTS.SCROLL, ({ scrollY, direction, progress }) => {
      this._onScroll(scrollY, direction, progress);
    });
    this.unsubscribers.push(unsubScroll);
    
    // Listen to animation frames for smooth interpolation
    const unsubFrame = this.eventBus.on(Constants.EVENTS.ANIMATION_FRAME, ({ time, delta }) => {
      this._onFrame(time, delta);
    });
    this.unsubscribers.push(unsubFrame);
  }

  _onScroll(scrollY, direction, progress) {
    const prevProgress = this.state.progress;
    this.state.progress = progress;
    this.state.direction = direction;
    this.state.velocity = Math.abs(progress - prevProgress);
    this.state.isScrolling = true;
    
    // Clear scroll timeout
    if (this.state.scrollTimeout) {
      clearTimeout(this.state.scrollTimeout);
    }
    this.state.scrollTimeout = setTimeout(() => {
      this.state.isScrolling = false;
      this.state.velocity = 0;
    }, 150);
    
    // Update motion targets
    this.scrollProgressValue.set(progress);
    this.scrollVelocityValue.set(this.state.velocity);
    
    // Update camera targets based on scroll progress
    this._updateCameraTargets(progress);
    
    // Update scene state targets
    this._updateSceneStateTargets(progress);
    
    // Emit scroll-driven events
    this.eventBus.emit(Constants.EVENTS.SCROLL_PROGRESS, {
      progress,
      velocity: this.state.velocity,
      direction,
      isScrolling: this.state.isScrolling,
    });
  }

  _onFrame(time, delta) {
    if (!this.isInitialized) return;
    
    // Parallax updates are emitted for other systems to consume
    this._emitParallaxData();
  }

  // ═══════════════════════════════════════════
  // CAMERA INTERPOLATION
  // ═══════════════════════════════════════════

  _updateCameraTargets(progress) {
    const { position, lookAt, fov } = this._interpolateCameraPath(progress);
    
    this.cameraX.set(position.x);
    this.cameraY.set(position.y);
    this.cameraZ.set(position.z);
    this.cameraLookX.set(lookAt.x);
    this.cameraLookY.set(lookAt.y);
    this.cameraFov.set(fov);
  }

  _interpolateCameraPath(progress) {
    const path = this.cameraPath;
    
    // Find the two keyframes to interpolate between
    let start = path[0];
    let end = path[path.length - 1];
    
    for (let i = 0; i < path.length - 1; i++) {
      if (progress >= path[i].progress && progress <= path[i + 1].progress) {
        start = path[i];
        end = path[i + 1];
        break;
      }
    }
    
    // Calculate local progress between keyframes
    const range = end.progress - start.progress;
    const localProgress = range > 0 ? (progress - start.progress) / range : 0;
    
    // Apply easing
    const easedProgress = this._applyEasing(localProgress, start.easing);
    
    return {
      position: {
        x: lerp(start.position.x, end.position.x, easedProgress),
        y: lerp(start.position.y, end.position.y, easedProgress),
        z: lerp(start.position.z, end.position.z, easedProgress),
      },
      lookAt: {
        x: lerp(start.lookAt.x, end.lookAt.x, easedProgress),
        y: lerp(start.lookAt.y, end.lookAt.y, easedProgress),
        z: lerp(start.lookAt.z, end.lookAt.z, easedProgress),
      },
      fov: lerp(start.fov, end.fov, easedProgress),
    };
  }

  _applyEasing(t, type) {
    switch (type) {
      case 'easeIn': return t * t;
      case 'easeOut': return 1 - (1 - t) * (1 - t);
      case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'easeOutExpo': return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      default: return t;
    }
  }

  // ═══════════════════════════════════════════
  // SCENE STATE INTERPOLATION
  // ═══════════════════════════════════════════

  _updateSceneStateTargets(progress) {
    for (const [name, state] of this.sceneStates) {
      for (const [prop, keyframes] of Object.entries(state)) {
        const value = this._interpolateKeyframes(keyframes, progress);
        this.eventBus.emit(Constants.EVENTS.SCENE_STATE_CHANGE, {
          state: name,
          property: prop,
          value,
          progress,
        });
      }
    }
  }

  _interpolateKeyframes(keyframes, progress) {
    let start = keyframes[0];
    let end = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (progress >= keyframes[i].progress && progress <= keyframes[i + 1].progress) {
        start = keyframes[i];
        end = keyframes[i + 1];
        break;
      }
    }
    
    const range = end.progress - start.progress;
    const localProgress = range > 0 ? (progress - start.progress) / range : 0;
    
    return lerp(start.value, end.value, localProgress);
  }

  // ═══════════════════════════════════════════
  // PARALLAX DATA EMISSION
  // ═══════════════════════════════════════════

  _emitParallaxData() {
    const scrollProgress = this.scrollProgressValue.get();
    
    const layerData = this.parallaxLayers.map((layer) => ({
      name: layer.name,
      speed: layer.speed,
      depth: layer.depth,
      offset: scrollProgress * layer.speed * 100, // Percentage offset
      transform: `translateY(${scrollProgress * layer.speed * -50}px)`,
    }));
    
    this.eventBus.emit(Constants.EVENTS.PARALLAX_UPDATE, {
      layers: layerData,
      progress: scrollProgress,
      velocity: this.scrollVelocityValue.get(),
    });
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  getCameraState() {
    return {
      position: {
        x: this.cameraX.get(),
        y: this.cameraY.get(),
        z: this.cameraZ.get(),
      },
      lookAt: {
        x: this.cameraLookX.get(),
        y: this.cameraLookY.get(),
        z: 0,
      },
      fov: this.cameraFov.get(),
    };
  }

  getScrollProgress() {
    return this.scrollProgressValue.get();
  }

  getScrollVelocity() {
    return this.scrollVelocityValue.get();
  }

  addObjectAnimation(name, config) {
    this.objectAnimations.set(name, config);
  }

  dispose() {
    this.unsubscribers.forEach((unsub) => unsub());
    if (this.state.scrollTimeout) {
      clearTimeout(this.state.scrollTimeout);
    }
    this.isInitialized = false;
  }
}
