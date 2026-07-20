/**
 * AETHER — Scene Manager
 * 
 * Creates and manages the Three.js Scene.
 * Provides hooks for future Parts to add objects, lights,
 * and environment effects without modifying this module.
 */

import * as THREE from 'three';
import { Constants } from '../utils/Constants.js';

export class SceneManager {
  constructor({ eventBus }) {
    this.eventBus = eventBus;
    this.scene = null;
    this.groups = new Map(); // Named groups for organization
  }

  init() {
    // Create the main scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(Constants.THREE.BACKGROUND_COLOR);

    // Create named groups for future Parts
    // Part 2 will add: lights, centralObject, floatingRings, particles, backgroundObjects
    this._createGroup('lights');
    this._createGroup('centralObject');
    this._createGroup('floatingRings');
    this._createGroup('particles');
    this._createGroup('backgroundObjects');
    this._createGroup('environment');

    // Add a subtle fog (can be adjusted in Part 2)
    this.scene.fog = new THREE.FogExp2(Constants.THREE.BACKGROUND_COLOR, 0.02);

    this.eventBus.emit(Constants.EVENTS.SCENE_READY, { scene: this.scene });
  }

  /**
   * Create a named group in the scene.
   * Future Parts will use these groups to organize their objects.
   */
  _createGroup(name) {
    const group = new THREE.Group();
    group.name = name;
    this.groups.set(name, group);
    this.scene.add(group);
  }

  /**
   * Get a named group.
   * @param {string} name - Group name
   */
  getGroup(name) {
    return this.groups.get(name);
  }

  /**
   * Add an object to a named group.
   * @param {string} groupName - Target group
   * @param {THREE.Object3D} object - Object to add
   */
  addToGroup(groupName, object) {
    const group = this.groups.get(groupName);
    if (group) {
      group.add(object);
    } else {
      console.warn(`[SceneManager] Group "${groupName}" not found. Adding to scene directly.`);
      this.scene.add(object);
    }
  }

  /**
   * Get the raw Three.js scene (for renderer).
   */
  getScene() {
    return this.scene;
  }

  dispose() {
    // Dispose all geometries, materials, and textures
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.groups.clear();
  }
}
