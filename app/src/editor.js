// The studio's state and its renderer. One state object describes the whole cover — the photo library, the
// panel layout, which photo fills which panel (or one photo across them all), each panel's crop, the
// colour grade and the lettering — and drawCoverComposition paints that state onto any canvas at any size.
// The same painter serves the live preview and the PNG exports, so what the editor shows is what exports.

import { layoutPanels, panelVariation, pointInPanel, tracePanelPath } from './panels.js';
import { applyColourGrade, applyPrintTexture, applyVignette } from './grade.js';
import { drawLettering } from './lettering.js';

/** Loads an image from a URL (a bundled sample path or a local object URL), resolving once it can be drawn. */
export function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** The sample photos bundled with the studio, loaded into the library at startup. */
export const SAMPLE_PHOTOS = [
  { name: 'portrait', url: 'samples/portrait.jpg', label: 'Cover Star' },
  { name: 'car', url: 'samples/car.jpg', label: 'Sunset Coupe' },
  { name: 'boulevard', url: 'samples/boulevard.jpg', label: 'Boulevard' },
  { name: 'pier', url: 'samples/pier.jpg', label: 'The Pier' },
];

/** A fresh crop for one panel: pan offsets as fractions of the panel's box, and a zoom multiplier. */
export function freshPanelView() {
  return { dx: 0, dy: 0, zoom: 1 };
}

/** The studio's starting state: the four samples in a Blockbuster cover under a Sunset grade. */
export function createStudioState() {
  return {
    photos: [], // { id, label, img } in library order
    mode: 'panels', // 'single': one photo across every panel; 'panels': a photo per panel
    singlePhoto: 0, // library index used in single mode
    assignments: [0, 1, 2, 3], // library index per panel, in panels mode
    panelViews: [freshPanelView(), freshPanelView(), freshPanelView(), freshPanelView(), freshPanelView(), freshPanelView()],
    selectedPanel: 0,
    layout: 'blockbuster',
    grade: 'sunset',
    gradeStrength: 0.85,
    vignette: true,
    printFx: true,
    lettering: {
      title: 'SUNSET CITY',
      caption: 'EVERY LEGEND HAS A PRICE',
      badge: 'PALM BAY · EST. 2026',
      style: 'block',
      sizeScale: 1,
      placement: 'bottom',
    },
  };
}

/** The library index of the photo that fills panel `panelIndex` under the state's mode. */
export function photoIndexForPanel(state, panelIndex) {
  if (state.mode === 'single') return state.singlePhoto;
  return state.assignments[panelIndex] ?? state.assignments[0] ?? 0;
}

