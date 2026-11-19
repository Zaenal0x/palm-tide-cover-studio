// layouts.js — panel geometry for the seven cover layouts.
//
// Rectangles are fractions of the cover (x, y, w, h in 0..1) plus a tilt in
// degrees. Every layout shares the same panel region and gutter rhythm, so
// switching layouts never changes how a panel is framed — only where the
// panels sit. The furniture (title, strip, badges) is drawn over the
// panels by render.js, the way a printed cover layers type over art.

function grid(cols, rows) {
  const panels = [];
  const x0 = 0.022;
  const y0 = 0.128;
  const wAll = 0.956;
  const hAll = 0.752;
  const gx = 0.021;
  const gy = 0.016;
  const w = (wAll - gx * (cols - 1)) / cols;
  const h = (hAll - gy * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      panels.push({ x: x0 + c * (w + gx), y: y0 + r * (h + gy), w, h, rot: 0 });
    }
  }
  return panels;
}

export const LAYOUTS = {
  hero: {
    name: 'Hero',
    panels: [
      { x: 0.022, y: 0.128, w: 0.566, h: 0.752, rot: 0 },
      { x: 0.612, y: 0.128, w: 0.366, h: 0.238, rot: -2.2 },
      { x: 0.612, y: 0.382, w: 0.366, h: 0.238, rot: 1.6 },
      { x: 0.612, y: 0.636, w: 0.366, h: 0.244, rot: -1.2 },
    ],
  },
  comic: {
    name: 'Comic',
    panels: [
      { x: 0.022, y: 0.128, w: 0.956, h: 0.352, rot: 0 },
      { x: 0.022, y: 0.496, w: 0.467, h: 0.384, rot: 0 },
      { x: 0.511, y: 0.496, w: 0.467, h: 0.384, rot: 0 },
    ],
  },
  grid9: { name: '9-Panel', panels: grid(3, 3) },
  one: { name: '1-Panel', panels: [{ x: 0.022, y: 0.128, w: 0.956, h: 0.752, rot: 0 }] },
  two: {
    name: '2-Panel',
    panels: [
      { x: 0.022, y: 0.128, w: 0.467, h: 0.752, rot: 0 },
      { x: 0.511, y: 0.128, w: 0.467, h: 0.752, rot: 0 },
    ],
  },
  three: { name: '3-Panel', panels: grid(3, 1) },
  four: { name: '4-Panel', panels: grid(2, 2) },
};

export const LAYOUT_ORDER = ['hero', 'comic', 'grid9', 'one', 'two', 'three', 'four'];

/** Default location tags, one per panel slot (place / time / sub-line). */
export const TAG_DEFAULTS = [
  { place: 'OCEAN DRIVE', time: '6:42 PM', sub: 'LOOKING FOR TROUBLE' },
  { place: 'MARINA DEL SOL', time: '7:48 PM', sub: 'NO WITNESSES' },
  { place: 'TOWER 9', time: '6:10 PM', sub: 'LAST SWIM' },
  { place: 'PALM BOULEVARD', time: '9:15 PM', sub: 'LIGHTS OUT' },
  { place: 'NEON ROW', time: '2:15 AM', sub: 'CITY OF GLASS' },
  { place: 'INTERSTATE 6', time: '11:58 PM', sub: 'FULL THROTTLE' },
  { place: 'VICE BEACH', time: '5:05 PM', sub: 'GOLDEN HOUR' },
  { place: 'PORT OF VICE', time: '8:30 PM', sub: 'LOW TIDE' },
  { place: 'DOWNTOWN', time: '12:04 AM', sub: 'HEAT WAVE' },
];
