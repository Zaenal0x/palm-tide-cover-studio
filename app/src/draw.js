// draw.js — the one composer used for the live preview, the PNG exports and
// the ?shot= scenes: graded photo panels edge to edge, the chrome-neon title
// lockup, and the full set of poster furniture overlaid on the photo field.

import { GRADES, gradedCanvas } from './grade.js';
import { LAYOUTS } from './layouts.js';

export function rectsPx(W, H, layoutKey) {
  const layout = LAYOUTS[layoutKey] || LAYOUTS.mosaic;
  const g = layout.gutter * (H / 1080);
  return layout.panels.map((p) => ({
    x: p.x * W + g / 2, y: p.y * H + g / 2,
    w: p.w * W - g, h: p.h * H - g, hero: !!p.hero, tilt: p.tilt || 0,
  }));
}

function fitSize(ctx, text, family, maxW, start) {
  let s = start;
  ctx.font = `${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > 8) {
    s *= 0.94;
    ctx.font = `${s}px ${family}`;
  }
  return s;
}

function starburst(ctx, cx, cy, rO, rI, points, rot) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rO : rI;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawPalm(ctx, x, baseY, s, color) {
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + s * 0.05, baseY - s * 0.6, x + s * 0.22, baseY - s);
  ctx.stroke();
  const tx = x + s * 0.22, ty = baseY - s;
  ctx.lineWidth = s * 0.05;
  for (const a of [-2.9, -2.4, -1.9, -1.35, -0.8, -0.25]) {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * s * 0.34, ty + Math.sin(a) * s * 0.34 - s * 0.10,
      tx + Math.cos(a) * s * 0.52, ty + Math.sin(a) * s * 0.52 + s * 0.16,
    );
    ctx.stroke();
  }
}

let noiseCanvas = null;
function grainTile() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = noiseCanvas.height = 256;
  const nx = noiseCanvas.getContext('2d');
  const id = nx.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  nx.putImageData(id, 0, 0);
  return noiseCanvas;
}

function drawTitle(ctx, cx, cy, maxW, H, cap) {
  const size = fitSize(ctx, cap.title, 'Anton', maxW, H * 0.20);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // magenta offset shadow pass
  ctx.font = `${size}px Anton`;
  ctx.fillStyle = '#ff2e88';
  ctx.fillText(cap.title, cx + size * 0.045, cy + size * 0.055);
  // gradient face with neon glow and a thick dark outline
  const grad = ctx.createLinearGradient(0, cy - size * 0.55, 0, cy + size * 0.55);
  grad.addColorStop(0, '#fff6d8');
  grad.addColorStop(0.38, '#ffe066');
  grad.addColorStop(0.68, '#ff9e3d');
  grad.addColorStop(1, '#ff5e8a');
  ctx.shadowColor = 'rgba(255,46,136,0.85)';
  ctx.shadowBlur = size * 0.30;
  ctx.fillStyle = grad;
  ctx.fillText(cap.title, cx, cy);
  ctx.shadowBlur = 0;
  ctx.lineWidth = size * 0.075;
  ctx.strokeStyle = '#1c0b2e';
  ctx.strokeText(cap.title, cx, cy);
  ctx.fillStyle = grad;
  ctx.fillText(cap.title, cx, cy);
  // glowing neon script subtitle tucked under the title
  const sub = fitSize(ctx, cap.subtitle, 'Pacifico', maxW * 0.8, size * 0.36);
  ctx.font = `${sub}px Pacifico`;
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = sub * 0.55;
  ctx.fillStyle = '#ff77b3';
  ctx.fillText(cap.subtitle, cx, cy + size * 0.62 + sub * 0.45);
  ctx.restore();
  return size;
}

function drawTag(ctx, r, tag, H) {
  if (r.w < 90 || r.h < 64) return;
  const fs = Math.max(10, H * 0.021);
  ctx.save();
  ctx.font = `${fs}px Anton`;
  const w1 = ctx.measureText(tag.place).width;
  ctx.font = `${fs * 0.72}px 'Segoe UI', sans-serif`;
  const w2 = ctx.measureText(`${tag.time} · ${tag.sub}`).width;
  const bw = Math.max(w1, w2) + fs * 0.9;
  const bh = fs * 2.15;
  const bx = r.x + 7, by = r.y + r.h - bh - 7;
  ctx.fillStyle = 'rgba(5,2,12,0.84)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#ffd23d';
  ctx.fillRect(bx, by, 3, bh);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${fs}px Anton`;
  ctx.fillStyle = '#fff3d6';
  ctx.fillText(tag.place, bx + fs * 0.45, by + fs * 1.05);
  ctx.font = `${fs * 0.72}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#ffb3cd';
  ctx.fillText(`${tag.time} · ${tag.sub}`, bx + fs * 0.45, by + fs * 1.82);
  ctx.restore();
}

export function drawCover(ctx, W, H, state, opts = {}) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.mosaic;
  const grade = GRADES[state.grade] || GRADES.vice;
  const s = state.settings;
  const cap = state.captions;
  const rects = rectsPx(W, H, state.layout);
  const u = H / 1080; // scale unit

  ctx.fillStyle = '#0a0518';
  ctx.fillRect(0, 0, W, H);

  // --- photo panels, fully filled, edge to edge ---
  rects.forEach((r, i) => {
    const panel = state.panels[i];
    if (!panel) return;
    const photo = state.photos.length ? state.photos[panel.photo % state.photos.length] : null;
    ctx.save();
    if (r.tilt) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(r.tilt);
      ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    }
    if (photo && photo.img) {
      const graded = gradedCanvas(photo.img, panel.crop, r.w, r.h, {
        grade: state.grade, strength: s.strength, contrast: s.contrast,
        saturation: s.saturation, halftone: s.halftone, dots: s.dots,
      });
      ctx.drawImage(graded, r.x, r.y);
    } else {
      const pg = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      pg.addColorStop(0, '#2a1152'); pg.addColorStop(1, '#12082a');
      ctx.fillStyle = pg;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `${Math.round(H * 0.03)}px Anton`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD PHOTO', r.x + r.w / 2, r.y + r.h / 2);
    }
    ctx.lineWidth = Math.max(1.5, grade.outline * u);
    ctx.strokeStyle = 'rgba(8,3,18,0.85)';
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
    drawTag(ctx, r, panel.tag, H);
  });

  // --- scrims: a soft band behind the title, top or centre ---
  if (layout.titlePos === 'center') {
    const band = ctx.createLinearGradient(0, H * 0.26, 0, H * 0.74);
    band.addColorStop(0, 'rgba(8,3,20,0)');
    band.addColorStop(0.5, 'rgba(8,3,20,0.52)');
    band.addColorStop(1, 'rgba(8,3,20,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, H * 0.26, W, H * 0.48);
  } else {
    const top = ctx.createLinearGradient(0, 0, 0, H * 0.34);
    top.addColorStop(0, 'rgba(8,3,20,0.55)');
    top.addColorStop(1, 'rgba(8,3,20,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, H * 0.34);
  }
  const bot = ctx.createLinearGradient(0, H * 0.78, 0, H);
  bot.addColorStop(0, 'rgba(8,3,20,0)');
  bot.addColorStop(1, 'rgba(8,3,20,0.5)');
  ctx.fillStyle = bot;
  ctx.fillRect(0, H * 0.78, W, H * 0.22);

  // --- WANTED pill (top-left; on top-titled layouts it drops below the title band) ---
  const pillH = H * 0.052, pillY = layout.titlePos === 'center' ? H * 0.028 : H * 0.252;
  ctx.save();
  ctx.font = `${pillH * 0.52}px Anton`;
  const stars = '★'.repeat(Math.max(0, Math.min(5, cap.stars)));
  const pillW = ctx.measureText('WANTED ').width + ctx.measureText(stars).width + pillH * 1.1;
  ctx.fillStyle = 'rgba(5,2,12,0.82)';
  ctx.beginPath();
  ctx.roundRect(H * 0.028, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd23d';
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff3d6';
  ctx.fillText('WANTED ', H * 0.028 + pillH * 0.55, pillY + pillH * 0.54);
  ctx.fillStyle = '#ffd23d';
  ctx.fillText(stars, H * 0.028 + pillH * 0.55 + ctx.measureText('WANTED ').width, pillY + pillH * 0.54);
  ctx.restore();

  // --- ribbon across the top-right corner ---
  ctx.save();
  ctx.translate(W - H * 0.045, H * 0.045);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#d90452';
  const ribW = H * 0.30, ribH = H * 0.034;
  ctx.fillRect(-ribW / 2, -ribH / 2, ribW, ribH);
  ctx.font = `${ribH * 0.5}px Anton`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9f2';
  ctx.fillText(cap.ribbon, 0, 1);
  ctx.restore();

  // --- starburst badge, right edge ---
  const bx = W - H * 0.105, by = H * 0.235, br = H * 0.082;
  ctx.save();
  const bg = ctx.createLinearGradient(bx - br, by - br, bx + br, by + br);
  bg.addColorStop(0, '#ffb03a'); bg.addColorStop(1, '#ff2e88');
  starburst(ctx, bx, by, br, br * 0.78, 12, 0.4);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1c0b2e';
  ctx.stroke();
  ctx.translate(bx, by);
  ctx.rotate(-0.21);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1c0b2e';
  const bLines = cap.badge.split(' ');
  ctx.font = `${br * 0.34}px Anton`;
  if (bLines.length > 1) {
    ctx.fillText(bLines.slice(0, Math.ceil(bLines.length / 2)).join(' '), 0, -br * 0.16);
    ctx.fillText(bLines.slice(Math.ceil(bLines.length / 2)).join(' '), 0, br * 0.24);
  } else {
    ctx.fillText(cap.badge, 0, br * 0.1);
  }
  ctx.restore();

  // --- volume tag, right side above the strip ---
  ctx.save();
  ctx.font = `${H * 0.026}px Anton`;
  const volW = ctx.measureText(cap.vol).width + H * 0.03;
  const volY = H * 0.845;
  ctx.fillStyle = 'rgba(5,2,12,0.85)';
  ctx.fillRect(W - volW - H * 0.024, volY, volW, H * 0.042);
  ctx.fillStyle = '#ffd23d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cap.vol, W - volW / 2 - H * 0.024, volY + H * 0.022);
  ctx.restore();

  // --- quote block, bottom-left above the strip ---
  ctx.save();
  const qx = H * 0.03, qy = H * 0.80;
  ctx.fillStyle = '#ffd23d';
  ctx.fillRect(qx, qy, 4, H * 0.085);
  ctx.textAlign = 'left';
  ctx.font = `italic ${H * 0.027}px Georgia, serif`;
  ctx.fillStyle = '#fff6e3';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText(cap.quote, qx + H * 0.018, qy + H * 0.032);
  ctx.font = `${H * 0.019}px Anton`;
  ctx.fillStyle = '#ffb3cd';
  ctx.fillText(cap.quoteBy, qx + H * 0.018, qy + H * 0.068);
  ctx.restore();

  // --- the title lockup: central on Mosaic, top on the rest ---
  if (layout.titlePos === 'center') {
    drawTitle(ctx, W / 2, H * 0.455, W * 0.94, H, cap);
  } else {
    drawTitle(ctx, W / 2, H * 0.115, W * 0.9, H, cap);
  }

  // --- bottom strip: sunset band, palms, tagline, credits, barcode ---
  const stripH = H * 0.075, stripY = H - stripH;
  const sg = ctx.createLinearGradient(0, stripY, 0, H);
  sg.addColorStop(0, '#2a0a44');
  sg.addColorStop(0.55, '#7a1042');
  sg.addColorStop(1, '#e85d3d');
  ctx.fillStyle = sg;
  ctx.fillRect(0, stripY, W, stripH);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, stripY, W, 2);
  drawPalm(ctx, W * 0.055, H - 4, stripH * 0.92, '#0a0518');
  drawPalm(ctx, W * 0.115, H - 4, stripH * 0.7, '#0a0518');
  drawPalm(ctx, W * 0.80, H - 4, stripH * 0.8, '#0a0518');
  ctx.save();
  ctx.font = `${stripH * 0.4}px Anton`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9c9';
  ctx.fillText(cap.tagline, W / 2, stripY + stripH * 0.36);
  ctx.font = `${fitSize(ctx, 'PALM TIDE PICTURES · A COVER STUDIO PRODUCTION · ALL STUNTS PERFORMED BY AMATEURS', "'Segoe UI', sans-serif", W * 0.62, stripH * 0.19)}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = 'rgba(255,233,201,0.75)';
  ctx.fillText('PALM TIDE PICTURES · A COVER STUDIO PRODUCTION · ALL STUNTS PERFORMED BY AMATEURS', W / 2, stripY + stripH * 0.74);
  ctx.restore();
  // barcode, bottom-right
  ctx.save();
  const bcW = W * 0.052, bcH = stripH * 0.62, bcX = W - bcW - H * 0.02, bcY = stripY + stripH * 0.19;
  ctx.fillStyle = '#f7f2e7';
  ctx.fillRect(bcX - 4, bcY - 3, bcW + 8, bcH + 6);
  ctx.fillStyle = '#14100c';
  let seed = 7;
  for (const ch of 'PALMTIDE') seed = (seed * 31 + ch.charCodeAt(0)) % 997;
  let bxr = bcX;
  while (bxr < bcX + bcW - 2) {
    seed = (seed * 37 + 11) % 997;
    const bw = 1 + (seed % 4) * (bcW / 46);
    if (seed % 3 !== 0) ctx.fillRect(bxr, bcY, bw, bcH);
    bxr += bw + bcW / 46;
  }
  ctx.restore();

  // --- grain + vignette over everything ---
  if (s.grain > 0) {
    ctx.save();
    ctx.globalAlpha = s.grain * 0.5;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (s.vignette > 0) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.36, W / 2, H / 2, Math.max(W, H) * 0.74);
    vg.addColorStop(0, 'rgba(5,2,12,0)');
    vg.addColorStop(1, `rgba(5,2,12,${s.vignette * 0.62})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // --- editor selection outline ---
  if (opts.selected != null && opts.selected >= 0 && rects[opts.selected]) {
    const r = rects[opts.selected];
    ctx.save();
    ctx.strokeStyle = '#ff5da2';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
    ctx.restore();
  }
}