/** Draws `img` into a panel: cover-fitted to the panel's box, zoomed and panned by the panel's crop. */
function drawPanelPhoto(ctx, panel, img, view, variation) {
  const zoom = variation.zoom * view.zoom;
  const scale = Math.max(panel.w / img.naturalWidth, panel.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = panel.cx + (variation.dx + view.dx) * panel.w;
  const cy = panel.cy + (variation.dy + view.dy) * panel.h;
  ctx.save();
  tracePanelPath(ctx, panel);
  ctx.clip();
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

/** An empty panel's stand-in: a deep dusk gradient with the panel's number set large in the display face. */
function drawEmptyPanel(ctx, panel, index) {
  ctx.save();
  tracePanelPath(ctx, panel);
  ctx.clip();
  const grad = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
  grad.addColorStop(0, '#3a2150');
  grad.addColorStop(1, '#170d28');
  ctx.fillStyle = grad;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.font = `${Math.min(panel.w, panel.h) * 0.5}px Anton, 'Arial Narrow Bold', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index + 1), panel.cx, panel.cy);
  ctx.restore();
}

/** The white keylines between panels and around the cover's edge, as on a printed game cover. */
function drawKeylines(ctx, panels, width, height, highlightPanel) {
  const unit = Math.min(width, height);
  ctx.save();
  ctx.lineJoin = 'round';
  for (const panel of panels) {
    tracePanelPath(ctx, panel);
    ctx.lineWidth = Math.max(2, unit * 0.006);
    ctx.strokeStyle = '#f7f3ea';
    ctx.stroke();
  }
  ctx.strokeStyle = '#f7f3ea';
  ctx.lineWidth = Math.max(2, unit * 0.007);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);
  if (highlightPanel >= 0 && panels[highlightPanel]) {
    tracePanelPath(ctx, panels[highlightPanel]);
    ctx.lineWidth = Math.max(3, unit * 0.01);
    ctx.strokeStyle = '#ffb340';
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Paints the whole cover described by `state` onto `ctx` at `width` x `height`: panels and their photos,
 * the grade, the vignette and print finish, the keylines and the lettering. `options.highlightPanel`
 * outlines one panel in amber (the editor's selection; exports pass -1).
 */
export function drawCoverComposition(ctx, width, height, state, options = {}) {
  const highlightPanel = options.highlightPanel ?? -1;
  ctx.save();
  ctx.fillStyle = '#0b0812';
  ctx.fillRect(0, 0, width, height);
  const panels = layoutPanels(state.layout, width, height);
  panels.forEach((panel, index) => {
    const photo = state.photos[photoIndexForPanel(state, index)];
    const view = state.panelViews[index] ?? freshPanelView();
    const variation = state.mode === 'single' ? panelVariation(index) : { zoom: 1, dx: 0, dy: 0 };
    if (photo && photo.img) drawPanelPhoto(ctx, panel, photo.img, view, variation);
    else drawEmptyPanel(ctx, panel, index);
  });
  ctx.restore();
  applyColourGrade(ctx, width, height, state.grade, state.gradeStrength);
  if (state.vignette) applyVignette(ctx, width, height, 0.5);
  if (state.printFx) applyPrintTexture(ctx, width, height);
  drawKeylines(ctx, layoutPanels(state.layout, width, height), width, height, highlightPanel);
  drawLettering(ctx, width, height, state.lettering, state.grade);
}

/**
 * Wires pointer control to the preview canvas: clicking a panel selects it, dragging inside a panel pans
 * its photo, and the wheel zooms the selected panel's photo. Calls `onChange` after every change so the
 * page can redraw and refresh its controls.
 */
export function createEditor(canvas, state, onChange) {
  let drag = null;

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function panelAt(x, y) {
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    for (let i = panels.length - 1; i >= 0; i--) {
      if (pointInPanel(panels[i], x, y)) return i;
    }
    return -1;
  }

  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const index = panelAt(point.x, point.y);
    if (index < 0) return;
    state.selectedPanel = index;
    const view = state.panelViews[index];
    drag = { index, startX: point.x, startY: point.y, dx: view.dx, dy: view.dy };
    canvas.setPointerCapture(event.pointerId);
    onChange();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = canvasPoint(event);
    const panels = layoutPanels(state.layout, canvas.width, canvas.height);
    const panel = panels[drag.index];
    const view = state.panelViews[drag.index];
    view.dx = clampPan(drag.dx + (point.x - drag.startX) / panel.w);
    view.dy = clampPan(drag.dy + (point.y - drag.startY) / panel.h);
    onChange();
  });

  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const point = canvasPoint(event);
    const index = panelAt(point.x, point.y);
    if (index < 0) return;
    state.selectedPanel = index;
    const view = state.panelViews[index];
    view.zoom = Math.max(0.6, Math.min(4, view.zoom * (event.deltaY < 0 ? 1.09 : 1 / 1.09)));
    onChange();
  }, { passive: false });

  return {
    /** The panel index under a canvas point, or -1 (the page uses it for its own hit hints). */
    panelAt,
  };
}

/** Keeps a pan offset inside the range where the photo still covers its panel. */
function clampPan(value) {
  return Math.max(-0.45, Math.min(0.45, value));
}
