// grade.js — the uniform photo grade pipeline.
// Every panel photo, whatever its source, is pushed through the same chain:
// saturation/contrast shaping -> posterize -> gradient-map duotone blended by
// the strength slider -> halftone dot screen sized by darkness. The graded
// result is cached per photo + settings so panels stay cheap to draw.

export const GRADES = {
  vice: {
    label: 'Vice Sunset',
    ramp: [[0, [22, 8, 46]], [0.3, [94, 30, 110]], [0.52, [219, 64, 110]], [0.75, [255, 123, 57]], [1, [255, 214, 120]]],
    posterize: 14, outline: 3, dotScale: 1,
  },
  neon: {
    label: 'Neon Night',
    ramp: [[0, [3, 8, 32]], [0.3, [10, 40, 110]], [0.55, [0, 170, 190]], [0.78, [255, 64, 170]], [1, [235, 245, 255]]],
    posterize: 14, outline: 3, dotScale: 1,
  },
  golden: {
    label: 'Golden Hour',
    ramp: [[0, [30, 16, 8]], [0.35, [110, 60, 20]], [0.6, [200, 120, 40]], [0.85, [255, 190, 90]], [1, [255, 240, 200]]],
    posterize: 16, outline: 3, dotScale: 0.9,
  },
  duotone: {
    label: 'Duotone Pink/Teal',
    ramp: [[0, [6, 54, 66]], [0.5, [38, 178, 175]], [0.76, [255, 120, 180]], [1, [255, 224, 238]]],
    posterize: 12, outline: 3, dotScale: 1,
  },
  comic: {
    label: 'Comic Ink',
    ramp: [[0, [16, 16, 24]], [0.4, [40, 80, 160]], [0.65, [240, 200, 60]], [1, [250, 246, 230]]],
    posterize: 5, outline: 5, dotScale: 1.25,
  },
  poster: {
    label: 'Poster Ink',
    ramp: [[0, [10, 6, 20]], [0.45, [150, 30, 90]], [0.7, [255, 90, 60]], [1, [255, 230, 160]]],
    posterize: 3, outline: 7, dotScale: 1.5,
  },
  natural: {
    label: 'Natural',
    ramp: [[0, [20, 16, 14]], [0.5, [128, 118, 108]], [1, [245, 240, 232]]],
    posterize: 32, outline: 2, dotScale: 0.5,
  },
};

function buildRampLUT(ramp) {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = ramp[0], b = ramp[ramp.length - 1];
    for (let s = 0; s < ramp.length - 1; s++) {
      if (t >= ramp[s][0] && t <= ramp[s + 1][0]) { a = ramp[s]; b = ramp[s + 1]; break; }
    }
    const span = (b[0] - a[0]) || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * f);
  }
  return lut;
}

const lutCache = new Map();
function rampLUT(name) {
  if (!lutCache.has(name)) lutCache.set(name, buildRampLUT(GRADES[name].ramp));
  return lutCache.get(name);
}

const gradeCache = new Map();

export function settingsKey(s) {
  return [s.grade, s.strength.toFixed(2), s.contrast.toFixed(2), s.saturation.toFixed(2),
    s.halftone ? 1 : 0, s.dots.toFixed(2)].join('|');
}

// Grade one source image (HTMLImageElement) into a canvas, cached.
export function gradeImage(img, s) {
  const key = img.src.slice(-48) + '|' + settingsKey(s);
  if (gradeCache.has(key)) return gradeCache.get(key);
  const g = GRADES[s.grade];
  const maxDim = 1100;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(2, Math.round(img.naturalWidth * scale));
  const h = Math.max(2, Math.round(img.naturalHeight * scale));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const lut = rampLUT(s.grade);
  const steps = Math.max(2, g.posterize);
  const sat = s.saturation, con = s.contrast, str = s.strength;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], gg = d[i + 1], b = d[i + 2];
    // saturation shaping around luminance
    const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    r = lum + (r - lum) * sat; gg = lum + (gg - lum) * sat; b = lum + (b - lum) * sat;
    // contrast shaping around mid grey
    r = (r - 128) * con + 128; gg = (gg - 128) * con + 128; b = (b - 128) * con + 128;
    r = Math.min(255, Math.max(0, r)); gg = Math.min(255, Math.max(0, gg)); b = Math.min(255, Math.max(0, b));
    // posterize on luminance, keep hue ratios by scaling
    const l2 = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    const pq = Math.round((l2 / 255) * (steps - 1)) / (steps - 1);
    const f = l2 > 4 ? (pq * 255) / l2 : 1;
    r = Math.min(255, r * f); gg = Math.min(255, gg * f); b = Math.min(255, b * f);
    // gradient-map duotone, blended by strength
    const li = Math.round(Math.min(255, Math.max(0, 0.2126 * r + 0.7152 * gg + 0.0722 * b)));
    const mr = lut[li * 3], mg = lut[li * 3 + 1], mb = lut[li * 3 + 2];
    d[i] = r + (mr - r) * str;
    d[i + 1] = gg + (mg - gg) * str;
    d[i + 2] = b + (mb - b) * str;
  }
  ctx.putImageData(id, 0, 0);
  if (s.halftone && s.dots > 0.01) {
    // halftone dot screen: cell average luminance sets dot radius, ink is the
    // ramp's shadow colour so dots melt into the grade.
    const ink = g.ramp[0][1];
    const cell = Math.max(4, Math.round(7 * g.dotScale));
    ctx.fillStyle = `rgb(${ink[0]},${ink[1]},${ink[2]})`;
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        let sum = 0, n = 0;
        for (let yy = y; yy < Math.min(h, y + cell); yy += 2) {
          for (let xx = x; xx < Math.min(w, x + cell); xx += 2) {
            const j = (yy * w + xx) * 4;
            sum += 0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2]; n++;
          }
        }
        const dark = 1 - (sum / Math.max(1, n)) / 255;
        const rad = (cell / 2) * Math.sqrt(Math.max(0, dark)) * s.dots * 1.2;
        if (rad > 0.4) {
          ctx.beginPath();
          ctx.arc(x + cell / 2, y + cell / 2, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  if (gradeCache.size > 24) gradeCache.clear();
  gradeCache.set(key, cv);
  return cv;
}
