/**
 * AETHER — Application Constants
 * 
 * Centralized constants for maintainability and consistency.
 * Future Parts will extend this with their own constants.
 */

export const Constants = Object.freeze({
  // ── Application ────────────────────────────
  APP_NAME: 'NOVA',
  VERSION: '1.0.0',

  // ── Events (Centralized Event Names) ───────
  // All modules use these constants for event names,
  // preventing typos and ensuring consistency.
  EVENTS: Object.freeze({
    APP_READY: 'app:ready',
    LOADING_PROGRESS: 'loading:progress',
    LOADING_COMPLETE: 'loading:complete',
    RESIZE: 'window:resize',
    SCROLL: 'window:scroll',
    MOUSE_MOVE: 'input:mousemove',
    MOUSE_ENTER: 'input:mouseenter',
    MOUSE_LEAVE: 'input:mouseleave',
    CLICK: 'input:click',
    NAV_TOGGLE: 'nav:toggle',
    NAV_OPEN: 'nav:open',
    NAV_CLOSE: 'nav:close',
    SCENE_READY: 'scene:ready',
    RENDERER_READY: 'renderer:ready',
    CAMERA_READY: 'camera:ready',
    ANIMATION_FRAME: 'animation:frame',
    // Reserved for future Parts
    LIGHTS_READY: 'lights:ready',
    OBJECTS_READY: 'objects:ready',
    PARTICLES_READY: 'particles:ready',
    HOVER_START: 'interaction:hoverstart',
    HOVER_END: 'interaction:hoverend',
    SCROLL_PROGRESS: 'scroll:progress',
        // ── Part 2: Layout & Navigation ──────────
    LAYOUT_READY: 'layout:ready',
    BREAKPOINT_CHANGE: 'layout:breakpointchange',
    SECTION_CHANGE: 'layout:sectionchange',
    SECTION_ENTER: 'layout:sectionenter',
    SECTION_LEAVE: 'layout:sectionleave',
    ELEMENT_REVEAL: 'layout:elementreveal',
    PARALLAX_UPDATE: 'layout:parallaxupdate',
        // ── Part 3: Motion & Interaction ─────────
    MOUSE_MOVE_SMOOTH: 'input:mousemove:smooth',
    HOVER_START: 'interaction:hoverstart',
    HOVER_END: 'interaction:hoverend',
    SCROLL_PROGRESS: 'scroll:progress',
    SCENE_STATE_CHANGE: 'scene:statechange',
    PARALLAX_UPDATE: 'layout:parallaxupdate',
    CAMERA_UPDATE: 'camera:update',

  }),

  // ── CSS Selectors ──────────────────────────
  SELECTORS: Object.freeze({
    LOADING_SCREEN: '#loading-screen',
    LOADING_BAR: '#loading-bar',
    LOADING_PERCENTAGE: '#loading-percentage',
    HEADER: '#site-header',
    NAV_LINKS: '#site-nav-links',
    NAV_TOGGLE: '#nav-toggle',
    HERO_CANVAS: '#hero-canvas-container',
  }),

  // ── Timing ─────────────────────────────────
  TIMING: Object.freeze({
    LOADING_MIN_DURATION: 1200,   // Minimum loading screen duration (ms)
    LOADING_FADE_DURATION: 800,   // Loading screen fade-out duration (ms)
    NAV_TRANSITION: 600,          // Mobile nav transition (ms)
    SCROLL_DEBOUNCE: 16,          // Scroll event debounce (ms)
    RESIZE_DEBOUNCE: 100,         // Resize event debounce (ms)
  }),

  // ── Three.js Defaults ──────────────────────
  THREE: Object.freeze({
    FOV: 45,
    NEAR: 0.1,
    FAR: 1000,
    CAMERA_POSITION: Object.freeze({ x: 0, y: 0, z: 5 }),
    BACKGROUND_COLOR: 0x050505,
    TONE_MAPPING: 'ACESFilmic',   // Will map to THREE.ACESFilmicToneMapping
    TONE_MAPPING_EXPOSURE: 1.2,
    OUTPUT_COLOR_SPACE: 'SRGB',   // Will map to THREE.SRGBColorSpace
  }),

  // ── Performance ────────────────────────────
  PERFORMANCE: Object.freeze({
    MAX_PIXEL_RATIO: 2,           // Cap DPR at 2 for performance
    MOBILE_PIXEL_RATIO: 1.5,      // Lower cap on mobile
    TARGET_FPS: 60,
    IDLE_FPS: 30,                 // FPS when tab is hidden
  }),
});
