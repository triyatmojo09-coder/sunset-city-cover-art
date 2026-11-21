// Sunset City — Cover Art Studio: the page's wiring. It builds the studio state, loads the bundled sample
// photos into the library, connects every control in the rail to the state, and redraws the live preview
// through the same painter the exporter uses. A `?shot=` query instead sets up a fixed scene for a
// screenshot (./shots.js). Photos are read locally and never leave the device.

import {
  SAMPLE_PHOTOS,
  createEditor,
  createStudioState,
  drawCoverComposition,
  freshPanelView,
  loadImageElement,
  photoIndexForPanel,
} from './editor.js';
import { PANEL_LAYOUTS } from './panels.js';
import { COLOUR_GRADES } from './grade.js';
import { LETTERING_STYLES } from './lettering.js';
import { EXPORT_SIZES, exportCoverPng } from './exporter.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const state = createStudioState();
let userPhotoCount = 0;

/** Paints the preview from the state; `highlight` outlines the selected panel in amber. */
function redraw(highlight = true) {
  drawCoverComposition(ctx, canvas.width, canvas.height, state, {
    highlightPanel: highlight ? state.selectedPanel : -1,
  });
}

/** Adds a photo to the library and returns its index. */
function addPhoto(id, label, img) {
  state.photos.push({ id, label, img });
  return state.photos.length - 1;
}

/** Loads image files the user picked or dropped into the library, then puts the first where it belongs. */
async function addPhotoFiles(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  if (!images.length) return;
  let firstIndex = -1;
  for (const file of images) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImageElement(url);
      const index = addPhoto(`user-${++userPhotoCount}`, file.name.replace(/\.[^.]+$/, ''), img);
      if (firstIndex < 0) firstIndex = index;
    } catch {
      status.textContent = `Could not read ${file.name}`;
    }
  }
  if (firstIndex >= 0) {
    if (state.mode === 'single') state.singlePhoto = firstIndex;
    else state.assignments[state.selectedPanel] = firstIndex;
    status.textContent = images.length > 1 ? `${images.length} photos added to the library` : 'Photo added to the library';
  }
  syncControls();
  redraw();
}

// ---------------------------------------------------------------- the control rail

const thumbsEl = document.getElementById('thumbs');
const selectedLabel = document.getElementById('selected-label');
const zoomSlider = document.getElementById('panel-zoom');

/** Rebuilds the photo thumbnails: a click fills the selected panel, or picks the one-photo mode's photo. */
function syncThumbs() {
  thumbsEl.innerHTML = '';
  state.photos.forEach((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    const used = state.mode === 'single' ? state.singlePhoto === index : state.assignments.includes(index);
    if (used) button.classList.add('used');
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.label;
    button.appendChild(img);
    const tag = document.createElement('span');
    tag.className = 'tag';
    if (state.mode === 'single') tag.textContent = state.singlePhoto === index ? 'ALL' : photo.label;
    else {
      const panels = state.assignments.map((a, i) => (a === index ? i + 1 : null)).filter(Boolean);
      tag.textContent = panels.length ? `P${panels.join(',')}` : photo.label;
    }
    button.appendChild(tag);
    button.title = photo.label;
    button.addEventListener('click', () => {
      if (state.mode === 'single') state.singlePhoto = index;
      else state.assignments[state.selectedPanel] = index;
      syncThumbs();
      redraw();
    });
    thumbsEl.appendChild(button);
  });
}

/** Marks the active button in a segmented or grid group by its data attribute. */
function markActive(container, attr, value) {
  container.querySelectorAll(`[data-${attr}]`).forEach((button) => {
    button.classList.toggle('active', button.dataset[attr] === String(value));
  });
}

/** Refreshes every control from the state (used after structural changes, not while typing). */
function syncControls() {
  markActive(document.querySelector('[aria-label="Photo mode"]'), 'mode', state.mode);
  markActive(document.getElementById('layout-buttons'), 'layout', state.layout);
  markActive(document.getElementById('grade-buttons'), 'grade', state.grade);
  markActive(document.getElementById('style-buttons'), 'style', state.lettering.style);
  markActive(document.querySelector('[aria-label="Lettering placement"]'), 'placement', state.lettering.placement);
  document.getElementById('grade-strength').value = state.gradeStrength;
  document.getElementById('vignette-toggle').checked = state.vignette;
  document.getElementById('print-toggle').checked = state.printFx;
  document.getElementById('title-input').value = state.lettering.title;
  document.getElementById('caption-input').value = state.lettering.caption;
  document.getElementById('badge-input').value = state.lettering.badge;
  document.getElementById('title-size').value = state.lettering.sizeScale;
  syncZoomControl();
  syncThumbs();
}

