// draw.js — the cover composer. One routine draws the cover at any size:
// the editor preview, the three PNG exports and the ?shot= scenes all call
// it, so what you see is exactly what you export.
//
// Order: backdrop → graded panels with shared gutters/outlines and location
// tags → tilted gradient title + neon script subtitle → poster furniture
// (WANTED pill, starburst badge, volume tag, corner ribbon, quote block,
// bottom strip with palms, credits and barcode) → grain and vignette.

import { LAYOUTS } from './layouts.js';
import { gradedCanvas } from './grade.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

let noiseTile = null;
function getNoise() {
  if (noiseTile) return noiseTile;
  const cv = document.createElement('canvas');
  cv.width = 140;
  cv.height = 140;
  const c = cv.getContext('2d');
  const img = c.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + Math.random() * 90;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  noiseTile = cv;
  return cv;
}

function drawPanel(ctx, rect, panel, photos, settings, selected, avoid) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (rect.rot) ctx.rotate(rect.rot);
  ctx.translate(-w / 2, -h / 2);

  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();

  const img = photos[panel.photo];
  if (img) {
    const src = gradedCanvas(img, settings);
    const sw = src.width;
    const sh = src.height;
    const scale = Math.max(w / sw, h / sh) * (panel.zoom || 1);
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (w - dw) / 2 + (panel.ox || 0) * (dw - w) * 0.5;
    const dy = (h - dh) / 2 + (panel.oy || 0) * (dh - h) * 0.5;
    ctx.drawImage(src, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#241335';
    ctx.fillRect(0, 0, w, h);
  }

  // location tag: a small black chip, place · time over a one-line sub
  const tag = panel.tag || {};
  if (tag.place) {
    const pad = Math.max(5, w * 0.02);
    const line1 = Math.max(10, Math.min(21, w * 0.052));
    const line2 = line1 * 0.78;
    ctx.font = `${line1}px Anton, sans-serif`;
    const head = tag.time ? `${tag.place} · ${tag.time}` : tag.place;
    const tw = Math.max(ctx.measureText(head).width, tag.sub ? ctx.measureText(tag.sub).width * 0.9 : 0);
    const chipW = Math.min(w - pad * 2, tw + pad * 2);
    const chipH = tag.sub ? line1 + line2 + pad * 1.7 : line1 + pad * 1.4;
    const cx = pad;
    const cy = h - chipH - pad;
    // the quote block owns the bottom-left corner: a chip that would slide
    // underneath it is skipped, never half-buried
    const hit = avoid
      && rect.x + cx < avoid.x + avoid.w && rect.x + cx + chipW > avoid.x
      && rect.y + cy < avoid.y + avoid.h && rect.y + cy + chipH > avoid.y;
    if (!hit) {
      ctx.fillStyle = 'rgba(4,2,10,0.88)';
      ctx.fillRect(cx, cy, chipW, chipH);
      ctx.fillStyle = '#ffd23c';
      ctx.textBaseline = 'top';
      ctx.fillText(head, cx + pad, cy + pad * 0.62, chipW - pad * 2);
      if (tag.sub) {
        ctx.font = `italic ${line2}px Georgia, serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(tag.sub, cx + pad, cy + pad * 0.62 + line1 * 1.12, chipW - pad * 2);
      }
    }
  }
  ctx.restore();

  // outline (drawn unrotated-frame-aligned by re-applying the transform)
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (rect.rot) ctx.rotate(rect.rot);
  ctx.translate(-w / 2, -h / 2);
  const thick = settings.grade === 'poster-ink' ? 1.9 : 1;
  ctx.lineWidth = Math.max(1.6, w * 0.011) * thick;
  ctx.strokeStyle = selected ? '#ff2ea6' : '#f5ead2';
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}

function starburst(ctx, cx, cy, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.78;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function palm(ctx, x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.55, x + s * 0.3, y - s * 0.95);
  ctx.stroke();
  const tx = x + s * 0.3;
  const ty = y - s * 0.95;
  ctx.lineWidth = s * 0.06;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.08 + i * 0.17);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * s * 0.42, ty - Math.sin(a) * s * 0.42 - s * 0.08,
      tx + Math.cos(a) * s * 0.62, ty - Math.sin(a) * s * 0.3 + s * 0.16,
    );
    ctx.stroke();
  }
}

export function drawCover(ctx, W, H, state, photos) {
  const s = state.settings;
  const cap = state.captions;
  const m = W * 0.034;
  const stripH = H * 0.088;

  // backdrop: deep violet falling to black
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2a0f45');
  bg.addColorStop(0.55, '#150826');
  bg.addColorStop(1, '#05030c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // panels
  const region = { x: m, y: H * 0.145, w: W - m * 2, h: H - stripH - H * 0.145 - m * 0.7 };
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  const gutter = Math.max(4, W * 0.011);

  // the quote block's box is settled before panels are drawn, so a panel
  // tag chip never slides underneath it
  let quoteBox = null;
  let quoteLines = [];
  const qSize = H * 0.021;
  if (cap.quote) {
    const qw = W * 0.44;
    ctx.font = `italic ${qSize}px Georgia, serif`;
    const words = cap.quote.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > qw - H * 0.03 && line) {
        quoteLines.push(line);
        line = word;
      } else line = test;
    }
    if (line) quoteLines.push(line);
    const qh = quoteLines.length * qSize * 1.3 + (cap.quoteSource ? qSize * 1.5 : 0) + H * 0.024;
    quoteBox = { x: m + gutter, y: region.y + region.h - qh - gutter, w: qw, h: qh };
  }

  layout.panels.forEach((r, i) => {
    const panel = state.panels[i];
    if (!panel) return;
    const rect = {
      x: region.x + r.x * region.w + gutter / 2,
      y: region.y + r.y * region.h + gutter / 2,
      w: r.w * region.w - gutter,
      h: r.h * region.h - gutter,
      rot: r.rot,
    };
    drawPanel(ctx, rect, panel, photos, s, state.selected === i && state.interactive, quoteBox);
  });

  // ---- lettering: tilted gradient title with a hard magenta shadow ----
  const cx = W / 2;
  const titleY = H * 0.105;
  ctx.save();
  ctx.translate(cx, titleY);
  ctx.rotate(-0.087);
  let size = H * 0.115;
  ctx.font = `${size}px Anton, sans-serif`;
  const tw = ctx.measureText(cap.title || 'PALM TIDE').width;
  if (tw > W * 0.88) {
    size *= (W * 0.88) / tw;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#ff2ea6';
  ctx.fillText(cap.title || 'PALM TIDE', size * 0.045, size * 0.075);
  ctx.lineWidth = size * 0.17;
  ctx.strokeStyle = '#160a26';
  ctx.strokeText(cap.title || 'PALM TIDE', 0, 0);
  const grad = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.55);
  grad.addColorStop(0, '#fff3d6');
  grad.addColorStop(0.55, '#ff9a3c');
  grad.addColorStop(1, '#ffd23c');
  ctx.fillStyle = grad;
  ctx.fillText(cap.title || 'PALM TIDE', 0, 0);
  ctx.restore();

  // neon script subtitle
  if (cap.subtitle) {
    ctx.save();
    ctx.translate(cx, titleY + size * 0.72);
    ctx.rotate(-0.087);
    ctx.font = `${H * 0.042}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff5ec4';
    ctx.shadowBlur = H * 0.02;
    ctx.fillStyle = '#ff8fd8';
    ctx.fillText(cap.subtitle, 0, 0);
    ctx.fillText(cap.subtitle, 0, 0);
    ctx.restore();
  }

  // ---- WANTED pill, top-left ----
  const pillH = H * 0.037;
  ctx.save();
  ctx.font = `${pillH * 0.58}px Anton, sans-serif`;
  const stars = '★'.repeat(Math.max(0, Math.min(8, cap.stars || 0)));
  const pillText = stars ? `${stars} WANTED` : 'WANTED';
  const pillW = ctx.measureText(pillText).width + pillH * 1.1;
  roundRect(ctx, m, H * 0.026, pillW, pillH, pillH / 2);
  ctx.fillStyle = '#c2146b';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#ffd23c';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, m + pillH * 0.55, H * 0.026 + pillH * 0.54);
  ctx.restore();

  // volume tag under the pill
  ctx.save();
  ctx.font = `${pillH * 0.5}px Anton, sans-serif`;
  const volW = ctx.measureText(cap.volume || '').width + pillH * 0.8;
  roundRect(ctx, m, H * 0.026 + pillH * 1.25, volW, pillH * 0.78, 4);
  ctx.fillStyle = 'rgba(5,3,12,0.85)';
  ctx.fill();
  ctx.fillStyle = '#ffd23c';
  ctx.fillText(cap.volume || '', m + pillH * 0.4, H * 0.026 + pillH * 1.25 + pillH * 0.42);
  ctx.restore();

  // ---- starburst badge, top-right ----
  const br = H * 0.052;
  const bx = W - m - br;
  const by = H * 0.062;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.18);
  starburst(ctx, 0, 0, br, 12);
  ctx.fillStyle = '#ffc93c';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#160a26';
  ctx.stroke();
  ctx.fillStyle = '#160a26';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const badgeLines = (cap.badge || '').split(' ');
  ctx.font = `${br * 0.42}px Anton, sans-serif`;
  if (badgeLines.length > 1) {
    ctx.fillText(badgeLines[0], 0, -br * 0.22);
    ctx.font = `${br * 0.52}px Anton, sans-serif`;
    ctx.fillText(badgeLines.slice(1).join(' '), 0, br * 0.24);
  } else {
    ctx.fillText(cap.badge || '', 0, 0);
  }
  ctx.restore();

  // ---- corner ribbon, bottom-right of the panel region ----
  if (cap.ribbon) {
    ctx.save();
    ctx.font = `${H * 0.02}px Anton, sans-serif`;
    const rw = ctx.measureText(cap.ribbon).width + H * 0.05;
    ctx.translate(W - m - rw * 0.44, region.y + region.h - H * 0.014);
    ctx.rotate(-0.3);
    ctx.fillStyle = '#c2146b';
    ctx.fillRect(-rw / 2, -H * 0.017, rw, H * 0.034);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cap.ribbon, 0, H * 0.001);
    ctx.restore();
  }

  // ---- quote block, bottom-left over the panels ----
  if (cap.quote && quoteBox) {
    ctx.save();
    const { x: qx, y: qy, w: qw, h: qh } = quoteBox;
    roundRect(ctx, qx, qy, qw, qh, 8);
    ctx.fillStyle = 'rgba(4,2,10,0.78)';
    ctx.fill();
    ctx.font = `italic ${qSize}px Georgia, serif`;
    ctx.fillStyle = '#ffe9a8';
    ctx.textBaseline = 'top';
    quoteLines.forEach((ln, i) => ctx.fillText(ln, qx + H * 0.015, qy + H * 0.011 + i * qSize * 1.3));
    if (cap.quoteSource) {
      ctx.font = `${qSize * 0.82}px Anton, sans-serif`;
      ctx.fillStyle = '#ff8fd8';
      ctx.fillText(cap.quoteSource, qx + H * 0.015, qy + qh - qSize * 1.35);
    }
    ctx.restore();
  }

  // ---- bottom strip: tagline, sunset palms, credits, barcode ----
  const sy = H - stripH;
  ctx.fillStyle = '#0a0416';
  ctx.fillRect(0, sy, W, stripH);
  ctx.fillStyle = '#ff2ea6';
  ctx.fillRect(0, sy, W, Math.max(2, H * 0.004));

  ctx.save();
  ctx.font = `${stripH * 0.34}px Anton, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(stripH * 0.06)}px`; } catch { /* older engines */ }
  ctx.fillStyle = '#f5ead2';
  ctx.textBaseline = 'middle';
  ctx.fillText(cap.tagline || '', m, sy + stripH * 0.54, W * 0.4);
  ctx.restore();

  // sunset disc + palm silhouettes at centre
  const discR = stripH * 0.34;
  const discX = W * 0.56;
  const discY = sy + stripH * 0.52;
  const disc = ctx.createLinearGradient(0, discY - discR, 0, discY + discR);
  disc.addColorStop(0, '#ffd23c');
  disc.addColorStop(1, '#ff5e7a');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(discX, discY, discR, 0, Math.PI * 2);
  ctx.fill();
  palm(ctx, discX - discR * 0.9, sy + stripH * 0.94, stripH * 0.52, '#0a0416');
  palm(ctx, discX + discR * 0.35, sy + stripH * 0.94, stripH * 0.4, '#0a0416');

  ctx.save();
  ctx.font = `${stripH * 0.17}px Anton, sans-serif`;
  ctx.fillStyle = 'rgba(245,234,210,0.55)';
  ctx.fillText('PALM TIDE COVER STUDIO', W * 0.635, sy + stripH * 0.38);
  ctx.fillText('PRINTED UNDER A VICE SUNSET', W * 0.635, sy + stripH * 0.66);
  ctx.restore();

  // barcode
  const bw = W * 0.075;
  const bh = stripH * 0.62;
  const bx2 = W - m - bw;
  const by2 = sy + stripH * 0.19;
  ctx.fillStyle = '#f5ead2';
  ctx.fillRect(bx2, by2, bw, bh);
  ctx.fillStyle = '#0a0416';
  let seed = 7;
  let px = bx2 + 3;
  while (px < bx2 + bw - 4) {
    seed = (seed * 31 + 17) % 97;
    const barW = 1 + (seed % 3);
    if (seed % 3 !== 0) ctx.fillRect(px, by2 + 3, barW, bh - 9);
    px += barW + 1.4;
  }
  ctx.font = `${stripH * 0.13}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('06 2026', bx2 + bw / 2, by2 + bh - 1.5);
  ctx.textAlign = 'left';

  // ---- grain + vignette ----
  if (s.vignette > 0.01) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${(s.vignette * 0.62).toFixed(3)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  if (s.grain > 0.01) {
    ctx.save();
    ctx.globalAlpha = s.grain * 0.34;
    ctx.globalCompositeOperation = 'overlay';
    const tile = getNoise();
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
