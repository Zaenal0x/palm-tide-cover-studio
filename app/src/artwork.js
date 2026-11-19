// artwork.js — the cover composer.
//
// One draw routine paints the whole cover: backdrop, the graded photo
// panels, then the poster furniture (quote card, WANTED pill, ribbon,
// volume tag, starburst badge, the big tilted title block and the
// bottom strip). The editor preview, the three PNG exports and the
// screenshot scenes all call this same routine, so what you see is
// exactly what ships.

import { gradeById } from './tones.js';
import { gradePhoto } from './pixlab.js';
import { layoutSlots } from './panels.js';

const CREAM = '#ffe9b0';
const INK = '#160a24';
const GOLD = '#ffd23c';
const PINK = '#ff4fa3';

export function createComposer() {
  const cache = new Map();
  let noiseTile = null;

  function gradedFor(photo, slot, w, h, grade, fx) {
    const key = [
      photo.src, Math.round(w), Math.round(h), grade.id,
      fx.strength.toFixed(3), fx.contrast.toFixed(3), fx.saturation.toFixed(3),
      fx.halftone ? 'ht' : 'flat', fx.dots.toFixed(2),
      (slot.zoom || 1).toFixed(3), (slot.ox || 0).toFixed(3), (slot.oy || 0).toFixed(3),
    ].join('|');
    let hit = cache.get(key);
    if (!hit) {
      hit = gradePhoto(photo, w, h, slot, grade, fx);
      if (cache.size > 60) cache.clear();
      cache.set(key, hit);
    }
    return hit;
  }

  function noise(ctx, W, H, amount) {
    if (!noiseTile) {
      noiseTile = document.createElement('canvas');
      noiseTile.width = 140;
      noiseTile.height = 140;
      const nctx = noiseTile.getContext('2d');
      const data = nctx.createImageData(140, 140);
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
    }
    ctx.save();
    ctx.globalAlpha = amount * 0.32;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(noiseTile, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function stars(ctx, x, y, size, count, colour) {
    ctx.save();
    ctx.fillStyle = colour;
    ctx.font = size + 'px sans-serif';
    ctx.textBaseline = 'middle';
    let cx = x;
    for (let i = 0; i < count; i++) {
      ctx.fillText('★', cx, y);
      cx += size * 1.08;
    }
    ctx.restore();
    return size * 1.08 * count;
  }

  function wrapWords(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const trial = line ? line + ' ' + word : word;
      if (ctx.measureText(trial).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = trial;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  function drawPanel(ctx, photo, slotState, rect, grade, fx) {
    ctx.save();
    ctx.translate(rect.x, rect.y);
    ctx.rotate(rect.tilt || 0);
    const w = rect.w;
    const h = rect.h;
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.clip();
    if (photo) {
      const graded = gradedFor(photo, slotState, w, h, grade, fx);
      ctx.drawImage(graded, -w / 2, -h / 2, w, h);
    } else {
      const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      grad.addColorStop(0, '#2c1747');
      grad.addColorStop(1, '#170a29');
      ctx.fillStyle = grad;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = 'rgba(255,233,176,0.5)';
      ctx.font = Math.min(44, h * 0.09) + 'px Anton, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', 0, 0);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    ctx.save();
    ctx.translate(rect.x, rect.y);
    ctx.rotate(rect.tilt || 0);
    ctx.lineWidth = grade.outlineWidth;
    ctx.strokeStyle = 'rgb(' + grade.outline.join(',') + ')';
    ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    const centred = { x: 0, y: 0, w: rect.w, h: rect.h };
    ctx.translate(-0, -0);
    drawTagCentred(ctx, slotState, centred);
    ctx.restore();
  }

  function drawTagCentred(ctx, slot, rect) {
    // rect here is centred on the panel centre.
    const tag = slot.tag || {};
    if (!tag.place) return;
    const size = Math.max(11, Math.min(30, rect.h * 0.062));
    ctx.font = size + 'px Anton, sans-serif';
    const placeW = ctx.measureText(tag.place.toUpperCase()).width;
    const sub = ((tag.time || '') + (tag.sub ? ' · ' + tag.sub : '')).toUpperCase();
    ctx.font = '600 ' + size * 0.54 + 'px sans-serif';
    const subW = ctx.measureText(sub).width;
    const pad = size * 0.55;
    const chipW = Math.max(placeW, subW) + pad * 2;
    const chipH = size * 2.05;
    const x = -rect.w / 2 + 9;
    const y = rect.h / 2 - chipH - 9;
    ctx.fillStyle = 'rgba(5,2,10,0.84)';
    roundRect(ctx, x, y, chipW, chipH, 4);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.font = size + 'px Anton, sans-serif';
    ctx.fillText(tag.place.toUpperCase(), x + pad, y + size * 1.02);
    ctx.fillStyle = '#ffd9ec';
    ctx.font = '600 ' + size * 0.54 + 'px sans-serif';
    ctx.fillText(sub, x + pad, y + size * 1.66);
  }

  function drawPalm(ctx, x, baseY, hgt) {
    ctx.save();
    ctx.strokeStyle = 'rgba(10,2,14,0.8)';
    ctx.fillStyle = 'rgba(10,2,14,0.8)';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.5, hgt * 0.13);
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x + hgt * 0.08, baseY - hgt * 0.6, x + hgt * 0.26, baseY - hgt);
    ctx.stroke();
    const topX = x + hgt * 0.26;
    const topY = baseY - hgt;
    ctx.lineWidth = Math.max(2, hgt * 0.085);
    for (let i = 0; i < 6; i++) {
      const spread = (i / 5 - 0.5) * 2; // -1 .. 1 across the crown
      const len = hgt * (0.52 - Math.abs(spread) * 0.14);
      const ex = topX + spread * len;
      const ey = topY + Math.abs(spread) * len * 0.42 - (1 - Math.abs(spread)) * len * 0.22;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + spread * len * 0.5, topY - len * 0.3, ex, ey);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(topX - hgt * 0.05, topY + hgt * 0.07, hgt * 0.07, 0, Math.PI * 2);
    ctx.arc(topX + hgt * 0.07, topY + hgt * 0.09, hgt * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBarcode(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = '#fdfdf8';
    roundRect(ctx, x, y, w, h, 3);
    ctx.fill();
    ctx.fillStyle = '#101014';
    let seed = 987654;
    let cx = x + w * 0.08;
    const end = x + w * 0.92;
    while (cx < end) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const bw = 1 + (seed % 4);
      if (seed % 3 !== 0) ctx.fillRect(cx, y + h * 0.12, bw, h * 0.62);
      cx += bw + 1 + (seed % 3);
    }
    ctx.fillStyle = '#101014';
    ctx.font = '600 ' + h * 0.16 + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2 026110 6', x + w / 2, y + h * 0.94);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function draw(ctx, W, H, model, photos, opts) {
    const grade = gradeById(model.gradeId);
    const fx = model.fx;
    const text = model.text;
    const stripH = Math.round(H * 0.085);
    opts = opts || {};

    // Backdrop.
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, grade.backdrop[0]);
    bg.addColorStop(0.55, grade.backdrop[1]);
    bg.addColorStop(1, grade.backdrop[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.78, H * 0.2, 10, W * 0.78, H * 0.2, W * 0.5);
    glow.addColorStop(0, 'rgba(255,170,80,0.35)');
    glow.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Panels.
    const rects = layoutSlots(model.layoutId, W, H, stripH).map((s) => ({
      x: s.x + s.w / 2,
      y: s.y + s.h / 2,
      w: s.w,
      h: s.h,
      tilt: s.tilt,
    }));
    rects.forEach((rect, i) => {
      const slotState = model.slots[i] || { photo: -1, ox: 0, oy: 0, zoom: 1, tag: {} };
      const photo = slotState.photo >= 0 ? photos[slotState.photo] : null;
      drawPanel(ctx, photo, slotState, rect, grade, fx);
    });

    // Volume tag, top-left corner.
    ctx.save();
    ctx.translate(W * 0.016, H * 0.016);
    ctx.rotate(-0.1);
    ctx.fillStyle = '#0e7d74';
    const volSize = H * 0.026;
    ctx.font = volSize + 'px Anton, sans-serif';
    const volW = ctx.measureText(text.volume).width + volSize * 1.1;
    roundRect(ctx, 0, 0, volW, volSize * 1.5, 4);
    ctx.fill();
    ctx.fillStyle = CREAM;
    ctx.fillText(text.volume, volSize * 0.55, volSize * 1.12);
    ctx.restore();

    // Quote card, top-left over the art.
    const qx = W * 0.045;
    const qy = H * 0.085;
    const qw = Math.min(W * 0.335, 560 * (W / 1920) + 130);
    const qSize = Math.max(13, H * 0.02);
    ctx.save();
    ctx.font = 'italic 600 ' + qSize + 'px sans-serif';
    const lines = wrapWords(ctx, text.quote, qw - qSize * 2.4);
    const qh = qSize * (lines.length * 1.35 + 2.1);
    ctx.fillStyle = 'rgba(8,3,16,0.62)';
    roundRect(ctx, qx, qy, qw, qh, 8);
    ctx.fill();
    ctx.fillStyle = PINK;
    ctx.font = qSize * 1.5 + 'px Pacifico, cursive';
    ctx.fillText('“', qx + qSize * 0.7, qy + qSize * 1.35);
    ctx.fillStyle = '#fdf6e3';
    ctx.font = 'italic 600 ' + qSize + 'px sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, qx + qSize * 1.9, qy + qSize * (1.25 + i * 1.35));
    });
    ctx.fillStyle = GOLD;
    ctx.font = qSize * 0.78 + 'px Anton, sans-serif';
    ctx.fillText('— ' + text.source.toUpperCase(), qx + qSize * 1.9, qy + qh - qSize * 0.85);
    stars(ctx, qx + qSize * 1.9, qy + qh - qSize * 0.38, qSize * 0.72, text.stars, GOLD);
    ctx.restore();

    // Ribbon across the top-right corner.
    // Ribbon across the top-right corner: in the rotated frame the
    // band's centreline sits a fixed distance from the corner, so it
    // crosses the top edge and the right edge evenly.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.translate(W, 0);
    ctx.rotate(Math.PI / 4);
    const ribH = H * 0.037;
    const ribDrop = W * 0.08;
    ctx.fillStyle = '#c2187a';
    ctx.fillRect(-W * 0.19, ribDrop - ribH / 2, W * 0.38, ribH);
    ctx.fillStyle = '#ffe3f2';
    ctx.font = ribH * 0.52 + 'px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text.ribbon.toUpperCase(), 0, ribDrop + ribH * 0.18);
    ctx.textAlign = 'left';
    ctx.restore();

    // WANTED pill, right side under the ribbon.
    ctx.save();
    const wSize = Math.max(13, H * 0.021);
    ctx.font = wSize + 'px Anton, sans-serif';
    const labelW = ctx.measureText('WANTED').width;
    const pillW = labelW + wSize * (text.stars * 1.15 + 2.2);
    const pillH = wSize * 1.9;
    const px = W - pillW - W * 0.035;
    const py = H * 0.115;
    ctx.fillStyle = 'rgba(8,3,16,0.85)';
    roundRect(ctx, px, py, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = GOLD;
    ctx.stroke();
    ctx.fillStyle = CREAM;
    ctx.fillText('WANTED', px + wSize * 0.9, py + pillH * 0.66);
    stars(ctx, px + labelW + wSize * 1.5, py + pillH * 0.52, wSize * 0.95, text.stars, GOLD);
    ctx.restore();

    // Starburst badge, bottom-right above the strip.
    const badgeText = (text.badge || '').toUpperCase();
    if (badgeText) {
      const bx = W * 0.9;
      const by = H - stripH - H * 0.085;
      const R = Math.min(W, H) * 0.088;
      ctx.save();
      ctx.beginPath();
      const spikes = 16;
      for (let i = 0; i < spikes * 2; i++) {
        const ang = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? R : R * 0.78;
        const vx = bx + Math.cos(ang) * rad;
        const vy = by + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = '#2a0a33';
      ctx.textAlign = 'center';
      const words = badgeText.split(/\s+/);
      const mid = Math.ceil(words.length / 2);
      const lineA = words.slice(0, mid).join(' ');
      const lineB = words.slice(mid).join(' ');
      let bSize = R * 0.34;
      ctx.font = bSize + 'px Anton, sans-serif';
      while (ctx.measureText(lineA).width > R * 1.25 && bSize > 8) {
        bSize -= 1;
        ctx.font = bSize + 'px Anton, sans-serif';
      }
      if (lineB) {
        ctx.fillText(lineA, bx, by - bSize * 0.12);
        ctx.fillText(lineB, bx, by + bSize * 0.95);
      } else {
        ctx.fillText(lineA, bx, by + bSize * 0.35);
      }
      ctx.textAlign = 'left';
      ctx.restore();
    }

    // Title block, bottom-left, tilted -5 degrees.
    const titleText = (text.title || '').toUpperCase();
    if (titleText) {
      let tSize = H * 0.155;
      ctx.save();
      ctx.font = tSize + 'px Anton, sans-serif';
      while (ctx.measureText(titleText).width > W * 0.92 && tSize > 20) {
        tSize -= 4;
        ctx.font = tSize + 'px Anton, sans-serif';
      }
      ctx.translate(W * 0.045, H - stripH - H * 0.018);
      ctx.rotate(-5 * Math.PI / 180);
      // Neon script subtitle above the title.
      const sSize = tSize * 0.4;
      ctx.font = sSize + 'px Pacifico, cursive';
      ctx.shadowColor = PINK;
      ctx.shadowBlur = sSize * 0.45;
      ctx.fillStyle = '#ff77c8';
      ctx.fillText(text.subtitle, tSize * 0.05, -tSize * 0.94);
      ctx.shadowBlur = 0;
      // Magenta drop shadow, dark outline, gradient face.
      ctx.font = tSize + 'px Anton, sans-serif';
      ctx.fillStyle = '#c2187a';
      ctx.fillText(titleText, tSize * 0.05, tSize * 0.07);
      ctx.lineJoin = 'round';
      ctx.lineWidth = tSize * 0.16;
      ctx.strokeStyle = INK;
      ctx.strokeText(titleText, 0, 0);
      const grad = ctx.createLinearGradient(0, -tSize, 0, 0);
      grad.addColorStop(0, '#fff6d8');
      grad.addColorStop(0.55, '#ffc53c');
      grad.addColorStop(1, '#ff7847');
      ctx.fillStyle = grad;
      ctx.fillText(titleText, 0, 0);
      ctx.restore();
    }

    // Bottom strip.
    const stripY = H - stripH;
    const stripGrad = ctx.createLinearGradient(0, 0, W, 0);
    stripGrad.addColorStop(0, '#2a0f3d');
    stripGrad.addColorStop(0.55, '#8f2a4d');
    stripGrad.addColorStop(1, '#ff7847');
    ctx.fillStyle = stripGrad;
    ctx.fillRect(0, stripY, W, stripH);
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, stripY, W, Math.max(2, H * 0.0035));
    ctx.save();
    ctx.fillStyle = CREAM;
    const tagSize = stripH * 0.4;
    ctx.font = tagSize + 'px Anton, sans-serif';
    const taglineText = text.tagline.toUpperCase();
    ctx.fillText(taglineText, W * 0.028, stripY + stripH * 0.65);
    const tagEnd = W * 0.028 + ctx.measureText(taglineText).width;
    // Credits and barcode on the right.
    ctx.font = '600 ' + stripH * 0.155 + 'px sans-serif';
    const creditW = ctx.measureText('PALM TIDE STUDIO · COVER ART EDITION').width;
    const creditStart = W * 0.885 - creditW;
    // Palm silhouettes fill whatever gap the strip leaves between the
    // tagline and the credits; if there is no gap, they stay off.
    const gapMid = (tagEnd + creditStart) / 2;
    if (creditStart - tagEnd > W * 0.09) {
      drawPalm(ctx, gapMid - stripH * 0.34, stripY + stripH * 0.97, stripH * 0.82);
      drawPalm(ctx, gapMid, stripY + stripH * 0.97, stripH * 0.64);
      drawPalm(ctx, gapMid + stripH * 0.3, stripY + stripH * 0.97, stripH * 0.76);
    }
    ctx.fillStyle = 'rgba(255,246,227,0.9)';
    ctx.textAlign = 'right';
    ctx.fillText('PALM TIDE STUDIO · COVER ART EDITION', W * 0.885, stripY + stripH * 0.42);
    ctx.fillText('PRINTED ON THE COAST', W * 0.885, stripY + stripH * 0.68);
    ctx.textAlign = 'left';
    drawBarcode(ctx, W * 0.9, stripY + stripH * 0.17, W * 0.072, stripH * 0.66);
    ctx.restore();

    // Selected panel outline (editor only).
    if (opts.selected != null && opts.selected >= 0 && rects[opts.selected]) {
      const rect = rects[opts.selected];
      ctx.save();
      ctx.translate(rect.x, rect.y);
      ctx.rotate(rect.tilt || 0);
      ctx.lineWidth = 3;
      ctx.strokeStyle = GOLD;
      ctx.setLineDash([12, 7]);
      ctx.strokeRect(-rect.w / 2 - 5, -rect.h / 2 - 5, rect.w + 10, rect.h + 10);
      ctx.restore();
    }

    // Grain and vignette finish.
    if (fx.grain > 0) noise(ctx, W, H, fx.grain);
    if (fx.vignette > 0) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.74);
      vg.addColorStop(0, 'rgba(8,0,16,0)');
      vg.addColorStop(1, 'rgba(8,0,16,' + (fx.vignette * 0.6).toFixed(3) + ')');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  return { draw };
}
