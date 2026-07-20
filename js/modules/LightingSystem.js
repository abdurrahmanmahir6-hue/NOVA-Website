/**
 * AETHER — PART 3B: Lighting System
 * 
 * Cinematic lighting controller with:
 * - Ambient lighting with color temperature
 * - Rim/accent lights for depth
 * - Dynamic intensity based on scroll
 * - Mouse-reactive light positioning
 * - Smooth transitions between states
 * 
 * Integrates with: SceneManager, MotionSystem, EventBus, Constants
 */

import * as THREE from 'three';
import { Constants } from '../utils/Constants.js';

export class LightingSystem {
  constructor({ sceneManager, motionSystem, eventBus, device }) {
    this.sceneManager = sceneManager;
    this.motionSystem = motionSystem;
    this.eventBus = eventBus;
    this.device = device;
    
    this.lights = new Map();
    this.lightStates = new Map();
    this.unsubscribers = [];
  }

  init() {
    this._createLights();
    this._bindEvents();
    this._setupIdleAnimations();
  }

  // ═══════════════════════════════════════════
  // LIGHT CREATION
  // ═══════════════════════════════════════════

  _createLights() {
    const lightsGroup = this.sceneManager.getGroup('lights');
    
    // ── Ambient Light ────────────────────────
    // Soft base illumination
    const ambientLight = new THREE.AmbientLight(
      new THREE.Color('#1a1a2e'),
      0.4
    );
    ambientLight.name = 'ambient';
    lightsGroup.add(ambientLight);
    this.lights.set('ambient', ambientLight);
    
    // ── Key Light (Main Directional) ─────────
    // Primary illumination from upper-right
    const keyLight = new THREE.DirectionalLight(
      new THREE.Color('#e8e4dc'),
      1.2
    );
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = !this.device.isMobile;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.bias = -0.001;
    keyLight.name = 'key';
    lightsGroup.add(keyLight);
    this.lights.set('key', keyLight);
    
    // ── Fill Light ───────────────────────────
    // Softer light from opposite side
    const fillLight = new THREE.DirectionalLight(
      new THREE.Color('#a8c4d9'),
      0.5
    );
    fillLight.position.set(-5, 3, 2);
    fillLight.name = 'fill';
    lightsGroup.add(fillLight);
    this.lights.set('fill', fillLight);
    
    // ── Rim Light ────────────────────────────
    // Backlight for edge definition
    const rimLight = new THREE.SpotLight(
      new THREE.Color('#c9a87c'),
      2.0,
      20,
      Math.PI / 6,
      0.5,
      1
    );
    rimLight.position.set(0, 5, -8);
    rimLight.lookAt(0, 0, 0);
    rimLight.name = 'rim';
    lightsGroup.add(rimLight);
    this.lights.set('rim', rimLight);
    
    // ── Accent Light (Mouse-reactive) ────────
    // Follows cursor for interactive feel
    const accentLight = new THREE.PointLight(
      new THREE.Color('#ffffff'),
      0.8,
      15,
      2
    );
    accentLight.position.set(0, 0, 3);
    accentLight.name = 'accent';
    lightsGroup.add(accentLight);
    this.lights.set('accent', accentLight);
    
    // ── Bottom Fill ──────────────────────────
    // Subtle uplight for grounding
    const bottomLight = new THREE.PointLight(
      new THREE.Color('#2a2a4e'),
      0.3,
      10,
      2
    );
    bottomLight.position.set(0, -3, 2);
    bottomLight.name = 'bottom';
    lightsGroup.add(bottomLight);
    this.lights.set('bottom', bottomLight);
    
    // Emit ready event
    this.eventBus.emit(Constants.EVENTS.LIGHTS_READY, {
      lights: Object.fromEntries(this.lights),
    });
  }

  // ═══════════════════════════════════════════
  // EVENT BINDING
  // ═══════════════════════════════════════════

  _bindEvents() {
    // React to scroll state changes
    const unsubState = this.eventBus.on(Constants.EVENTS.SCENE_STATE_CHANGE, ({ state, property, value }) => {
      if (state === 'lights' && property === 'intensity') {
        this._updateLightIntensity(value);
      }
    });
    this.unsubscribers.push(unsubState);
    
    // React to mouse movement for accent light
    const unsubMouse = this.eventBus.on(Constants.EVENTS.MOUSE_MOVE_SMOOTH, ({ x, y }) => {
      this._updateAccentLight(x, y);
    });
    this.unsubscribers.push(unsubMouse);
  }

  // ═══════════════════════════════════════════
  // IDLE ANIMATIONS
  // ═══════════════════════════════════════════

  _setupIdleAnimations() {
    // Subtle breathing of key light intensity
    this.motionSystem.addIdle('keyLightBreath', (time) => {
      return 1.0 + Math.sin(time * 0.5) * 0.1;
    }, {
      output: 'target',
      targetName: 'keyLightIntensity',
      multiplier: 1,
    });
    
    // Create tracked value for key light
    this.motionSystem.createValue('keyLightIntensity', 1.2, {
      damping: 2,
      onUpdate: (value) => {
        const key = this.lights.get('key');
        if (key) key.intensity = value;
      },
    });
    
    // Rim light subtle sweep
    this.motionSystem.addIdle('rimSweep', (time) => {
      return Math.sin(time * 0.3) * 0.5;
    }, {
      output: 'target',
      targetName: 'rimPositionX',
      multiplier: 1,
    });
    
    this.motionSystem.createValue('rimPositionX', 0, {
      damping: 1.5,
      onUpdate: (value) => {
        const rim = this.lights.get('rim');
        if (rim) rim.position.x = value * 3;
      },
    });
  }

  // ═══════════════════════════════════════════
  // LIGHT UPDATES
  // ═══════════════════════════════════════════

  _updateLightIntensity(intensityMultiplier) {
    const key = this.lights.get('key');
    const fill = this.lights.get('fill');
    const rim = this.lights.get('rim');
    
    if (key) key.intensity = 1.2 * intensityMultiplier;
    if (fill) fill.intensity = 0.5 * intensityMultiplier;
    if (rim) rim.intensity = 2.0 * intensityMultiplier;
  }

  _updateAccentLight(x, y) {
    const accent = this.lights.get('accent');
    if (!accent) return;
    
    // Smooth follow with damping
    const targetX = x * 4;
    const targetY = y * 3;
    const targetZ = 3 + (1 - Math.abs(x)) * 2;
    
    accent.position.x += (targetX - accent.position.x) * 0.05;
    accent.position.y += (targetY - accent.position.y) * 0.05;
    accent.position.z += (targetZ - accent.position.z) * 0.05;
    
    // Color shift based on position
    const hue = (x + 1) * 0.1 + 0.05; // Warm to cool
    accent.color.setHSL(hue, 0.3, 0.8);
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  getLight(name) {
    return this.lights.get(name);
  }

  setLightColor(name, color) {
    const light = this.lights.get(name);
    if (light) light.color.set(color);
  }

  setLightIntensity(name, intensity) {
    const light = this.lights.get(name);
    if (light) light.intensity = intensity;
  }

  dispose() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.lights.forEach((light) => {
      light.dispose();
    });
    this.lights.clear();
  }
}
