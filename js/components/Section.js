/**
 * AETHER — PART 2: Section Component
 * 
 * Reusable section wrapper with:
 * - ID assignment for navigation
 * - Container injection
 * - Reveal animation attributes
 * - Theme/color variant support
 */

import { Container } from './Container.js';

export class Section {
  constructor(options = {}) {
    this.options = {
      id: options.id || '',
      className: options.className || '',
      tag: options.tag || 'section',
      ariaLabel: options.ariaLabel || '',
      theme: options.theme || 'dark', // dark | light | accent
      reveal: options.reveal !== false,
      revealDelay: options.revealDelay || 0,
      fullHeight: options.fullHeight || false,
      withContainer: options.withContainer !== false,
      containerOptions: options.containerOptions || {},
    };
    
    this.element = null;
  }

  create(content = []) {
    const el = document.createElement(this.options.tag);
    
    // Base classes
    const classes = ['section'];
    if (this.options.className) classes.push(this.options.className);
    if (this.options.fullHeight) classes.push('section--full-height');
    if (this.options.theme !== 'dark') classes.push(`section--${this.options.theme}`);
    el.className = classes.join(' ');
    
    // Attributes
    if (this.options.id) {
      el.id = this.options.id;
    }
    if (this.options.ariaLabel) {
      el.setAttribute('aria-label', this.options.ariaLabel);
    }
    if (this.options.reveal) {
      el.setAttribute('data-reveal', '');
      if (this.options.revealDelay) {
        el.setAttribute('data-reveal-delay', this.options.revealDelay);
      }
    }
    
    // Content
    if (this.options.withContainer) {
      const container = Container.create(content, this.options.containerOptions);
      el.appendChild(container);
    } else {
      content.forEach((child) => {
        if (typeof child === 'string') {
          el.innerHTML += child;
        } else if (child instanceof HTMLElement) {
          el.appendChild(child);
        }
      });
    }
    
    this.element = el;
    return el;
  }

  getElement() {
    return this.element;
  }

  static create(content, options) {
    const section = new Section(options);
    return section.create(content);
  }
}
