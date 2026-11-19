// grade.js — the uniform photo grade pipeline of PALM TIDE Cover Studio.
//
// The whole point of this studio: a photo never reaches the cover raw.
// Every panel photo is pushed through the same pipeline at draw time —
// contrast and saturation shaping, a light posterize, a gradient-map
// duotone blended over the photo by the grade strength, and an optional
// halftone dot screen — so a whole cover reads as one piece of poster
// art instead of a collage of stock photos under a glossy title.

// A grade is a five-stop gradient map (shadow -> highlight), an ink
// colour for halftone dots and outlines, a posterize recipe, a blend
// ceiling (Natural stays a light touch even at full strength) and the
// backdrop colours the cover canvas shows between panels.
export const GRADES = [
  {
    id: 'vice-sunset', name: 'Vice Sunset',
    stops: [[0.0, [36, 10, 54]], [0.28, [122, 32, 74]], [0.52, [232, 84, 74]], [0.76, [255, 150, 64]], [1.0, [255, 226, 160]]],
    ink: '#2a0a2e', outlineWidth: 3, posterLevels: 22, posterMix: 0.30, maxBlend: 1.0,
    backdrop: ['#2b0f3a', '#57184d', '#8c2456'],
  },
  {
    id: 'neon-night', name: 'Neon Night',
    stops: [[0.0, [8, 10, 38]], [0.30, [26, 34, 96]], [0.55, [0, 150, 178]], [0.78, [236, 64, 190]], [1.0, [190, 245, 255]]],
    ink: '#060818', outlineWidth: 3, posterLevels: 20, posterMix: 0.30, maxBlend: 1.0,
    backdrop: ['#04061e', '#0a1440', '#131f5e'],
  },
  {
    id: 'golden-hour', name: 'Golden Hour',
    stops: [[0.0, [46, 22, 8]], [0.30, [128, 66, 20]], [0.55, [216, 128, 44]], [0.78, [255, 186, 84]], [1.0, [255, 240, 200]]],
    ink: '#2e1503', outlineWidth: 3, posterLevels: 24, posterMix: 0.25, maxBlend: 1.0,
    backdrop: ['#241005', '#4a2408', '#7a3c10'],
  },
  {
    id: 'duotone-pink-teal', name: 'Duotone Pink/Teal',
    stops: [[0.0, [6, 42, 54]], [0.32, [10, 110, 120]], [0.58, [240, 90, 160]], [0.80, [255, 150, 190]], [1.0, [214, 255, 246]]],
    ink: '#04222b', outlineWidth: 3, posterLevels: 14, posterMix: 0.50, maxBlend: 1.0,
    backdrop: ['#062a33', '#0a3d4d', '#0f5568'],
  },
  {
    id: 'comic-ink', name: 'Comic Ink',
    stops: [[0.0, [16, 12, 28]], [0.30, [70, 40, 110]], [0.55, [226, 84, 60]], [0.78, [250, 170, 60]], [1.0, [255, 244, 214]]],
    ink: '#120a20', outlineWidth: 5, posterLevels: 10, posterMix: 0.65, maxBlend: 1.0,
    backdrop: ['#170f26', '#241243', '#33185c'],
  },
  {
    id: 'poster-ink', name: 'Poster Ink',
    stops: [[0.0, [10, 8, 18]], [0.30, [58, 30, 88]], [0.55, [214, 48, 92]], [0.78, [255, 138, 42]], [1.0, [255, 238, 190]]],
    ink: '#0a0612', outlineWidth: 8, posterLevels: 7, posterMix: 0.85, maxBlend: 1.0,
    backdrop: ['#120a20', '#1e0f38', '#2c1650'],
  },
  {
    id: 'natural', name: 'Natural',
    stops: [[0.0, [24, 24, 28]], [0.30, [84, 84, 88]], [0.55, [150, 148, 146]], [0.78, [214, 210, 204]], [1.0, [248, 246, 242]]],
    ink: '#141416', outlineWidth: 3, posterLevels: 0, posterMix: 0.0, maxBlend: 0.30,
    backdrop: ['#1c1a22', '#2a2733', '#3a3644'],
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Build a 256-entry RGB lookup table from a grade's gradient stops.
export function buildLut(stops) {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        a = stops[s];
        b = stops[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * f);
  }
  return lut;
}

const lutCache = new Map();
export function lutFor(grade) {
  if (!lutCache.has(grade.id)) lutCache.set(grade.id, buildLut(grade.stops));
  return lutCache.get(grade.id);
}

// Grade one photo into an offscreen canvas of exactly w x h pixels.
// The photo is cover-fitted with the panel crop (dx, dy in -1..1 as a
// fraction of the overflow, zoom >= 1), then shaped, posterized and
// gradient-mapped per pixel, then screened with halftone dots whose
// size follows the graded darkness of each cell.
export function gradePhoto(img, w, h, crop, opts) {
  const grade = opts.grade;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(w));
  canvas.height = Math.max(2, Math.round(h));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Cover-fit the photo with the user's crop.
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(canvas.width / iw, canvas.height / ih) * (crop.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = (dw - canvas.width) * (0.5 + 0.5 * (crop.dx || 0));
  const oy = (dh - canvas.height) * (0.5 + 0.5 * (crop.dy || 0));
  ctx.drawImage(img, -ox, -oy, dw, dh);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const lut = lutFor(grade);
  const blend = Math.min(1, Math.max(0, opts.strength)) * grade.maxBlend;
  const keep = 1 - blend;
  const con = 1 + opts.contrast;
  const sat = 1 + opts.saturation;
  const levels = grade.posterLevels;
  const pMix = grade.posterMix;
  const pKeep = 1 - pMix;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255;
    let g = d[i + 1] / 255;
    let b = d[i + 2] / 255;

    // Contrast around mid grey, then saturation around luminance.
    r = (r - 0.5) * con + 0.5;
    g = (g - 0.5) * con + 0.5;
    b = (b - 0.5) * con + 0.5;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * sat;
    g = lum + (g - lum) * sat;
    b = lum + (b - lum) * sat;

    // Light posterize: snap a share of each channel toward flat steps.
    if (levels > 1) {
      const step = levels - 1;
      r = r * pKeep + (Math.round(Math.min(1, Math.max(0, r)) * step) / step) * pMix;
      g = g * pKeep + (Math.round(Math.min(1, Math.max(0, g)) * step) / step) * pMix;
      b = b * pKeep + (Math.round(Math.min(1, Math.max(0, b)) * step) / step) * pMix;
    }

    // Gradient map by the shaped luminance, blended by grade strength.
    const li = Math.min(255, Math.max(0, Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * 255))) * 3;
    d[i] = Math.min(255, Math.max(0, (r * keep + (lut[li] / 255) * blend) * 255));
    d[i + 1] = Math.min(255, Math.max(0, (g * keep + (lut[li + 1] / 255) * blend) * 255));
    d[i + 2] = Math.min(255, Math.max(0, (b * keep + (lut[li + 2] / 255) * blend) * 255));
  }
  ctx.putImageData(imgData, 0, 0);

  // Halftone dot screen: one ink dot per cell, sized by darkness.
  if (opts.halftone && opts.halftoneAmt > 0.01) {
    const cell = Math.max(4, Math.round(9 - opts.halftoneAmt * 4));
    const maxR = cell * 0.72;
    ctx.fillStyle = grade.ink;
    ctx.globalAlpha = 0.28 + opts.halftoneAmt * 0.45;
    const dd = imgData.data;
    const cw = canvas.width;
    for (let y = cell / 2; y < canvas.height; y += cell) {
      for (let x = cell / 2; x < cw; x += cell) {
        const idx = ((Math.floor(y) * cw) + Math.floor(x)) * 4;
        const dark = 1 - (0.2126 * dd[idx] + 0.7152 * dd[idx + 1] + 0.0722 * dd[idx + 2]) / 255;
        const rad = dark * maxR * (0.35 + opts.halftoneAmt * 0.85);
        if (rad < 0.4) continue;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  return canvas;
}
