/**
 * AETHER — PART 2: Grid Item Component
 * 
 * Grid cell with responsive span configuration.
 */

export class GridItem {
  constructor(options = {}) {
    this.options = {
      span: options.span || 1,
      spanSm: options.spanSm || null,
      spanMd: options.spanMd || null,
      spanLg: options.spanLg || null,
      spanXl: options.spanXl || null,
      offset: options.offset || 0,
      className: options.className || '',
      tag: options.tag || 'div',
    };
    
    this.element = null;
  }

  create(children = []) {
    const el = document.createElement(this.options.tag);
    
    const classes = ['grid__item'];
    if (this.options.className) classes.push(this.options.className);
    el.className = classes.join(' ');
    
    // CSS Custom Properties for responsive spans
    el.style.setProperty('--grid-span', this.options.span);
    if (this.options.spanSm) el.style.setProperty('--grid-span-sm', this.options.spanSm);
    if (this.options.spanMd) el.style.setProperty('--grid-span-md', this.options.spanMd);
    if (this.options.spanLg) el.style.setProperty('--grid-span-lg', this.options.spanLg);
    if (this.options.spanXl) el.style.setProperty('--grid-span-xl', this.options.spanXl);
    if (this.options.offset) el.style.setProperty('--grid-offset', this.options.offset);
    
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
    const item = new GridItem(options);
    return item.create(children);
  }
}
