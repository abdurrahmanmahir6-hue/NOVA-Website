/**
 * AETHER — PART 2: Layout System
 * 
 * Central layout controller managing the responsive app shell,
 * container system, grid, spacing utilities, and section wrappers.
 * 
 * Integrates with: App (via registerModule), EventBus, Constants
 */

import { Constants } from '../utils/Constants.js';
import { debounce, throttle } from '../utils/Helpers.js';

export class LayoutSystem {
  constructor({ eventBus, device }) {
    this.eventBus = eventBus;
    this.device = device;
    
    this.state = {
      currentBreakpoint: null,
      isMobile: false,
      isTablet: false,
      isDesktop: false,
      scrollDirection: 'none',
      scrollProgress: 0,
    };

    this.sections = [];
    this.unsubscribers = [];
    this._scrollTick = null;
  }

  init() {
    this._detectBreakpoint();
    this._cacheSections();
    this._bindEvents();
    this._applyLayoutClasses();
    
    // Emit initial layout state
    this.eventBus.emit(Constants.EVENTS.LAYOUT_READY, {
      breakpoint: this.state.currentBreakpoint,
      ...this.state,
    });
  }

  // ── Breakpoint Detection ───────────────────

  get BREAKPOINTS() {
    return Object.freeze({
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    });
  }

  _detectBreakpoint() {
    const width = window.innerWidth;
    let bp = 'xs';
    
    if (width >= 1536) bp = '2xl';
    else if (width >= 1280) bp = 'xl';
    else if (width >= 1024) bp = 'lg';
    else if (width >= 768) bp = 'md';
    else if (width >= 640) bp = 'sm';
    
    const prev = this.state.currentBreakpoint;
    this.state.currentBreakpoint = bp;
    this.state.isMobile = width < 768;
    this.state.isTablet = width >= 768 && width < 1024;
    this.state.isDesktop = width >= 1024;
    
    if (prev !== bp) {
      document.documentElement.setAttribute('data-breakpoint', bp);
      this.eventBus.emit(Constants.EVENTS.BREAKPOINT_CHANGE, {
        breakpoint: bp,
        previous: prev,
        width,
      });
    }
    
    return bp;
  }

  // ── Section Management ─────────────────────

  _cacheSections() {
    this.sections = Array.from(document.querySelectorAll('section[id]')).map((el) => ({
      id: el.id,
      element: el,
      offsetTop: 0,
      offsetBottom: 0,
    }));
    this._updateSectionMetrics();
  }

  _updateSectionMetrics() {
    this.sections.forEach((section) => {
      const rect = section.element.getBoundingClientRect();
      section.offsetTop = rect.top + window.scrollY;
      section.offsetBottom = section.offsetTop + rect.height;
    });
  }

  getCurrentSection() {
    const scrollY = window.scrollY + window.innerHeight * 0.3;
    return this.sections.find((s) => scrollY >= s.offsetTop && scrollY < s.offsetBottom);
  }

  // ── Scroll Direction & Progress ────────────

  _onScroll() {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const prevY = this.state.lastScrollY || 0;
    
    this.state.scrollDirection = scrollY > prevY ? 'down' : scrollY < prevY ? 'up' : 'none';
    this.state.scrollProgress = docHeight > 0 ? scrollY / docHeight : 0;
    this.state.lastScrollY = scrollY;
    
    // Update body attribute for CSS hooks
    document.body.setAttribute('data-scroll-direction', this.state.scrollDirection);
    
    // Active section detection
    const currentSection = this.getCurrentSection();
    if (currentSection && currentSection.id !== this.state.activeSection) {
      this.state.activeSection = currentSection.id;
      this.eventBus.emit(Constants.EVENTS.SECTION_CHANGE, {
        sectionId: currentSection.id,
        section: currentSection,
      });
    }
    
    this.eventBus.emit(Constants.EVENTS.SCROLL, {
      scrollY,
      direction: this.state.scrollDirection,
      progress: this.state.scrollProgress,
    });
  }

  // ── Layout Classes ─────────────────────────

  _applyLayoutClasses() {
    const html = document.documentElement;
    html.classList.add('layout-initialized');
    
    if (this.state.isMobile) html.classList.add('is-mobile');
    else html.classList.remove('is-mobile');
    
    if (this.state.isTablet) html.classList.add('is-tablet');
    else html.classList.remove('is-tablet');
    
    if (this.state.isDesktop) html.classList.add('is-desktop');
    else html.classList.remove('is-desktop');
  }

  // ── Event Binding ──────────────────────────

  _bindEvents() {
    const throttledScroll = throttle(() => this._onScroll(), 16);
    window.addEventListener('scroll', throttledScroll, { passive: true });
    
    const debouncedResize = debounce(() => {
      this._detectBreakpoint();
      this._updateSectionMetrics();
      this._applyLayoutClasses();
    }, Constants.TIMING.RESIZE_DEBOUNCE);
    window.addEventListener('resize', debouncedResize);
    
    // Listen for resize from ResizeHandler to sync
    const unsub = this.eventBus.on(Constants.EVENTS.RESIZE, () => {
      this._updateSectionMetrics();
    });
    this.unsubscribers.push(unsub);
  }

  // ── Public API ─────────────────────────────

  getBreakpoint() {
    return this.state.currentBreakpoint;
  }

  getState() {
    return { ...this.state };
  }

  scrollToSection(sectionId, options = {}) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    const offset = options.offset || 0;
    const behavior = options.behavior || 'smooth';
    const top = section.offsetTop - offset;
    
    window.scrollTo({ top, behavior });
  }

  dispose() {
    this.unsubscribers.forEach((unsub) => unsub());
    document.documentElement.removeAttribute('data-breakpoint');
    document.body.removeAttribute('data-scroll-direction');
  }
}
