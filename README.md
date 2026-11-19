# PALM TIDE Cover Studio

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-7a1c50)](https://make.fun/bounty/gta6-cover-art-01)
[![prize](https://img.shields.io/badge/prize-%24250-gold)](https://make.fun/bounty/gta6-cover-art-01)
[![deadline](https://img.shields.io/badge/deadline-Nov%2021%2C%202026-blue)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA 6-style
multi-panel poster cover art, exported as a PNG to share. It was built for
the make.fun bounty [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01).
Everything runs in the browser from static files — your photos never leave
your machine, and the app makes no network requests.

## The point: a uniform photo grade

A cover maker fails when its photos look like raw stock pasted under a
glossy title. In PALM TIDE every photo that lands in a panel is pushed
through the same grade pipeline at draw time:

1. contrast and saturation shaping,
2. a light posterize,
3. a gradient-map duotone (per grade) blended by the grade-strength slider,
4. a halftone dot screen sized by darkness,

then framed by a consistent panel gutter and outline. The first thing the
app shows is a finished cover: six sample photos auto-filled into a hero
layout under the Vice Sunset grade at strength 0.90, halftone on.

## Features

- **7 layouts** — Hero (tilted side panels), Comic, 9-Panel, 1, 2, 3 and
  4-Panel, all sharing one gutter and outline system.
- **7 grades** — Vice Sunset, Neon Night, Golden Hour, Duotone Pink/Teal,
  Comic Ink, Poster Ink (strong halftone, thick outlines, hard posterize)
  and Natural, plus sliders for strength, contrast, saturation, grain and
  vignette, and a halftone toggle with amount.
- **3 one-click variants** — Sunset, Neon Night and Comic Ink, each a
  cohesive grade + layout + lettering combination.
- **Any photo** — multi-upload and drag & drop; per-panel photo choice;
  drag to reposition, scroll to zoom, double-click to reset a panel's crop;
  fill-all and spread shortcuts.
- **Full poster furniture** — gradient Anton title with a hard shadow and
  −5° tilt, Pacifico script subtitle, WANTED star pill, quote block with
  star row, starburst badge, corner ribbon, volume tag, per-panel location
  tags (place · time · sub-line), and a bottom strip with tagline, palm
  silhouettes, credits and a barcode. All of it editable.
- **Exports** — PNG at 1080 × 1080, 1080 × 1350 and 1920 × 1080, or all
  three sizes at once, rendered by the same draw routine as the preview.
- **Undo/redo** for every edit (buttons or Ctrl+Z / Ctrl+Shift+Z).

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Then open <http://localhost:8080> in a desktop browser. No build step, no
install: `app/` is plain static files.

## Hand in / verify

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` validates the entry against the gate's caps, copies `app/` and
`screenshots/` to the output directory, writes `dossier.json` with the
vendored `vendor/makefun-app.ts` library (unchanged from the kit), and logs
a manifest of everything shipped.

The screenshots in `screenshots/` are real captures of this app, taken with
headless Chromium through the app's own `?shot=` scenes:

```sh
node make-shots.mjs      # needs Playwright + Chromium available
```

## Licences

- Code: MIT (see `LICENSE`).
- Fonts: Anton and Pacifico, vendored under `app/fonts/`, each under the
  SIL Open Font License 1.1 (the OFL texts ship beside the font files).
- Sample photos: see `app/samples/ATTRIBUTION.md` — two made for make.fun
  with an image model and shipped in the bounty kit, four generated with an
  image model for this entry. No Rockstar Games logo, artwork or font is
  used anywhere.
