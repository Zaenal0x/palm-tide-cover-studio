[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Zaenal0x/palm-tide-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Zaenal0x/palm-tide-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# PALM TIDE Cover Studio

A static, offline web app that turns your photos and captions into GTA 6
style cover art: a full-bleed staggered photo mosaic — or seven other
multi-panel layouts — with every photo pushed through one uniform
sunset/neon grade, halftone dots and all, under bold gradient lettering.

## What it does

- **Mosaic first.** The default cover is a full-bleed photo mosaic in the
  style of open-world game key art: 6 staggered panels edge to edge, the
  gradient block title, neon script subtitle, WANTED pill, starburst badge
  and bottom strip overlaid on the photo field.
- **One grade for every photo.** A per-pixel pipeline (saturation/contrast
  shaping, posterize, gradient-map duotone, halftone dot screen) is applied
  identically to every panel photo, so a cover never looks like raw stock
  pasted under a title. Seven looks: Vice Sunset, Neon Night, Golden Hour,
  Duotone Pink/Teal, Comic Ink, Poster Ink and Natural — with a strength
  slider that visibly re-grades the photos themselves.
- **8 layouts, 3 one-click variants** (Sunset Mosaic, Neon Night, Comic
  Ink), per-panel crop by drag / scroll / double-click, fill-all and spread,
  editable captions and per-panel location tags, undo/redo.
- **Exports** a finished PNG at 1080×1080, 1080×1350 or 1920×1080, or all
  three at once. The exported art is rendered by the exact same code as the
  live preview.

## Run it

The app is fully static and offline — serve the `app/` folder with any
static file server, or use the bundled preview server:

```
node serve.ts        # then open the printed local address
```

`node main.ts` packages the entry: it copies `app/` and `screenshots/` into
`$MAKEFUN_OUTPUT_DIR` (default `/output`) and writes the `dossier.json`
built by `vendor/makefun-app.ts`.

## Notes

- Fonts: Anton and Pacifico, both SIL Open Font License, bundled locally in
  `app/fonts/` with their license texts.
- Sample photos: see `app/samples/ATTRIBUTION.md`.
- No network requests at runtime; no third-party logos or artwork.
