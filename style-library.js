(async ()=>{
const library = await fetch('style-library.json', { cache: 'no-store' }).then(response => {
  if (!response.ok) throw new Error('Style catalogue unavailable');
  return response.json();
});
const excludedImages = new Set(library.excluded_room_images || []);
const area = document.body.dataset.designArea || 'Living room';
const entries = library.entries.filter(entry => entry.kind === 'room' && entry.area === area).map(entry => ({
  ...entry,
  variants: entry.variants.filter(variant => variant.tv_mounting !== 'wall' && !excludedImages.has(variant.image))
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true })),
})).filter(entry => entry.variants.length);
const original = {
  id: 'before', name: 'Original empty room',
  description: area === 'Bedroom' ? 'Owner photograph of the bedroom toward the terrace.' : 'Owner photograph from beside the peninsula toward the terrace.',
  variants: [{ label: 'Owner photograph', image: area === 'Bedroom' ? 'source/2 - Flat images/Bedroom window 1.PNG' : 'source/2 - Flat images/Livingroom 1.PNG' }],
};
const allChoices = entries.concat(original);
const params = new URL(location.href).searchParams;
const versions = new Map(entries.map(entry => [entry.id, variantIndex(entry, entry.default_variant)]));
let colour = 'all';
let view = ['full', 'compare'].includes(params.get('view')) ? params.get('view') : 'tiles';
let selectedId = allChoices.some(entry => entry.id === params.get('style')) ? params.get('style') : (entries[0] || original).id;
function entryFor(id) { return allChoices.find(entry => entry.id === id) || entries[0] || original; }
function variantIndex(entry, filename) {
  const index = entry.variants.findIndex(variant => variant.image.split('/').pop() === filename);
  return Math.max(0, index);
}
versions.set(selectedId, variantIndex(entryFor(selectedId), params.get('variant') || entryFor(selectedId).default_variant));
const comparison = {
  left: { id: params.get('left') || selectedId, index: 0 },
  right: { id: params.get('right') || (entries.find(entry => entry.id !== selectedId) || original).id, index: 0 },
};
for (const side of ['left', 'right']) {
  comparison[side].id = entryFor(comparison[side].id).id;
  comparison[side].index = variantIndex(entryFor(comparison[side].id), params.get(side + 'Variant') || entryFor(comparison[side].id).default_variant);
}
let editingSide = 'left';
let compareInitialized = view === 'compare';
let reveal = params.has('split') ? Number(params.get('split')) : 50;
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function selectedVariant(entry) { return entry.variants[versions.get(entry.id) || 0]; }
function visibleEntries() { return entries.filter(entry => colour === 'all' || (entry.colours || []).includes(colour)); }
function choices() { return visibleEntries().concat(original); }
function choiceButtons(container, options, selected, callback) {
  container.replaceChildren();
  options.forEach((option, index) => {
    const button = element('button', 'choice-button', option.name || option.label);
    const value = option.id ?? index;
    button.setAttribute('aria-pressed', String(value === selected));
    button.addEventListener('click', () => callback(value));
    container.append(button);
  });
}
function rememberLocation() {
  const url = new URL(location.href);
  url.hash = '';
  url.searchParams.set('view', view);
  url.searchParams.set('style', selectedId);
  url.searchParams.set('variant', selectedVariant(entryFor(selectedId)).image.split('/').pop());
  for (const side of ['left', 'right']) {
    const state = comparison[side];
    if (view === 'compare') {
      url.searchParams.set(side, state.id);
      url.searchParams.set(side + 'Variant', entryFor(state.id).variants[state.index].image.split('/').pop());
    } else {
      url.searchParams.delete(side);
      url.searchParams.delete(side + 'Variant');
    }
  }
  if (view === 'compare') url.searchParams.set('split', String(Math.round(reveal)));
  else url.searchParams.delete('split');
  try { history.replaceState(null, '', url); } catch (_) { /* Local file URL restriction. */ }
}
function openStyle(entry) {
  selectedId = entry.id;
  view = 'full';
  render(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function card(entry) {
  const article = element('article', 'style-card');
  article.dataset.style = entry.id;
  const imageButton = element('button', 'style-image');
  imageButton.setAttribute('aria-label', 'View ' + entry.name + ' full width');
  const image = element('img');
  image.src = selectedVariant(entry).image;
  image.alt = [entry.name, entry.sofa].filter(Boolean).join(' · ');
  image.loading = 'lazy';
  imageButton.append(image);
  imageButton.addEventListener('click', () => openStyle(entry));
  const caption = element('div', 'card-caption');
  caption.append(element('h3', '', entry.name), element('span', 'sofa-tag', entry.sofa));
  if (entry.variants.length > 1) {
    const select = element('select');
    select.setAttribute('aria-label', 'Version for ' + entry.name);
    entry.variants.forEach((variant, index) => {
      const option = element('option', '', variant.label);
      option.value = String(index);
      select.append(option);
    });
    select.value = String(versions.get(entry.id) || 0);
    select.addEventListener('change', () => {
      versions.set(entry.id, Number(select.value));
      selectedId = entry.id;
      image.src = selectedVariant(entry).image;
      imageButton.title = selectedVariant(entry).note || '';
      renderFull();
      rememberLocation();
    });
    caption.append(select);
  }
  article.append(imageButton, caption);
  return article;
}
function renderFull() {
  const available = choices();
  if (!available.some(entry => entry.id === selectedId)) selectedId = available[0].id;
  const entry = entryFor(selectedId);
  const variant = selectedVariant(entry);
  choiceButtons(document.querySelector('#style-selector'), available, selectedId, id => { selectedId = id; render(true); });
  choiceButtons(document.querySelector('#version-selector'), entry.variants, versions.get(entry.id) || 0, index => { versions.set(entry.id, index); render(true); });
  document.querySelector('#full-version-row').hidden = entry.variants.length < 2;
  document.querySelector('#viewer-image').src = variant.image;
  document.querySelector('#viewer-image').alt = entry.name;
  document.querySelector('#viewer-title').textContent = entry.name;
  document.querySelector('#viewer-description').textContent = [entry.description, variant.note].filter(Boolean).join(' ');
  document.querySelector('#viewer-full-image').href = variant.image;
  document.querySelector('#viewer-download').href = variant.image;
}
function setReveal(value) {
  reveal = Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 50));
  document.querySelector('#compare-stage').style.setProperty('--reveal', reveal + '%');
  document.querySelector('#compare-reveal').value = String(reveal);
  const leftPercent = Math.round(reveal);
  document.querySelector('#compare-position').textContent = leftPercent + '% left · ' + (100 - leftPercent) + '% right';
  document.querySelector('#compare-reveal').setAttribute('aria-valuetext', leftPercent + '% left image');
}
function renderCompare() {
  const available = choices();
  for (const side of ['left', 'right']) {
    const state = comparison[side];
    if (!available.some(entry => entry.id === state.id)) { state.id = available[0].id; state.index = 0; }
    const entry = entryFor(state.id);
    const variant = entry.variants[state.index] || entry.variants[0];
    const image = document.querySelector('#compare-' + side + '-image');
    image.src = variant.image;
    image.alt = side + ': ' + entry.name + ' · ' + variant.label;
    document.querySelector('#' + side + '-image-name').textContent = entry.name;
    document.querySelector('#compare-' + side + '-label').textContent = entry.name;
  }
  document.querySelectorAll('[data-side]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.side === editingSide)));
  document.querySelector('#compare-choice-label').textContent = 'CHOOSE THE ' + editingSide.toUpperCase() + ' IMAGE';
  const state = comparison[editingSide];
  const entry = entryFor(state.id);
  choiceButtons(document.querySelector('#compare-style-selector'), available, state.id, id => {
    state.id = id; state.index = versions.get(id) || 0; renderCompare(); rememberLocation();
  });
  choiceButtons(document.querySelector('#compare-version-selector'), entry.variants, state.index, index => {
    state.index = index; renderCompare(); rememberLocation();
  });
  document.querySelector('#compare-version-row').hidden = entry.variants.length < 2;
  setReveal(reveal);
}
function render(updateURL = false) {
  const visible = visibleEntries();
  const grid = document.querySelector('#room-styles');
  grid.replaceChildren(...visible.map(card));
  document.querySelector('#library-count').textContent = visible.length + ' room styles · ' + visible.reduce((sum, entry) => sum + entry.variants.length, 0) + ' saved images';
  const hasConcepts = entries.length > 0;
  document.querySelector('.library-tools').hidden = !hasConcepts;
  renderFull();
  renderCompare();
  document.querySelector('#tile-view').hidden = view !== 'tiles';
  document.querySelector('#fullwidth-view').hidden = view !== 'full';
  document.querySelector('#comparison-view').hidden = view !== 'compare';
  document.querySelector('#empty-library').hidden = visible.length > 0 || view !== 'tiles' || !hasConcepts;
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  if (updateURL) rememberLocation();
}
document.querySelector('#sofa-colour').addEventListener('change', event => { colour = event.target.value; render(true); });
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.view;
  if (view === 'compare' && !compareInitialized) {
    comparison.left = { id: selectedId, index: versions.get(selectedId) || 0 };
    comparison.right = { id: (choices().find(entry => entry.id !== selectedId) || original).id, index: 0 };
    compareInitialized = true;
  }
  render(true);
}));
document.querySelectorAll('[data-side]').forEach(button => button.addEventListener('click', () => { editingSide = button.dataset.side; renderCompare(); }));
document.querySelector('#swap-images').addEventListener('click', () => {
  [comparison.left, comparison.right] = [comparison.right, comparison.left];
  renderCompare(); rememberLocation();
});
function stepStyle(direction) {
  const available = choices();
  const index = available.findIndex(entry => entry.id === selectedId);
  selectedId = available[(index + direction + available.length) % available.length].id;
  render(true);
}
document.querySelector('#previous-style').addEventListener('click', () => stepStyle(-1));
document.querySelector('#next-style').addEventListener('click', () => stepStyle(1));
document.querySelector('#viewer-full-image').draggable = false;
document.querySelector('#viewer-image').draggable = false;
document.querySelector('#before-button').addEventListener('click', () => openStyle(original));
const range = document.querySelector('#compare-reveal');
range.addEventListener('input', () => setReveal(range.value));
range.addEventListener('change', rememberLocation);
function revealAt(clientX) {
  const bounds = document.querySelector('#compare-stage').getBoundingClientRect();
  setReveal((clientX - bounds.left) / bounds.width * 100);
}
range.addEventListener('pointerdown', event => {
  event.preventDefault(); range.focus(); range.setPointerCapture(event.pointerId); revealAt(event.clientX);
});
range.addEventListener('pointermove', event => {
  if (range.hasPointerCapture(event.pointerId)) revealAt(event.clientX);
});
range.addEventListener('pointerup', event => {
  if (range.hasPointerCapture(event.pointerId)) { revealAt(event.clientX); range.releasePointerCapture(event.pointerId); rememberLocation(); }
});
render();

})();
