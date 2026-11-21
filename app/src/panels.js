// Panel geometry for the four cover layouts. Every layout is a pure function of the cover's pixel size, so one
// composition adapts unchanged to a square, a 4:5 portrait or a 16:9 landscape export. A panel is a polygon
// (the shape its photo is clipped to) plus the bounding box the photo is fitted into.

/** The layouts the studio offers, in the order the layout picker shows them. */
export const PANEL_LAYOUTS = [
  { id: 'blockbuster', label: 'Blockbuster' },
  { id: 'triptych', label: 'Triptych' },
  { id: 'herostrip', label: 'Hero Strip' },
  { id: 'duo', label: 'Duo Split' },
];

/** Builds a panel record from polygon points: the points, their bounding box and the box's centre. */
function panelFromPoints(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  return { points, x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

/** A rectangular panel from its corners. */
function rectPanel(x, y, w, h) {
  return panelFromPoints([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
}

/**
 * Blockbuster: a large hero panel at the top left, two stacked panels at the top right and one wide panel
 * along the bottom — the classic ensemble game cover.
 */
function blockbusterPanels(W, H) {
  const m = Math.min(W, H) * 0.035;
  const g = Math.min(W, H) * 0.014;
  const heroW = (W - 2 * m) * 0.62;
  const sideX = m + heroW + g;
  const sideW = W - m - sideX;
  const topH = (H - 2 * m) * 0.66;
  const sideH = (topH - g) / 2;
  const bottomY = m + topH + g;
  return [
    rectPanel(m, m, heroW, topH),
    rectPanel(sideX, m, sideW, sideH),
    rectPanel(sideX, m + sideH + g, sideW, sideH),
    rectPanel(m, bottomY, W - 2 * m, H - m - bottomY),
  ];
}

/** Triptych: three tall panels parted by slightly angled dividers, full bleed to the cover's edges. */
function triptychPanels(W, H) {
  const slant = W * 0.045;
  const third = W / 3;
  return [
    panelFromPoints([[0, 0], [third + slant, 0], [third - slant, H], [0, H]]),
    panelFromPoints([[third + slant, 0], [2 * third + slant, 0], [2 * third - slant, H], [third - slant, H]]),
    panelFromPoints([[2 * third + slant, 0], [W, 0], [W, H], [2 * third - slant, H]]),
  ];
}

/** Hero Strip: one full-bleed hero over a film strip of three small panels along the foot. */
function heroStripPanels(W, H) {
  const m = Math.min(W, H) * 0.03;
  const g = Math.min(W, H) * 0.014;
  const stripY = H * 0.755;
  const stripH = H - m - stripY;
  const cellW = (W - 2 * m - 2 * g) / 3;
  return [
    rectPanel(0, 0, W, stripY - g),
    rectPanel(m, stripY, cellW, stripH),
    rectPanel(m + cellW + g, stripY, cellW, stripH),
    rectPanel(m + 2 * (cellW + g), stripY, cellW, stripH),
  ];
}

/** Duo Split: two panels parted by one long diagonal. */
function duoSplitPanels(W, H) {
  const topX = W * 0.58;
  const bottomX = W * 0.42;
  return [
    panelFromPoints([[0, 0], [topX, 0], [bottomX, H], [0, H]]),
    panelFromPoints([[topX, 0], [W, 0], [W, H], [bottomX, H]]),
  ];
}

const LAYOUT_BUILDERS = {
  blockbuster: blockbusterPanels,
  triptych: triptychPanels,
  herostrip: heroStripPanels,
  duo: duoSplitPanels,
};

/** The panels of `layoutId` on a `width` x `height` cover, in drawing order (hero first). */
export function layoutPanels(layoutId, width, height) {
  const build = LAYOUT_BUILDERS[layoutId] ?? blockbusterPanels;
  return build(width, height);
}

/**
 * The collage variation one-photo mode gives panel `index`: a deeper crop and a slight shift, so a single
 * photo reads as several different shots across the panels, the way a poster collage reuses one shoot.
 */
export function panelVariation(index) {
  const variations = [
    { zoom: 1.0, dx: 0.0, dy: 0.0 },
    { zoom: 1.5, dx: 0.1, dy: -0.05 },
    { zoom: 1.8, dx: -0.08, dy: 0.06 },
    { zoom: 1.25, dx: 0.04, dy: 0.08 },
    { zoom: 1.6, dx: -0.05, dy: -0.07 },
    { zoom: 1.35, dx: 0.07, dy: 0.03 },
  ];
  return variations[index % variations.length];
}

/** Whether point (px, py) falls inside a panel's polygon (ray casting over its points). */
export function pointInPanel(panel, px, py) {
  const pts = panel.points;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Traces a panel's polygon as the context's current path. */
export function tracePanelPath(ctx, panel) {
  const pts = panel.points;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
