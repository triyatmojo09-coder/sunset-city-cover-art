// Colour grades, vignette and print texture. A grade is a canvas filter pass (saturation, contrast, hue)
// blended over the composed panels at the chosen strength, then a set of coloured light overlays — a warm
// horizon glow for Sunset, magenta and cyan night light for Neon, and so on. Everything is drawn with the
// 2D canvas alone, so a grade costs nothing to load and works offline.

/** The grades the studio offers, in the order the grade picker shows them. */
export const COLOUR_GRADES = [
  { id: 'sunset', label: 'Sunset' },
  { id: 'neon', label: 'Neon' },
  { id: 'noir', label: 'Noir' },
  { id: 'gold', label: 'Gold Hour' },
];

/** The canvas filter string at the heart of each grade. */
const GRADE_FILTERS = {
  sunset: 'saturate(1.45) contrast(1.1) brightness(1.03)',
  neon: 'saturate(1.6) contrast(1.16) brightness(0.99) hue-rotate(-8deg)',
  noir: 'grayscale(1) contrast(1.32) brightness(1.05)',
  gold: 'sepia(0.55) saturate(1.3) contrast(1.07) brightness(1.05)',
};

/** A vertical wash of colour: stops are [offset, colour] pairs, drawn with the given composite operation. */
function washGradient(ctx, width, height, stops, operation, alpha) {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  for (const [at, colour] of stops) grad.addColorStop(at, colour);
  ctx.save();
  ctx.globalCompositeOperation = operation;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** A soft round pool of coloured light centred at (cx, cy), fading to nothing at `radius`. */
function lightPool(ctx, cx, cy, radius, colour, operation, alpha) {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, colour);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.globalCompositeOperation = operation;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

/** The coloured light each grade lays over its filter pass, all of it scaled by the grade's strength. */
const GRADE_OVERLAYS = {
  sunset(ctx, W, H, s) {
    washGradient(ctx, W, H, [[0, 'rgba(10, 70, 92, 0.55)'], [0.42, 'rgba(10, 70, 92, 0)'], [0.78, 'rgba(255, 94, 32, 0)'], [1, 'rgba(255, 94, 32, 0.6)']], 'soft-light', s);
    lightPool(ctx, W * 0.5, H * 1.02, H * 0.75, 'rgba(255, 120, 40, 0.55)', 'overlay', 0.8 * s);
  },
  neon(ctx, W, H, s) {
    washGradient(ctx, W, H, [[0, 'rgba(16, 0, 54, 0.6)'], [0.5, 'rgba(16, 0, 54, 0)'], [1, 'rgba(255, 0, 128, 0.38)']], 'soft-light', s);
    lightPool(ctx, W * 0.08, H * 0.06, H * 0.7, 'rgba(0, 229, 255, 0.5)', 'screen', 0.55 * s);
    lightPool(ctx, W * 0.95, H * 0.98, H * 0.7, 'rgba(255, 47, 214, 0.5)', 'screen', 0.55 * s);
  },
  noir(ctx, W, H, s) {
    lightPool(ctx, W * 0.5, H * 0.38, H * 0.8, 'rgba(235, 240, 248, 0.35)', 'screen', 0.5 * s);
    washGradient(ctx, W, H, [[0, 'rgba(0, 0, 0, 0.3)'], [0.35, 'rgba(0, 0, 0, 0)'], [1, 'rgba(0, 0, 0, 0.42)']], 'multiply', s);
  },
  gold(ctx, W, H, s) {
    washGradient(ctx, W, H, [[0, 'rgba(122, 74, 0, 0.4)'], [0.45, 'rgba(122, 74, 0, 0)'], [1, 'rgba(255, 176, 56, 0.45)']], 'soft-light', s);
    lightPool(ctx, W * 0.82, H * 0.1, H * 0.65, 'rgba(255, 196, 84, 0.5)', 'overlay', 0.7 * s);
  },
};

/**
 * Applies grade `gradeId` to everything already drawn on `ctx`, at `strength` from 0 (the plain photos)
 * to 1 (the full grade). The filter pass is blended over the original so a low strength stays subtle.
 */
export function applyColourGrade(ctx, width, height, gradeId, strength) {
  const filter = GRADE_FILTERS[gradeId] ?? GRADE_FILTERS.sunset;
  const s = Math.max(0, Math.min(1, strength));
  if (s > 0) {
    const copy = document.createElement('canvas');
    copy.width = width;
    copy.height = height;
    copy.getContext('2d').drawImage(ctx.canvas, 0, 0);
    ctx.save();
    ctx.filter = filter;
    ctx.globalAlpha = s;
    ctx.drawImage(copy, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.filter = 'none';
    (GRADE_OVERLAYS[gradeId] ?? GRADE_OVERLAYS.sunset)(ctx, width, height, s);
    ctx.restore();
  }
}

/** Darkens the cover's edges toward its centre, the way a poster's light falls off. */
export function applyVignette(ctx, width, height, strength = 0.55) {
  const radius = Math.hypot(width, height) / 2;
  const grad = ctx.createRadialGradient(width / 2, height / 2, radius * 0.42, width / 2, height / 2, radius);
  grad.addColorStop(0, 'rgba(5, 2, 10, 0)');
  grad.addColorStop(1, `rgba(5, 2, 10, ${strength})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** A deterministic 0..1 hash of a pixel position, so the print grain is the same on every render. */
function pixelHash(x, y) {
  let n = (x * 1973 + y * 9277 + 7919) | 0;
  n = Math.imul(n ^ (n >>> 13), 0x5bd1e995);
  return ((n ^ (n >>> 15)) >>> 0) / 4294967295;
}

/**
 * The print finish: tones are snapped to a short ladder of levels (the posterised, screen-printed feel)
 * and a fine deterministic grain is laid over the whole cover.
 */
export function applyPrintTexture(ctx, width, height) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const levels = 26;
  const step = 255 / (levels - 1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const grain = (pixelHash(x, y) - 0.5) * 11;
      for (let c = 0; c < 3; c++) {
        const v = data[i + c] + grain;
        data[i + c] = Math.round(v / step) * step;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}
