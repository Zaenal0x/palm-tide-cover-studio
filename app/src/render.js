// render.js — draws a complete PALM TIDE cover onto any 2D context.
//
// One draw routine serves the live preview, the PNG exports and the
// screenshot scenes, so what the editor shows is exactly what exports.
// Order: backdrop, graded panels with outlines and location tags,
// grain and vignette, then the poster furniture — gradient title with
// a hard magenta shadow, neon script subtitle, WANTED star pill, quote
// block, starburst badge, corner ribbon, volume tag and the bottom
// strip with tagline, palm silhouettes, credits and a barcode.

import { gradeById, gradePhoto } from './grade.js';
import { panelsFor } from './layouts.js';

// Lettering presets per cover variant: title gradient stops, script
// subtitle colour and the hard shadow colour behind the title.
export const LETTERING = {
  sunset: { titleStops: ['#fff3d6', '#ffb35c', '#ff7847', '#ff4d6d'], script: '#ff5da2', shadow: '#d61c69' },
  neon: { titleStops: ['#d8fbff', '#4de8ff', '#7a5cff', '#ff4dd2'], script: '#4de8ff', shadow: '#122a8c' },
  comic: { titleStops: ['#fff8dc', '#ffd23e', '#ff8a2a', '#e63b2e'], script: '#ffe9a8', shadow: '#7a1060' },
};

let noiseCanvas = null;
function getNoise() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 256;
  noiseCanvas.height = 256;
  const nctx = noiseCanvas.getContext('2d');
  const data = nctx.createImageData(256, 256);
  let seed = 1234567;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = 96 + (seed % 128);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  return noiseCanvas;
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawStar(ctx, cx, cy, r, color) {
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
  ctx.fillStyle = color;
  ctx.fill();
}

function drawStarburst(ctx, cx, cy, r, fill, outline) {
  ctx.beginPath();
  const points = 16;
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.78;
    const a = (i * Math.PI) / points;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = r * 0.05;
  ctx.strokeStyle = outline;
  ctx.stroke();
}

// A simple palm silhouette: curved trunk and five fronds.
function drawPalm(ctx, x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.55, x + s * 0.3, y - s * 0.95);
  ctx.stroke();
  const tx = x + s * 0.3;
  const ty = y - s * 0.95;
  ctx.lineWidth = s * 0.055;
  for (const a of [-2.9, -2.35, -1.85, -1.3, -0.75]) {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * s * 0.42, ty + Math.sin(a) * s * 0.42 - s * 0.1,
      tx + Math.cos(a) * s * 0.72, ty + Math.sin(a) * s * 0.62 + s * 0.22,
    );
    ctx.stroke();
  }
}

