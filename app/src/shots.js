// Fixed scenes for screenshots, driven by the page's query string: ?shot=cover paints one exported cover
// full-bleed at its export size; ?shot=editor shows the studio with a scene loaded. Scene parameters come
// from the query — layout, grade, mode, photos (sample names, comma separated), single (the one-photo
// mode's sample), title, caption, badge, style, placement, strength, panel, size, and per-panel crops
// v0..v5 as "dx,dy,zoom". window.__shotReady is set once the scene is painted with its fonts loaded.

/** Applies the query's scene parameters to the studio state. */
function applyScene(query, state) {
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('mode')) state.mode = query.get('mode');
  if (query.get('title') !== null) state.lettering.title = query.get('title');
  if (query.get('caption') !== null) state.lettering.caption = query.get('caption');
  if (query.get('badge') !== null) state.lettering.badge = query.get('badge');
  if (query.get('style')) state.lettering.style = query.get('style');
  if (query.get('placement')) state.lettering.placement = query.get('placement');
  if (query.get('strength')) state.gradeStrength = Math.max(0, Math.min(1, Number(query.get('strength')) / 100));
  if (query.get('vignette')) state.vignette = query.get('vignette') !== '0';
  if (query.get('print')) state.printFx = query.get('print') !== '0';
  if (query.get('panel')) state.selectedPanel = Number(query.get('panel'));
  for (let i = 0; i < state.panelViews.length; i++) {
    const view = query.get(`v${i}`);
    if (!view) continue;
    const [dx, dy, zoom] = view.split(',').map(Number);
    if (Number.isFinite(dx)) state.panelViews[i].dx = dx;
    if (Number.isFinite(dy)) state.panelViews[i].dy = dy;
    if (Number.isFinite(zoom) && zoom >= 1) state.panelViews[i].zoom = zoom;
  }
  const indexOf = (name) => state.photos.findIndex((p) => p.id === name);
  if (query.get('single')) {
    const index = indexOf(query.get('single'));
    if (index >= 0) {
      state.singlePhoto = index;
      if (!query.get('mode')) state.mode = 'single';
    }
  }
  if (query.get('photos')) {
    query.get('photos').split(',').forEach((name, i) => {
      const index = indexOf(name.trim());
      if (index >= 0) state.assignments[i] = index;
    });
    if (!query.get('mode')) state.mode = 'panels';
  }
}

/** Sets up and paints the scene `shot` names, then flags the page ready for its screenshot. */
export async function runShot(shot, query, studio) {
  const { state } = studio;
  applyScene(query, state);
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const [w, h] = (query.get('size') ?? '1080x1080').split('x').map(Number);
    studio.setPreviewSize(w || 1080, h || 1080);
    studio.redraw(false);
  } else {
    studio.syncControls();
    studio.redraw(true);
  }
  try {
    await document.fonts.load("120px Anton");
    await document.fonts.ready;
  } catch {
    /* the fallback stack paints the scene instead */
  }
  studio.redraw(shot !== 'cover');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
