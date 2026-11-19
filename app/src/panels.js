// panels.js — the seven cover layouts.
//
// A layout is a list of panel rectangles in cover pixels. The field is
// the whole canvas above the bottom strip; every layout shares the
// same outer margin and gutter so switching layouts never changes the
// cover's bones, only how the photographs divide the field.

export const LAYOUTS = [
  { id: 'hero', name: 'Hero' },
  { id: 'comic', name: 'Comic' },
  { id: 'nine', name: '9-Panel' },
  { id: 'one', name: '1-Panel' },
  { id: 'two', name: '2-Panel' },
  { id: 'three', name: '3-Panel' },
  { id: 'four', name: '4-Panel' },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export function slotCount(layoutId) {
  switch (layoutId) {
    case 'one': return 1;
    case 'two': return 2;
    case 'three': return 3;
    case 'four': return 4;
    case 'comic': return 3;
    case 'hero': return 3;
    case 'nine': return 9;
    default: return 3;
  }
}

// Rectangles for a W x H cover whose bottom strip takes stripH pixels.
// tilt is a small rotation in radians, used only by the hero layout.
export function layoutSlots(layoutId, W, H, stripH) {
  const fieldH = H - stripH;
  const mx = W * 0.026;
  const my = fieldH * 0.032;
  const fw = W - mx * 2;
  const fh = fieldH - my * 2;
  const g = Math.max(6, W * 0.009);
  const slot = (x, y, w, h, tilt) => ({ x, y, w, h, tilt: tilt || 0 });

  switch (layoutId) {
    case 'one':
      return [slot(mx, my, fw, fh)];
    case 'two': {
      const w = (fw - g) / 2;
      return [slot(mx, my, w, fh), slot(mx + w + g, my, w, fh)];
    }
    case 'three': {
      const w = (fw - g * 2) / 3;
      return [0, 1, 2].map((i) => slot(mx + i * (w + g), my, w, fh));
    }
    case 'four': {
      const w = (fw - g) / 2;
      const h = (fh - g) / 2;
      return [
        slot(mx, my, w, h),
        slot(mx + w + g, my, w, h),
        slot(mx, my + h + g, w, h),
        slot(mx + w + g, my + h + g, w, h),
      ];
    }
    case 'comic': {
      const topH = fh * 0.46;
      const botH = fh - topH - g;
      const w = (fw - g) / 2;
      return [
        slot(mx, my, fw, topH),
        slot(mx, my + topH + g, w, botH),
        slot(mx + w + g, my + topH + g, w, botH),
      ];
    }
    case 'nine': {
      const w = (fw - g * 2) / 3;
      const h = (fh - g * 2) / 3;
      const out = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          out.push(slot(mx + col * (w + g), my + row * (h + g), w, h));
        }
      }
      return out;
    }
    case 'hero':
    default: {
      const heroW = fw * 0.585;
      const sideX = mx + heroW + g;
      const sideW = fw - heroW - g;
      const sideH = (fh - g) / 2;
      return [
        slot(mx, my, heroW, fh),
        slot(sideX, my, sideW, sideH, 0.035),
        slot(sideX, my + sideH + g, sideW, sideH, -0.028),
      ];
    }
  }
}
