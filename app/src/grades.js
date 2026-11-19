// grades.js — the grade definitions and the per-panel photo pipeline.
//
// Every photo that lands in a panel goes through the same treatment:
// contrast/saturation shaping, a light posterize, a gradient-map duotone
// blended by the grade-strength slider, and a halftone dot screen. The
// pipeline renders into an offscreen canvas per panel and caches the
// result, so the preview, the exports and the screenshots all draw the
// identical graded pixels.

/** A five-stop colour ramp, darkest to lightest, plus its ink colour. */
function ramp(stops, ink) {
  const parsed = stops.map((hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]);
  const lut = [];
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (parsed.length - 1);
    const a = Math.min(parsed.length - 2, Math.floor(t));
    const f = t - a;
    const A = parsed[a];
    const B = parsed[a + 1];
    lut.push([
      Math.round(A[0] + (B[0] - A[0]) * f),
      Math.round(A[1] + (B[1] - A[1]) * f),
      Math.round(A[2] + (B[2] - A[2]) * f),
    ]);
  }
  return { lut, ink };
}

export const GRADES = {
  vice: {
    name: 'Vice Sunset',
    ...ramp(['#160a2e', '#57135e', '#c22a6d', '#ff7a3d', '#ffe3a3'], '#20062b'),
    posterize: 0.25, levels: 12, halftone: 0.65, cap: 1.0, outlineScale: 1,
  },
  neon: {
    name: 'Neon Night',
    ...ramp(['#03051c', '#0a2470', '#6d1b9e', '#ff2e88', '#a8fbff'], '#05001a'),
    posterize: 0.3, levels: 11, halftone: 0.6, cap: 1.0, outlineScale: 1,
  },
  golden: {
    name: 'Golden Hour',
    ...ramp(['#1c0d02', '#6e2f08', '#c96a1e', '#ffb84d', '#fff3c4'], '#241103'),
    posterize: 0.2, levels: 12, halftone: 0.5, cap: 0.95, outlineScale: 1,
  },
  duotone: {
    name: 'Duotone Pink/Teal',
    ...ramp(['#04222b', '#0e7d8c', '#39c2b8', '#ff7ad9', '#ffe3f6'], '#04222b'),
    posterize: 0.35, levels: 10, halftone: 0.55, cap: 1.0, outlineScale: 1,
  },
  comic: {
    name: 'Comic Ink',
    ...ramp(['#101018', '#3d3d8f', '#d63a2f', '#ff9e2c', '#fff6d8'], '#0c0c14'),
    posterize: 0.55, levels: 9, halftone: 0.8, cap: 1.0, outlineScale: 1.4,
  },
  poster: {
    name: 'Poster Ink',
    ...ramp(['#0d0221', '#4a0e6e', '#e01e63', '#ff8a3d', '#ffeec2'], '#0d0221'),
    posterize: 0.85, levels: 7, halftone: 0.85, cap: 1.0, outlineScale: 2,
  },
  natural: {
    name: 'Natural',
    ...ramp(['#101418', '#3a4a52', '#7d8b90', '#c3c9c4', '#f4f1e6'], '#10151a'),
    posterize: 0, levels: 256, halftone: 0.12, cap: 0.35, outlineScale: 1,
  },
};

export const GRADE_ORDER = ['vice', 'neon', 'golden', 'duotone', 'comic', 'poster', 'natural'];

const cache = new Map();
const CACHE_MAX = 24;

/**
 * The graded canvas for one panel photo.
 * img: HTMLImageElement; w/h: panel pixel size; t: the panel transform
 * {dx, dy, zoom}; s: the shared settings {grade, strength, contrast,
 * saturation, halftone, dots}.
 */
