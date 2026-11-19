// layouts.js — panel geometry for the seven cover layouts.
//
// Rects are fractions of the panel region (x, y, w, h in 0..1) plus an
// optional tilt in radians. The composer insets every rect by half the
// shared gutter, so all layouts keep identical gutters and outlines —
// one system, seven silhouettes.

export const LAYOUTS = {
  hero: {
    label: 'Hero',
    panels: [
      { x: 0, y: 0, w: 0.555, h: 1, rot: 0 },
      { x: 0.575, y: 0, w: 0.425, h: 0.49, rot: -0.028 },
      { x: 0.575, y: 0.51, w: 0.425, h: 0.49, rot: 0.028 },
    ],
  },
  comic: {
    label: 'Comic',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.46, rot: 0 },
      { x: 0, y: 0.48, w: 0.49, h: 0.52, rot: 0 },
      { x: 0.51, y: 0.48, w: 0.49, h: 0.52, rot: 0 },
    ],
  },
  grid9: {
    label: '9-Panel',
    panels: [
      { x: 0, y: 0, w: 0.326, h: 0.326, rot: 0 },
      { x: 0.337, y: 0, w: 0.326, h: 0.326, rot: 0 },
      { x: 0.674, y: 0, w: 0.326, h: 0.326, rot: 0 },
      { x: 0, y: 0.337, w: 0.326, h: 0.326, rot: 0 },
      { x: 0.337, y: 0.337, w: 0.326, h: 0.326, rot: 0 },
      { x: 0.674, y: 0.337, w: 0.326, h: 0.326, rot: 0 },
      { x: 0, y: 0.674, w: 0.326, h: 0.326, rot: 0 },
      { x: 0.337, y: 0.674, w: 0.326, h: 0.326, rot: 0 },
      { x: 0.674, y: 0.674, w: 0.326, h: 0.326, rot: 0 },
    ],
  },
  one: {
    label: '1-Panel',
    panels: [{ x: 0, y: 0, w: 1, h: 1, rot: 0 }],
  },
  two: {
    label: '2-Panel',
    panels: [
      { x: 0, y: 0, w: 0.492, h: 1, rot: 0 },
      { x: 0.508, y: 0, w: 0.492, h: 1, rot: 0 },
    ],
  },
  three: {
    label: '3-Panel',
    panels: [
      { x: 0, y: 0, w: 0.322, h: 1, rot: 0 },
      { x: 0.339, y: 0, w: 0.322, h: 1, rot: 0 },
      { x: 0.678, y: 0, w: 0.322, h: 1, rot: 0 },
    ],
  },
  four: {
    label: '4-Panel',
    panels: [
      { x: 0, y: 0, w: 0.492, h: 0.49, rot: 0 },
      { x: 0.508, y: 0, w: 0.492, h: 0.49, rot: 0 },
      { x: 0, y: 0.51, w: 0.492, h: 0.49, rot: 0 },
      { x: 0.508, y: 0.51, w: 0.492, h: 0.49, rot: 0 },
    ],
  },
};

export const LAYOUT_KEYS = Object.keys(LAYOUTS);
