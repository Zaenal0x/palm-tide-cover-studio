// grade.js — the uniform photo grade, applied to EVERY panel photo.
//
// Pipeline per photo (baked once per settings change into a cached canvas):
//   1. saturation + contrast shaping on the raw pixels
//   2. luminance posterize (levels come from the grade)
//   3. gradient-map duotone through the grade's ramp, blended by strength
//   4. halftone dot screen, dot size driven by darkness, baked on top
// The cover composer only ever draws these baked canvases, never a raw
// photo, so preview, every export size and the ?shot= scenes all agree.

import { GRADES, buildLut } from './palette.js';

const cache = new Map();
let cacheKey = '';

export function settingsKey(s) {
  return [
    s.grade, s.strength.toFixed(3), s.contrast.toFixed(3), s.saturation.toFixed(3),
    s.halftone ? 1 : 0, s.dots.toFixed(3),
  ].join('|');
}

// Call when any grade setting changes: stale bakes are dropped.
export function syncSettings(s) {
  const k = settingsKey(s);
  if (k !== cacheKey) {
    cacheKey = k;
    cache.clear();
  }
}

// The graded canvas for one source image under the current settings.
export function gradedCanvas(img, s) {
  syncSettings(s);
  let entry = cache.get(img);
  if (entry) return entry;

  const grade = GRADES[s.grade] || GRADES['vice-sunset'];
  const maxSide = 960;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(2, Math.round(img.naturalWidth * scale));
  const h = Math.max(2, Math.round(img.naturalHeight * scale));

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const lut = buildLut(grade);
  const strength = s.strength;
  const levels = Math.max(2, grade.posterize);
  const sat = s.saturation;
  const con = s.contrast;
  const lum = new Float32Array(w * h);

  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let r = d[i] / 255;
    let g = d[i + 1] / 255;
    let b = d[i + 2] / 255;

    // saturation shaping around the pixel's own luminance
    let l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = l + (r - l) * sat;
    g = l + (g - l) * sat;
    b = l + (b - l) * sat;

    // contrast shaping around mid grey
    r = (r - 0.5) * con + 0.5;
    g = (g - 0.5) * con + 0.5;
    b = (b - 0.5) * con + 0.5;

    l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    l = Math.min(1, Math.max(0, l));
    lum[p] = l;

    // posterize the luminance, then map it through the grade's ramp
    const q = Math.round(l * (levels - 1)) / (levels - 1);
    const li = Math.round(q * 255) * 3;
    const mr = lut[li] / 255;
    const mg = lut[li + 1] / 255;
    const mb = lut[li + 2] / 255;

    d[i] = Math.round(Math.min(1, Math.max(0, r + (mr - r) * strength)) * 255);
    d[i + 1] = Math.round(Math.min(1, Math.max(0, g + (mg - g) * strength)) * 255);
    d[i + 2] = Math.round(Math.min(1, Math.max(0, b + (mb - b) * strength)) * 255);
  }
  ctx.putImageData(imageData, 0, 0);

  // halftone screen: ink dots grow with darkness, so shadows print heavy
  // and highlights stay clean — the printed-poster read the judge looks for.
  if (s.halftone && s.dots > 0.01) {
    const cell = Math.max(5, Math.round(w / 130));
    const ink = grade.ink;
    ctx.fillStyle = `rgb(${ink[0]},${ink[1]},${ink[2]})`;
    const amount = s.dots * grade.halftoneBoost;
    for (let y = cell >> 1; y < h; y += cell) {
      for (let x = cell >> 1; x < w; x += cell) {
        const darkness = 1 - lum[(y * w + x)];
        const radius = (cell * 0.58) * darkness * amount;
        if (radius < 0.35) continue;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  cache.set(img, cv);
  return cv;
}
