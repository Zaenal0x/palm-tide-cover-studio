// layouts.js — panel geometry for every cover layout.
// Rects are fractions of the canvas (x, y, w, h in 0..1), plus an optional
// tilt in degrees for the Hero layout. The Mosaic fills the frame edge to
// edge with staggered panels, GTA key-art style.

export const LAYOUTS = {
  mosaic: {
    label: 'Mosaic',
    panels: [
      { x: 0.00, y: 0.00, w: 0.40, h: 0.64 },
      { x: 0.40, y: 0.00, w: 0.32, h: 0.40 },
      { x: 0.72, y: 0.00, w: 0.28, h: 0.54 },
      { x: 0.00, y: 0.64, w: 0.40, h: 0.36 },
      { x: 0.40, y: 0.40, w: 0.32, h: 0.60 },
      { x: 0.72, y: 0.54, w: 0.28, h: 0.46 },
    ],
  },
  hero: {
    label: 'Hero',
    panels: [
      { x: 0.05, y: 0.05, w: 0.50, h: 0.90, tilt: -2 },
      { x: 0.59, y: 0.07, w: 0.36, h: 0.42, tilt: 2.5 },
      { x: 0.59, y: 0.54, w: 0.36, h: 0.40, tilt: -2 },
    ],
  },
  comic: {
    label: 'Comic',
    panels: [
      { x: 0.00, y: 0.00, w: 0.55, h: 0.50 },
      { x: 0.55, y: 0.00, w: 0.45, h: 0.50 },
      { x: 0.00, y: 0.50, w: 0.45, h: 0.50 },
      { x: 0.45, y: 0.50, w: 0.55, h: 0.50 },
    ],
  },
  grid9: {
    label: '9-Panel',
    panels: Array.from({ length: 9 }, (_, i) => ({
      x: (i % 3) / 3, y: Math.floor(i / 3) / 3, w: 1 / 3, h: 1 / 3,
    })),
  },
  one: {
    label: '1-Panel',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  two: {
    label: '2-Panel',
    panels: [
      { x: 0.00, y: 0.00, w: 0.52, h: 1.00 },
      { x: 0.52, y: 0.00, w: 0.48, h: 1.00 },
    ],
  },
  three: {
    label: '3-Panel',
    panels: [
      { x: 0.00, y: 0.00, w: 0.50, h: 1.00 },
      { x: 0.50, y: 0.00, w: 0.50, h: 0.48 },
      { x: 0.50, y: 0.48, w: 0.50, h: 0.52 },
    ],
  },
  four: {
    label: '4-Panel',
    panels: [
      { x: 0.00, y: 0.00, w: 0.50, h: 0.50 },
      { x: 0.50, y: 0.00, w: 0.50, h: 0.50 },
      { x: 0.00, y: 0.50, w: 0.50, h: 0.50 },
      { x: 0.50, y: 0.50, w: 0.50, h: 0.50 },
    ],
  },
};

export const LAYOUT_ORDER = ['mosaic', 'hero', 'comic', 'grid9', 'one', 'two', 'three', 'four'];

export function panelRects(layoutName, W, H) {
  return LAYOUTS[layoutName].panels.map((p) => ({
    x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H, tilt: p.tilt || 0,
  }));
}
