// palette.js — the seven cover grades of PALM TIDE Cover Studio.
//
// Every grade is one promise: whatever photo lands in a panel, it comes out
// the other side of the SAME ramp, so a cover never reads as raw stock glued
// under a glossy title. A ramp is five [r, g, b] stops from shadow (0) to
// highlight (1); the pipeline in grade.js maps each pixel's luminance
// through it and blends by the strength slider.

export const GRADES = {
  'vice-sunset': {
    label: 'Vice Sunset',
    stops: [
      [16, 4, 38], [94, 20, 84], [216, 52, 110], [255, 128, 56], [255, 226, 154],
    ],
    posterize: 26, halftoneBoost: 1.0, ink: [12, 2, 26],
  },
  'neon-night': {
    label: 'Neon Night',
    stops: [
      [3, 6, 24], [24, 22, 92], [10, 110, 168], [240, 46, 160], [205, 250, 255],
    ],
    posterize: 22, halftoneBoost: 1.0, ink: [2, 3, 14],
  },
  'golden-hour': {
    label: 'Golden Hour',
    stops: [
      [20, 10, 4], [94, 46, 12], [198, 104, 28], [255, 176, 70], [255, 243, 196],
    ],
    posterize: 26, halftoneBoost: 0.9, ink: [16, 8, 2],
  },
  'pink-teal': {
    label: 'Duotone Pink/Teal',
    stops: [
      [4, 36, 42], [12, 110, 118], [110, 205, 190], [255, 118, 188], [255, 228, 242],
    ],
    posterize: 18, halftoneBoost: 1.0, ink: [3, 24, 28],
  },
  'comic-ink': {
    label: 'Comic Ink',
    stops: [
      [16, 17, 26], [72, 78, 98], [146, 156, 176], [212, 218, 232], [252, 252, 255],
    ],
    posterize: 9, halftoneBoost: 1.35, ink: [8, 8, 12],
  },
  'poster-ink': {
    label: 'Poster Ink',
    stops: [
      [0, 0, 0], [38, 38, 40], [104, 104, 108], [186, 186, 190], [255, 255, 255],
    ],
    posterize: 5, halftoneBoost: 1.8, ink: [0, 0, 0],
  },
  'natural': {
    label: 'Natural',
    stops: [
      [0, 0, 0], [64, 64, 64], [128, 128, 128], [192, 192, 192], [255, 255, 255],
    ],
    posterize: 64, halftoneBoost: 0.55, ink: [10, 10, 10],
  },
};

export const GRADE_KEYS = Object.keys(GRADES);

// Sample a five-stop ramp at t in [0, 1] into [r, g, b] floats.
export function rampAt(stops, t) {
  const x = Math.min(0.99999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

// A 256-entry lookup table for one grade: index by luminance byte.
export function buildLut(grade) {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    const [r, g, b] = rampAt(grade.stops, v / 255);
    lut[v * 3] = r;
    lut[v * 3 + 1] = g;
    lut[v * 3 + 2] = b;
  }
  return lut;
}
