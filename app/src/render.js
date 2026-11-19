// render.js — draws the whole cover: graded panels, location tags and the
// poster furniture. One routine serves the live preview, the three export
// sizes and the screenshot scenes, so what you see is exactly what ships.

import { GRADES, gradePhoto } from './grades.js';
import { LAYOUTS } from './layouts.js';

export const LETTERING = [
  ['#fff6d8', '#ffb84d', '#ff5e3a'],
  ['#a8fbff', '#3df2ff', '#ff2e88'],
  ['#fff6d8', '#ffd23d', '#e01e63'],
];

const DARK = '#16041f';

function hexRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** Set ctx.font in Anton at a size that fits maxW, shrinking from startPx. */
function fitFont(ctx, text, family, startPx, maxW, minPx = 8) {
  let px = startPx;
  ctx.font = `${px}px ${family}`;
  while (px > minPx && ctx.measureText(text).width > maxW) {
    px *= 0.94;
    ctx.font = `${px}px ${family}`;
  }
  return px;
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** A palm silhouette: curved trunk and five fronds, base at (x, baseY). */
function palm(ctx, x, baseY, h, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const w = h * 0.055;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + h * 0.06, baseY - h * 0.55, x + h * 0.16, baseY - h);
  ctx.stroke();
  const tx = x + h * 0.16;
  const ty = baseY - h;
  ctx.lineWidth = w * 0.62;
  for (const a of [-2.75, -2.15, -1.55, -0.95, -0.35]) {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * h * 0.24,
      ty + Math.sin(a) * h * 0.24 - h * 0.05,
      tx + Math.cos(a) * h * 0.42,
      ty + Math.sin(a) * h * 0.42 + h * 0.13,
    );
    ctx.stroke();
  }
}

/** A small deterministic barcode seeded by a string. */
function barcode(ctx, x, y, w, h, seed) {
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(x, y, w, h);
  let s = 7;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) % 9973;
  const rnd = () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
  ctx.fillStyle = '#14100c';
  let bx = x + w * 0.07;
  const bottom = y + h * 0.78;
  while (bx < x + w * 0.9) {
    const bw = (0.4 + rnd() * 1.7) * (w / 46);
    if (rnd() > 0.36) ctx.fillRect(bx, y + h * 0.1, bw, bottom - y - h * 0.1);
    bx += bw + (0.5 + rnd()) * (w / 46);
  }
  ctx.font = `${Math.round(h * 0.16)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('2 026110 6', x + w / 2, y + h * 0.95);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, maxW, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(next).width > maxW && line !== '') {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line !== '') lines.push(line);
  if (lines.length === maxLines) {
    const joined = lines.join(' ');
    if (joined.length < text.length) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s,.;:]+$/, '')}…`;
  }
  return lines;
}

