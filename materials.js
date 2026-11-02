(async ()=>{
const catalogue = await fetch('style-library.json', { cache: 'no-store' }).then(response => response.json());
const directions = catalogue.entries.filter(entry => entry.kind === 'material');
const boards = new Map();
for (const entry of directions) {
  for (const variant of entry.variants) {
    if (!boards.has(variant.image)) boards.set(variant.image, { names: [], image: variant.image });
    const board = boards.get(variant.image);
    if (!board.names.includes(entry.name)) board.names.push(entry.name);
  }
}
document.querySelector('#board-count').textContent = boards.size + ' boards · ' + directions.length + ' material directions';
for (const board of boards.values()) {
  const figure = document.createElement('figure'); figure.className = 'fullwidth-frame material-board';
  const link = document.createElement('a'); link.href = board.image; link.target = '_blank'; link.rel = 'noopener';
  const image = document.createElement('img'); image.src = board.image; image.alt = board.names.join(' / '); image.loading = 'lazy'; link.append(image);
  const caption = document.createElement('figcaption');
  const title = document.createElement('h2'); title.textContent = board.names.join(' · ');
  const download = document.createElement('a'); download.href = board.image; download.download = ''; download.textContent = 'Save board ↗';
  caption.append(title, download); figure.append(link, caption); document.querySelector('#material-boards').append(figure);
}

})();
