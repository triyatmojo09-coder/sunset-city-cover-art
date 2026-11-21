# SUNSET CITY — Cover Art Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/triyatmojo09-coder/sunset-city-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/triyatmojo09-coder/sunset-city-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your own photo into GTA-poster-style cover art: a multi-panel poster with bold
caption lettering and a Vice sunset or neon colour grade, exported as a PNG to share.
It runs entirely offline in a desktop browser from its own static files — your photos
never leave your machine.

An entry to make.fun's [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty.

## What it does

- **Four panel layouts** in the multi-panel cover tradition: Blockbuster (big hero,
  two stacked panels, wide bottom strip), Triptych (angled dividers), Hero Strip
  (full-bleed hero over a film strip) and Duo Split (diagonal two-panel).
- **Any photo, your way**: drop photos anywhere, fill every panel with one photo in
  collage variations, or click a panel and give it its own photo; drag to reposition
  and scroll or slide to zoom each panel's crop.
- **Four colour grades** — Sunset, Neon, Noir and Gold Hour — with a strength slider,
  a vignette and a posterise-and-grain print finish.
- **Lettering that carries the poster**: the title in the bundled Anton display face
  (SIL Open Font License), in Block, Chrome or neon Outline styles, with an editable
  caption and badge line, size control and top or bottom placement.
- **One-click PNG export** in the common post sizes: 1080 × 1080, 1080 × 1350 and
  1920 × 1080, with the panel geometry re-flowed for each aspect.

## Run it

```sh
node serve.ts        # serves app/ at http://localhost:8080
```

Open the page, pick or drop a photo, choose a layout and a grade, edit the caption,
and export. No network is needed once the files are on your machine.

## Layout of the code

- `app/src/panels.js` — the four layouts' panel geometry and hit testing
- `app/src/grade.js` — the colour grades, vignette and print finish
- `app/src/lettering.js` — title, caption and badge rendering
- `app/src/editor.js` — studio state and the one painter shared by preview and exports
- `app/src/exporter.js` — full-size PNG renders in the three post sizes
- `main.ts` — the hand-in program: copies `app/` and `screenshots/` and writes the dossier

MIT licensed. The Anton font is under the SIL Open Font License 1.1 (see `app/fonts/OFL.txt`).
