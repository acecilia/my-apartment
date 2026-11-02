(()=>{
const links = [
  ['project', 'Apartment', 'index.html#overview'],
  ['model', '3D model', 'model.html'],
  ['design', 'Living room', 'style-explorer.html'],
  ['bedroom', 'Bedroom', 'bedroom.html'],
  ['materials', 'Material boards', 'materials.html'],
];

class ApartmentNavigation extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('./navigation.css', document.baseURI).href;
    root.append(stylesheet);
    const header = document.createElement('header');
    header.className = 'navigation';
    header.innerHTML = '<a class="brand" href="index.html#overview"><span class="mark">M</span><span>MY APARTMENT<small>DESIGN PROJECT</small></span></a><nav aria-label="Main navigation"></nav>';
    const nav = header.querySelector('nav');
    for (const [key, label, href] of links) {
      const anchor = document.createElement('a');
      anchor.dataset.key = key;
      anchor.href = href;
      anchor.textContent = label;
      nav.append(anchor);
    }
    root.append(header);
    this.updateActive = () => {
      const page = location.pathname.split('/').pop() || 'index.html';
      const current = page === 'index.html'
        ? 'project'
        : page === 'living-room.html' ? 'design' : links.find(([, , href]) => href.split('#')[0] === page)?.[0];
      for (const anchor of nav.querySelectorAll('a')) {
        if (anchor.dataset.key === current) anchor.setAttribute('aria-current', 'page');
        else anchor.removeAttribute('aria-current');
      }
    };
    this.updateActive();
    window.addEventListener('hashchange', this.updateActive);
    this.resizeObserver = new ResizeObserver(() => {
      const height = Math.ceil(this.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--apartment-navigation-height', `${height}px`);
    });
    this.resizeObserver.observe(this);
    const mobile = window.matchMedia('(max-width: 1000px)');
    let lastY = window.scrollY, direction = 0, distance = 0;
    this.onScroll = () => {
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = 0;
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const y = Math.max(0, Math.min(maxY, window.scrollY));
        const delta = y - lastY;
        lastY = y;
        if (!mobile.matches || y <= this.offsetHeight || root.querySelector(':focus-visible')) {
          this.removeAttribute('data-scroll-hidden');
          distance = 0;
          return;
        }
        if (Math.abs(delta) < 1) return;
        const nextDirection = Math.sign(delta);
        distance = nextDirection === direction ? distance + Math.abs(delta) : Math.abs(delta);
        direction = nextDirection;
        if (distance >= 12) this.toggleAttribute('data-scroll-hidden', direction > 0);
      });
    };
    this.resetScroll = () => {
      lastY = window.scrollY;
      distance = 0;
      this.removeAttribute('data-scroll-hidden');
    };
    this.scrollMedia = mobile;
    window.addEventListener('scroll', this.onScroll, { passive: true });
    mobile.addEventListener('change', this.resetScroll);
    this.addEventListener('focusin', this.resetScroll);
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this.updateActive);
    this.resizeObserver?.disconnect();
    window.removeEventListener('scroll', this.onScroll);
    this.scrollMedia?.removeEventListener('change', this.resetScroll);
    this.removeEventListener('focusin', this.resetScroll);
    cancelAnimationFrame(this.scrollFrame);
  }
}

customElements.define('apartment-navigation', ApartmentNavigation);

})();
