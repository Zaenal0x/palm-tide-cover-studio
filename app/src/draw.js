// draw.js — the cover composer for PALM TIDE Cover Studio.
// One routine paints preview, screenshots and full-size exports alike:
// graded photo panels edge-to-edge, then the poster furniture on top —
// a huge chrome-neon title lockup, glowing script subtitle, WANTED pill,
// starburst badge, corner ribbon, quote block and the bottom strip —
// finished with film grain and a vignette.
(function () {
  'use strict';

  var noiseCanvas = null;
  function getNoise() {
    if (noiseCanvas) return noiseCanvas;
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = noiseCanvas.height = 256;
    var nx = noiseCanvas.getContext('2d');
    var id = nx.createImageData(256, 256);
    for (var i = 0; i < id.data.length; i += 4) {
      var v = (Math.random() * 255) | 0;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = 255;
    }
    nx.putImageData(id, 0, 0);
    return noiseCanvas;
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

  function star(ctx, cx, cy, r, color) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rad = i % 2 === 0 ? r : r * 0.45;
      var a = -Math.PI / 2 + i * Math.PI / 5;
      var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function palm(ctx, x, y, s, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = s * 0.09;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.55, x + s * 0.34, y - s * 0.92);
    ctx.stroke();
    var tx = x + s * 0.34, ty = y - s * 0.92;
    for (var i = 0; i < 6; i++) {
      var a = Math.PI * (0.08 + i * 0.17);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(
        tx + Math.cos(a) * s * 0.42, ty - Math.sin(a) * s * 0.42 - s * 0.06,
        tx + Math.cos(a) * s * 0.62, ty - Math.sin(a) * s * 0.3 + s * 0.16);
      ctx.stroke();
    }
  }

  function fitFont(ctx, text, font, targetW, startPx) {
    var px = startPx;
    ctx.font = font(px);
    while (px > 8 && ctx.measureText(text).width > targetW) {
      px *= 0.94;
      ctx.font = font(px);
    }
    return px;
  }

  function drawCover(ctx, W, H, S) {
    var u = Math.min(W, H);
    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, W, H);

    var layout = window.PTL.LAYOUTS[S.layout].build(W / H);
    var rects = layout.rects;
    var gutter = Math.max(3, W * 0.0045);

    // --- photo panels, edge to edge ---
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var x = r.x * W + gutter / 2, y = r.y * H + gutter / 2;
      var w = r.w * W - gutter, h = r.h * H - gutter;
      var panel = S.panels[i];
      var photo = panel ? S.photos[panel.photo] : null;
      ctx.save();
      roundRect(ctx, x, y, w, h, Math.max(2, u * 0.006));
      ctx.clip();
      if (photo && photo.img) {
        var view = { id: photo.id, img: photo.img, ox: panel.ox, oy: panel.oy, zoom: panel.zoom };
        var graded = window.PTG.render(view, Math.round(w), Math.round(h), S.gradeParams);
        if (graded) ctx.drawImage(graded, x, y);
        else ctx.drawImage(photo.img, x, y, w, h);
      } else {
        ctx.fillStyle = '#1c1030';
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = Math.max(1.5, u * 0.003);
      roundRect(ctx, x, y, w, h, Math.max(2, u * 0.006));
      ctx.stroke();
      if (S.selected === i) {
        ctx.strokeStyle = '#ff2e88';
        ctx.lineWidth = Math.max(2, u * 0.005);
        roundRect(ctx, x, y, w, h, Math.max(2, u * 0.006));
        ctx.stroke();
      }
      // location tag: small black label, bottom-left of the panel
      if (photo && photo.tags && photo.tags.place) {
        var tfs = Math.max(10, u * 0.021);
        ctx.font = '700 ' + tfs + 'px Anton, sans-serif';
        var tw = ctx.measureText(photo.tags.place).width;
        var th = tfs * 2.15;
        var tx = x + u * 0.012, ty = y + h - th - u * 0.012;
        ctx.fillStyle = 'rgba(5,2,10,0.82)';
        ctx.fillRect(tx, ty, tw + tfs * 0.9, th);
        ctx.fillStyle = '#ffd98a';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(photo.tags.place, tx + tfs * 0.45, ty + tfs * 1.05);
        ctx.font = '400 ' + tfs * 0.72 + 'px Anton, sans-serif';
        ctx.fillStyle = '#f5e9ff';
        ctx.fillText((photo.tags.time || '') + (photo.tags.sub ? '  ·  ' + photo.tags.sub : ''), tx + tfs * 0.45, ty + tfs * 1.85);
      }
    }

    var C = S.captions;
    var stripH = H * 0.088;

    // --- top scrim so the lettering punches off the photos ---
    var scrim = ctx.createLinearGradient(0, 0, 0, H * 0.34);
    scrim.addColorStop(0, 'rgba(8,2,16,0.66)');
    scrim.addColorStop(1, 'rgba(8,2,16,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H * 0.34);

    // --- WANTED pill, top-left ---
    var pillH = u * 0.052, pillW = u * 0.30;
    var pillX = W * 0.026, pillY = H * 0.026;
    ctx.fillStyle = 'rgba(8,3,14,0.88)';
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = Math.max(1.5, u * 0.003);
    ctx.stroke();
    ctx.fillStyle = '#ffb347';
    ctx.font = '700 ' + pillH * 0.44 + 'px Anton, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WANTED', pillX + pillW * 0.07, pillY + pillH * 0.68);
    var starR = pillH * 0.26;
    for (var sIdx = 0; sIdx < 5; sIdx++) {
      star(ctx, pillX + pillW * 0.52 + sIdx * starR * 2.15, pillY + pillH / 2, starR,
        sIdx < C.stars ? '#ffd23e' : 'rgba(255,255,255,0.25)');
    }
    // volume tag under the pill
    ctx.fillStyle = 'rgba(8,3,14,0.85)';
    var volFs = u * 0.024;
    ctx.font = '700 ' + volFs + 'px Anton, sans-serif';
    var volW = ctx.measureText(C.volume).width + volFs * 1.1;
    ctx.fillRect(pillX, pillY + pillH + u * 0.01, volW, volFs * 1.5);
    ctx.fillStyle = '#7df9ff';
    ctx.fillText(C.volume, pillX + volFs * 0.55, pillY + pillH + u * 0.01 + volFs * 1.12);

    // --- ribbon across the top-right corner ---
    ctx.save();
    ctx.translate(W, 0);
    ctx.rotate(Math.PI / 4);
    var ribFs = u * 0.023;
    ctx.font = '700 ' + ribFs + 'px Anton, sans-serif';
    var ribW = ctx.measureText(C.ribbon).width + ribFs * 2.2;
    ctx.fillStyle = '#c2145a';
    ctx.fillRect(-ribW / 2, -ribFs * 1.05, ribW, ribFs * 2.1);
    ctx.fillStyle = '#ffe9f4';
    ctx.textAlign = 'center';
    ctx.fillText(C.ribbon, 0, ribFs * 0.38);
    ctx.restore();

    // --- THE TITLE LOCKUP: huge chrome-neon block letters ---
    var title = (C.title || 'PALM TIDE').toUpperCase();
    var titlePx = fitFont(ctx, title, function (px) { return '400 ' + px + 'px Anton, sans-serif'; }, W * 0.94, H * 0.21);
    ctx.save();
    ctx.translate(W / 2, H * 0.175);
    ctx.rotate(-0.021);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '400 ' + titlePx + 'px Anton, sans-serif';
    // magenta offset shadow
    ctx.fillStyle = '#d1006f';
    ctx.fillText(title, titlePx * 0.045, titlePx * 0.075);
    // neon glow pass
    ctx.save();
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = titlePx * 0.35;
    ctx.fillStyle = '#ff5da2';
    ctx.fillText(title, 0, 0);
    ctx.restore();
    // thick dark outline
    ctx.lineWidth = titlePx * 0.14;
    ctx.strokeStyle = '#16030e';
    ctx.lineJoin = 'round';
    ctx.strokeText(title, 0, 0);
    // chrome-neon gradient face
    var tg = ctx.createLinearGradient(0, -titlePx * 0.55, 0, titlePx * 0.55);
    tg.addColorStop(0, '#fff6d8');
    tg.addColorStop(0.35, '#ffd23e');
    tg.addColorStop(0.62, '#ff8a3c');
    tg.addColorStop(1, '#ff2e88');
    ctx.fillStyle = tg;
    ctx.fillText(title, 0, 0);
    ctx.restore();

    // --- script subtitle, glowing neon pink ---
    if (C.subtitle) {
      var subPx = fitFont(ctx, C.subtitle, function (px) { return '400 ' + px + 'px Pacifico, cursive'; }, W * 0.62, H * 0.062);
      ctx.save();
      ctx.translate(W / 2, H * 0.175 + titlePx * 0.62);
      ctx.rotate(-0.021);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '400 ' + subPx + 'px Pacifico, cursive';
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = subPx * 0.8;
      ctx.fillStyle = '#ff77b3';
      ctx.fillText(C.subtitle, 0, 0);
      ctx.fillText(C.subtitle, 0, 0);
      ctx.restore();
    }

    // --- quote block, bottom-left above the strip ---
    if (C.quote) {
      var qFs = Math.max(11, u * 0.026);
      ctx.font = 'italic 600 ' + qFs + 'px Georgia, serif';
      var quote = '“' + C.quote + '”';
      var qw = Math.min(ctx.measureText(quote).width, W * 0.52);
      ctx.fillStyle = 'rgba(8,3,14,0.72)';
      roundRect(ctx, W * 0.026, H - stripH - qFs * 3.1, qw + qFs * 1.2, qFs * 2.7, u * 0.01);
      ctx.fill();
      ctx.fillStyle = '#ffeecf';
      ctx.textAlign = 'left';
      // simple wrap: shrink to fit one or two lines
      var words = quote.split(' '), lines = [], line = '';
      for (var wi = 0; wi < words.length; wi++) {
        var trial = line ? line + ' ' + words[wi] : words[wi];
        if (ctx.measureText(trial).width > qw && line) { lines.push(line); line = words[wi]; }
        else line = trial;
      }
      if (line) lines.push(line);
      lines.slice(0, 2).forEach(function (ln, li) {
        ctx.fillText(ln, W * 0.026 + qFs * 0.6, H - stripH - qFs * 3.1 + qFs * (1.05 + li * 0.95));
      });
      ctx.font = '700 ' + qFs * 0.62 + 'px Anton, sans-serif';
      ctx.fillStyle = '#7df9ff';
      ctx.fillText('— ' + (C.source || ''), W * 0.026 + qFs * 0.6, H - stripH - qFs * 0.32);
    }

    // --- starburst badge, bottom-right above the strip ---
    var bR = u * 0.075;
    var bX = W - bR - W * 0.028, bY = H - stripH - bR - H * 0.02;
    ctx.beginPath();
    for (var bi = 0; bi < 32; bi++) {
      var br = bi % 2 === 0 ? bR : bR * 0.8;
      var ba = bi * Math.PI / 16;
      var bx = bX + Math.cos(ba) * br, by = bY + Math.sin(ba) * br;
      if (bi === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
    }
    ctx.closePath();
    var bg = ctx.createRadialGradient(bX, bY, bR * 0.1, bX, bY, bR);
    bg.addColorStop(0, '#ffcf4d');
    bg.addColorStop(1, '#ff5e3a');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = '#16030e';
    ctx.lineWidth = Math.max(1.5, u * 0.003);
    ctx.stroke();
    ctx.fillStyle = '#2a0a02';
    ctx.textAlign = 'center';
    var badgeWords = (C.badge || '').split(' ');
    var bFs = fitFont(ctx, badgeWords[0] || '', function (px) { return '400 ' + px + 'px Anton, sans-serif'; }, bR * 1.35, bR * 0.42);
    ctx.font = '400 ' + bFs + 'px Anton, sans-serif';
    if (badgeWords.length > 1) {
      ctx.fillText(badgeWords[0], bX, bY - bFs * 0.28);
      ctx.fillText(badgeWords.slice(1).join(' '), bX, bY + bFs * 0.78);
    } else {
      ctx.fillText(badgeWords[0] || '', bX, bY + bFs * 0.35);
    }

    // --- bottom strip: tagline, palms, credits, barcode ---
    ctx.fillStyle = '#0b0313';
    ctx.fillRect(0, H - stripH, W, stripH);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(0, H - stripH, W, Math.max(2, u * 0.004));
    var tFs = Math.max(11, stripH * 0.34);
    ctx.font = '400 ' + tFs + 'px Anton, sans-serif';
    ctx.fillStyle = '#ffeecf';
    ctx.textAlign = 'left';
    ctx.fillText(C.tagline || '', W * 0.026, H - stripH * 0.36);
    // sunset disc + palm silhouettes, centre of the strip
    var discR = stripH * 0.34, discX = W * 0.52, discY = H - stripH / 2;
    var dg = ctx.createLinearGradient(0, discY - discR, 0, discY + discR);
    dg.addColorStop(0, '#ffd23e');
    dg.addColorStop(1, '#ff2e88');
    ctx.save();
    ctx.beginPath();
    ctx.arc(discX, discY, discR, 0, 6.2832);
    ctx.clip();
    ctx.fillStyle = dg;
    ctx.fillRect(discX - discR, discY - discR, discR * 2, discR * 2);
    palm(ctx, discX - discR * 0.55, discY + discR * 0.92, discR * 1.15, '#12041f');
    palm(ctx, discX + discR * 0.28, discY + discR * 0.95, discR * 0.9, '#12041f');
    ctx.restore();
    // credits
    ctx.font = '400 ' + stripH * 0.17 + 'px Anton, sans-serif';
    ctx.fillStyle = 'rgba(245,233,255,0.66)';
    ctx.textAlign = 'center';
    ctx.fillText('PALM TIDE COVER STUDIO · A MAKE.FUN ENTRY · PRINTED IN VICE COLOURS', W * 0.72, H - stripH * 0.4);
    // barcode, right end of the strip
    var seed = 7;
    for (var s = 0; s < (C.title || '').length; s++) seed = (seed * 31 + C.title.charCodeAt(s)) % 9973;
    var bx2 = W * 0.9, bw = W * 0.075, bh = stripH * 0.62, by2 = H - stripH * 0.82;
    ctx.fillStyle = '#f5e9ff';
    ctx.fillRect(bx2 - 4, by2 - 3, bw + 8, bh + 6);
    ctx.fillStyle = '#0b0313';
    var cxp = bx2;
    while (cxp < bx2 + bw - 2) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      var barW = 1 + (seed % 3);
      if (seed % 2 === 0) ctx.fillRect(cxp, by2, barW, bh);
      cxp += barW + 1.4;
    }

    // --- grain + vignette ---
    if (S.gradeParams.grain > 0) {
      ctx.save();
      ctx.globalAlpha = S.gradeParams.grain * 0.16;
      ctx.globalCompositeOperation = 'overlay';
      var noise = getNoise();
      for (var ny = 0; ny < H; ny += 256) for (var nx = 0; nx < W; nx += 256) {
        ctx.drawImage(noise, nx, ny);
      }
      ctx.restore();
    }
    if (S.gradeParams.vignette > 0) {
      var vg = ctx.createRadialGradient(W / 2, H / 2, u * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
      vg.addColorStop(0, 'rgba(5,0,12,0)');
      vg.addColorStop(1, 'rgba(5,0,12,' + (S.gradeParams.vignette * 0.6) + ')');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.textBaseline = 'alphabetic';
  }

  window.PTD = { drawCover: drawCover };
})();
