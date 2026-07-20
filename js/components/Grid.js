/**
 * AETHER — PART 2: Grid Component
 * 
 * CSS Grid wrapper with responsive column configuration.
 * Supports: columns, gap, alignment, and responsive variants.
 */

export class Grid {
  constructor(options = {}) {
    this.options = {
      columns: options.columns || 12,
      gap: options.gap || null, // Uses CSS var if null
      rowGap: options.rowGap || null,
      align: options.align || 'start',
      justify: options.justify || 'start',
      className: options.className || '',
      tag: options.tag || 'div',
    };
    
    this.element = null;
  }

  create(children = []) {
    const el = document.createElement(this.options.tag);
    el.className = `grid ${this.options.className}`.trim();
    
    // CSS Grid properties
    el.style.display = 'grid';
    
    if (typeof this.options.columns === 'number') {
      el.style.gridTemplateColumns = `repeat(${this.options.columns}, 1fr)`;
    } else if (typeof this.options.columns === 'string') {
      el.style.gridTemplateColumns = this.options.columns;
    }
    
    if (this.options.gap) {
      el.style.gap = this.options.gap;
    }
    if (this.options.rowGap) {
      el.style.rowGap = this.options.rowGap;
    }
    if (this.options.align) {
      el.style.alignItems = this.options.align;
    }
    if (this.options.justify) {
      el.style.justifyItems = this.options.justify;
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
    const grid = new Grid(options);
    return grid.create(children);
  }
}
