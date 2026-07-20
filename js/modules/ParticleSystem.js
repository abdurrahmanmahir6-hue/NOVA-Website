/**
 * AETHER — PART 3B: Particle System
 * 
 * Atmospheric particle system with:
 * - Depth variation for parallax
 * - Velocity variation for organic movement
 * - Floating motion with sine waves
 * - Opacity and size variation
 * - Smooth looping
 * - GPU-friendly implementation
 * 
 * Uses BufferGeometry for performance.
 * All particle attributes are pre-allocated.
 * 
 * Integrates with: SceneManager, MotionSystem, EventBus, Constants
 */

import * as THREE from 'three';
import { Constants } from '../utils/Constants.js';

export class ParticleSystem {
  constructor({ sceneManager, motionSystem, eventBus, device }) {
    this.sceneManager = sceneManager;
    this.motionSystem = motionSystem;
    this.eventBus = eventBus;
    this.device = device;
    
    this.particles = null;
    this.count = 0;
    this.attributes = {};
    this.unsubscribers = [];
  }

  init() {
    this._createParticles();
    this._bindEvents();
  }

  // ═══════════════════════════════════════════
  // PARTICLE CREATION
  // ═══════════════════════════════════════════

  _createParticles() {
    const group = this.sceneManager.getGroup('particles');
    
    // Particle count based on device capability
    this.count = this.device.isMobile ? 300 : this.device.isTablet ? 600 : 1500;
    
    const geometry = new THREE.BufferGeometry();
    
    // ── Positions ────────────────────────────
    const positions = new Float32Array(this.count * 3);
    const initialPositions = new Float32Array(this.count * 3);
    
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      
      // Distribute in a large sphere with depth variation
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 3 + Math.random() * 12;
      const depthLayer = Math.random(); // 0 = near, 1 = far
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi) * (0.5 + depthLayer);
      
      initialPositions[i3] = positions[i3];
      initialPositions[i3 + 1] = positions[i3 + 1];
      initialPositions[i3 + 2] = positions[i3 + 2];
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.attributes.initialPositions = initialPositions;
    
    // ── Sizes ────────────────────────────────
    const sizes = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      // Size variation: some large, many small
      const rand = Math.random();
     
