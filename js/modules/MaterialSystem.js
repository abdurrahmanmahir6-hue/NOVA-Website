/**
 * AETHER — PART 3B: Material System
 * 
 * Premium material definitions with:
 * - Physically-based materials
 * - Fresnel effects
 * - Custom gradients
 * - Glass-like transparency
 * - Reflection tuning
 * - Material reuse for performance
 * 
 * All materials are cached and reused to minimize GPU memory.
 * 
 * Integrates with: SceneManager, EventBus, Constants
 */

import * as THREE from 'three';

export class MaterialSystem {
  constructor({ eventBus, device }) {
    this.eventBus = eventBus;
    this.device = device;
    
    // ── Material Cache ───────────────────────
    this.cache = new Map();
    
    // ── Shared Geometries ────────────────────
    this.geometries = new Map();
  }

  init() {
    this._createBaseMaterials();
    this._createSharedGeometries();
  }

  // ═══════════════════════════════════════════
  // BASE MATERIALS
  // ═══════════════════════════════════════════

  _createBaseMaterials() {
    // ── Central Object Material ──────────────
    // Premium metallic with subtle color shift
    const centralMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#e8e4dc'),
      metalness: 0.9,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 1.0,
      envMapIntensity: 1.5,
      sheen: 0.5,
      sheenColor: new THREE.Color('#c9a87c'),
    });
    this.cache.set('central', centralMaterial);
    
    // ── Ring Material ────────────────────────
    // Glass-like with transmission
    const ringMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#a8c4d9'),
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.6,
      thickness: 0.5,
      transparent: true,
      opacity: 0.8,
      ior: 1.5,
      side: THREE.DoubleSide,
    });
    this.cache.set('ring', ringMaterial);
    
    // ── Accent Ring Material ─────────────────
    const accentRingMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#c9a87c'),
      metalness: 0.7,
      roughness: 0.2,
      clearcoat: 0.8,
      emissive: new THREE.Color('#c9a87c'),
      emissiveIntensity: 0.1,
    });
    this.cache.set('ringAccent', accentRingMaterial);
    
    // ── Particle Material ────────────────────
    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color('#e8e4dc'),
      size: 0.03,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.cache.set('particle', particleMaterial);
    
    // ── Background Object Material ───────────
    const bgMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#1a1a2e'),
      metalness: 0.5,
      roughness: 0.8,
      transparent: true,
      opacity: 0.3,
    });
    this.cache.set('background', bgMaterial);
    
    // ── Glass Material ───────────────────────
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffffff'),
      metalness: 0.0,
      roughness: 0.0,
      transmission: 0.95,
      thickness: 1.0,
      transparent: true,
      opacity: 0.3,
      ior: 1.7,
      side: THREE.DoubleSide,
    });
    this.cache.set('glass', glassMaterial);
  }

  // ═══════════════════════════════════════════
  // SHARED GEOMETRIES (Performance)
  // ═══════════════════════════════════════════

  _createSharedGeometries() {
    // Icosahedron for central object (high detail)
    this.geometries.set('icosahedron', new THREE.IcosahedronGeometry(1, 64));
    
    // Torus for rings
    this.geometries.set('torus', new THREE.TorusGeometry(1.5, 0.02, 16, 100));
    
    // Sphere for particles
    this.geometries.set('particle', new THREE.SphereGeometry(0.02, 4, 4));
    
    // Plane for background elements
    this.geometries.set('plane', new THREE.PlaneGeometry(1, 1));
  }

  // ═══════════════════════════════════════════
  // MATERIAL GETTERS
  // ═══════════════════════════════════════════

  getMaterial(name) {
    return this.cache.get(name);
  }

  getGeometry(name) {
    return this.geometries.get(name);
  }

  /**
   * Clone a material with optional overrides.
   * Useful for creating variations without full recreation.
   */
  cloneMaterial(baseName, overrides = {}) {
    const base = this.cache.get(baseName);
    if (!base) return null;
    
    const cloned = base.clone();
    
    for (const [key, value] of Object.entries(overrides)) {
      if (key === 'color' && typeof value === 'string') {
        cloned.color.set(value);
      } else {
        cloned[key] = value;
      }
    }
    
    return cloned;
  }

  // ═══════════════════════════════════════════
  // FRESNEL EFFECT (Custom Shader)
  // ═══════════════════════════════════════════

  createFresnelMaterial(options = {}) {
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform vec3 uColor;
      uniform vec3 uFresnelColor;
      uniform float uFresnelPower;
      uniform float uOpacity;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vec3 viewDirection = normalize(-vPosition);
        float fresnel = pow(1.0 - dot(viewDirection, vNormal), uFresnelPower);
        
        vec3 finalColor = mix(uColor, uFresnelColor, fresnel);
        float alpha = mix(uOpacity * 0.3, uOpacity, fresnel);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;
    
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(options.color || '#1a1a2e') },
        uFresnelColor: { value: new THREE.Color(options.fresnelColor || '#a8c4d9') },
        uFresnelPower: { value: options.power || 2.0 },
        uOpacity: { value: options.opacity ?? 0.5 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  // ═══════════════════════════════════════════
  // DISPOSAL
  // ═══════════════════════════════════════════

  dispose() {
    this.cache.forEach((material) => material.dispose());
    this.cache.clear();
    
    this.geometries.forEach((geometry) => geometry.dispose());
    this.geometries.clear();
  }
}
