// pixlab.js — the per-panel photo grade pipeline.
//
// Every photograph that lands in a cover panel is pushed through the
// same chain, at draw time, on an offscreen canvas sized to the panel:
//
//   cover-fit crop -> saturation -> contrast -> posterise
//   -> gradient-map duotone blended by the strength slider
//   -> halftone dot screen sized by darkness
//
// The result is cached by the caller under a key of every input that
// shapes it, so dragging a slider re-grades once and exports reuse the
// exact pixels the preview showed.

import { rampTable } from './tones.js';

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Where the source image sits inside a w x h panel. ox / oy are pan
// offsets expressed as a fraction of the panel size; zoom multiplies
// the plain cover-fit scale. The returned rect always covers the panel.
export function fitRect(img, w, h, zoom, ox, oy) {
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const scale = base * (zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  let dx = (w - dw) / 2 + (ox || 0) * w;
  let dy = (h - dh) / 2 + (oy || 0) * h;
  dx = Math.min(0, Math.max(w - dw, dx));
  dy = Math.min(0, Math.max(h - dh, dy));
  return { dx, dy, dw, dh };
}

// Grade one photograph into a fresh canvas of w x h pixels.
// fx: { strength, contrast, saturation, halftone, dots }
export function gradePhoto(img, w, h, slot, grade, fx) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(w));
  canvas.height = Math.max(2, Math.round(h));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const r = fitRect(img, canvas.width, canvas.height, slot.zoom, slot.ox, slot.oy);
  ctx.drawImage(img, r.dx, r.dy, r.dw, r.dh);

  const W = canvas.width;
  const H = canvas.height;
  const imageData = ctx.getImageData(0, 0, W, H);
  const px = imageData.data;
  const table = rampTable(grade);
  const strength = clamp01(fx.strength);
  const contrast = fx.contrast;
  const saturation = fx.saturation;
  const levels = grade.posterLevels;
  const posterMix = grade.posterMix;

  for (let i = 0; i < px.length; i += 4) {
    let red = px[i] / 255;
    let green = px[i + 1] / 255;
    let blue = px[i + 2] / 255;

    // Saturation: pull each channel toward (or away from) luminance.
    const lum0 = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    red = lum0 + (red - lum0) * saturation;
    green = lum0 + (green - lum0) * saturation;
    blue = lum0 + (blue - lum0) * saturation;

    // Contrast around mid grey.
    red = (red - 0.5) * contrast + 0.5;
    green = (green - 0.5) * contrast + 0.5;
    blue = (blue - 0.5) * contrast + 0.5;

    // Posterise: snap the luminance-driven tone to a few flat steps,
    // blended so skin and sky keep a little modelling.
    if (levels > 1 && posterMix > 0) {
      const step = 255 / (levels - 1);
      const lumP = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      const snapped = Math.round(Math.min(1, Math.max(0, lumP)) * (levels - 1)) / (levels - 1);
      const shift = (snapped - lumP) * posterMix;
      red += shift;
      green += shift;
      blue += shift;
    }

    // Gradient map: colour by final luminance, blended by strength.
    const lum = Math.min(1, Math.max(0, 0.2126 * red + 0.7152 * green + 0.0722 * blue));
    const li = Math.round(lum * 255) * 3;
    const keep = 1 - strength;
    px[i] = Math.min(255, Math.max(0, (red * keep + (table[li] / 255) * strength) * 255));
    px[i + 1] = Math.min(255, Math.max(0, (green * keep + (table[li + 1] / 255) * strength) * 255));
    px[i + 2] = Math.min(255, Math.max(0, (blue * keep + (table[li + 2] / 255) * strength) * 255));
  }
  ctx.putImageData(imageData, 0, 0);

  if (fx.halftone) {
    halftoneScreen(ctx, imageData, grade, fx.dots);
  }
  return canvas;
}

// A dot screen laid over the graded pixels: one dot per cell, its
// radius set by how dark the cell is, drawn in the grade's ink colour.
function halftoneScreen(ctx, imageData, grade, dots) {
  const W = imageData.width;
  const H = imageData.height;
  const px = imageData.data;
  const scale = Math.max(0.55, W / 1080);
  const cell = Math.max(4, Math.round((11 - dots * 6) * scale * (2 - Math.min(1.6, grade.dotScale)) * 0.5 + 3 * scale));
  const ink = grade.ink;
  ctx.save();
  ctx.fillStyle = 'rgb(' + ink[0] + ',' + ink[1] + ',' + ink[2] + ')';
  ctx.globalAlpha = 0.34 + dots * 0.3;
  for (let y = cell / 2; y < H; y += cell) {
    for (let x = cell / 2; x < W; x += cell) {
      const sx = Math.min(W - 1, Math.floor(x));
      const sy = Math.min(H - 1, Math.floor(y));
      const idx = (sy * W + sx) * 4;
      const lum = (0.2126 * px[idx] + 0.7152 * px[idx + 1] + 0.0722 * px[idx + 2]) / 255;
      const radius = cell * 0.58 * (1 - lum) * grade.dotScale;
      if (radius < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
