[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Zaenal0x/palm-tide-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Zaenal0x/palm-tide-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# PALM TIDE Cover Studio

A static, offline web app that turns your photos and captions into GTA 6-style
multi-panel poster cover art, exported as PNG. It is an entry to make.fun's
**gta6-cover-art-01** bounty, "Make GTA 6 Cover Art".

The whole point is the grade: every photo in every panel runs through one
uniform pipeline — saturation and contrast shaping, a light posterize, a
gradient-map duotone blended by the Grade Strength slider, and a halftone dot
screen sized by darkness — so photos read as printed poster art, never as raw
stock under a glossy title.

## Features

- 7 grades: Vice Sunset, Neon Night, Golden Hour, Duotone Pink/Teal,
  Comic Ink, Poster Ink (the boldest: heavy halftone, thick outlines, hard
  posterize) and Natural
- 7 layouts: Hero, Comic, 9-Panel, 1/2/3/4-Panel, all on one gutter and
  outline system
- 3 one-click variants (Sunset, Neon Night, Comic Ink) that restyle grade,
  layout and lettering together
- Multi-photo upload and drag & drop, per-panel crop (drag to reposition,
  scroll to zoom, double-click to reset), fill-all and spread
- Fully editable captions: title, script subtitle, tagline, quote and source,
  badge, ribbon, volume tag, WANTED star count, and per-panel location tags
- Poster furniture: tilted gradient title with a magenta shadow, neon script
  subtitle, WANTED pill, starburst badge, corner ribbon, bottom strip with
  palm silhouettes, credits and a barcode
- Sliders for grade strength, contrast, saturation, halftone dots, grain and
  vignette; undo/redo throughout
- Export PNG at 1080×1080, 1080×1350 and 1920×1080, or all three at once —
  the same draw routine renders preview and exports, so they always match
- Six license-free sample photos are loaded and auto-filled on first open, so
  the first thing you see is a finished, fully graded cover

## Run it

Open `app/index.html` in a desktop browser, or serve the folder:

```sh
node serve.ts        # http://localhost:5173
```

No build step, no network requests: fonts (Anton and Pacifico, SIL Open Font
License, texts in `app/fonts/`), samples and code are all vendored in `app/`.

## Entry packaging

`node main.ts` copies `app/` and `screenshots/` into `$MAKEFUN_OUTPUT_DIR`
(default `/output`), validates the competition's caps (screenshot count and
size, app file and byte caps) and writes `dossier.json` with the kit's
`buildDossier` from `vendor/makefun-app.ts`.

No Rockstar logos, artwork or fonts are used anywhere; all lettering is set in
the vendored OFL fonts.
