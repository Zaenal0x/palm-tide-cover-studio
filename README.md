[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Zaenal0x/palm-tide-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Zaenal0x/palm-tide-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# PALM TIDE Cover Studio

A static, fully offline web app that turns your photos and captions into
GTA 6-style multi-panel poster cover art, exported as PNG. No network
requests, no build step, no dependencies — open it and make a cover.

## What it does

- **One grade for every photo.** Each panel photo is run through the same
  per-pixel pipeline at draw time — saturation/contrast shaping, a light
  posterize, a gradient-map duotone blended by the grade-strength slider,
  and a halftone dot screen sized by darkness — so a phone snapshot and a
  DSLR shot come out looking like panels of the same poster.
- **Key-art Mosaic layout.** The default cover is a dense, full-bleed
  staggered mosaic: a character hero panel (~40% of the frame) with panels
  packed edge to edge around it, hairline gutters only, and the big
  chrome-neon title lockup sitting centrally across the middle of the
  collage, the way real key art centres its title. Seven more layouts
  (Hero, Comic, 9-Panel, 1/2/3/4-Panel) are one click away.
- **Seven grades** — Vice Sunset, Neon Night, Golden Hour, Duotone
  Pink/Teal, Comic Ink, Poster Ink (the boldest: 4-level posterize, heavy
  halftone, thick outlines) and Natural — plus three one-click variants
  (Sunset Mosaic / Neon Night / Comic Ink).
- **Full poster furniture**, all editable: gradient title and neon script
  subtitle, WANTED star pill, starburst badge, corner ribbon, volume tag,
  quote block, per-panel location tags, and a bottom strip with palm
  silhouettes, credits and a barcode.
- **A real editor.** Multi-photo upload and drag & drop, per-panel drag /
  scroll-zoom / double-click-reset cropping, fill-all and spread, caption
  and tag editing, grade sliders (strength, contrast, saturation, grain,
  vignette, halftone dots), undo/redo, and PNG export at 1080×1080,
  1080×1350 and 1920×1080, individually or all three at once.

## Run it

The app is the static `app/` folder — serve it with anything, or use the
bundled preview server (Node 22+, standard library only):

```sh
node serve.ts          # http://localhost:8137
```

Then drop in your photos, pick a layout and grade, and export.

## Entry plumbing

`node main.ts` copies `app/` and `screenshots/` into `$MAKEFUN_OUTPUT_DIR`
(default `/output`), validates the entry caps (screenshot count and size,
app file count and total bytes) before writing, emits `dossier.json` via
`buildDossier` from `vendor/makefun-app.ts`, and logs a manifest of what
was written.

## Fonts & assets

Anton and Pacifico are vendored under `app/fonts/` with their SIL Open
Font License texts. Sample photos are license-free; see
`app/samples/ATTRIBUTION.md`. No Rockstar logos, artwork or fonts are
used anywhere.
