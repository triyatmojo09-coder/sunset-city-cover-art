// PNG export. Each export renders the current composition offscreen at the exact pixel size — the panel
// geometry is a function of the cover size, so the layout re-flows honestly into a square, a 4:5 portrait
// or a 16:9 landscape — and downloads the PNG through a temporary link.

import { drawCoverComposition } from './editor.js';

/** The export sizes the studio offers, in the order the export buttons show them. */
export const EXPORT_SIZES = [
  { id: 'square', label: 'PNG · 1080 × 1080', width: 1080, height: 1080 },
  { id: 'portrait', label: 'PNG · 1080 × 1350', width: 1080, height: 1350 },
  { id: 'wide', label: 'PNG · 1920 × 1080', width: 1920, height: 1080 },
];

/** Renders the cover described by `state` onto a fresh canvas of `width` x `height` and returns it. */
export function renderCoverCanvas(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCoverComposition(canvas.getContext('2d'), width, height, state, { highlightPanel: -1 });
  return canvas;
}

/** Renders and downloads the cover at one of EXPORT_SIZES; `onSaved` hears the file name once it starts. */
export function exportCoverPng(state, size, onSaved) {
  const canvas = renderCoverCanvas(state, size.width, size.height);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunset-city-${size.width}x${size.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (onSaved) onSaved(a.download);
  }, 'image/png');
}
