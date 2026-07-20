/**
 * AETHER — Loading Manager
 * 
 * Manages the loading screen UI.
 * Displays progress and handles the reveal transition.
 */

import { Constants } from '../utils/Constants.js';

export class LoadingManager {
  constructor() {
    this.elements = {};
    this.isVisible = true;
  }

  init() {
    this.elements.screen = document.querySelector(Constants.SELECTORS.LOADING_SCREEN);
    this.elements.bar = document.querySelector(Constants.SELECTORS.LOADING_BAR);
    this.elements.percentage = document.querySelector(Constants.SELECTORS.LOADING_PERCENTAGE);

    if (!this.elements.screen) {
      console.warn('[LoadingManager] Loading screen element not found.');
    }
  }

  /**
   * Update the loading progress.
   * @param {number} progress - Value between 0 and 1
   */
  updateProgress(progress) {
    const percent = Math.round(progress * 100);
    
    if (this.elements.bar) {
      this.elements.bar.style.width = `${percent}%`;
    }
    
    if (this.elements.percentage) {
      this.elements.percentage.textContent = `${percent}%`;
    }
  }

  /**
   * Hide the loading screen with a smooth transition.
   */
  hide() {
    if (!this.elements.screen || !this.isVisible) return;

    // Ensure minimum display time for perceived quality
    const elapsed = Date.now() - this._startTime;
    const minDuration = Constants.TIMING.LOADING_MIN_DURATION;
    const delay = Math.max(0, minDuration - elapsed);

    setTimeout(() => {
      this.elements.screen.classList.add('loading-screen--hidden');
      this.isVisible = false;
      
      // Remove from DOM after transition to free memory
      setTimeout(() => {
        if (this.elements.screen && this.elements.screen.parentNode) {
          this.elements.screen.parentNode.removeChild(this.elements.screen);
        }
      }, Constants.TIMING.LOADING_FADE_DURATION + 100);
    }, delay);
  }

  /**
   * Show the loading screen (for re-initialization).
   */
  show() {
    if (!this.elements.screen) return;
    this.elements.screen.classList.remove('loading-screen--hidden');
    this.isVisible = true;
    this._startTime = Date.now();
  }

  dispose() {
    this.elements = {};
  }
}
