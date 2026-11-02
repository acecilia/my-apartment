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
  }

  disconnectedCallback() {
    window.removeEventListener('hashchange', this.updateActive);
    this.resizeObserver?.disconnect();
  }
}

customElements.define('apartment-navigation', ApartmentNavigation);

})();
