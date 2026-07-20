/**
 * AETHER — Core Application Controller
 * 
 * Responsibility: Orchestrates all modules, manages lifecycle,
 * and provides the central hub for cross-module communication.
 * 
 * Future Parts will register their modules here via the plugin system.
 */

import { LoadingManager } from '../modules/LoadingManager.js';
import { UIManager } from '../modules/UIManager.js';
import { SceneManager } from '../modules/SceneManager.js';
import { RendererManager } from '../modules/RendererManager.js';
import { CameraManager } from '../modules/CameraManager.js';
import { AnimationLoop } from '../modules/AnimationLoop.js';
import { ResizeHandler } from '../modules/ResizeHandler.js';
import { AssetLoader } from '../modules/AssetLoader.js';
import { EventBus } from '../utils/EventBus.js';
import { DeviceCapabilities } from '../utils/DeviceCapabilities.js';
import { Constants } from '../utils/Constants.js';
import { LayoutSystem } from '../modules/LayoutSystem.js';
import { NavigationSystem } from '../modules/NavigationSystem.js';
import { ScrollSystem } from '../modules/ScrollSystem.js';
import { MotionSystem } from '../modules/MotionSystem.js';
import { ScrollEngine } from '../modules/ScrollEngine.js';
import { MouseInteraction } from '../modules/MouseInteraction.js';


export class App {
  constructor() {
    // ── Core References ──────────────────────
    this.canvasContainer = null;
    this.canvas = null;
    
    // ── Module Registry ──────────────────────
    // All modules are stored here for lifecycle management.
    // Future parts will register additional modules.
    this.modules = new Map();
    
    // ── State ────────────────────────────────
    this.isInitialized = false;
    this.isRunning = false;
    
    // ── Event Bus (Cross-Module Communication) ─
    // Decoupled pub/sub system. Modules communicate via events,
    // not direct references, ensuring loose coupling.
    this.eventBus = new EventBus();
    
    // ── Device Capabilities ──────────────────
    // Detects and caches device features (DPR, touch, WebGL, etc.)
    this.device = new DeviceCapabilities();
  }

  /**
   * Initialize the application.
   * Sequentially bootstraps all modules in dependency order.
   */
  async init() {
    if (this.isInitialized) {
      console.warn('[App] Already initialized.');
      return;
    }

    try {
      // 1. Cache DOM references
      this.canvasContainer = document.getElementById('hero-canvas-container');
      if (!this.canvasContainer) {
        throw new Error('Canvas container not found in DOM.');
      }

      // 2. Initialize utilities (no dependencies)
      this.modules.set('device', this.device);
      this.modules.set('eventBus', this.eventBus);

      // 3. Initialize loading manager (UI layer, no deps)
      const loadingManager = new LoadingManager();
      this.modules.set('loading', loadingManager);
      loadingManager.init();

      // 4. Initialize asset loader (depends on loading manager)
      const assetLoader = new AssetLoader({
        loadingManager,
        eventBus: this.eventBus,
      });
      this.modules.set('assetLoader', assetLoader);

      // 5. Initialize UI manager (depends on eventBus)
      const uiManager = new UIManager({ eventBus: this.eventBus });
      this.modules.set('ui', uiManager);
      uiManager.init();

            // 5b. Initialize Layout System (Part 2)
      const layoutSystem = new LayoutSystem({
        eventBus: this.eventBus,
        device: this.device,
      });
      this.registerModule('layout', layoutSystem);
      layoutSystem.init();

      // 5c. Initialize Navigation System (Part 2)
      const navigationSystem = new NavigationSystem({
        eventBus: this.eventBus,
        layoutSystem,
        device: this.device,
      });
      this.registerModule('navigation', navigationSystem);
      navigationSystem.init();

      // 5d. Initialize Scroll System (Part 2)
      const scrollSystem = new ScrollSystem({
        eventBus: this.eventBus,
        layoutSystem,
      });
      this.registerModule('scroll', scrollSystem);
      scrollSystem.init();
            // 5e. Initialize Motion System (Part 3A)
      const motionSystem = new MotionSystem({
        eventBus: this.eventBus,
        device: this.device,
      });
      this.registerModule('motion', motionSystem);
      motionSystem.init();

      // 5f. Initialize Mouse Interaction (Part 3A)
      const mouseInteraction = new MouseInteraction({
        eventBus: this.eventBus,
        motionSystem,
        device: this.device,
      });
      this.registerModule('mouse', mouseInteraction);
      mouseInteraction.init();

      // 5g. Initialize Scroll Engine (Part 3A)
      const scrollEngine = new ScrollEngine({
        eventBus: this.eventBus,
        motionSystem,
        layoutSystem,
        device: this.device,
      });
      this.registerModule('scrollEngine', scrollEngine);
      scrollEngine.init();



      // 6. Initialize Three.js core (interdependent)
      await this._initThreeJS();

      // 7. Initialize resize handler (depends on renderer, camera)
      const resizeHandler = new ResizeHandler({
        renderer: this.modules.get('renderer'),
        camera: this.modules.get('camera'),
        canvasContainer: this.canvasContainer,
        device: this.device,
        eventBus: this.eventBus,
      });
      this.modules.set('resize', resizeHandler);
      resizeHandler.init();

      // 8. Initialize animation loop (depends on renderer, scene, camera)
      const animationLoop = new AnimationLoop({
        renderer: this.modules.get('renderer'),
        scene: this.modules.get('scene'),
        camera: this.modules.get('camera'),
        eventBus: this.eventBus,
      });
      this.modules.set('animation', animationLoop);

      // 9. Start the render loop
      animationLoop.start();
      this.isRunning = true;

      // 10. Simulate asset loading, then reveal
      await this._onAssetsLoaded();

      this.isInitialized = true;
      this.eventBus.emit(Constants.EVENTS.APP_READY, { app: this });

      console.log('[App] Initialization complete.');

    } catch (error) {
      console.error('[App] Initialization failed:', error);
      this._handleInitError(error);
    }
  }