let noiseTile = null;
function grainTile() {
  if (noiseTile) return noiseTile;
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const ctx = cv.getContext('2d');
  const data = ctx.createImageData(256, 256);
  let s = 1234567;
  for (let i = 0; i < data.data.length; i += 4) {
    s = (s * 48271) % 2147483647;
    const v = s % 256;
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  noiseTile = cv;
  return cv;
}

/**
 * Draw the cover into ctx at W x H pixels.
 * S: the studio state; photos: array of HTMLImageElement by photo id.
 * opts.selection: panel index to outline (editor only), or null.
 */
export function drawCover(ctx, W, H, S, photos, opts = {}) {
  const grade = GRADES[S.grade];
  const u = Math.min(W, H);
  const layout = LAYOUTS[S.layout];

  // Backdrop: the grade's own dark-to-mid ramp with a warm glow.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  const c0 = hexRgb('#0d0217');
  const c1 = grade.lut[64];
  bg.addColorStop(0, `rgb(${c0[0]},${c0[1]},${c0[2]})`);
  bg.addColorStop(0.55, `rgb(${c1[0]},${c1[1]},${c1[2]})`);
  bg.addColorStop(1, `rgb(${c0[0]},${c0[1]},${c0[2]})`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.82, H * 0.1, 0, W * 0.82, H * 0.1, u * 0.75);
  const gc = grade.lut[205];
  glow.addColorStop(0, `rgba(${gc[0]},${gc[1]},${gc[2]},0.30)`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Panels.
  const settings = {
    grade: S.grade, strength: S.strength, contrast: S.contrast,
    saturation: S.saturation, halftone: S.halftone, dots: S.dots,
  };
  layout.panels.forEach((p, i) => {
    const panel = S.panels[i];
    const pw = p.w * W;
    const ph = p.h * H;
    const cx = (p.x + p.w / 2) * W;
    const cy = (p.y + p.h / 2) * H;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((p.rot ?? 0) * Math.PI) / 180);
    ctx.beginPath();
    ctx.rect(-pw / 2, -ph / 2, pw, ph);
    ctx.clip();
    const img = panel && panel.photo != null ? photos[panel.photo] : null;
    if (img) {
      const graded = gradePhoto(img, pw, ph, panel, settings);
      ctx.drawImage(graded, -pw / 2, -ph / 2, pw, ph);
    } else {
      const pg = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
      const m = grade.lut[90];
      pg.addColorStop(0, `rgb(${m[0]},${m[1]},${m[2]})`);
      pg.addColorStop(1, '#12041f');
      ctx.fillStyle = pg;
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.textAlign = 'center';
      fitFont(ctx, 'ADD A PHOTO', 'Anton', u * 0.03, pw * 0.8);
      ctx.fillText('ADD A PHOTO', 0, -u * 0.005);
      ctx.font = `${Math.round(u * 0.016)}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('pick a sample on the left, or drop a file', 0, u * 0.026);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    // Outline: one shared treatment — heavy dark keyline, thin light inner.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((p.rot ?? 0) * Math.PI) / 180);
    ctx.lineWidth = Math.max(2.5, u * 0.0075) * grade.outlineScale;
    ctx.strokeStyle = DARK;
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
    ctx.lineWidth = Math.max(1, u * 0.0016);
    ctx.strokeStyle = 'rgba(255,240,214,0.4)';
    const inset = Math.max(3, u * 0.006) * grade.outlineScale;
    ctx.strokeRect(-pw / 2 + inset, -ph / 2 + inset, pw - inset * 2, ph - inset * 2);
    ctx.restore();

    // Location tag, bottom-left inside the panel.
    if (img && panel) drawTag(ctx, p, panel, W, H, u);
  });

  // Palms rise from the bottom strip over the art.
  palm(ctx, W * 0.47, H * 0.918, H * 0.115, DARK);
  palm(ctx, W * 0.545, H * 0.918, H * 0.15, DARK);
  palm(ctx, W * 0.615, H * 0.918, H * 0.095, DARK);

  drawStrip(ctx, W, H, S, u);
  drawTopFurniture(ctx, W, H, S, u);
  drawTitle(ctx, W, H, S, u);
  drawBadge(ctx, W, H, S, u);

  // Film grain and vignette finish the print look.
  if (S.grain > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = S.grain * 0.55;
    ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (S.vignette > 0.01) {
    const v = ctx.createRadialGradient(W / 2, H * 0.46, u * 0.34, W / 2, H * 0.46, Math.max(W, H) * 0.78);
    v.addColorStop(0, 'rgba(6,0,14,0)');
    v.addColorStop(1, `rgba(6,0,14,${(S.vignette * 0.62).toFixed(3)})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  // Editor selection outline (never on exports).
  if (opts.selection != null && layout.panels[opts.selection]) {
    const p = layout.panels[opts.selection];
    const pw = p.w * W;
    const ph = p.h * H;
    ctx.save();
    ctx.translate((p.x + p.w / 2) * W, (p.y + p.h / 2) * H);
    ctx.rotate(((p.rot ?? 0) * Math.PI) / 180);
    ctx.lineWidth = Math.max(2, u * 0.004);
    ctx.strokeStyle = '#3df2ff';
    ctx.setLineDash([u * 0.016, u * 0.011]);
    ctx.strokeRect(-pw / 2 - u * 0.008, -ph / 2 - u * 0.008, pw + u * 0.016, ph + u * 0.016);
    ctx.restore();
  }
}

function drawTag(ctx, p, panel, W, H, u) {
  const ts = u * 0.029;
  ctx.font = `${ts}px Anton`;
  const placeW = ctx.measureText(panel.place || '').width;
  ctx.font = `600 ${Math.round(ts * 0.54)}px system-ui, sans-serif`;
  const line2 = `${panel.time || ''} · ${panel.sub || ''}`;
  const line2W = ctx.measureText(line2).width;
  const pad = ts * 0.42;
  const bw = Math.max(placeW, line2W) + pad * 2;
  const bh = ts * 1.98;
  const bx = (p.x + 0.014) * W;
  const by = (p.y + p.h) * H - bh - H * 0.014;
  if (bw > p.w * W * 0.94) return; // too small a panel for a tag
  ctx.fillStyle = 'rgba(5,2,12,0.84)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#ffd23d';
  ctx.font = `${ts}px Anton`;
  ctx.fillText(panel.place || '', bx + pad, by + ts * 1.02);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = `600 ${Math.round(ts * 0.54)}px system-ui, sans-serif`;
  ctx.fillText(line2, bx + pad, by + ts * 1.68);
}

function drawStrip(ctx, W, H, S, u) {
  const y0 = H * 0.908;
  ctx.fillStyle = '#12041f';
  ctx.fillRect(0, y0, W, H - y0);
  ctx.fillStyle = '#ffd23d';
  ctx.fillRect(0, y0, W, Math.max(2, H * 0.0035));

  ctx.fillStyle = '#fff6d8';
  const ts = fitFont(ctx, S.tagline, 'Anton', u * 0.031, W * 0.42);
  ctx.fillText(S.tagline, W * 0.03, y0 + (H - y0) / 2 + ts * 0.36);

  const bw = W * 0.072;
  const bh = (H - y0) * 0.72;
  barcode(ctx, W * 0.978 - bw, y0 + (H - y0 - bh) / 2, bw, bh, S.title + S.vol);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 ${Math.round(u * 0.0145)}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('PALM TIDE STUDIO · COVER ART EDITION', W * 0.895, y0 + (H - y0) / 2 + u * 0.005);
  ctx.textAlign = 'left';
}

function drawTopFurniture(ctx, W, H, S, u) {
  // Volume tag, top-left, tilted.
  ctx.save();
  ctx.translate(W * 0.028, H * 0.026);
  ctx.rotate((-4 * Math.PI) / 180);
  const vs = fitFont(ctx, S.vol, 'Anton', u * 0.03, W * 0.2);
  const vw = ctx.measureText(S.vol).width + vs * 0.9;
  const vh = vs * 1.5;
  ctx.fillStyle = '#07332f';
  ctx.fillRect(0, 0, vw, vh);
  ctx.lineWidth = Math.max(1.5, u * 0.0028);
  ctx.strokeStyle = '#ffd23d';
  ctx.strokeRect(0, 0, vw, vh);
  ctx.fillStyle = '#fff6d8';
  ctx.fillText(S.vol, vs * 0.45, vs * 1.12);
  ctx.restore();

  // WANTED pill with the star row, top-right.
  const starN = Math.max(0, Math.min(5, Math.round(S.stars)));
  const ps = u * 0.03;
  ctx.font = `${ps}px Anton`;
  const labelW = ctx.measureText('WANTED').width;
  const starR = u * 0.0155;
  const pillW = labelW + starN * starR * 2.5 + ps * 1.5;
  const pillH = ps * 1.52;
  const px = W * 0.978 - pillW;
  const py = H * 0.026;
  ctx.fillStyle = 'rgba(8,2,16,0.88)';
  ctx.beginPath();
  ctx.roundRect(px, py, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, u * 0.0028);
  ctx.strokeStyle = '#ffd23d';
  ctx.stroke();
  ctx.fillStyle = '#ffd23d';
  ctx.fillText('WANTED', px + ps * 0.55, py + ps * 1.08);
  for (let i = 0; i < starN; i++) {
    drawStar(ctx, px + ps * 0.55 + labelW + ps * 0.35 + starR + i * starR * 2.5, py + pillH / 2, starR, '#ffd23d');
  }

  // Quote block, centred along the top, clear of the vol tag and the pill.
  const qw = W * 0.385;
  const qx = W * 0.235;
  const qy = H * 0.016;
  const qh = H * 0.096;
  ctx.fillStyle = 'rgba(8,2,16,0.55)';
  ctx.beginPath();
  ctx.roundRect(qx, qy, qw, qh, u * 0.012);
  ctx.fill();
  ctx.fillStyle = '#ffd23d';
  ctx.font = `${Math.round(u * 0.034)}px Georgia, serif`;
  ctx.fillText('“', qx + u * 0.014, qy + u * 0.036);
  ctx.fillStyle = '#fdf6e3';
  const qs = u * 0.0245;
  ctx.font = `italic ${qs}px Georgia, serif`;
  const lines = wrapText(ctx, S.quote, qw - u * 0.055, 2);
  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    ctx.fillText(line, qx + qw / 2, qy + qh * 0.36 + i * qs * 1.25);
  });
  ctx.fillStyle = '#ffd23d';
  ctx.font = `700 ${Math.round(u * 0.0145)}px system-ui, sans-serif`;
  ctx.fillText(`— ${S.quoteSrc}`, qx + qw / 2, qy + qh * 0.88);
  ctx.textAlign = 'left';

  // Ribbon across the top-right corner.
  ctx.save();
  ctx.beginPath();
  ctx.rect(W - u * 0.24, 0, u * 0.24, u * 0.24);
  ctx.clip();
  ctx.translate(W - u * 0.088, u * 0.088);
  ctx.rotate(-Math.PI / 4);
  const rb = ctx.createLinearGradient(-u * 0.17, 0, u * 0.17, 0);
  rb.addColorStop(0, '#e01e63');
  rb.addColorStop(1, '#ff5e3a');
  ctx.fillStyle = rb;
  ctx.fillRect(-u * 0.17, -u * 0.03, u * 0.34, u * 0.06);
  ctx.fillStyle = '#ffffff';
  const rs = fitFont(ctx, S.ribbon, 'Anton', u * 0.023, u * 0.3);
  ctx.textAlign = 'center';
  ctx.fillText(S.ribbon, 0, rs * 0.36);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawTitle(ctx, W, H, S, u) {
  const stops = LETTERING[S.lettering] ?? LETTERING[0];
  ctx.save();
  ctx.translate(W * 0.036, H * 0.878);
  ctx.rotate((-5 * Math.PI) / 180);
  // Script subtitle above the title, neon pink with a glow.
  ctx.save();
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = u * 0.022;
  ctx.fillStyle = '#ff5ea8';
  const ss = fitFont(ctx, S.subtitle, 'Pacifico', u * 0.05, W * 0.55);
  ctx.fillText(S.subtitle, u * 0.03, -H * 0.112);
  ctx.restore();
  // Magenta drop shadow, then the dark keyline, then the gradient fill.
  const ts = fitFont(ctx, S.title, 'Anton', u * 0.128, W * 0.68);
  ctx.fillStyle = '#ff2e88';
  ctx.fillText(S.title, u * 0.013, u * 0.011);
  ctx.lineJoin = 'round';
  ctx.lineWidth = u * 0.011;
  ctx.strokeStyle = DARK;
  ctx.strokeText(S.title, 0, 0);
  const grad = ctx.createLinearGradient(0, -ts * 0.82, 0, ts * 0.18);
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.55, stops[1]);
  grad.addColorStop(1, stops[2]);
  ctx.fillStyle = grad;
  ctx.fillText(S.title, 0, 0);
  ctx.restore();
}

function drawBadge(ctx, W, H, S, u) {
  const cx = W * 0.878;
  const cy = H * 0.782;
  const r = u * 0.089;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((8 * Math.PI) / 180);
  const bg = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  bg.addColorStop(0, '#ffe97a');
  bg.addColorStop(1, '#ff9e2c');
  ctx.fillStyle = bg;
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.79;
    const a = (i * Math.PI) / spikes;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(2, u * 0.004);
  ctx.strokeStyle = DARK;
  ctx.stroke();
  ctx.fillStyle = '#2a0a2e';
  ctx.textAlign = 'center';
  const bs = fitFont(ctx, S.badge, 'Anton', u * 0.027, r * 1.45);
  const words = S.badge.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(next).width > r * 1.3 && line !== '') {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  lines.slice(0, 3).forEach((l, i) => {
    ctx.fillText(l, 0, (i - (Math.min(lines.length, 3) - 1) / 2) * bs * 1.12 + bs * 0.36);
  });
  ctx.textAlign = 'left';
  ctx.restore();
}
