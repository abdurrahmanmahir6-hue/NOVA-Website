/**
 * AETHER — PART 3A: Motion System
 * 
 * Centralized physics-based animation controller.
 * Provides: smooth easing, damping, inertia, floating animations,
 * idle animations, object breathing, and micro-interactions.
 * 
 * All motion values are computed per-frame with delta-time correction
 * for frame-rate independent, physically believable movement.
 * 
 * Integrates with: AnimationLoop (via EVENTS.ANIMATION_FRAME),
 * EventBus, Constants
 */

import { Constants } from '../utils/Constants.js';
import { damp, lerp, clamp } from '../utils/Helpers.js';

export class MotionSystem {
  constructor({ eventBus, device }) {
    this.eventBus = eventBus;
    this.device = device;
    
    // ── Motion Targets ───────────────────────
    // Map of named values with their physics properties
    this.targets = new Map();
    
    // ── Idle Animations ──────────────────────
    this.idleAnimations = new Map();
    
    // ── Floating Objects ─────────────────────
    this.floatingObjects = new Map();
    
    // ── Breathing Objects ────────────────────
    this.breathingObjects = new Map();
    
    // ── Micro Interactions ───────────────────
    this.microInteractions = new Map();
    
    this.unsubscribers = [];
    this.time = 0;
    this.isRunning = false;
  }

  init() {
    const unsub = this.eventBus.on(Constants.EVENTS.ANIMATION_FRAME, ({ time, delta }) => {
      this._update(time, delta);
    });
    this.unsubscribers.push(unsub);
    this.isRunning = true;
  }

  // ═══════════════════════════════════════════
  // VALUE TRACKING (Damped Motion)
  // ═══════════════════════════════════════════

  /**
   * Create a tracked motion value with configurable physics.
   * @param {string} name - Unique identifier
   * @param {number} initial - Starting value
   * @param {Object} config - Physics configuration
   */
  createValue(name, initial = 0, config = {}) {
    const cfg = {
      damping: config.damping ?? 4.0,        // Higher = snappier
      mass: config.mass ?? 1.0,              // Higher = more inertia
      stiffness: config.stiffness ?? 0.0,    // Spring tension
      precision: config.precision ?? 0.001,  // Stop threshold
      clamp: config.clamp ?? null,           // [min, max]
      ...config,
    };

    this.targets.set(name, {
      current: initial,
      target: initial,
      velocity: 0,
      config: cfg,
      onUpdate: config.onUpdate || null,
      onComplete: config.onComplete || null,
    });

    return {
      get: () => this.getValue(name),
      set: (v) => this.setTarget(name, v),
      add: (v) => this.addToTarget(name, v),
      dispose: () => this.targets.delete(name),
    };
  }

  getValue(name) {
    const t = this.targets.get(name);
    return t ? t.current : 0;
  }

  setTarget(name, value) {
    const t = this.targets.get(name);
    if (t) t.target = value;
  }

  addToTarget(name, delta) {
    const t = this.targets.get(name);
    if (t) t.target += delta;
  }

  // ═══════════════════════════════════════════
  // IDLE ANIMATIONS (Ambient Motion)
  // ═══════════════════════════════════════════

  /**
   * Register an idle animation — continuous ambient motion.
   * @param {string} name
   * @param {Function} fn - (time, delta) => value
   * @param {Object} options
   */
  addIdle(name, fn, options = {}) {
    this.idleAnimations.set(name, {
      fn,
      output: options.output || 'value', // 'value' | 'target'
      targetName: options.targetName || null,
      multiplier: options.multiplier ?? 1,
      phase: options.phase ?? 0,
    });
  }

  // ═══════════════════════════════════════════
  // FLOATING ANIMATIONS (Sine-based drift)
  // ═══════════════════════════════════════════

