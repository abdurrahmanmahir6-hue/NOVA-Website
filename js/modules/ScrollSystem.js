/**
 * AETHER — PART 2: Scroll System
 * 
 * Advanced scroll behavior controller:
 * - Smooth scroll polyfill enhancement
 * - Scroll progress tracking per section
 * - Parallax preparation (data attributes)
 * - Scroll-triggered class toggling
 * - IntersectionObserver-based reveals
 * 
 * Integrates with: LayoutSystem, EventBus, Constants
 */

import { Constants } from '../utils/Constants.js';
import { throttle } from '../utils/Helpers.js';

export class ScrollSystem {
  constructor({ eventBus, layoutSystem }) {
    this.eventBus = eventBus;
    this.layoutSystem = layoutSystem;
    
    this.observers = new Map();
    this.scrollTargets = [];
    this.unsubscribers = [];
  }

  init() {
    this._initParallaxTargets();
    this._initRevealObserver();
    this._initProgressTracking();
    this._bindEventBus();
  }

  // ── Parallax Preparation ───────────────────

  _initParallaxTargets() {
    // Find all elements with data-parallax attributes
    // Actual parallax math will be in Part 3 (Animation)
    // Here we just register them and emit events
    this.scrollTargets = Array.from(document.querySelectorAll('[data-parallax]')).map((el) => ({
      element: el,
      speed: parseFloat(el.dataset.parallax) || 0.1,
      direction: el.dataset.parallaxDirection || 'vertical',
    }));
  }

  // ── Intersection Observer (Reveal) ─────────

  _initRevealObserver() {
    const revealElements = document.querySelectorAll('[data-reveal]');
    if (revealElements.length === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = entry.target.dataset.revealDelay || 0;
            
            setTimeout(() => {
              entry.target.classList.add('is-revealed');
              entry.target.classList.remove('is-hidden');
            }, delay);
            
            // Emit for external listeners
            this.eventBus.emit(Constants.EVENTS.ELEMENT_REVEAL, {
              element: entry.target,
            });
            
            // Unobserve after reveal
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.1,
      }
    );
    
    revealElements.forEach((el) => {
      el.classList.add('is-hidden');
      observer.observe(el);
    });
    
    this.observers.set('reveal', observer);
  }

  // ── Section Progress Tracking ──────────────

  _initProgressTracking() {
    const sections = document.querySelectorAll('section[id]');
    if (sections.length === 0) return;
    
    const progressObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const section = entry.target;
          const id = section.id;
          
          if (entry.isIntersecting) {
            section.classList.add('is-in-viewport');
            this.eventBus.emit(Constants.EVENTS.SECTION_ENTER, { sectionId: id, section });
          } else {
            section.classList.remove('is-in-viewport');
            this.eventBus.emit(Constants.EVENTS.SECTION_LEAVE, { sectionId: id, section });
          }
        });
      },
      {
        root: null,
        rootMargin: '-20% 0px -20% 0px',
        threshold: 0,
      }
    );
    
    sections.forEach((section) => progressObserver.observe(section));
    this.observers.set('progress', progressObserver);
  }

  // ── Event Bus Binding ──────────────────────

  _bindEventBus() {
    // Update parallax targets on scroll
    const unsub = this.eventBus.on(Constants.EVENTS.SCROLL, ({ scrollY }) => {
      this._updateParallax(scrollY);
    });
    this.unsubscribers.push(unsub);
  }

  _updateParallax(scrollY) {
    // Emit parallax data for Part 3 to consume
    // Part 3 will apply actual transforms via GSAP or direct style
    if (this.scrollTargets.length === 0) return;
    
    const parallaxData = this.scrollTargets.map((target) => ({
      element: target.element,
      speed: target.speed,
      direction: target.direction,
      offset: scrollY * target.speed,
    }));
    
    this.eventBus.emit(Constants.EVENTS.PARALLAX_UPDATE, { targets: parallaxData });
  }

  // ── Public API ─────────────────────────────

  scrollTo(target, options = {}) {
    let element;
    
    if (typeof target === 'string') {
      element = document.querySelector(target);
    } else {
      element = target;
    }
    
    if (!element) return;
    
    const offset = options.offset || 0;
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    
    window.scrollTo({
      top,
      behavior: options.behavior || 'smooth',
    });
  }

  dispose() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    this.unsubscribers.forEach((unsub) => unsub());
  }
}
