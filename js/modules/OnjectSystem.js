/**
 * AETHER — PART 3B: Object System
 * 
 * 3D object creation and management:
 * - Central sculptural object
 * - Floating orbital rings
 * - Background ambient objects
 * - Object animations and interactions
 * 
 * All objects are organized into SceneManager groups.
 * Animations are handled via MotionSystem for physics-based movement.
 * 
 * Integrates with: SceneManager, MaterialSystem, MotionSystem, EventBus
 */

import * as THREE from 'three';
import { Constants } from '../utils/Constants.js';

export class ObjectSystem {
  constructor({ sceneManager, materialSystem, motionSystem, eventBus, device }) {
    this.sceneManager = sceneManager;
    this.materialSystem = materialSystem;
    this.motionSystem = motionSystem;
    this.eventBus = eventBus;
    this.device = device;
    
    this.objects = new Map();
    this.rings = [];
    this.backgroundObjects = [];
    this.unsubscribers = [];
  }

  init() {
    this._createCentralObject();
    this._createFloatingRings();
    this._createBackgroundObjects();
    this._bindEvents();
    this._setupAnimations();
  }

  // ═══════════════════════════════════════════
  // CENTRAL OBJECT
  // ═══════════════════════════════════════════

  _createCentralObject() {
    const group = this.sceneManager.getGroup('centralObject');
    
    // Main sculptural form: Icosahedron with detail
    const geometry = this.materialSystem.getGeometry('icosahedron');
    const material = this.materialSystem.getMaterial('central');
    
    const centralMesh = new THREE.Mesh(geometry, material);
    centralMesh.name = 'central';
    centralMesh.castShadow = !this.device.isMobile;
    centralMesh.receiveShadow = !this.device.isMobile;
    
    group.add(centralMesh);
    this.objects.set('central', centralMesh);
    
    // Inner glow shell (slightly larger, fresnel effect)
    const fresnelMaterial = this.materialSystem.createFresnelMaterial({
      color: '#050505',
      fresnelColor: '#c9a87c',
      power: 3.0,
      opacity: 0.4,
    });
    
    const glowGeometry = new THREE.IcosahedronGeometry(1.05, 32);
    const glowMesh = new THREE.Mesh(glowGeometry, fresnelMaterial);
    glowMesh.name = 'centralGlow';
    group.add(glowMesh);
    this.objects.set('centralGlow', glowMesh);
    
    // Wireframe overlay for tech feel
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#a8c4d9'),
      wireframe: true,
      transparent: true,
      opacity: 0.03,
    });
    
    const wireMesh = new THREE.Mesh(geometry.clone(), wireMaterial);
    wireMesh.name = 'centralWire';
    wireMesh.scale.setScalar(1.02);
    group.add(wireMesh);
    this.objects.set('centralWire', wireMesh);
  }

  // ═══════════════════════════════════════════
  // FLOATING RINGS
  // ═══════════════════════════════════════════

  _createFloatingRings() {
    const group = this.sceneManager.getGroup('floatingRings');
    const ringCount = this.device.isMobile ? 3 : 5;
    
    const baseGeometry = this.materialSystem.getGeometry('torus');
    
    for (let i = 0; i < ringCount; i++) {
      const isAccent = i === 1 || i === 3;
      const material = isAccent 
        ? this.materialSystem.getMaterial('ringAccent')
        : this.materialSystem.getMaterial('ring');
      
      const ring = new THREE.Mesh(baseGeometry, material.clone());
      
      // Vary ring size
      const scale = 1.2 + i * 0.4;
      ring.scale.setScalar(scale);
      
      // Random initial rotation
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      ring.rotation.z = Math.random() * Math.PI;
      
      // Tilt each ring differently
      ring.rotation.x += (i % 2 === 0 ? 1 : -1) * 0.3;
      ring.rotation.y += i * 0.4;
      
      ring.name = `ring_${i}`;
      group.add(ring);
      
      this.rings.push({
        mesh: ring,
        index: i,
        baseScale: scale,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.1,
          y: (Math.random() - 0.5) * 0.15,
          z: (Math.random() - 0.5) * 0.05,
        },
        floatPhase: i * Math.PI * 0.4,
      });
    }
    
    this.eventBus.emit(Constants.EVENTS.OBJECTS_READY, {
      type: 'rings',
      count: ringCount,
    });
  }

  // ═══════════════════════════════════════════
  // BACKGROUND OBJECTS
  // ═══════════════════════════════════════════

  _createBackgroundObjects() {
    const group = this.sceneManager.getGroup('backgroundObjects');
    const count = this.device.isMobile ? 8 : 20;
    
    const geometry = new THREE.OctahedronGeometry(0.1, 0);
    const material = this.materialSystem.getMaterial('background');
    
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      
      // Distribute in a sphere around the center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 6 + Math.random() * 8;
      
      mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
      mesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
      mesh.position.z = radius * Math.cos(phi);
      
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      const scale = 0.5 + Math.random() * 1.5;
      mesh.scale.setScalar(scale);
      
      mesh.name = `bgObject_${i}`;
      group.add(mesh);
      
      this.backgroundObjects.push({
        mesh,
        basePosition: mesh.position.clone(),
        baseRotation: mesh.rotation.clone(),
        driftSpeed: 0.05 + Math.random() * 0.1,
        driftPhase: Math.random() * Math.PI * 2,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.01,
        },
      });
    }
  }

  // ═══════════════════════════════════════════
  // ANIMATIONS
  // ═══════════════════════════════════════════

  _setupAnimations() {
    // Central object breathing
    this.motionSystem.addBreathing('central', {
      minScale: 0.985,
      maxScale: 1.015,
      frequency: 0.6,
      onUpdate: (scale) => {
        const central = this.objects.get('central');
        const glow = this.objects.get('centralGlow');
        const wire = this.objects.get('centralWire');
        
        if (central) central.scale.setScalar(scale);
        if (glow) glow.scale.setScalar(scale * 1.05);
        if (wire) wire.scale.setScalar(scale * 1.02);
      },
    });
    
    // Central object floating
    const centralFloat = this.motionSystem.addFloating('central', {
      amplitudeY: 0.08,
      amplitudeX: 0.04,
      amplitudeZ: 0.02,
      frequencyY: 0.4,
      frequencyX: 0.25,
      onUpdate: (pos) => {
        const group = this.sceneManager.getGroup('centralObject');
        if (group) {
          group.position.set(pos.x, pos.y, pos.z);
        }
      },
    });
    centralFloat.setBase(0, 0, 0);
  }

  // ═══════════════════════════════════════════
  // EVENT BINDING
  // ═══════════════════════════════════════════

  _bindEvents() {
    // Update on every frame
    const unsub = this.eventBus.on(Constants.EVENTS.ANIMATION_FRAME, ({ time, delta }) => {
      this._onFrame(time, delta);
    });
    this.unsubscribers.push(unsub);
    
    // React to mouse parallax
    const unsubMouse = this.eventBus.on(Constants.EVENTS.MOUSE_MOVE_SMOOTH, ({ parallaxX, parallaxY }) => {
      this._onMouseMove(parallaxX, parallaxY);
    });
    this.unsubscribers.push(unsubMouse);
  }

  _onFrame(time, delta) {
    // Rotate rings
    for (const ring of this.rings) {
      ring.mesh.rotation.x += ring.rotationSpeed.x * delta;
      ring.mesh.rotation.y += ring.rotationSpeed.y * delta;
      ring.mesh.rotation.z += ring.rotationSpeed.z * delta;
      
      // Subtle floating of individual rings
      const floatY = Math.sin(time * 0.5 + ring.floatPhase) * 0.05;
      ring.mesh.position.y = floatY;
    }
    
    // Animate background objects
    for (const obj of this.backgroundObjects) {
      // Slow rotation
      obj.mesh.rotation.x += obj.rotationSpeed.x;
      obj.mesh.rotation.y += obj.rotationSpeed.y;
      obj.mesh.rotation.z += obj.rotationSpeed.z;
      
      // Gentle drift
      const drift = Math.sin(time * obj.driftSpeed + obj.driftPhase) * 0.3;
      obj.mesh.position.x = obj.basePosition.x + drift;
    }
    
    // Rotate wireframe slightly faster for tech effect
    const wire = this.objects.get('centralWire');
    if (wire) {
      wire.rotation.y += 0.05 * delta;
      wire.rotation.x += 0.02 * delta;
    }
  }

  _onMouseMove(x, y) {
    // Subtle parallax on central object group
    const centralGroup = this.sceneManager.getGroup('centralObject');
    if (centralGroup) {
      centralGroup.rotation.y = x * 0.1;
      centralGroup.rotation.x = -y * 0.1;
    }
    
    // Rings tilt slightly toward mouse
    for (const ring of this.rings) {
      ring.mesh.rotation.x += x * 0.001;
      ring.mesh.rotation.y += y * 0.001;
    }
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════

  getObject(name) {
    return this.objects.get(name);
  }

  getRings() {
    return this.rings.map((r) => r.mesh);
  }

  dispose() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.objects.clear();
    this.rings = [];
    this.backgroundObjects = [];
  }
}
