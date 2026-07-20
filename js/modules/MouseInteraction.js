/**
 * AETHER — PART 3A: Mouse Interaction System
 * 
 * Advanced cursor-driven interaction controller.
 * Provides: mouse parallax, smooth object following, hover reactions,
 * magnetic movement, interactive lighting, and cursor depth response.
 * 
 * All interactions use normalized device coordinates (-1 to 1) for
 * consistent behavior across screen sizes.
 * 
 * Integrates with: MotionSystem, EventBus, Constants, DeviceCapabilities
 */

import { Constants } from '../utils/Constants.js';
import { clamp, lerp, damp } from '../utils/Helpers.js';

export class MouseInteraction {
  constructor({ eventBus, motionSystem, device }) {
    this.eventBus = eventBus;
    this.motionSystem = motionSystem;
    this.device = device;
    
    // ── Mouse State ──────────────────────────
    this.state = {
      x: 0,              // Normalized X (-1 to 1)
      y: 0,              // Normalized Y (-1 to 1)
      rawX: 0,           // Raw pixel X
      rawY: 0,           // Raw pixel Y
      isMoving: false,
      isHovering: false,
      hoverTarget: null,
    };
    
    // ── Smooth Values ────────────────────────
    this.smoothX = null;
    this.smoothY = null;
    this.smoothVelocity = null;
    
    // ── Interactive Objects ──────────────────
    this.interactiveObjects = new Map();
    
    // ── Magnetic Elements ────────────────────
    this.magneticElements = [];
    
    // ── Light Followers ──────────────────────
    this.lightFollowers = [];
    
    this.unsubscribers = [];
    this.moveTimeout = null;
    this.isTouch = device.isTouch;
  }

  init() {
    if (this.isTouch) {
      this._initTouch();
    } else {
      this._initMouse();
    }
    
    this._createSmoothValues();
    this._bindEvents();
  }

  // ═══════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════

  _initMouse() {
    // Mouse is primary input
    document.addEventListener('mousemove', (e) => this._onMouseMove(e), { passive: true });
    document.addEventListener('mouseenter', () => this._onMouseEnter(), { passive: true });
    document.addEventListener('mouseleave', () => this._onMouseLeave(), { passive: true });
  }

