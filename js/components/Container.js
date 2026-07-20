/**
 * AETHER — PART 2: Container Component
 * 
 * Reusable container wrapper enforcing max-width and padding.
 * Used by sections and layout blocks.
 */

export class Container {
  constructor(options = {}) {
    this.options = {
      maxWidth: options.maxWidth || null, // Uses CSS var if null
      padding: options.padding || null,
      className: options.className || '',
      tag: options.tag || 'div',
    };
    
    this.element = null;
  }

  create(children = []) {
    const el = document.createElement(this.options.tag);
    el.className = `container ${this.options.className}`.trim();
    
    if (this.options.maxWidth) {
      el.style.maxWidth = this.options.maxWidth;
    }
    
    if (this.options.padding) {
      el.style.padding = this.options.padding;
    }
    
    children.forEach((child) => {
      if (typeof child === 'string') {
        el.innerHTML += child;
      } else if (child instanceof HTMLElement) {
        el.appendChild(child);
      }
    });
    
    this.element = el;
    return el;
  }

  getElement() {
    return this.element;
  }

  static create(children, options) {
    const container = new Container(options);
    return container.create(children);
  }
}
