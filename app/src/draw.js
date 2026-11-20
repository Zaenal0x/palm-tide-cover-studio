// draw.js — the cover composer. One draw routine renders the live preview,
// every PNG export and every ?shot= scene, so what you see is what ships.
// On the Mosaic the furniture overlays a full-bleed photo field; on the
// other layouts the panels compose over a dusk backdrop.

import { GRADES, gradeImage } from './grade.js';
import { panelRects } from './layouts.js';

const FULL_BLEED = new Set(['mosaic', 'one', 'two', 'three', 'four', 'comic', 'grid9']);

let noiseCanvas = null;
function getNoise() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 140; noiseCanvas.height = 140;
  const c = noiseCanvas.getContext('2d');
  const id = c.createImageData(140, 140);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 255;
  }
  c.putImageData(id, 0, 0);
  return noiseCanvas;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, -34, 16, -58); ctx.stroke();
  const tipX = 16, tipY = -58;
  const fronds = [[-34, -16], [-22, -26], [-4, -30], [14, -28], [30, -18], [36, -4]];
  ctx.lineWidth = 4;
  for (const [fx, fy] of fronds) {
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(tipX + fx * 0.5, tipY + fy - 8, tipX + fx, tipY + fy + 8);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(tipX - 4, tipY + 3, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(tipX + 5, tipY + 5, 3.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPanel(ctx, rect, panel, photos, s, H) {
  const g = GRADES[s.grade];
  ctx.save();
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  ctx.translate(cx, cy);
  ctx.rotate((rect.tilt * Math.PI) / 180);
  ctx.translate(-rect.w / 2, -rect.h / 2);
  const w = rect.w, h = rect.h;
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  const photo = panel && panel.photo != null ? photos[panel.photo] : null;
  if (photo && photo.img) {
    const graded = gradeImage(photo.img, s);
    const zoom = panel.zoom || 1;
    const scale = Math.max(w / graded.width, h / graded.height) * zoom;
    const dw = graded.width * scale, dh = graded.height * scale;
    const ox = (w - dw) / 2 + (panel.dx || 0) * w * 0.3;
    const oy = (h - dh) / 2 + (panel.dy || 0) * h * 0.3;
    ctx.drawImage(graded, ox, oy, dw, dh);
  } else {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#2a1650'); grad.addColorStop(1, '#12081f');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `600 ${Math.max(11, H * 0.016)}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', w / 2, h / 2);
  }
  ctx.restore();
  // outline + gutter edge
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rect.tilt * Math.PI) / 180);
  ctx.translate(-rect.w / 2, -rect.h / 2);
  ctx.lineWidth = Math.max(1.5, g.outline * (H / 1080));
  ctx.strokeStyle = 'rgba(8,4,16,0.9)';
  ctx.strokeRect(0, 0, rect.w, rect.h);
  ctx.restore();
  // location tag
  if (panel && panel.tag && panel.tag.place) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rect.tilt * Math.PI) / 180);
    ctx.translate(-rect.w / 2, -rect.h / 2);
    const fs = Math.max(10, H * 0.017);
    ctx.font = `${fs}px Anton, sans-serif`;
    const line1 = `${panel.tag.place} — ${panel.tag.time}`;
    const tw = ctx.measureText(line1).width;
    const pad = fs * 0.55, th = fs * 2.05;
    const tx = fs * 0.7, ty = rect.h - th - fs * 0.7;
    ctx.fillStyle = 'rgba(5,3,10,0.85)';
    ctx.fillRect(tx, ty, tw + pad * 2, th);
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(line1, tx + pad, ty + fs * 0.18);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `${fs * 0.72}px system-ui, sans-serif`;
    ctx.fillText(panel.tag.sub || '', tx + pad, ty + fs * 1.05);
    ctx.restore();
  }
}