  /**
   * Add a floating motion to an object or value.
   * Uses layered sine waves for organic, non-repetitive motion.
   */
  addFloating(name, options = {}) {
    const config = {
      amplitudeX: options.amplitudeX ?? 0.15,
      amplitudeY: options.amplitudeY ?? 0.2,
      amplitudeZ: options.amplitudeZ ?? 0.1,
      frequencyX: options.frequencyX ?? 0.3,
      frequencyY: options.frequencyY ?? 0.5,
      frequencyZ: options.frequencyZ ?? 0.2,
      phaseX: options.phaseX ?? 0,
      phaseY: options.phaseY ?? Math.PI * 0.5,
      phaseZ: options.phaseZ ?? Math.PI * 0.25,
      ...options,
    };

    this.floatingObjects.set(name, {
      config,
      basePosition: { x: 0, y: 0, z: 0 },
      current: { x: 0, y: 0, z: 0 },
      onUpdate: options.onUpdate || null,
    });

    return {
      setBase: (x, y, z) => {
        const f = this.floatingObjects.get(name);
        if (f) f.basePosition = { x, y, z };
      },
      dispose: () => this.floatingObjects.delete(name),
    };
  }

  // ═══════════════════════════════════════════
  // BREATHING ANIMATIONS (Scale pulsation)
  // ═══════════════════════════════════════════

  addBreathing(name, options = {}) {
    const config = {
      minScale: options.minScale ?? 0.98,
      maxScale: options.maxScale ?? 1.02,
      frequency: options.frequency ?? 0.8,
      phase: options.phase ?? 0,
      ease: options.ease ?? 'sine', // 'sine' | 'easeInOut'
      ...options,
    };

    this.breathingObjects.set(name, {
      config,
      currentScale: 1,
      onUpdate: options.onUpdate || null,
    });

    return {
      dispose: () => this.breathingObjects.delete(name),
    };
  }

  // ═══════════════════════════════════════════
  // MICRO INTERACTIONS (One-shot animations)
  // ═══════════════════════════════════════════

  /**
   * Trigger a one-shot micro-interaction.
   * E.g., button press feedback, hover bounce.
   */
  triggerMicro(name, options = {}) {
    const config = {
      type: options.type ?? 'spring', // 'spring' | 'decay' | 'ease'
      from: options.from ?? 0,
      to: options.to ?? 1,
      duration: options.duration ?? 0.4,
      damping: options.damping ?? 12,
      onUpdate: options.onUpdate || null,
      onComplete: options.onComplete || null,
      ...options,
    };

    const interaction = {
      config,
      startTime: this.time,
      elapsed: 0,
      isComplete: false,
    };

    this.microInteractions.set(name, interaction);

    return {
      isComplete: () => {
        const m = this.microInteractions.get(name);
        return m ? m.isComplete : true;
      },
    };
  }

  // ═══════════════════════════════════════════
  // CORE UPDATE LOOP
  // ═══════════════════════════════════════════

  _update(time, delta) {
    this.time = time;
    
    // Skip heavy updates if reduced motion is preferred
    if (this.device.isReducedMotion) {
      this._updateReducedMotion(delta);
      return;
    }

    this._updateTargets(delta);
    this._updateIdle(time, delta);
    this._updateFloating(time);
    this._updateBreathing(time);
    this._updateMicroInteractions(delta);
  }

  _updateTargets(delta) {
    for (const [name, target] of this.targets) {
      const { current, target: tgt, velocity, config } = target;
      
      // Spring-damper physics
      const displacement = tgt - current;
      const springForce = config.stiffness * displacement;
      const dampingForce = -config.damping * velocity;
      const acceleration = (springForce + dampingForce) / config.mass;
      
      let newVelocity = velocity + acceleration * delta;
      let newValue = current + newVelocity * delta;
      
      // Clamp if specified
      if (config.clamp) {
        newValue = clamp(newValue, config.clamp[0], config.clamp[1]);
      }
      
      // Stop if close enough
      if (Math.abs(displacement) < config.precision && Math.abs(newVelocity) < config.precision) {
        newValue = tgt;
        newVelocity = 0;
      }
      
      target.current = newValue;
      target.velocity = newVelocity;
      
      if (target.onUpdate) {
        target.onUpdate(newValue, name);
      }
      
      if (newValue === tgt && target.onComplete && velocity !== 0) {
        target.onComplete(newValue, name);
      }
    }
  }

