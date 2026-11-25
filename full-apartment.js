const furnitureControls = [...document.querySelectorAll('.apartment-view-options input')];
const tvControl = furnitureControls.find(control => control.value === 'tv');
const consoleControl = furnitureControls.find(control => control.value === 'console');
const layerSources = new Map([...document.querySelector('#furniture-layers').content.querySelectorAll('img')]
  .map(source => [source.dataset.furniture, source]));
const canvas = document.querySelector('#apartment-furniture-canvas');
const context = canvas.getContext('2d');
const baseImage = document.querySelector('#apartment-base-image');
const openImage = document.querySelector('#open-apartment-image');
const saveImage = document.querySelector('#save-apartment-image');
const viewTitle = document.querySelector('#apartment-view-title');
const viewDetails = document.querySelector('#apartment-view-details');
const emptyDetails = viewDetails.textContent;
const layerCache = new Map();
const savedViews = new Map([
  ['empty-apartment', ''],
  ['scepter-oak', 'bed'],
  ['black-desk', 'desk'],
  ['scepter-desk', 'bed,desk'],
]);
let renderRevision = 0;
let composedUrl;

function prepareLayer(key) {
  if (layerCache.has(key)) return layerCache.get(key);
  const source = layerSources.get(key);
  const image = new Image();
  image.src = source.getAttribute('src');
  const loaded = image.decode().then(() => {
    const [left, top, right, bottom] = source.dataset.bounds.split(' ').map(Number);
    const [targetLeft, targetTop, targetRight, targetBottom] =
      (source.dataset.targetBounds ?? source.dataset.bounds).split(' ').map(Number);
    const width = Math.round((targetRight - targetLeft) * canvas.width);
    const height = Math.round((targetBottom - targetTop) * canvas.height);
    const patch = document.createElement('canvas');
    patch.width = width;
    patch.height = height;
    const layerContext = patch.getContext('2d');
    layerContext.drawImage(image, left * image.naturalWidth, top * image.naturalHeight,
      (right - left) * image.naturalWidth, (bottom - top) * image.naturalHeight, 0, 0, width, height);

    if (source.hasAttribute('data-dark-cutout') && location.protocol !== 'file:') {
      const pixels = layerContext.getImageData(0, 0, width, height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const brightest = Math.max(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
        const coverage = Math.max(0, Math.min(1, (135 - brightest) / 48));
        pixels.data[i + 3] = Math.round(pixels.data[i + 3] * coverage);
      }
      layerContext.putImageData(pixels, 0, 0);
    }

    layerContext.globalCompositeOperation = 'destination-in';
    if (source.dataset.outline) {
      // A soft silhouette lets the rug show up to the furniture resting on it.
      const mask = document.createElement('canvas');
      mask.width = width;
      mask.height = height;
      const maskContext = mask.getContext('2d');
      maskContext.filter = 'blur(3px)';
      maskContext.beginPath();
      for (const [i, point] of source.dataset.outline.split(' ').entries()) {
        const [x, y] = point.split(',').map(Number);
        const move = i === 0 ? 'moveTo' : 'lineTo';
        maskContext[move]((x - targetLeft) * canvas.width, (y - targetTop) * canvas.height);
      }
      maskContext.closePath();
      maskContext.fill();
      layerContext.drawImage(mask, 0, 0);
    } else {
      // Feather rectangular crops into the unchanged floor around the item.
      const fadeX = layerContext.createLinearGradient(0, 0, width, 0);
      const fadeY = layerContext.createLinearGradient(0, 0, 0, height);
      for (const [fade, size] of [[fadeX, width], [fadeY, height]]) {
        const edge = Math.min(.12, 12 / size);
        fade.addColorStop(0, 'transparent');
        fade.addColorStop(edge, 'black');
        fade.addColorStop(1 - edge, 'black');
        fade.addColorStop(1, 'transparent');
        layerContext.fillStyle = fade;
        layerContext.fillRect(0, 0, width, height);
      }
    }
    return { patch, left: Math.round(targetLeft * canvas.width), top: Math.round(targetTop * canvas.height) };
  }).catch(error => {
    layerCache.delete(key);
    throw error;
  });
  layerCache.set(key, loaded);
  return loaded;
}

function setImageLinks(url, name) {
  if (composedUrl) URL.revokeObjectURL(composedUrl);
  composedUrl = url?.startsWith('blob:') ? url : undefined;
  for (const link of [openImage, saveImage]) {
    if (url) link.href = url;
    else link.removeAttribute('href');
  }
  if (name) saveImage.download = name;
}

async function showSelectedFurniture() {
  const revision = ++renderRevision;
  const selected = furnitureControls.filter(control => control.checked).map(control => control.value);
  if (!selected.length) {
    canvas.hidden = true;
    baseImage.removeAttribute('aria-hidden');
    viewTitle.textContent = 'Empty apartment';
    viewDetails.textContent = emptyDetails;
    setImageLinks(baseImage.src, 'full-apartment-empty-03.png');
    return;
  }

  setImageLinks();
  try {
    const drawOrder = [...layerSources.keys()].filter(key => selected.includes(key));
    const [, layers] = await Promise.all([baseImage.decode(), Promise.all(drawOrder.map(prepareLayer))]);
    if (revision !== renderRevision) return;
    context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
    for (const layer of layers) context.drawImage(layer.patch, layer.left, layer.top);
    const sources = selected.map(key => layerSources.get(key));
    const names = sources.map(source => source.dataset.label).join(' + ');
    const details = sources.map(source => source.dataset.size);
    if (selected.includes('bed') && selected.includes('desk')) details.push('1.27 m from desk front to bed foot');
    viewTitle.textContent = names;
    viewDetails.textContent = details.join(' · ');
    canvas.setAttribute('aria-label', 'Centred apartment cutaway with ' + names);
    canvas.hidden = false;
    baseImage.setAttribute('aria-hidden', 'true');
    if (location.protocol !== 'file:') {
      const image = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (image && revision === renderRevision) {
        setImageLinks(URL.createObjectURL(image), 'full-apartment-' + selected.join('-') + '-01.png');
      }
    }
  } catch {
    if (revision !== renderRevision) return;
    if (canvas.hidden) setImageLinks(baseImage.src, 'full-apartment-empty-03.png');
    viewDetails.textContent = 'This view could not load. Try the switches again.';
  }
}

function restoreApartmentView() {
  const hash = location.hash.slice(1);
  const selection = savedViews.get(hash) ?? new URLSearchParams(hash).get('furniture') ?? '';
  const items = selection.split(',');
  for (const control of furnitureControls) control.checked = items.includes(control.value);
  keepTvSupported();
  showSelectedFurniture();
}

function keepTvSupported(changed) {
  if (!tvControl || !consoleControl) return;
  if (changed === consoleControl && !consoleControl.checked) tvControl.checked = false;
  if (tvControl.checked) consoleControl.checked = true;
}

for (const control of furnitureControls) {
  control.addEventListener('change', () => {
    keepTvSupported(control);
    const selected = furnitureControls.filter(item => item.checked).map(item => item.value);
    if (location.protocol !== 'file:') {
      history.replaceState(null, '', selected.length ? '#furniture=' + selected.join(',') : '#empty-apartment');
    }
    showSelectedFurniture();
  });
}

window.addEventListener('hashchange', restoreApartmentView);
restoreApartmentView();
