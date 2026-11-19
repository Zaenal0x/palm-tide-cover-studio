// tones.js — the seven house grades of PALM TIDE Cover Studio.
//
// A grade is a small bundle of decisions that the pixel pipeline in
// pixlab.js applies to EVERY panel photograph, so a cover never shows a
// raw stock photo: a five-stop colour ramp keyed to luminance, a
// posterise setting, a halftone ink, an outline colour and the backdrop
// the panels sit on. Keeping the grades as data means the editor, the
// one-click variants and the exports all share exactly the same look.

export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    stops: [
      [0.0, [22, 10, 42]],
      [0.25, [75, 20, 80]],
      [0.5, [160, 44, 94]],
      [0.72, [226, 96, 63]],
      [0.88, [247, 161, 60]],
      [1.0, [255, 233, 176]],
    ],
    posterLevels: 6,
    posterMix: 0.35,
    ink: [42, 10, 51],
    outline: [24, 6, 34],
    outlineWidth: 3,
    dotScale: 1.0,
    backdrop: ['#2a0f3d', '#57184f', '#8f2a4d'],
  },
  {
    id: 'neon',
    name: 'Neon Night',
    stops: [
      [0.0, [5, 9, 20]],
      [0.3, [13, 43, 82]],
      [0.55, [122, 30, 110]],
      [0.78, [232, 62, 140]],
      [0.9, [25, 211, 197]],
      [1.0, [216, 255, 248]],
    ],
    posterLevels: 6,
    posterMix: 0.3,
    ink: [8, 4, 24],
    outline: [6, 8, 20],
    outlineWidth: 3,
    dotScale: 1.0,
    backdrop: ['#050914', '#131b3d', '#3d1450'],
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    stops: [
      [0.0, [29, 15, 4]],
      [0.35, [92, 46, 12]],
      [0.6, [176, 106, 30]],
      [0.82, [237, 169, 60]],
      [1.0, [255, 243, 196]],
    ],
    posterLevels: 7,
    posterMix: 0.25,
    ink: [46, 22, 4],
    outline: [30, 16, 4],
    outlineWidth: 3,
    dotScale: 0.9,
    backdrop: ['#241103', '#4d2408', '#7a3c10'],
  },
  {
    id: 'duotone',
    name: 'Duotone Pink/Teal',
    stops: [
      [0.0, [6, 42, 51]],
      [0.35, [14, 125, 116]],
      [0.62, [122, 74, 140]],
      [0.85, [240, 110, 170]],
      [1.0, [255, 196, 224]],
    ],
    posterLevels: 6,
    posterMix: 0.4,
    ink: [10, 30, 40],
    outline: [8, 24, 30],
    outlineWidth: 3,
    dotScale: 1.0,
    backdrop: ['#07222b', '#3d1450', '#0e4d4a'],
  },
  {
    id: 'comic',
    name: 'Comic Ink',
    stops: [
      [0.0, [16, 16, 24]],
      [0.4, [49, 67, 124]],
      [0.65, [195, 63, 78]],
      [0.85, [240, 140, 46]],
      [1.0, [253, 243, 208]],
    ],
    posterLevels: 4,
    posterMix: 0.8,
    ink: [10, 10, 16],
    outline: [8, 8, 12],
    outlineWidth: 5,
    dotScale: 1.25,
    backdrop: ['#141428', '#2c2c50', '#4d2140'],
  },
  {
    id: 'poster',
    name: 'Poster Ink',
    stops: [
      [0.0, [10, 10, 18]],
      [0.45, [94, 26, 110]],
      [0.7, [232, 58, 58]],
      [0.9, [255, 154, 46]],
      [1.0, [255, 246, 216]],
    ],
    posterLevels: 3,
    posterMix: 0.95,
    ink: [6, 6, 10],
    outline: [4, 4, 8],
    outlineWidth: 7,
    dotScale: 1.6,
    backdrop: ['#100a1e', '#33104a', '#57184f'],
  },
  {
    id: 'natural',
    name: 'Natural',
    stops: [
      [0.0, [20, 16, 12]],
      [0.5, [138, 122, 104]],
      [1.0, [255, 248, 238]],
    ],
    posterLevels: 0,
    posterMix: 0.0,
    ink: [30, 24, 18],
    outline: [20, 14, 10],
    outlineWidth: 2,
    dotScale: 0.35,
    backdrop: ['#1c1410', '#33241a', '#4a3423'],
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// A 256-entry lookup table for one grade's ramp: index by luminance.
export function rampTable(grade) {
  const table = new Uint8Array(256 * 3);
  const stops = grade.stops;
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
    table[i * 3] = Math.round(a[1][0] + (b[1][0] - a[1][0]) * f);
    table[i * 3 + 1] = Math.round(a[1][1] + (b[1][1] - a[1][1]) * f);
    table[i * 3 + 2] = Math.round(a[1][2] + (b[1][2] - a[1][2]) * f);
  }
  return table;
}