  /**
   * Initialize Three.js core modules: Scene, Camera, Renderer.
   * These are tightly coupled and initialized together.
   */
  async _initThreeJS() {
    const { device, eventBus } = this;

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.classList.add('hero__canvas');
    this.canvasContainer.appendChild(this.canvas);

    // ── Scene Manager ────────────────────────
    const sceneManager = new SceneManager({ eventBus });
    this.modules.set('scene', sceneManager);
    sceneManager.init();

    // ── Camera Manager ───────────────────────
    const cameraManager = new CameraManager({
      canvasContainer: this.canvasContainer,
      device,
      eventBus,
    });
    this.modules.set('camera', cameraManager);
    cameraManager.init();

    // ── Renderer Manager ─────────────────────
    const rendererManager = new RendererManager({
      canvas: this.canvas,
      device,
      eventBus,
    });
    this.modules.set('renderer', rendererManager);
    rendererManager.init();
  }

  /**
   * Called when all assets are loaded.
   * Hides loading screen and reveals the experience.
   */
  async _onAssetsLoaded() {
    const loadingManager = this.modules.get('loading');
    const assetLoader = this.modules.get('assetLoader');

    // Simulate progressive loading for demonstration
    // In production, this would await actual asset loading
    await assetLoader.simulateLoading((progress) => {
      loadingManager.updateProgress(progress);
    });

    // Hide loading screen with transition
    loadingManager.hide();
  }

  /**
   * Handle initialization errors gracefully.
   */
  _handleInitError(error) {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.innerHTML = `
        <div style="text-align:center;padding:2rem;">
          <p style="color:#fff;font-size:1.25rem;margin-bottom:1rem;">Unable to load experience</p>
          <p style="color:rgba(255,255,255,0.5);font-size:0.875rem;">${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Get a registered module by name.
   * Used by future Parts to access core systems.
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * Register a new module (for Parts 2 & 3).
   */
  registerModule(name, moduleInstance) {
    if (this.modules.has(name)) {
      console.warn(`[App] Module "${name}" already registered. Overwriting.`);
    }
    this.modules.set(name, moduleInstance);
  }

  /**
   * Destroy the application and clean up resources.
   */
  destroy() {
    this.isRunning = false;
    
    // Stop animation loop first
    const animation = this.modules.get('animation');
    if (animation) animation.stop();

    // Dispose modules in reverse order
    const disposeOrder = [
      'scrollEngine', 'mouse', 'motion', // Part 3A
      'scroll', 'navigation', 'layout',  // Part 2
      'animation', 'resize', 'renderer', 'camera',
      'scene', 'ui', 'assetLoader', 'loading'
    ];
    
    for (const name of disposeOrder) {
      const module = this.modules.get(name);
      if (module && typeof module.dispose === 'function') {
        module.dispose();
      }
    }

    this.modules.clear();
    this.eventBus.clear();
    this.isInitialized = false;

    console.log('[App] Destroyed.');
  }
}
