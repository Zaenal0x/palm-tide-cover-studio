[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Zaenal0x/palm-tide-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Zaenal0x/palm-tide-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# PALM TIDE Cover Studio

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
  4-Panel, all sharing one gutter and outline treatment.
- **7 grades** — Vice Sunset, Neon Night, Golden Hour, Duotone Pink/Teal,
  Comic Ink, Poster Ink (the boldest: heavy halftone, thick outline, strong
  posterize) and Natural.
- **3 one-click variants** — Sunset, Neon Night and Comic Ink presets that
  set layout, grade and lettering together.
- **Photo handling** — multi-upload and drag & drop, per-panel crop with
  drag / mouse-wheel zoom / double-click reset, fill-all-from-one-photo and
  spread-photos-across-panels.
- **Editable everything** — title, script subtitle, tagline, quote and its
  source, badge, ribbon, volume tag, star count, and a location tag
  (place / time / sub-line) per panel.
- **Poster furniture** — gradient Anton title with a magenta shadow, neon
  Pacifico subtitle, WANTED star pill, quote block, starburst badge,
  volume tag, ribbon, and a bottom strip with palm silhouettes, credits
  and a barcode.
- **Sliders** — grade strength, contrast, saturation, grain, vignette,
  plus a halftone toggle and dots amount. Undo/redo included.
- **Export** — PNG at 1080×1080, 1080×1350 and 1920×1080, or all three at
  once, rendered by the same draw routine as the preview.

## Run it

```sh
node serve.ts          # then open http://localhost:5173/
```

Any static file server pointed at `app/` works just as well; the app is
plain HTML, CSS and JavaScript with no build step.

## Build the entry output

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` validates the entry against the bounty's caps (screenshot count
and size, app file and byte totals), copies `app/` and `screenshots/` into
the output directory, writes `dossier.json` with the vendored
`buildDossier`, and logs a manifest of everything it wrote.

## Assets and licenses

- Fonts: **Anton** and **Pacifico**, both under the SIL Open Font License
  1.1, vendored in `app/fonts/` with their license texts. No Rockstar
  logos, artwork or fonts are used anywhere.
- Sample photos: see `app/samples/ATTRIBUTION.md` — two images from the
  bounty kit's own free starter assets and four images generated for this
  entry.
- Code: MIT, see `LICENSE`.
