[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Zaenal0x/palm-tide-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Zaenal0x/palm-tide-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# PALM TIDE Cover Studio

A static, offline browser studio that turns your photos and captions into
GTA 6-style multi-panel poster cover art, exported as PNG. It is an entry
to the make.fun bounty **gta6-cover-art-01**.

Open `app/index.html` (or run `node serve.ts` and visit the printed URL),
and the studio opens on a finished cover: a full-bleed staggered photo
mosaic in the signature **Mosaic** layout, where one large character panel
anchors the frame like real key art, every photo already pushed through
the Vice Sunset grade at strength 0.90 with halftone on, and a huge
chrome-neon PALM TIDE title lockup glowing over the top.

## What it does

- **Uniform photo grade on every panel** — saturation/contrast shaping,
  light posterize, a gradient-map duotone blended by the grade-strength
  slider, and a halftone dot screen sized by darkness. Photos are never
  left raw under a glossy title; the strength slider visibly re-grades
  the photos themselves.
- **7 grades** — Vice Sunset, Neon Night, Golden Hour, Duotone
  Pink/Teal, Comic Ink, Poster Ink (the boldest: strong posterize and
  the heaviest halftone) and Natural.
- **8 layouts** — Mosaic (character key art), Hero + Strip, Comic Quad,
  9-Panel Grid, and 1/2/3/4-panel arrangements, all sharing one gutter
  and outline system.
- **Character-led covers** — the Mosaic's hero panel takes a person,
  large in frame; the bundled samples lead with a convertible portrait.
- **Full poster furniture** — chrome-neon gradient title with magenta
  offset shadow and glow, neon script subtitle, WANTED star pill,
  starburst badge, corner ribbon, volume tag, per-panel location tags,
  quote block, and a bottom strip with tagline, palm silhouettes,
  credits and a barcode.
- **Real editing** — multi-photo upload and drag & drop, per-panel
  drag/wheel/double-click cropping, fill-all and spread, editable
  captions and per-panel location tags, undo/redo, live preview.
- **Exports** — one-click PNG at 1080×1080, 1080×1350 and 1920×1080, or
  all three at once, rendered by the same draw routine as the preview.
- **Three one-click variants** — Sunset Mosaic, Neon Night and Comic
  Ink, each a distinct but cohesive grade/layout/lettering combination.

Everything runs locally in the browser: no network requests, no build
step. Fonts are Anton and Pacifico, both under the SIL Open Font License
1.1 (licence texts in `app/fonts/`). Sample photos are license-free; see
`app/samples/ATTRIBUTION.md`. No Rockstar logos, artwork or fonts are
used anywhere.

## Entry plumbing

`main.ts` (Node 22) validates the entry against the bounty caps, copies
`app/` and `screenshots/` into `$MAKEFUN_OUTPUT_DIR` (default `/output`)
and writes `dossier.json` there with the kit's `buildDossier`.
`capture.mjs` renders the four screenshots from the running app with
Playwright/Chromium.