export function gradePhoto(img, w, h, t, s) {
  const g = GRADES[s.grade];
  const key = [
    img.src, w, h, t.dx.toFixed(1), t.dy.toFixed(1), t.zoom.toFixed(3),
    s.grade, s.strength, s.contrast, s.saturation, s.halftone, s.dots,
  ].join('|');
  const hit = cache.get(key);
  if (hit) return hit;

  const cv = document.createElement('canvas');
  cv.width = Math.max(2, Math.round(w));
  cv.height = Math.max(2, Math.round(h));
  const ctx = cv.getContext('2d');

  // Cover-fit crop: base scale fills the panel, zoom and drag adjust it.
  const scale = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight) * t.zoom;
  const sw = cv.width / scale;
  const sh = cv.height / scale;
  const sx = (img.naturalWidth - sw) / 2 - t.dx / scale;
  const sy = (img.naturalHeight - sh) / 2 - t.dy / scale;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);

  const blend = Math.min(1, s.strength * g.cap);
  if (blend > 0.003 || g.posterize > 0 || s.contrast !== 1 || s.saturation !== 1) {
    const data = ctx.getImageData(0, 0, cv.width, cv.height);
    const px = data.data;
    const lut = g.lut;
    const post = g.posterize;
    const steps = Math.max(2, g.levels - 1);
    const con = s.contrast;
    const sat = s.saturation;
    for (let i = 0; i < px.length; i += 4) {
      let r = px[i] / 255;
      let gg = px[i + 1] / 255;
      let b = px[i + 2] / 255;
      // Contrast around mid-grey, then saturation around luminance.
      r = (r - 0.5) * con + 0.5;
      gg = (gg - 0.5) * con + 0.5;
      b = (b - 0.5) * con + 0.5;
      const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      r = lum + (r - lum) * sat;
      gg = lum + (gg - lum) * sat;
      b = lum + (b - lum) * sat;
      if (post > 0) {
        r += (Math.round(Math.min(1, Math.max(0, r)) * steps) / steps - r) * post;
        gg += (Math.round(Math.min(1, Math.max(0, gg)) * steps) / steps - gg) * post;
        b += (Math.round(Math.min(1, Math.max(0, b)) * steps) / steps - b) * post;
      }
      if (blend > 0.003) {
        const li = Math.round(Math.min(1, Math.max(0, 0.2126 * r + 0.7152 * gg + 0.0722 * b)) * 255);
        const map = lut[li];
        r += (map[0] / 255 - r) * blend;
        gg += (map[1] / 255 - gg) * blend;
        b += (map[2] / 255 - b) * blend;
      }
      px[i] = Math.min(255, Math.max(0, Math.round(r * 255)));
      px[i + 1] = Math.min(255, Math.max(0, Math.round(gg * 255)));
      px[i + 2] = Math.min(255, Math.max(0, Math.round(b * 255)));
    }
    ctx.putImageData(data, 0, 0);
  }

  // Halftone: sample the graded photo on a coarse grid and lay ink dots
  // whose radius grows with darkness.
  const amount = s.halftone ? s.dots * g.halftone : 0;
  if (amount > 0.01) {
    const cell = Math.max(5, Math.round(Math.min(cv.width, cv.height) / 64));
    const cols = Math.ceil(cv.width / cell);
    const rows = Math.ceil(cv.height / cell);
    const probe = document.createElement('canvas');
    probe.width = cols;
    probe.height = rows;
    const pctx = probe.getContext('2d');
    pctx.drawImage(cv, 0, 0, cols, rows);
    const sample = pctx.getImageData(0, 0, cols, rows).data;
    ctx.fillStyle = g.ink;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const dark = 1 - (0.2126 * sample[i] + 0.7152 * sample[i + 1] + 0.0722 * sample[i + 2]) / 255;
        const rad = cell * 0.58 * Math.sqrt(dark) * amount;
        if (rad < 0.4) continue;
        ctx.globalAlpha = 0.28 + 0.55 * amount;
        ctx.beginPath();
        ctx.arc(x * cell + cell / 2, y * cell + cell / 2, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, cv);
  return cv;
}