function drawStarburst(ctx, cx, cy, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.78;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawCover(ctx, W, H, s, photos, selected = -1) {
  const u = H / 1080; // unit scale
  // backdrop (only visible on non-full-bleed layouts)
  const bg = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.1, W * 0.5, H * 0.55, H * 1.05);
  bg.addColorStop(0, '#3b1154'); bg.addColorStop(0.55, '#1c0b31'); bg.addColorStop(1, '#0a0514');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const rects = panelRects(s.layout, W, H);
  rects.forEach((rect, i) => drawPanel(ctx, rect, s.panels[i], photos, s, H));

  if (selected >= 0 && rects[selected]) {
    const r = rects[selected];
    ctx.save();
    ctx.lineWidth = Math.max(2, 3 * u);
    ctx.strokeStyle = '#22d3ee';
    ctx.setLineDash([10 * u, 7 * u]);
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
  }

  // lettering scrim: soft dark gradients behind title (top) and strip (bottom)
  const scrimT = ctx.createLinearGradient(0, 0, 0, H * 0.36);
  scrimT.addColorStop(0, 'rgba(5,2,12,0.62)'); scrimT.addColorStop(1, 'rgba(5,2,12,0)');
  ctx.fillStyle = scrimT; ctx.fillRect(0, 0, W, H * 0.36);

  // corner ribbon
  ctx.save();
  ctx.translate(0, 0);
  ctx.rotate(-Math.PI / 4);
  const ribW = H * 0.30, ribH = H * 0.042;
  ctx.fillStyle = '#c21847';
  ctx.fillRect(-ribW / 2, H * 0.055, ribW, ribH);
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.max(9, H * 0.016)}px Anton, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s.ribbon, 0, H * 0.055 + ribH / 2 + 1);
  ctx.restore();

  // WANTED pill, top right
  const pillW = W * 0.21, pillH = H * 0.052;
  const pillX = W - pillW - W * 0.025, pillY = H * 0.028;
  ctx.save();
  ctx.fillStyle = 'rgba(5,3,10,0.85)';
  rr(ctx, pillX, pillY, pillW, pillH, pillH / 2); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = Math.max(1.2, 1.6 * u); ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.font = `${pillH * 0.42}px Anton, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('WANTED', pillX + pillW * 0.07, pillY + pillH / 2 + 1);
  const starStr = '★'.repeat(Math.max(0, Math.min(8, s.stars)));
  let starFs = pillH * 0.5;
  ctx.font = `${starFs}px sans-serif`;
  const starAvail = pillW * 0.48;
  while (ctx.measureText(starStr).width > starAvail && starFs > 6) {
    starFs *= 0.9;
    ctx.font = `${starFs}px sans-serif`;
  }
  ctx.fillText(starStr, pillX + pillW * 0.47, pillY + pillH / 2 + 1);
  ctx.restore();

  // volume tag under the pill
  ctx.save();
  ctx.fillStyle = 'rgba(5,3,10,0.85)';
  const volFs = Math.max(9, H * 0.016);
  ctx.font = `${volFs}px Anton, sans-serif`;
  const vw = ctx.measureText(s.volume).width + volFs * 1.1;
  const vx = W - vw - W * 0.025, vy = pillY + pillH + H * 0.012;
  ctx.fillRect(vx, vy, vw, volFs * 1.7);
  ctx.fillStyle = '#ff5fc8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s.volume, vx + vw / 2, vy + volFs * 0.87);
  ctx.restore();

  // title block
  ctx.save();
  ctx.translate(W / 2, H * 0.155);
  ctx.rotate((-2 * Math.PI) / 180);
  let tSize = H * 0.135;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const setTitleFont = () => { ctx.font = `${tSize}px Anton, sans-serif`; };
  setTitleFont();
  while (ctx.measureText(s.title).width > W * 0.9 && tSize > 20) { tSize *= 0.94; setTitleFont(); }
  const tGrad = ctx.createLinearGradient(0, -tSize / 2, 0, tSize / 2);
  tGrad.addColorStop(0, '#fff6d8'); tGrad.addColorStop(0.45, '#ffd23f');
  tGrad.addColorStop(0.75, '#ff7b39'); tGrad.addColorStop(1, '#ff4e8a');
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#ff2ea6'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = tSize * 0.055; ctx.shadowOffsetY = tSize * 0.075;
  ctx.strokeStyle = '#160a24'; ctx.lineWidth = tSize * 0.16;
  ctx.strokeText(s.title, 0, 0);
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = tGrad;
  ctx.fillText(s.title, 0, 0);
  ctx.restore();

  // script subtitle with neon glow
  ctx.save();
  ctx.translate(W / 2, H * 0.155 + tSize * 0.78);
  ctx.rotate((-2 * Math.PI) / 180);
  let sSize = H * 0.052;
  ctx.font = `${sSize}px Pacifico, cursive`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  while (ctx.measureText(s.subtitle).width > W * 0.8 && sSize > 12) { sSize *= 0.94; ctx.font = `${sSize}px Pacifico, cursive`; }
  ctx.shadowColor = '#ff2ea6'; ctx.shadowBlur = 18 * u;
  ctx.fillStyle = '#ff8fd8';
  ctx.fillText(s.subtitle, 0, 0);
  ctx.shadowBlur = 6 * u;
  ctx.fillStyle = '#ffd7f2';
  ctx.fillText(s.subtitle, 0, 0);
  ctx.restore();

  // starburst badge, right side
  const bR = H * 0.075;
  const bx = W - bR - W * 0.035, by = H * 0.47;
  ctx.save();
  const bGrad = ctx.createRadialGradient(bx, by, bR * 0.2, bx, by, bR);
  bGrad.addColorStop(0, '#ffe98a'); bGrad.addColorStop(1, '#ff9a3c');
  drawStarburst(ctx, bx, by, bR, 16);
  ctx.fillStyle = bGrad; ctx.fill();
  ctx.lineWidth = Math.max(1.2, 2 * u); ctx.strokeStyle = '#160a24'; ctx.stroke();
  ctx.fillStyle = '#160a24';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const words = s.badge.split(' ');
  const mid = Math.ceil(words.length / 2);
  const l1 = words.slice(0, mid).join(' '), l2 = words.slice(mid).join(' ');
  ctx.font = `${bR * 0.34}px Anton, sans-serif`;
  if (l2) {
    ctx.fillText(l1, bx, by - bR * 0.19);
    ctx.fillText(l2, bx, by + bR * 0.19);
  } else {
    ctx.fillText(l1, bx, by);
  }
  ctx.restore();

  // quote block, bottom left above the strip
  ctx.save();
  const qx = W * 0.03, qy = H * 0.845;
  ctx.fillStyle = '#ffd23f';
  ctx.font = `${H * 0.05}px Pacifico, cursive`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('“', qx, qy);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = `italic 600 ${Math.max(11, H * 0.021)}px Georgia, serif`;
  ctx.fillText(s.quote, qx + H * 0.035, qy - H * 0.008);
  ctx.fillStyle = 'rgba(255,210,63,0.9)';
  ctx.font = `${Math.max(8, H * 0.012)}px Anton, sans-serif`;
  ctx.fillText(s.quoteSource, qx + H * 0.035, qy + H * 0.02);
  ctx.restore();

  // bottom strip: tagline, palms, credits, barcode
  const stripH = H * 0.072, stripY = H - stripH;
  ctx.save();
  ctx.fillStyle = 'rgba(4,2,9,0.94)';
  ctx.fillRect(0, stripY, W, stripH);
  ctx.fillStyle = '#ffd23f';
  ctx.font = `${stripH * 0.34}px Anton, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(s.tagline.split('').join('  '), W * 0.025, stripY + stripH / 2 + 1);
  drawPalm(ctx, W * 0.47, stripY + stripH * 0.98, stripH / 62, '#000');
  drawPalm(ctx, W * 0.52, stripY + stripH * 0.98, stripH / 78, '#000');
  drawPalm(ctx, W * 0.565, stripY + stripH * 0.98, stripH / 70, '#000');
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `${stripH * 0.19}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('PALM TIDE COVER STUDIO', W * 0.845, stripY + stripH * 0.34);
  ctx.fillText('PRINTED IN VICE CITY • NO. 06', W * 0.845, stripY + stripH * 0.66);
  // barcode
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let bx2 = W * 0.865;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const bTop = stripY + stripH * 0.18, bH = stripH * 0.64;
  while (bx2 < W * 0.975) {
    const bw = (1 + Math.floor(rnd() * 3)) * u * 1.6;
    if (rnd() > 0.42) ctx.fillRect(bx2, bTop, bw, bH);
    bx2 += bw + 1.4 * u;
  }
  ctx.restore();

  // grain + vignette
  if (s.grain > 0.01) {
    ctx.save();
    ctx.globalAlpha = s.grain * 0.55;
    ctx.globalCompositeOperation = 'overlay';
    const pat = ctx.createPattern(getNoise(), 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (s.vignette > 0.01) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${(s.vignette * 0.75).toFixed(3)})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
}
