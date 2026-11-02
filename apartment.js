let data;
let photos = [];
let selectedRoom = 'living';
async function init() {
  const results = await Promise.all([
    fetch('apartment.json', { cache: 'no-store' }).then(response => response.json()),
    fetch('photo-catalogue.json', { cache: 'no-store' }).then(response => response.json()),
  ]);
  data = results[0];
  photos = [...new Map(results[1].photos.map(photo => [photo.id || photo.file, photo])).values()];
  document.querySelectorAll('.hotspot').forEach(node => node.addEventListener('click', () => selectRoom(node.dataset.room)));
  const filter = document.querySelector('#photo-filter');
  const groups = [
    ['all', 'All photos'], ['living', 'Living / kitchen'], ['bedroom', 'Bedroom'],
    ['hall', 'Corridor'], ['bathrooms', 'Both bathrooms'], ['ensuite', 'Ensuite bathroom'],
    ['powder', 'Powder room'], ['laundry', 'Laundry doors'], ['balcony', 'Terrace'],
    ['pool', 'Pool'], ['views', 'Views'],
  ];
  filter.replaceChildren();
  for (const [id, label] of groups) {
    const count = id === 'all' ? photos.length : photos.filter(photo => photo.groups.includes(id)).length;
    const option = document.createElement('option'); option.value = id; option.textContent = label + ' (' + count + ')'; filter.append(option);
  }
  filter.value = 'all';
  filter.addEventListener('change', () => renderPhotos(filter.value));
  document.querySelector('#show-all').addEventListener('click', () => fixedMode(false));
  document.querySelector('#show-fixed').addEventListener('click', () => fixedMode(true));
  document.querySelector('.room-panel .text-link').addEventListener('click', () => {
    filter.value = selectedRoom; renderPhotos(selectedRoom);
  });
  selectRoom('living');
  renderPhotos('all');
}
function selectRoom(id) {
  const room = data.rooms.find(entry => entry.id === id);
  if (!room) return;
  selectedRoom = id;
  document.querySelectorAll('.hotspot').forEach(node => node.classList.toggle('selected', node.dataset.room === id));
  document.querySelector('#room-index').textContent = 'ROOM ' + String(data.rooms.indexOf(room) + 1).padStart(2, '0');
  document.querySelector('#room-name').textContent = room.name;
  document.querySelector('#room-summary').textContent = room.summary;
  const dimensions = document.querySelector('#room-dimensions'); dimensions.replaceChildren();
  for (const value of room.dimensions) { const span = document.createElement('span'); span.textContent = value + ' m'; dimensions.append(span); }
  const fixed = document.querySelector('#room-fixed'); fixed.replaceChildren();
  for (const value of room.fixed) { const span = document.createElement('span'); span.textContent = value; fixed.append(span); }
}
function renderPhotos(filter) {
  const visible = filter === 'all' ? photos : photos.filter(photo => photo.groups.includes(filter));
  const grid = document.querySelector('#photo-grid'); grid.replaceChildren();
  for (const photo of visible) {
    const figure = document.createElement('figure'); figure.className = 'photo-card'; figure.dataset.photo = photo.id;
    const link = document.createElement('a'); link.href = photo.image; link.target = '_blank'; link.rel = 'noopener'; link.title = photo.file;
    const image = document.createElement('img'); image.src = photo.image; image.alt = photo.title; image.loading = 'lazy'; link.append(image);
    const caption = document.createElement('figcaption');
    const title = document.createElement('span'); title.textContent = photo.title; title.title = photo.file;
    const category = document.createElement('b'); category.textContent = photo.category;
    caption.append(title, category); figure.append(link, caption); grid.append(figure);
  }
  document.querySelector('#photo-count').textContent = visible.length + ' of ' + photos.length + ' photos';
}
function fixedMode(on) {
  document.querySelector('.plan-stage').classList.toggle('fixed-mode', on);
  document.querySelector('#show-all').classList.toggle('active', !on);
  document.querySelector('#show-fixed').classList.toggle('active', on);
}
init().catch(error => {
  console.error(error);
  document.querySelector('#room-summary').textContent = 'Could not load project data. Open this page through the local preview server.';
});
