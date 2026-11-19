// layouts.js — panel geometry for PALM TIDE Cover Studio.
//
// Every layout returns panel rectangles in cover pixel coordinates for
// a W x H canvas: { x, y, w, h, rot } with rot in radians around the
// panel centre. All layouts share one gutter width derived from the
// canvas, so the dark backdrop shows between panels as a consistent
// gutter and every panel takes the same outline in the renderer.

export const LAYOUTS = [
  { id: 'hero', name: 'Hero' },
  { id: 'comic', name: 'Comic' },
  { id: 'grid9', name: '9-Panel' },
  { id: 'one', name: '1-Panel' },
  { id: 'two', name: '2-Panel' },
  { id: 'three', name: '3-Panel' },
  { id: 'four', name: '4-Panel' },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

function gutter(W, H) {
  return Math.max(6, Math.round(Math.min(W, H) * 0.014));
}

export function panelsFor(layoutId, W, H) {
  const g = gutter(W, H);
  const iw = W - g * 2;
  const ih = H - g * 2;
  switch (layoutId) {
    case 'one':
      return [{ x: g, y: g, w: iw, h: ih, rot: 0 }];
    case 'two': {
      const w = (iw - g) / 2;
      return [
        { x: g, y: g, w, h: ih, rot: 0 },
        { x: g + w + g, y: g, w, h: ih, rot: 0 },
      ];
    }
    case 'three': {
      const lw = iw * 0.46;
      const rw = iw - lw - g;
      const rh = (ih - g) / 2;
      return [
        { x: g, y: g, w: lw, h: ih, rot: 0 },
        { x: g + lw + g, y: g, w: rw, h: rh, rot: 0 },
        { x: g + lw + g, y: g + rh + g, w: rw, h: rh, rot: 0 },
      ];
    }
    case 'four': {
      const w = (iw - g) / 2;
      const h = (ih - g) / 2;
      return [
        { x: g, y: g, w, h, rot: 0 },
        { x: g + w + g, y: g, w, h, rot: 0 },
        { x: g, y: g + h + g, w, h, rot: 0 },
        { x: g + w + g, y: g + h + g, w, h, rot: 0 },
      ];
    }
    case 'comic': {
      const topH = ih * 0.46;
      const botH = ih - topH - g;
      const bw = (iw - g) / 2;
      return [
        { x: g, y: g, w: iw, h: topH, rot: 0 },
        { x: g, y: g + topH + g, w: bw, h: botH, rot: 0.012 },
        { x: g + bw + g, y: g + topH + g, w: bw, h: botH, rot: -0.012 },
      ];
    }
    case 'grid9': {
      const w = (iw - g * 2) / 3;
      const h = (ih - g * 2) / 3;
      const out = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          out.push({ x: g + c * (w + g), y: g + r * (h + g), w, h, rot: 0 });
        }
      }
      return out;
    }
    case 'hero':
    default: {
      const heroW = iw * 0.52;
      const rx = g + heroW + g;
      const rw = W - rx - g;
      const rh = (ih - g * 2) / 3;
      const tilts = [-0.045, 0.03, -0.025];
      const out = [{ x: g, y: g, w: heroW, h: ih, rot: 0 }];
      for (let i = 0; i < 3; i++) {
        out.push({ x: rx, y: g + i * (rh + g), w: rw, h: rh, rot: tilts[i] });
      }
      return out;
    }
  }
}

// Hit test: is point (px, py) inside panel p, honouring its rotation?
export function pointInPanel(p, px, py) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  let dx = px - cx;
  let dy = py - cy;
  if (p.rot) {
    const cos = Math.cos(-p.rot);
    const sin = Math.sin(-p.rot);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    dx = rx;
    dy = ry;
  }
  return Math.abs(dx) <= p.w / 2 && Math.abs(dy) <= p.h / 2;
}