  _initTouch() {
    // Touch fallback — use single touch as mouse proxy
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this._onMouseMove(e.touches[0]);
      }
    }, { passive: true });
  }

  _createSmoothValues() {
    // Smooth mouse position with different damping for X and Y
    this.smoothX = this.motionSystem.createValue('mouseX', 0, {
      damping: this.isTouch ? 6 : 3.5,
      precision: 0.0001,
    });
    
    this.smoothY = this.motionSystem.createValue('mouseY', 0, {
      damping: this.isTouch ? 6 : 3.5,
      precision: 0.0001,
    });
    
    this.smoothVelocity = this.motionSystem.createValue('mouseVelocity', 0, {
      damping: 8,
      precision: 0.001,
    });
  }

  _bindEvents() {
    // Listen for animation frames to update derived values
    const unsub = this.eventBus.on(Constants.EVENTS.ANIMATION_FRAME, ({ delta }) => {
      this._onFrame(delta);
    });
    this.unsubscribers.push(unsub);
  }

  // ═══════════════════════════════════════════
  // MOUSE EVENT HANDLERS
  // ═══════════════════════════════════════════

  _onMouseMove(e) {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    
    // Normalize to -1 to 1
    const nx = (clientX / innerWidth) * 2 - 1;
    const ny = -(clientY / innerHeight) * 2 + 1; // Invert Y for 3D coordinates
    
    this.state.rawX = clientX;
    this.state.rawY = clientY;
    this.state.x = clamp(nx, -1, 1);
    this.state.y = clamp(ny, -1, 1);
    this.state.isMoving = true;
    
    // Update motion targets
    this.smoothX.set(this.state.x);
    this.smoothY.set(this.state.y);
    
    // Calculate velocity
    const dx = this.state.x - (this._prevX || 0);
    const dy = this.state.y - (this._prevY || 0);
    const velocity = Math.sqrt(dx * dx + dy * dy);
    this.smoothVelocity.set(velocity);
    
    this._prevX = this.state.x;
    this._prevY = this.state.y;
    
    // Reset move timeout
    clearTimeout(this.moveTimeout);
    this.moveTimeout = setTimeout(() => {
      this.state.isMoving = false;
      this.smoothVelocity.set(0);
    }, 100);
    
    // Emit mouse move event
    this.eventBus.emit(Constants.EVENTS.MOUSE_MOVE, {
      x: this.state.x,
      y: this.state.y,
      rawX: clientX,
      rawY: clientY,
      velocity,
      isMoving: true,
    });
    
    // Check hover on interactive objects
    this._checkHover(clientX, clientY);
  }

  _onMouseEnter() {
    this.eventBus.emit(Constants.EVENTS.MOUSE_ENTER, {});
  }

  _onMouseLeave() {
    this.state.isMoving = false;
    this.smoothVelocity.set(0);
    this.eventBus.emit(Constants.EVENTS.MOUSE_LEAVE, {});
  }

  // ═══════════════════════════════════════════
  // HOVER DETECTION
  // ═══════════════════════════════════════════

  _checkHover(clientX, clientY) {
    // Check DOM-based magnetic elements
    for (const el of this.magneticElements) {
      const rect = el.element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.sqrt(
        Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2)
      );
      
      const isHovering = distance < el.radius;
      
      if (isHovering !== el.isHovering) {
        el.isHovering = isHovering;
        
        if (isHovering) {
          el.element.classList.add('is-magnetic-active');
          this.eventBus.emit(Constants.EVENTS.HOVER_START, {
            element: el.element,
            type: 'magnetic',
          });
        } else {
          el.element.classList.remove('is-magnetic-active');
          this.eventBus.emit(Constants.EVENTS.HOVER_END, {
            element: el.element,
            type: 'magnetic',
          });
        }
      }
      
      // Apply magnetic pull
      if (isHovering && !this.device.isReducedMotion) {
        const pullStrength = 1 - (distance / el.radius);
        const pullX = (clientX - centerX) * el.strength * pullStrength;
        const pullY = (clientY - centerY) * el.strength * pullStrength;
        
        el.element.style.transform = `translate(${pullX}px, ${pullY}px)`;
      } else if (!isHovering && el.lastTransform) {
        el.element.style.transform = '';
        el.lastTransform = null;
      }
    }
  }

  // ═══════════════════════════════════════════
  // FRAME UPDATE
  // ═══════════════════════════════════════════

  _onFrame(delta) {
    if (!this.state.isMoving && this.smoothVelocity.get() < 0.001) return;
    
    const smoothX = this.smoothX.get();
    const smoothY = this.smoothY.get();
    const velocity = this.smoothVelocity.get();
    
    // Emit smooth mouse position for other systems
    this.eventBus.emit(Constants.EVENTS.MOUSE_MOVE_SMOOTH, {
      x: smoothX,
      y: smoothY,
      velocity,
      parallaxX: smoothX * 0.5,  // Reduced range for parallax
      parallaxY: smoothY * 0.5,
    });
    
    // Update light followers
    this._updateLightFollowers(smoothX, smoothY);
  }

  _updateLightFollowers(x, y) {
    for (const light of this.lightFollowers) {
      if (light.object && light.object.position) {
        const targetX = x * light.range;
        const targetY = y * light.range;
        const targetZ = light.baseZ + (1 - Math.abs(x)) * light.depthRange;
        
        // Smooth follow
        light.object.position.x = damp(
          light.object.position.x,
          targetX,
          light.damping,
          0.016
        );
        light.object.position.y = damp(
          light.object.position.y,
          targetY,
          light.damping,
          0.016
        );
        light.object.position.z = damp(
          light.object.position.z,
          targetZ,
          light.damping,
          0.016
        );
      }
    }
  }

  // ═══════════════════════════════════════════
  // PUBLIC API — Registration
  // ═══════════════════════════════════════════

  /**
   * Register a DOM element for magnetic hover effect.
   */
  addMagnetic(element, options = {}) {
    const config = {
      element,
      strength: options.strength ?? 0.3,
      radius: options.radius ?? 100,
      isHovering: false,
      lastTransform: null,
    };
    
    this.magneticElements.push(config);
    
    return {
      dispose: () => {
        const idx = this.magneticElements.indexOf(config);
        if (idx > -1) this.magneticElements.splice(idx, 1);
      },
    };
  }

  /**
   * Register a Three.js light to follow the mouse.
   */
  addLightFollower(light, options = {}) {
    const config = {
      object: light,
      range: options.range ?? 3,
      baseZ: options.baseZ ?? 2,
      depthRange: options.depthRange ?? 1,
      damping: options.damping ?? 4,
    };
    
    this.lightFollowers.push(config);
    
    return {
      dispose: () => {
        const idx = this.lightFollowers.indexOf(config);
        if (idx > -1) this.lightFollowers.splice(idx, 1);
      },
    };
  }

  /**
   * Register an interactive 3D object.
   */
  addInteractiveObject(name, object, options = {}) {
    this.interactiveObjects.set(name, {
      object,
      onHover: options.onHover || null,
      onClick: options.onClick || null,
      isHovered: false,
      originalScale: object.scale.clone(),
      hoverScale: options.hoverScale ?? 1.05,
    });
  }

  // ═══════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════

  getPosition() {
    return {
      x: this.smoothX.get(),
      y: this.smoothY.get(),
    };
  }

  getRawPosition() {
    return {
      x: this.state.x,
      y: this.state.y,
    };
  }

  getVelocity() {
    return this.smoothVelocity.get();
  }

  // ═══════════════════════════════════════════
  // DISPOSAL
  // ═══════════════════════════════════════════

  dispose() {
    this.unsubscribers.forEach((unsub) => unsub());
    clearTimeout(this.moveTimeout);
    this.magneticElements = [];
    this.lightFollowers = [];
    this.interactiveObjects.clear();
  }
}
