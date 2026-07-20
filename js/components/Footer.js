/**
 * AETHER — PART 2: Footer Component
 * 
 * Site footer with responsive layout, navigation links,
 * and social links. Follows the design system from Part 1.
 */

import { Container } from './Container.js';

export class Footer {
  constructor(options = {}) {
    this.options = {
      brand: options.brand || 'Aether',
      tagline: options.tagline || 'Crafted with precision.',
      copyright: options.copyright || `© ${new Date().getFullYear()} Aether. All rights reserved.`,
      links: options.links || [],
      socials: options.socials || [],
      className: options.className || '',
    };
    
    this.element = null;
  }

  create() {
    const footer = document.createElement('footer');
    footer.className = `site-footer ${this.options.className}`.trim();
    footer.setAttribute('role', 'contentinfo');
    
    const inner = Container.create([], { className: 'site-footer__inner' });
    
    // Brand column
    const brandCol = document.createElement('div');
    brandCol.className = 'site-footer__brand';
    
    const brandName = document.createElement('span');
    brandName.className = 'site-footer__logo';
    brandName.textContent = this.options.brand;
    
    const tagline = document.createElement('p');
    tagline.className = 'site-footer__tagline';
    tagline.textContent = this.options.tagline;
    
    brandCol.appendChild(brandName);
    brandCol.appendChild(tagline);
    
    // Links column
    const linksCol = document.createElement('nav');
    linksCol.className = 'site-footer__nav';
    linksCol.setAttribute('aria-label', 'Footer navigation');
    
    if (this.options.links.length > 0) {
      const linksList = document.createElement('ul');
      linksList.className = 'site-footer__links';
      
      this.options.links.forEach((link) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = link.href;
        a.className = 'site-footer__link';
        a.textContent = link.label;
        if (link.external) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        }
        li.appendChild(a);
        linksList.appendChild(li);
      });
      
      linksCol.appendChild(linksList);
    }
    
    // Social column
    const socialCol = document.createElement('div');
    socialCol.className = 'site-footer__social';
    
    if (this.options.socials.length > 0) {
      this.options.socials.forEach((social) => {
        const a = document.createElement('a');
        a.href = social.href;
        a.className = 'site-footer__social-link';
        a.setAttribute('aria-label', social.label);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        a.innerHTML = social.icon || social.label;
        socialCol.appendChild(a);
      });
    }
    
    // Copyright
    const copyright = document.createElement('p');
    copyright.className = 'site-footer__copyright';
    copyright.textContent = this.options.copyright;
    
    // Assemble
    const content = document.createElement('div');
    content.className = 'site-footer__content';
    content.appendChild(brandCol);
    content.appendChild(linksCol);
    content.appendChild(socialCol);
    
    inner.appendChild(content);
    inner.appendChild(copyright);
    footer.appendChild(inner);
    
    this.element = footer;
    return footer;
  }

  getElement() {
    return this.element;
  }

  static create(options) {
    const footer = new Footer(options);
    return footer.create();
  }
}
