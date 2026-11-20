// grade.js — the uniform photo grade pipeline for PALM TIDE Cover Studio.
// Every panel photo, whatever its source, is pushed through the same chain:
// saturation/contrast shaping -> light posterize -> gradient-map duotone
// blended by the grade-strength slider -> halftone dot screen sized by
// darkness. Results are cached per photo/crop/settings so the editor stays
// live while sliders move.
(function () {
  'use strict';

  // Each grade is a luminance ramp (stops of [t, r, g, b]) plus a posterize
  // strength and the ink colour its halftone dots are printed in.
  var GRADES = {
    vice: {
      label: 'Vice Sunset',
      ramp: [[0, 26, 6, 46], [0.28, 106, 32, 120], [0.52, 214, 62, 118], [0.76, 255, 128, 84], [1, 255, 233, 184]],
      posterize: 0.22, ink: [24, 4, 38]
    },
    neon: {
      label: 'Neon Night',
      ramp: [[0, 4, 8, 24], [0.3, 12, 38, 96], [0.55, 10, 158, 178], [0.8, 255, 46, 136], [1, 246, 240, 255]],
      posterize: 0.18, ink: [3, 4, 18]
    },
    golden: {
      label: 'Golden Hour',
      ramp: [[0, 26, 13, 2], [0.3, 102, 48, 14], [0.55, 196, 102, 28], [0.8, 242, 168, 66], [1, 255, 238, 178]],
      posterize: 0.15, ink: [30, 16, 2]
    },
    duotone: {
      label: 'Duotone Pink/Teal',
      ramp: [[0, 10, 44, 66], [0.45, 16, 110, 138], [0.72, 120, 92, 158], [1, 255, 96, 150]],
      posterize: 0.3, ink: [8, 30, 44]
    },
    comic: {
      label: 'Comic Ink',
      ramp: [[0, 16, 16, 46], [0.32, 36, 66, 138], [0.58, 226, 52, 66], [0.82, 244, 158, 84], [1, 255, 244, 214]],
      posterize: 0.55, ink: [10, 10, 30]
    },
    posterink: {
      label: 'Poster Ink',
      ramp: [[0, 10, 10, 16], [0.3, 58, 50, 134], [0.55, 210, 36, 58], [0.8, 244, 96, 52], [1, 255, 232, 210]],
      posterize: 0.8, ink: [6, 6, 12]
    },
    natural: {
      label: 'Natural',
      ramp: [[0, 12, 10, 14], [0.5, 128, 122, 118], [1, 252, 246, 238]],
      posterize: 0.0, ink: [20, 18, 20]
    }
  };

  function rampAt(ramp, t) {
    for (var i = 1; i < ramp.length; i++) {
      if (t <= ramp[i][0]) {
        var a = ramp[i - 1], b = ramp[i];
        var f = (t - a[0]) / Math.max(1e-5, b[0] - a[0]);
        return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
      }
    }
    var last = ramp[ramp.length - 1];
    return [last[1], last[2], last[3]];
  }

  var cache = new Map();
  var CACHE_MAX = 48;

  function cacheKey(photoId, sx, sy, sw, sh, w, h, p) {
    return [photoId, sx | 0, sy | 0, sw | 0, sh | 0, w, h, p.grade,
      p.strength.toFixed(2), p.contrast.toFixed(2), p.saturation.toFixed(2),
      p.halftone ? 1 : 0, p.dots.toFixed(2)].join('|');
  }

  // Render one photo crop through the pipeline into a canvas of w x h.
  function render(photo, w, h, p) {
    var img = photo.img;
    if (!img || !img.naturalWidth) return null;
    // Cover-fit crop, then panel offset/zoom inside the slack.
    var scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (photo.zoom || 1);
    var sw = w / scale, sh = h / scale;
    var slackX = Math.max(0, img.naturalWidth - sw), slackY = Math.max(0, img.naturalHeight - sh);
    var sx = slackX * (0.5 + (photo.ox || 0) * 0.5);
    var sy = slackY * (0.5 + (photo.oy || 0) * 0.5);
    var key = cacheKey(photo.id, sx, sy, sw, sh, w, h, p);
    if (cache.has(key)) return cache.get(key);

    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);

    var grade = GRADES[p.grade] || GRADES.vice;
    var idata = cx.getImageData(0, 0, w, h);
    var d = idata.data;
    var sat = p.saturation, con = p.contrast, str = p.strength;
    var post = grade.posterize, levels = 6;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      // saturation shaping around luminance
      r = lum * 255 + (r - lum * 255) * sat;
      g = lum * 255 + (g - lum * 255) * sat;
      b = lum * 255 + (b - lum * 255) * sat;
      // contrast shaping
      r = ((r / 255 - 0.5) * con + 0.5) * 255;
      g = ((g / 255 - 0.5) * con + 0.5) * 255;
      b = ((b / 255 - 0.5) * con + 0.5) * 255;
      // light posterize, mixed by the grade's own amount
      if (post > 0) {
        r += (Math.round(r / 255 * levels) / levels * 255 - r) * post;
        g += (Math.round(g / 255 * levels) / levels * 255 - g) * post;
        b += (Math.round(b / 255 * levels) / levels * 255 - b) * post;
      }
      // gradient-map duotone by (shaped) luminance, blended by strength
      var l2 = (0.2126 * Math.max(0, Math.min(255, r)) + 0.7152 * Math.max(0, Math.min(255, g)) + 0.0722 * Math.max(0, Math.min(255, b))) / 255;
      var mapped = rampAt(grade.ramp, Math.max(0, Math.min(1, l2)));
      d[i] = r + (mapped[0] - r) * str;
      d[i + 1] = g + (mapped[1] - g) * str;
      d[i + 2] = b + (mapped[2] - b) * str;
    }
    cx.putImageData(idata, 0, 0);

    // Halftone dot screen: one dot per cell, radius sized by cell darkness.
    if (p.halftone) {
      var cs = Math.max(5, Math.round(Math.max(w, h) / 150 * (1.6 - p.dots * 0.8)));
      var ink = grade.ink;
      cx.fillStyle = 'rgb(' + ink[0] + ',' + ink[1] + ',' + ink[2] + ')';
      var src = cx.getImageData(0, 0, w, h).data;
      for (var y = 0; y < h; y += cs) {
        for (var x = 0; x < w; x += cs) {
          var px = Math.min(w - 1, x + (cs >> 1)), py = Math.min(h - 1, y + (cs >> 1));
          var o = (py * w + px) * 4;
          var dark = 1 - (0.2126 * src[o] + 0.7152 * src[o + 1] + 0.0722 * src[o + 2]) / 255;
          var rad = cs * 0.52 * dark * (0.55 + p.dots * 0.6);
          if (rad > 0.6) {
            cx.globalAlpha = 0.32;
            cx.beginPath();
            cx.arc(x + cs / 2, y + cs / 2, rad, 0, 6.2832);
            cx.fill();
          }
        }
      }
      cx.globalAlpha = 1;
    }

    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(key, cv);
    return cv;
  }

  window.PTG = { GRADES: GRADES, render: render, clearCache: function () { cache.clear(); } };
})();
