/**
 * AETHER — UI Manager
 * 
 * Manages all UI interactions: navigation, scroll effects,
 * header state, and mobile menu.
 * 
 * Future Parts will extend this with scroll-driven animations,
 * hover effects, and GSAP timelines.
 */

import { Constants } from '../utils/Constants.js';
import { debounce, throttle } from '../utils/Helpers.js';

export class UIManager {
  constructor({ eventBus }) {
    this.eventBus = eventBus;
    this.elements = {};
    this.state = {
      isNavOpen: false,
      isScrolled: false,
      lastScrollY: 0,
    };
    this.unsubscribers = [];
  }

  init() {
    this._cacheElements();
    this._bindEvents();
    this._checkScrollPosition();
  }

  _cacheElements() {
    this.elements.header = document.querySelector(Constants.SELECTORS.HEADER);
    this.elements.navLinks = document.querySelector(Constants.SELECTORS.NAV_LINKS);
    this.elements.navToggle = document.querySelector(Constants.SELECTORS.NAV_TOGGLE);
  }

  _bindEvents() {
    // Navigation toggle
    if (this.elements.navToggle) {
      this.elements.navToggle.addEventListener('click', () => this._toggleNav());
    }

    // Close nav on link click (mobile)
    if (this.elements.navLinks) {
      const links = this.elements.navLinks.querySelectorAll('a');
      links.forEach((link) => {
        link.addEventListener('click', () => this._closeNav());
      });
    }

    // Scroll handling (throttled for performance)
    const throttledScroll = throttle(() => this._onScroll(), Constants.TIMING.SCROLL_DEBOUNCE);
    window.addEventListener('scroll', throttledScroll, { passive: true });

    // Resize handling (debounced)
    const debouncedResize = debounce(() => this._onResize(), Constants.TIMING.RESIZE_DEBOUNCE);
    window.addEventListener('resize', debouncedResize);

    // Keyboard: close nav on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.isNavOpen) {
        this._closeNav();
      }
    });

    // Close nav when clicking outside
    document.addEventListener('click', (e) => {
      if (
        this.state.isNavOpen &&
        !this.elements.navLinks.contains(e.target) &&
        !this.elements.navToggle.contains(e.target)
      ) {
        this._closeNav();
      }
    });
  }

  _toggleNav() {
    if (this.state.isNavOpen) {
      this._closeNav();
    } else {
      this._openNav();
    }
  }

  _openNav() {
    if (!this.elements.navLinks || !this.elements.navToggle) return;
    
    this.elements.navLinks.classList.add('site-nav__links--open');
    this.elements.navToggle.setAttribute('aria-expanded', 'true');
    this.state.isNavOpen = true;
    document.body.style.overflow = 'hidden';
    
    this.eventBus.emit(Constants.EVENTS.NAV_OPEN);
  }

  _closeNav() {
    if (!this.elements.navLinks || !this.elements.navToggle) return;
    
    this.elements.navLinks.classList.remove('site-nav__links--open');
    this.elements.navToggle.setAttribute('aria-expanded', 'false');
    this.state.isNavOpen = false;
    document.body.style.overflow = '';
    
    this.eventBus.emit(Constants.EVENTS.NAV_CLOSE);
  }

  _onScroll() {
    const scrollY = window.scrollY;
    this.state.lastScrollY = scrollY;

    // Header background transition
    const threshold = 50;
    const isScrolled = scrollY > threshold;

    if (isScrolled !== this.state.isScrolled) {
      this.state.isScrolled = isScrolled;
      
      if (this.elements.header) {
        this.elements.header.classList.toggle('site-header--scrolled', isScrolled);
      }
    }

    this.eventBus.emit(Constants.EVENTS.SCROLL, { scrollY });
  }

  _checkScrollPosition() {
    this._onScroll();
  }

  _onResize() {
    // Close mobile nav on resize to desktop
    if (window.innerWidth > 768 && this.state.isNavOpen) {
      this._closeNav();
    }
  }

  dispose() {
    this.unsubscribers.forEach((unsub) => unsub());
    document.body.style.overflow = '';
  }
}
