/**
 * AETHER — PART 2: Navigation System
 * 
 * Comprehensive navigation controller handling:
 * - Desktop navigation with active link detection
 * - Mobile navigation drawer with animations
 * - Sticky header behavior
 * - Skip navigation for accessibility
 * - Keyboard navigation & focus management
 * - Smooth anchor scrolling
 * - Scroll-aware header state
 * 
 * Integrates with: LayoutSystem, EventBus, Constants, UIManager (Part 1)
 */

import { Constants } from '../utils/Constants.js';
import { debounce, throttle } from '../utils/Helpers.js';

export class NavigationSystem {
  constructor({ eventBus, layoutSystem, device }) {
    this.eventBus = eventBus;
    this.layoutSystem = layoutSystem;
    this.device = device;
    
    this.elements = {};
    this.state = {
      isOpen: false,
      isSticky: false,
      isHidden: false,
      lastScrollY: 0,
      scrollThreshold: 80,
      hideThreshold: 200,
      activeLink: null,
    };
    
    this.unsubscribers = [];
    this.focusTrap = null;
  }

  init() {
    this._cacheElements();
    this._createSkipNav();
    this._bindEvents();
    this._bindEventBus();
    this._updateActiveLink();
  }

  // ── DOM Caching ────────────────────────────

  _cacheElements() {
    this.elements.header = document.querySelector(Constants.SELECTORS.HEADER);
    this.elements.nav = document.querySelector('.site-nav');
    this.elements.navLinks = document.querySelector(Constants.SELECTORS.NAV_LINKS);
    this.elements.navToggle = document.querySelector(Constants.SELECTORS.NAV_TOGGLE);
    this.elements.links = this.elements.navLinks 
      ? Array.from(this.elements.navLinks.querySelectorAll('a[href^="#"]'))
      : [];
    this.elements.skipNav = null;
  }

  // ── Skip Navigation (Accessibility) ────────

