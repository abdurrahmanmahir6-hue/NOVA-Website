/**
 * AETHER — PART 1: FOUNDATION
 * Main Entry Point — Module Orchestrator
 * 
 * Architecture: ES6 Modules with clear separation of concerns.
 * Future Parts (2 & 3) will import and extend from these modules.
 */

import { App } from './core/App.js';

// ── Initialize Application ───────────────────
// DOMContentLoaded ensures the DOM is fully parsed before initialization.
// This prevents race conditions and ensures all elements exist.
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch((error) => {
    console.error('[Aether] Fatal initialization error:', error);
  });
});