const BAR_WIDTHS = [3, 1, 2, 1, 1, 3, 2, 2, 1, 1, 3, 1, 2, 1, 4, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 4, 1, 2];
function drawBarcode(ctx, x, y, w, h) {
  ctx.fillStyle = '#f7f2e6';
  rr(ctx, x, y, w, h, h * 0.12);
  ctx.fill();
  const total = BAR_WIDTHS.reduce((a, b) => a + b, 0);
  const unit = (w * 0.84) / total;
  let bx = x + w * 0.08;
  ctx.fillStyle = '#14100c';
  BAR_WIDTHS.forEach((bw, i) => {
    if (i % 2 === 0) ctx.fillRect(bx, y + h * 0.14, unit * bw, h * 0.58);
    bx += unit * bw;
  });
  ctx.font = `700 ${Math.round(h * 0.2)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('2 026110 6', x + w / 2, y + h * 0.92);
  ctx.textAlign = 'left';
}

function fitSize(ctx, text, font, weight, maxWidth, startSize, minSize) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${font}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `${weight} ${size}px ${font}`;
  return size;
}

export function createRenderer() {
  const cache = new Map();

  function gradedPanel(S, photo, panel) {
    const grade = gradeById(S.grade);
    const cap = 880;
    const s = Math.min(1, cap / Math.max(panel.w, panel.h));
    const w = Math.max(2, Math.round(panel.w * s));
    const h = Math.max(2, Math.round(panel.h * s));
    const crop = S.panelCropFor(panel.index);
    const key = [
      photo.id, S.grade, S.strength.toFixed(2), S.contrast.toFixed(2), S.saturation.toFixed(2),
      S.halftone ? 'h1' : 'h0', S.halftoneAmt.toFixed(2), w, h,
      crop.dx.toFixed(2), crop.dy.toFixed(2), crop.zoom.toFixed(2),
    ].join('|');
    if (cache.has(key)) return cache.get(key);
    const canvas = gradePhoto(photo.img, w, h, crop, {
      grade,
      strength: S.strength,
      contrast: S.contrast,
      saturation: S.saturation,
      halftone: S.halftone,
      halftoneAmt: S.halftoneAmt,
    });
    if (cache.size > 48) cache.delete(cache.keys().next().value);
    cache.set(key, canvas);
    return canvas;
  }

  function drawPanel(ctx, S, panel, u) {
    const grade = gradeById(S.grade);
    const photo = S.photoForPanel(panel.index);
    ctx.save();
    ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.rotate(panel.rot || 0);
    const hw = panel.w / 2;
    const hh = panel.h / 2;
    ctx.beginPath();
    ctx.rect(-hw, -hh, panel.w, panel.h);
    ctx.clip();
    if (photo) {
      const graded = gradedPanel(S, photo, panel);
      ctx.drawImage(graded, -hw, -hh, panel.w, panel.h);
    } else {
      const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
      grad.addColorStop(0, grade.backdrop[1]);
      grad.addColorStop(1, grade.backdrop[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(-hw, -hh, panel.w, panel.h);
      ctx.fillStyle = 'rgba(255,243,214,0.75)';
      ctx.textAlign = 'center';
      ctx.font = `${Math.round(panel.h * 0.3)}px Anton, sans-serif`;
      ctx.fillText(String(panel.index + 1), 0, panel.h * 0.12);
      ctx.font = `700 ${Math.max(11, Math.round(panel.h * 0.045))}px sans-serif`;
      ctx.fillText('ADD A PHOTO', 0, panel.h * 0.24);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    // Outline + location tag ride the panel's rotation.
    ctx.save();
    ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
    ctx.rotate(panel.rot || 0);
    ctx.lineWidth = Math.max(2, grade.outlineWidth * u);
    ctx.strokeStyle = grade.ink;
    ctx.strokeRect(-hw, -hh, panel.w, panel.h);
    const tag = S.panelTags[panel.index];
    if (tag && tag.place) {
      const placeSize = Math.max(11, Math.round(20 * u));
      const subSize = Math.max(9, Math.round(13.5 * u));
      ctx.font = `${placeSize}px Anton, sans-serif`;
      const wPlace = ctx.measureText(tag.place.toUpperCase()).width;
      ctx.font = `700 ${subSize}px sans-serif`;
      const subText = `${tag.time} · ${tag.sub}`;
      const wSub = ctx.measureText(subText).width;
      const tagW = Math.max(wPlace, wSub) + 20 * u;
      const tagH = placeSize + subSize + 16 * u;
      const tx = -hw + 10 * u;
      const ty = hh - tagH - 10 * u;
      ctx.fillStyle = 'rgba(5,2,10,0.85)';
      ctx.fillRect(tx, ty, tagW, tagH);
      ctx.fillStyle = '#ffb35c';
      ctx.font = `${placeSize}px Anton, sans-serif`;
      ctx.fillText(tag.place.toUpperCase(), tx + 10 * u, ty + placeSize + 3 * u);
      ctx.fillStyle = 'rgba(255,243,214,0.92)';
      ctx.font = `700 ${subSize}px sans-serif`;
      ctx.fillText(subText, tx + 10 * u, ty + placeSize + subSize + 9 * u);
    }
    ctx.restore();

    if (S.showSelection && S.selected === panel.index) {
      ctx.save();
      ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
      ctx.rotate(panel.rot || 0);
      ctx.strokeStyle = '#4de8ff';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(-hw - 5, -hh - 5, panel.w + 10, panel.h + 10);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  function draw(ctx, W, H, S) {
    const grade = gradeById(S.grade);
    const lettering = LETTERING[S.variant] || LETTERING.sunset;
    const u = H / 1080;

    // Backdrop: grade-tinted vertical gradient, a warm horizon band
    // and a soft sun glow behind the panels.
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, grade.backdrop[0]);
    bg.addColorStop(0.55, grade.backdrop[1]);
    bg.addColorStop(1, grade.backdrop[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,170,80,0.16)';
    ctx.fillRect(0, H * 0.58, W, H * 0.1);
    const glow = ctx.createRadialGradient(W * 0.3, H * 0.34, 10, W * 0.3, H * 0.34, Math.max(W, H) * 0.55);
    glow.addColorStop(0, 'rgba(255,150,70,0.35)');
    glow.addColorStop(1, 'rgba(255,150,70,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Panels.
    const panels = panelsFor(S.layout, W, H);
    panels.forEach((p, i) => drawPanel(ctx, S, { ...p, index: i }, u));

    // Grain, then vignette.
    if (S.grain > 0.01) {
      ctx.save();
      ctx.globalAlpha = S.grain * 0.45;
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = ctx.createPattern(getNoise(), 'repeat');
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (S.vignette > 0.01) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.max(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
      vg.addColorStop(0, 'rgba(8,0,14,0)');
      vg.addColorStop(1, `rgba(8,0,14,${(S.vignette * 0.6).toFixed(3)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    drawFurniture(ctx, W, H, S, lettering, u);
  }

  function drawFurniture(ctx, W, H, S, L, u) {
    const stripH = Math.round(H * 0.075);
    ctx.textBaseline = 'alphabetic';

    // Volume tag, top-left.
    if (S.volume) {
      ctx.save();
      ctx.font = `${Math.round(24 * u)}px Anton, sans-serif`;
      const tw = ctx.measureText(S.volume.toUpperCase()).width + 26 * u;
      // Keep the whole tag on the canvas even on narrow portrait covers.
      ctx.translate(Math.max(W * 0.028, tw / 2 + 10 * u), H * 0.045);
      ctx.rotate(-0.1);
      ctx.fillStyle = '#0e3a46';
      rr(ctx, -tw / 2, -22 * u, tw, 40 * u, 6 * u);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.textAlign = 'center';
      ctx.fillText(S.volume.toUpperCase(), 0, 8 * u);
      ctx.restore();
      ctx.textAlign = 'left';
    }

    // Corner ribbon, top-right, diagonal.
    if (S.ribbon) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(W - H * 0.19, 0, H * 0.19, H * 0.19);
      ctx.clip();
      ctx.translate(W - H * 0.052, H * 0.052);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#e63b6e';
      const rw = H * 0.3;
      const rh = 34 * u;
      ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
      ctx.fillStyle = '#fff3d6';
      ctx.font = `${Math.round(19 * u)}px Anton, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(S.ribbon.toUpperCase(), 0, 7 * u);
      ctx.restore();
      ctx.textAlign = 'left';
    }

    // WANTED pill with the star count, top-right under the ribbon.
    {
      const starN = Math.max(0, Math.min(8, S.stars | 0));
      ctx.font = `${Math.round(25 * u)}px Anton, sans-serif`;
      const wordW = ctx.measureText((S.hud || 'WANTED').toUpperCase()).width;
      const starsW = starN * 30 * u;
      const pw = wordW + starsW + 44 * u;
      const ph = 46 * u;
      const px = W - pw - W * 0.026;
      const py = H * 0.105;
      ctx.fillStyle = 'rgba(8,3,14,0.92)';
      rr(ctx, px, py, pw, ph, ph / 2);
      ctx.fill();
      ctx.lineWidth = 2.5 * u;
      ctx.strokeStyle = '#ffd23e';
      ctx.stroke();
      ctx.fillStyle = '#ffd23e';
      ctx.fillText((S.hud || 'WANTED').toUpperCase(), px + 20 * u, py + ph * 0.68);
      for (let i = 0; i < starN; i++) {
        drawStar(ctx, px + 34 * u + wordW + i * 30 * u, py + ph / 2, 11.5 * u, '#ffd23e');
      }
    }

    // Quote block with its star row, upper-left.
    if (S.quote) {
      const qx = W * 0.03;
      const qy = H * 0.115;
      const qw = W * 0.335;
      ctx.font = `italic 600 ${Math.round(25 * u)}px Georgia, serif`;
      const words = S.quote.split(/\s+/);
      const lines = [];
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > qw && line) {
          lines.push(line);
          line = word;
        } else line = test;
      }
      if (line) lines.push(line);
      const qh = lines.length * 31 * u + 78 * u;
      ctx.fillStyle = 'rgba(8,3,14,0.55)';
      rr(ctx, qx - 12 * u, qy - 30 * u, qw + 24 * u, qh, 10 * u);
      ctx.fill();
      ctx.fillStyle = '#ffb35c';
      ctx.font = `${Math.round(44 * u)}px Georgia, serif`;
      ctx.fillText('“', qx, qy + 8 * u);
      ctx.fillStyle = '#fff3d6';
      ctx.font = `italic 600 ${Math.round(25 * u)}px Georgia, serif`;
      lines.forEach((ln, i) => ctx.fillText(ln, qx, qy + 34 * u + i * 31 * u));
      if (S.quoteSource) {
        ctx.fillStyle = 'rgba(255,211,62,0.95)';
        ctx.font = `700 ${Math.round(15 * u)}px sans-serif`;
        ctx.fillText(`— ${S.quoteSource.toUpperCase()}`, qx, qy + 34 * u + lines.length * 31 * u + 4 * u);
      }
      const starN = Math.max(0, Math.min(8, S.stars | 0));
      for (let i = 0; i < starN; i++) {
        drawStar(ctx, qx + 12 * u + i * 27 * u, qy + qh - 16 * u, 10 * u, '#ffd23e');
      }
    }

    // Starburst badge, lower-right above the strip.
    if (S.badge) {
      const br = Math.min(W, H) * 0.088;
      const bx = W - br - W * 0.035;
      const by = H - stripH - br - H * 0.035;
      drawStarburst(ctx, bx, by, br, '#ffd23e', '#1c0726');
      ctx.fillStyle = '#2a0a2e';
      ctx.textAlign = 'center';
      const parts = S.badge.toUpperCase().split(/\s+/);
      const mid = Math.ceil(parts.length / 2);
      const lineA = parts.slice(0, mid).join(' ');
      const lineB = parts.slice(mid).join(' ');
      const bs = fitSize(ctx, lineA, 'Anton, sans-serif', '', br * 1.15, Math.round(br * 0.34), 9);
      ctx.fillText(lineA, bx, by + (lineB ? -2 * u : bs * 0.35));
      if (lineB) {
        fitSize(ctx, lineB, 'Anton, sans-serif', '', br * 1.15, Math.round(br * 0.34), 9);
        ctx.fillText(lineB, bx, by + bs * 0.92);
      }
      ctx.textAlign = 'left';
    }

    // Title block: script subtitle over a gradient block title,
    // the whole block tilted -5 degrees, lower-left.
    {
      const baseY = H - stripH - H * 0.028;
      const tx = W * 0.032;
      ctx.save();
      ctx.translate(tx, baseY);
      ctx.rotate(-0.087);
      const title = (S.title || 'PALM TIDE').toUpperCase();
      const titleSize = fitSize(ctx, title, 'Anton, sans-serif', '', W * 0.66, Math.round(H * 0.135), 20);
      if (S.subtitle) {
        ctx.font = `${Math.round(titleSize * 0.42)}px Pacifico, cursive`;
        ctx.shadowColor = L.script;
        ctx.shadowBlur = 22 * u;
        ctx.fillStyle = L.script;
        ctx.fillText(S.subtitle, 6 * u, -titleSize * 1.04);
        ctx.shadowBlur = 0;
      }
      ctx.font = `${titleSize}px Anton, sans-serif`;
      const grad = ctx.createLinearGradient(0, -titleSize, 0, 0);
      L.titleStops.forEach((c, i) => grad.addColorStop(i / (L.titleStops.length - 1), c));
      ctx.shadowColor = L.shadow;
      ctx.shadowOffsetX = titleSize * 0.045;
      ctx.shadowOffsetY = titleSize * 0.07;
      ctx.lineJoin = 'round';
      ctx.lineWidth = titleSize * 0.16;
      ctx.strokeStyle = '#1c0726';
      ctx.strokeText(title, 0, 0);
      ctx.fillStyle = grad;
      ctx.fillText(title, 0, 0);
      ctx.restore();
    }

    // Credits line, right-aligned above the strip.
    ctx.fillStyle = 'rgba(255,243,214,0.55)';
    ctx.font = `600 ${Math.round(13 * u)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('PALM TIDE STUDIO · COVER ART EDITION · PRINTED ON THE COAST', W - W * 0.028, H - stripH - 10 * u);
    ctx.textAlign = 'left';

    // Bottom strip: sunset band, palms, tagline, barcode.
    const sy = H - stripH;
    const sg = ctx.createLinearGradient(0, sy, 0, H);
    sg.addColorStop(0, '#3a0f3f');
    sg.addColorStop(0.55, '#7a1c50');
    sg.addColorStop(1, '#c94f36');
    ctx.fillStyle = sg;
    ctx.fillRect(0, sy, W, stripH);
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(0, sy, W, Math.max(2, 3 * u));
    drawPalm(ctx, W * 0.47, H - 4 * u, stripH * 0.92, '#160818');
    drawPalm(ctx, W * 0.52, H - 4 * u, stripH * 0.7, '#160818');
    drawPalm(ctx, W * 0.575, H - 4 * u, stripH * 0.84, '#160818');
    if (S.tagline) {
      ctx.fillStyle = '#fff3d6';
      const ts = fitSize(ctx, S.tagline.toUpperCase(), 'Anton, sans-serif', '', W * 0.4, Math.round(stripH * 0.42), 10);
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowOffsetY = 2;
      ctx.fillText(S.tagline.toUpperCase(), W * 0.028, sy + stripH * 0.66);
      ctx.shadowOffsetY = 0;
      void ts;
    }
    drawBarcode(ctx, W - W * 0.028 - W * 0.062, sy + stripH * 0.16, W * 0.062, stripH * 0.68);
  }

  return { draw };
}