  _createSkipNav() {
    const skipNav = document.createElement('a');
    skipNav.href = '#main-content';
    skipNav.className = 'skip-nav';
    skipNav.textContent = 'Skip to main content';
    skipNav.setAttribute('tabindex', '0');
    
    document.body.insertBefore(skipNav, document.body.firstChild);
    this.elements.skipNav = skipNav;
    
    skipNav.addEventListener('click', (e) => {
      e.preventDefault();
      const main = document.querySelector('.site-main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus();
        main.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // ── Event Binding ──────────────────────────

  _bindEvents() {
    // Toggle button
    if (this.elements.navToggle) {
      this.elements.navToggle.addEventListener('click', () => this.toggle());
    }
    
    // Nav link clicks — smooth scroll
    this.elements.links.forEach((link) => {
      link.addEventListener('click', (e) => this._handleLinkClick(e));
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => this._handleKeydown(e));
    
    // Scroll-aware header
    const throttledScroll = throttle(() => this._onScroll(), 16);
    window.addEventListener('scroll', throttledScroll, { passive: true });
    
    // Focus management for mobile nav
    document.addEventListener('focusin', (e) => this._handleFocusIn(e));
  }

  _bindEventBus() {
    // Sync with LayoutSystem section changes
    const unsubSection = this.eventBus.on(Constants.EVENTS.SECTION_CHANGE, ({ sectionId }) => {
      this._setActiveLink(sectionId);
    });
    this.unsubscribers.push(unsubSection);
    
    // Sync with UIManager nav events
    const unsubNavOpen = this.eventBus.on(Constants.EVENTS.NAV_OPEN, () => {
      this.state.isOpen = true;
      this._trapFocus();
    });
    this.unsubscribers.push(unsubNavOpen);
    
    const unsubNavClose = this.eventBus.on(Constants.EVENTS.NAV_CLOSE, () => {
      this.state.isOpen = false;
      this._releaseFocus();
    });
    this.unsubscribers.push(unsubNavClose);
  }

  // ── Scroll-Aware Header ────────────────────

  _onScroll() {
    const scrollY = window.scrollY;
    const prevY = this.state.lastScrollY;
    const direction = scrollY > prevY ? 'down' : scrollY < prevY ? 'up' : 'none';
    
    // Sticky state
    const isSticky = scrollY > this.state.scrollThreshold;
    if (isSticky !== this.state.isSticky) {
      this.state.isSticky = isSticky;
      this.elements.header.classList.toggle('site-header--sticky', isSticky);
    }
    
    // Hide/show on scroll direction (desktop only)
    if (!this.layoutSystem.state.isMobile && isSticky) {
      const isHidden = direction === 'down' && scrollY > this.state.hideThreshold;
      if (isHidden !== this.state.isHidden) {
        this.state.isHidden = isHidden;
        this.elements.header.classList.toggle('site-header--hidden', isHidden);
        this.elements.header.classList.toggle('site-header--visible', !isHidden);
      }
    } else if (this.state.isHidden) {
      this.state.isHidden = false;
      this.elements.header.classList.remove('site-header--hidden');
      this.elements.header.classList.add('site-header--visible');
    }
    
    this.state.lastScrollY = scrollY;
  }

  // ── Link Handling ──────────────────────────

  _handleLinkClick(e) {
    const href = e.currentTarget.getAttribute('href');
    if (!href.startsWith('#')) return;
    
    e.preventDefault();
    const targetId = href.slice(1);
    
    // Close mobile nav if open
    if (this.state.isOpen) {
      this.close();
    }
    
    // Smooth scroll to section
    this.layoutSystem.scrollToSection(targetId, {
      offset: this.elements.header ? this.elements.header.offsetHeight : 80,
      behavior: 'smooth',
    });
    
    // Update URL without jump
    history.pushState(null, null, href);
    
    // Set active immediately for responsiveness
    this._setActiveLink(targetId);
  }

  _updateActiveLink() {
    const current = this.layoutSystem.getCurrentSection();
    if (current) {
      this._setActiveLink(current.id);
    }
  }

  _setActiveLink(sectionId) {
    if (this.state.activeLink === sectionId) return;
    this.state.activeLink = sectionId;
    
    this.elements.links.forEach((link) => {
      const href = link.getAttribute('href').slice(1);
      const isActive = href === sectionId;
      
      link.classList.toggle('site-nav__link--active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  // ── Mobile Drawer ──────────────────────────

  toggle() {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.state.isOpen) return;
    
    this.state.isOpen = true;
    document.body.classList.add('nav-drawer-open');
    document.body.style.overflow = 'hidden';
    
    if (this.elements.navLinks) {
      this.elements.navLinks.classList.add('site-nav__links--open');
    }
    
    if (this.elements.navToggle) {
      this.elements.navToggle.setAttribute('aria-expanded', 'true');
    }
    
    this.eventBus.emit(Constants.EVENTS.NAV_OPEN);
  }

  close() {
    if (!this.state.isOpen) return;
    
    this.state.isOpen = false;
    document.body.classList.remove('nav-drawer-open');
    document.body.style.overflow = '';
    
    if (this.elements.navLinks) {
      this.elements.navLinks.classList.remove('site-nav__links--open');
    }
    
    if (this.elements.navToggle) {
      this.elements.navToggle.setAttribute('aria-expanded', 'false');
    }
    
    this.eventBus.emit(Constants.EVENTS.NAV_CLOSE);
  }

  // ── Keyboard Navigation ────────────────────

  _handleKeydown(e) {
    // Escape closes mobile nav
    if (e.key === 'Escape' && this.state.isOpen) {
      this.close();
      this.elements.navToggle?.focus();
    }
    
    // Arrow keys for desktop nav link cycling
    if (!this.state.isOpen && e.key === 'ArrowRight' && document.activeElement?.classList.contains('site-nav__link')) {
      this._focusNextLink(1);
    }
    if (!this.state.isOpen && e.key === 'ArrowLeft' && document.activeElement?.classList.contains('site-nav__link')) {
      this._focusNextLink(-1);
    }
  }

  _focusNextLink(direction) {
    const links = this.elements.links;
    const current = document.activeElement;
    const index = links.indexOf(current);
    if (index === -1) return;
    
    const nextIndex = (index + direction + links.length) % links.length;
    links[nextIndex].focus();
  }

  // ── Focus Trap (Mobile Drawer) ─────────────

  _trapFocus() {
    if (!this.elements.navLinks) return;
    
    const focusable = this.elements.navLinks.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusable.length === 0) return;
    
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    
    first.focus();
    
    this.focusTrap = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    
    this.elements.navLinks.addEventListener('keydown', this.focusTrap);
  }

  _releaseFocus() {
    if (this.focusTrap && this.elements.navLinks) {
      this.elements.navLinks.removeEventListener('keydown', this.focusTrap);
      this.focusTrap = null;
    }
  }

  _handleFocusIn(e) {
    // If focus leaves the drawer while open, trap it back
    if (this.state.isOpen && this.elements.navLinks && !this.elements.navLinks.contains(e.target)) {
      const firstLink = this.elements.navLinks.querySelector('a');
      if (firstLink) firstLink.focus();
    }
  }

  // ── Public API ─────────────────────────────

  getState() {
    return { ...this.state };
  }

  dispose() {
    this.close();
    this.unsubscribers.forEach((unsub) => unsub());
    if (this.elements.skipNav) {
      this.elements.skipNav.remove();
    }
    document.body.classList.remove('nav-drawer-open');
  }
}