  _updateIdle(time, delta) {
    for (const [name, idle] of this.idleAnimations) {
      const value = idle.fn(time + idle.phase, delta) * idle.multiplier;
      
      if (idle.output === 'target' && idle.targetName) {
        this.setTarget(idle.targetName, value);
      }
    }
  }

  _updateFloating(time) {
    for (const [name, float] of this.floatingObjects) {
      const { config, basePosition, onUpdate } = float;
      const t = time;
      
      // Layered sine waves for organic motion
      const x = basePosition.x + Math.sin(t * config.frequencyX + config.phaseX) * config.amplitudeX;
      const y = basePosition.y + Math.sin(t * config.frequencyY + config.phaseY) * config.amplitudeY;
      const z = basePosition.z + Math.sin(t * config.frequencyZ + config.phaseZ) * config.amplitudeZ;
      
      // Secondary harmonics for complexity
      const x2 = Math.sin(t * config.frequencyX * 1.7 + config.phaseX * 0.5) * config.amplitudeX * 0.3;
      const y2 = Math.sin(t * config.frequencyY * 2.3 + config.phaseY * 0.3) * config.amplitudeY * 0.2;
      
      float.current = {
        x: x + x2,
        y: y + y2,
        z: z,
      };
      
      if (onUpdate) {
        onUpdate(float.current, name);
      }
    }
  }

  _updateBreathing(time) {
    for (const [name, breath] of this.breathingObjects) {
      const { config, onUpdate } = breath;
      const t = time * config.frequency + config.phase;
      
      let value;
      if (config.ease === 'sine') {
        value = (Math.sin(t) + 1) * 0.5; // 0 to 1
      } else {
        // Ease in-out approximation
        const sinVal = Math.sin(t);
        value = sinVal < 0 ? 0 : sinVal * sinVal;
      }
      
      breath.currentScale = lerp(config.minScale, config.maxScale, value);
      
      if (onUpdate) {
        onUpdate(breath.currentScale, name);
      }
    }
  }

  _updateMicroInteractions(delta) {
    for (const [name, micro] of this.microInteractions) {
      if (micro.isComplete) continue;
      
      micro.elapsed += delta;
      const progress = clamp(micro.elapsed / micro.config.duration, 0, 1);
      
      let easedProgress;
      if (micro.config.type === 'spring') {
        // Damped spring approximation
        const damped = Math.exp(-micro.config.damping * progress);
        const oscillation = Math.cos(progress * Math.PI * 3);
        easedProgress = 1 - damped * (0.5 + 0.5 * oscillation);
      } else if (micro.config.type === 'decay') {
        // Exponential decay
        easedProgress = 1 - Math.exp(-5 * progress);
      } else {
        // Smooth ease
        easedProgress = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      }
      
      const value = lerp(micro.config.from, micro.config.to, easedProgress);
      
      if (micro.config.onUpdate) {
        micro.config.onUpdate(value, progress, name);
      }
      
      if (progress >= 1) {
        micro.isComplete = true;
        if (micro.config.onComplete) {
          micro.config.onComplete(micro.config.to, name);
        }
        this.microInteractions.delete(name);
      }
    }
  }

  _updateReducedMotion(delta) {
    // In reduced motion mode, snap targets instantly
    for (const [name, target] of this.targets) {
      if (target.current !== target.target) {
        target.current = target.target;
        target.velocity = 0;
        if (target.onUpdate) target.onUpdate(target.current, name);
      }
    }
  }

  // ═══════════════════════════════════════════
  // EASING FUNCTIONS
  // ═══════════════════════════════════════════

  static easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  static easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  static easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  // ═══════════════════════════════════════════
  // DISPOSAL
  // ═══════════════════════════════════════════

  dispose() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.targets.clear();
    this.idleAnimations.clear();
    this.floatingObjects.clear();
    this.breathingObjects.clear();
    this.microInteractions.clear();
    this.isRunning = false;
  }
}
