// The cover's lettering: a big poster title, a caption line under it and a small badge line, drawn in the
// bundled Anton face (a condensed display face under the SIL Open Font License, kept in app/fonts/).
// Three lettering styles: Block (white with a black keyline and a hard shadow), Chrome (a metallic
// gradient fill) and Outline (hollow letters with a neon glow).

/** The lettering styles the studio offers, in the order the style picker shows them. */
export const LETTERING_STYLES = [
  { id: 'block', label: 'Block' },
  { id: 'chrome', label: 'Chrome' },
  { id: 'outline', label: 'Outline' },
];

/** The font stack for cover lettering: the bundled face first, condensed system faces behind it. */
export const TITLE_FONT_STACK = "Anton, 'Arial Narrow Bold', 'Liberation Sans Narrow', sans-serif";

/** Sets the canvas letter spacing when the browser supports it (Chromium does); harmless elsewhere. */
function setLetterSpacing(ctx, px) {
  try {
    ctx.letterSpacing = `${px}px`;
  } catch {
    /* older engines have no letterSpacing on the 2D context */
  }
}

/** Shrinks the title's font size until it fits `maxWidth`, and returns the size that fits. */
function fitTitleSize(ctx, title, baseSize, maxWidth) {
  let size = baseSize;
  ctx.font = `${size}px ${TITLE_FONT_STACK}`;
  while (ctx.measureText(title).width > maxWidth && size > 10) {
    size *= 0.94;
    ctx.font = `${size}px ${TITLE_FONT_STACK}`;
  }
  return size;
}

/** A soft dark scrim behind the lettering block so the words stay readable over a bright photo. */
function drawScrim(ctx, width, height, placement) {
  const grad = placement === 'top'
    ? ctx.createLinearGradient(0, 0, 0, height * 0.42)
    : ctx.createLinearGradient(0, height * 0.58, 0, height);
  if (placement === 'top') {
    grad.addColorStop(0, 'rgba(8, 3, 16, 0.62)');
    grad.addColorStop(1, 'rgba(8, 3, 16, 0)');
  } else {
    grad.addColorStop(0, 'rgba(8, 3, 16, 0)');
    grad.addColorStop(1, 'rgba(8, 3, 16, 0.62)');
  }
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Block lettering: a hard offset shadow, a thick black keyline and a flat white fill. */
function drawBlockTitle(ctx, title, cx, baseline, size) {
  ctx.save();
  ctx.font = `${size}px ${TITLE_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0a0612';
  ctx.fillText(title, cx + size * 0.05, baseline + size * 0.055);
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.11;
  ctx.strokeStyle = '#0a0612';
  ctx.strokeText(title, cx, baseline);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, cx, baseline);
  ctx.restore();
}

/** Chrome lettering: a vertical metallic gradient running bright, steel, bright, steel, bright. */
function drawChromeTitle(ctx, title, cx, baseline, size) {
  const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline + size * 0.12);
  grad.addColorStop(0, '#f9fcff');
  grad.addColorStop(0.34, '#cfdff0');
  grad.addColorStop(0.5, '#71879c');
  grad.addColorStop(0.56, '#eef7ff');
  grad.addColorStop(0.78, '#8ba2b8');
  grad.addColorStop(1, '#e8f1f8');
  ctx.save();
  ctx.font = `${size}px ${TITLE_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(6, 10, 18, 0.85)';
  ctx.fillText(title, cx + size * 0.04, baseline + size * 0.05);
  ctx.lineWidth = size * 0.055;
  ctx.strokeStyle = '#0d1622';
  ctx.strokeText(title, cx, baseline);
  ctx.fillStyle = grad;
  ctx.fillText(title, cx, baseline);
  ctx.restore();
}

/** Outline lettering: hollow letters stroked in neon, glowing against the cover. */
function drawOutlineTitle(ctx, title, cx, baseline, size, gradeId) {
  const neon = gradeId === 'neon' ? '#ff4fd8' : '#3fe3ff';
  ctx.save();
  ctx.font = `${size}px ${TITLE_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.shadowColor = neon;
  ctx.shadowBlur = size * 0.28;
  ctx.lineWidth = size * 0.045;
  ctx.strokeStyle = neon;
  ctx.strokeText(title, cx, baseline);
  ctx.strokeText(title, cx, baseline);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillText(title, cx, baseline);
  ctx.restore();
}

const TITLE_DRAWERS = { block: drawBlockTitle, chrome: drawChromeTitle, outline: drawOutlineTitle };

/**
 * Draws the lettering block onto `ctx`. `lettering` is { title, caption, badge, style, sizeScale,
 * placement }; the block sits at the foot of the cover, or at its head when placement is 'top'.
 */
export function drawLettering(ctx, width, height, lettering, gradeId) {
  const title = (lettering.title ?? '').trim().toUpperCase();
  const caption = (lettering.caption ?? '').trim().toUpperCase();
  const badge = (lettering.badge ?? '').trim().toUpperCase();
  if (!title && !caption && !badge) return;
  drawScrim(ctx, width, height, lettering.placement);
  const cx = width / 2;
  const baseSize = Math.min(width, height * 1.35) * 0.148 * (lettering.sizeScale ?? 1);
  ctx.save();
  const size = title ? fitTitleSize(ctx, title, baseSize, width * 0.93) : baseSize;
  let titleBaseline;
  let captionBaseline;
  let badgeBaseline;
  if (lettering.placement === 'top') {
    titleBaseline = height * 0.045 + size;
    captionBaseline = titleBaseline + size * 0.44;
    badgeBaseline = captionBaseline + size * 0.34;
  } else {
    badgeBaseline = height * 0.952;
    captionBaseline = badgeBaseline - size * 0.36;
    titleBaseline = captionBaseline - size * 0.46;
  }
  if (title) (TITLE_DRAWERS[lettering.style] ?? drawBlockTitle)(ctx, title, cx, titleBaseline, size, gradeId);
  ctx.textAlign = 'center';
  if (caption) {
    const captionSize = size * 0.215;
    ctx.font = `${captionSize}px ${TITLE_FONT_STACK}`;
    setLetterSpacing(ctx, captionSize * 0.55);
    ctx.fillStyle = 'rgba(6, 3, 12, 0.9)';
    ctx.fillText(caption, cx + captionSize * 0.09, captionBaseline + captionSize * 0.1);
    ctx.fillStyle = '#ffe9c4';
    ctx.fillText(caption, cx, captionBaseline);
    setLetterSpacing(ctx, 0);
  }
  if (badge) {
    const badgeSize = size * 0.13;
    ctx.font = `${badgeSize}px ${TITLE_FONT_STACK}`;
    setLetterSpacing(ctx, badgeSize * 0.8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.fillText(badge, cx, badgeBaseline);
    setLetterSpacing(ctx, 0);
  }
  ctx.restore();
}