/** The zoom slider and label follow the selected panel. */
function syncZoomControl() {
  const view = state.panelViews[state.selectedPanel];
  zoomSlider.value = view ? view.zoom : 1;
  const photo = state.photos[photoIndexForPanel(state, state.selectedPanel)];
  selectedLabel.textContent = `Panel ${state.selectedPanel + 1} selected${photo ? ` — ${photo.label}` : ''}. Drag inside it to reposition its photo.`;
}

/** Builds a group of picker buttons from a list of {id, label} options. */
function buildButtonGroup(container, attr, options, onPick) {
  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset[attr] = option.id;
    button.textContent = option.label;
    button.addEventListener('click', () => { onPick(option.id); syncControls(); redraw(); });
    container.appendChild(button);
  }
}

buildButtonGroup(document.getElementById('layout-buttons'), 'layout', PANEL_LAYOUTS, (id) => { state.layout = id; });
buildButtonGroup(document.getElementById('grade-buttons'), 'grade', COLOUR_GRADES, (id) => { state.grade = id; });
buildButtonGroup(document.getElementById('style-buttons'), 'style', LETTERING_STYLES, (id) => { state.lettering.style = id; });
buildButtonGroup(document.getElementById('export-buttons'), 'size', EXPORT_SIZES.map((s) => ({ id: s.id, label: s.label })), (id) => {
  const size = EXPORT_SIZES.find((s) => s.id === id);
  exportCoverPng(state, size, (name) => { status.textContent = `Saved ${name}`; });
});

document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => { state.mode = button.dataset.mode; syncControls(); redraw(); });
});
document.querySelectorAll('[data-placement]').forEach((button) => {
  button.addEventListener('click', () => { state.lettering.placement = button.dataset.placement; syncControls(); redraw(); });
});

document.getElementById('photo-file').addEventListener('change', (event) => {
  addPhotoFiles(event.target.files);
  event.target.value = '';
});
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => {
  event.preventDefault();
  if (event.dataTransfer) addPhotoFiles(event.dataTransfer.files);
});

zoomSlider.addEventListener('input', () => {
  state.panelViews[state.selectedPanel].zoom = Number(zoomSlider.value);
  redraw();
});
document.getElementById('reset-view').addEventListener('click', () => {
  state.panelViews[state.selectedPanel] = freshPanelView();
  syncZoomControl();
  redraw();
});
document.getElementById('grade-strength').addEventListener('input', (event) => {
  state.gradeStrength = Number(event.target.value);
  redraw();
});
document.getElementById('vignette-toggle').addEventListener('change', (event) => { state.vignette = event.target.checked; redraw(); });
document.getElementById('print-toggle').addEventListener('change', (event) => { state.printFx = event.target.checked; redraw(); });
document.getElementById('title-size').addEventListener('input', (event) => { state.lettering.sizeScale = Number(event.target.value); redraw(); });
for (const [id, key] of [['title-input', 'title'], ['caption-input', 'caption'], ['badge-input', 'badge']]) {
  document.getElementById(id).addEventListener('input', (event) => { state.lettering[key] = event.target.value; redraw(); });
}

createEditor(canvas, state, () => { redraw(); syncZoomControl(); syncThumbs(); });

// ---------------------------------------------------------------- startup and shots

const studio = {
  state,
  redraw,
  syncControls,
  setPreviewSize(width, height) { canvas.width = width; canvas.height = height; },
};

async function startup() {
  redraw(false);
  for (const sample of SAMPLE_PHOTOS) {
    try {
      const img = await loadImageElement(sample.url);
      addPhoto(sample.name, sample.label, img);
    } catch {
      /* a missing sample simply never joins the library */
    }
  }
  syncControls();
  redraw();
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) await runShot(query.get('shot'), query, studio);
}

startup();
