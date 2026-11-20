// grade.js — the uniform photo grade: every panel photo, whatever its source,
// is pushed through the same per-pixel pipeline at draw time:
// saturation/contrast shaping -> light posterize -> gradient-map duotone
// blended by the grade-strength slider -> halftone dot screen sized by darkness.

export const GRADES = {
  vice: {
    name: 'Vice Sunset',
    stops: [[24, 8, 48], [88, 20, 96], [178, 38, 110], [242, 92, 74], [255, 166, 88], [255, 232, 176]],
    posterize: 10, sat: 1.12, con: 1.07, ink: [26, 6, 44], inkAlpha: 0.5, outline: 2,
  },
  neon: {
    name: 'Neon Night',
    stops: [[6, 8, 30], [16, 32, 92], [0, 120, 178], [64, 200, 230], [240, 64, 180], [255, 214, 240]],
    posterize: 10, sat: 1.18, con: 1.1, ink: [4, 6, 26], inkAlpha: 0.5, outline: 2,
  },
  gold: {
    name: 'Golden Hour',
    stops: [[32, 16, 8], [96, 48, 16], [176, 96, 32], [240, 160, 64], [255, 214, 130], [255, 244, 200]],
    posterize: 12, sat: 1.08, con: 1.05, ink: [30, 14, 4], inkAlpha: 0.42, outline: 2,
  },
  duoteal: {
    name: 'Duotone Pink/Teal',
    stops: [[10, 40, 52], [16, 96, 110], [64, 200, 190], [240, 120, 180], [255, 178, 214]],
    posterize: 9, sat: 1.1, con: 1.08, ink: [6, 26, 34], inkAlpha: 0.5, outline: 2,
  },
  comic: {
    name: 'Comic Ink',
    stops: [[20, 16, 40], [70, 40, 120], [200, 60, 90], [250, 140, 60], [255, 220, 120], [255, 250, 230]],
    posterize: 5, sat: 1.22, con: 1.16, ink: [12, 8, 28], inkAlpha: 0.62, outline: 3,
  },
  poster: {
    name: 'Poster Ink',
    stops: [[8, 6, 24], [60, 16, 80], [170, 30, 100], [245, 80, 70], [255, 180, 90], [255, 240, 200]],
    posterize: 4, sat: 1.26, con: 1.22, ink: [5, 3, 16], inkAlpha: 0.78, outline: 4,
  },
  natural: {
    name: 'Natural',
    stops: [[2, 2, 2], [66, 62, 58], [130, 126, 120], [194, 190, 184], [255, 252, 247]],
    posterize: 0, sat: 1.02, con: 1.03, ink: [20, 18, 16], inkAlpha: 0.3, outline: 2,
  },
};

export const GRADE_KEYS = Object.keys(GRADES);

const cache = new Map();
const CACHE_MAX = 48;

function rampLUT(stops) {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const f = t * (stops.length - 1) - seg;
    const a = stops[seg], b = stops[seg + 1];
    lut[i * 3] = a[0] + (b[0] - a[0]) * f;
    lut[i * 3 + 1] = a[1] + (b[1] - a[1]) * f;
    lut[i * 3 + 2] = a[2] + (b[2] - a[2]) * f;
  }
  return lut;
}
for (const k of GRADE_KEYS) GRADES[k].lut = rampLUT(GRADES[k].stops);

// Returns a canvas of exactly w x h holding `img` cropped by `crop`
// ({x, y in 0..1 pan, zoom >= 1}) and graded by `settings`
// ({grade, strength, contrast, saturation, halftone, dots}).
export function gradedCanvas(img, crop, w, h, settings) {
  w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
  const g = GRADES[settings.grade] || GRADES.vice;
  const key = [
    img.__uid, w, h,
    crop.x.toFixed(3), crop.y.toFixed(3), crop.zoom.toFixed(3),
    settings.grade, settings.strength.toFixed(2), settings.contrast.toFixed(2),
    settings.saturation.toFixed(2), settings.halftone ? 1 : 0, settings.dots.toFixed(2),
  ].join('|');
  const hit = cache.get(key);
  if (hit) return hit;

  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });

  // cover-fit the photo into the panel, then apply pan/zoom crop
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * crop.zoom;
  const dw = iw * scale, dh = ih * scale;
  cx.drawImage(img, (w - dw) * crop.x, (h - dh) * crop.y, dw, dh);

  const imgData = cx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const sat = settings.saturation * g.sat;
  const con = settings.contrast * g.con;
  const strength = settings.strength;
  const levels = g.posterize;
  const lut = g.lut;
  const inv = 1 - strength;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], gg = d[i + 1], b = d[i + 2];
    // saturation shaping around luminance
    const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    r = lum + (r - lum) * sat;
    gg = lum + (gg - lum) * sat;
    b = lum + (b - lum) * sat;
    // contrast shaping around mid grey
    r = (r - 128) * con + 128;
    gg = (gg - 128) * con + 128;
    b = (b - 128) * con + 128;
    // light posterize, then read the gradient map at the shaped luminance
    let t = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    if (levels > 0) t = Math.round(t * levels) / levels;
    const li = (t * 255) | 0;
    const mr = lut[li * 3], mg = lut[li * 3 + 1], mb = lut[li * 3 + 2];
    d[i] = r * inv + mr * strength;
    d[i + 1] = gg * inv + mg * strength;
    d[i + 2] = b * inv + mb * strength;
  }
  cx.putImageData(imgData, 0, 0);

  // halftone dot screen: dot radius grows with the darkness of the graded pixel
  if (settings.halftone) {
    const pitch = Math.max(5, Math.round((15 - settings.dots * 8) * (h / 540)));
    const ink = g.ink;
    cx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${g.inkAlpha})`;
    const data = imgData.data;
    for (let y = pitch >> 1; y < h; y += pitch) {
      for (let x = pitch >> 1; x < w; x += pitch) {
        const p = ((y * w) + x) * 4;
        const dark = 1 - (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
        const rad = Math.pow(dark, 1.25) * pitch * 0.74;
        if (rad > 0.4) {
          cx.beginPath();
          cx.arc(x, y, rad, 0, 6.2832);
          cx.fill();
        }
      }
    }
  }

  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, cv);
  return cv;
}
