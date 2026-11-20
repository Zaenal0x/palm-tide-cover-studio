// main.js — the PALM TIDE Cover Studio editor.
// Three-column studio: photo rail (left), live canvas (centre), controls
// (right). All state lives here; draw.js paints it and grade.js grades it.
(function () {
  'use strict';

  var SAMPLES = [
    { src: 'samples/convertible.jpg', name: 'The Getaway', tags: { place: 'PALM TIDE BLVD', time: 'GOLDEN HOUR', sub: 'The Getaway' } },
    { src: 'samples/rooftop.jpg', name: 'Rooftop', tags: { place: 'SKYLINE ROOFTOP', time: 'DUSK', sub: 'Business Up Top' } },
    { src: 'samples/neon-street.jpg', name: 'Neon Street', tags: { place: 'NEON DISTRICT', time: '2:14 AM', sub: 'Night Shift' } },
    { src: 'samples/boulevard.jpg', name: 'Boulevard', tags: { place: 'OCEAN DRIVE', time: 'MIDDAY', sub: 'Cruise Control' } },
    { src: 'samples/marina.jpg', name: 'Marina', tags: { place: 'MARINA BAY', time: 'SUNSET', sub: 'Low Tide' } },
    { src: 'samples/pier.jpg', name: 'Pier', tags: { place: 'PALM PIER', time: 'BLUE HOUR', sub: 'Last Light' } }
  ];

  var ASPECTS = { '16:9': [1920, 1080], '4:5': [1080, 1350], '1:1': [1080, 1080] };

  var S = {
    layout: 'mosaic',
    aspect: '16:9',
    gradeParams: { grade: 'vice', strength: 0.9, contrast: 1.06, saturation: 1.12, grain: 0.25, vignette: 0.35, halftone: true, dots: 1 },
    photos: [],
    panels: [],
    captions: {
      title: 'PALM TIDE', subtitle: 'Vice Nights',
      tagline: 'EVERY SUNSET HAS A PRICE',
      quote: 'In Palm Tide, nobody leaves the way they came in.',
      source: 'PALM TIDE GAZETTE', badge: 'PALM CITY',
      ribbon: "COLLECTOR'S EDITION", volume: 'VOL. 06', stars: 5
    },
    selected: 0,
    activePhoto: 0
  };

  var photoSeq = 0;
  function makePhoto(src, name, tags) {
    var img = new Image();
    var p = { id: 'p' + (++photoSeq), src: src, name: name, tags: tags, img: img, loaded: false };
    img.onload = function () { p.loaded = true; scheduleDraw(); };
    img.src = src;
    return p;
  }

  function layoutPanels() {
    var built = window.PTL.LAYOUTS[S.layout].build(ASPECTS[S.aspect][0] / ASPECTS[S.aspect][1]);
    var n = built.rects.length;
    var order = [built.hero];
    for (var i = 0; i < n; i++) if (i !== built.hero) order.push(i);
    var panels = new Array(n);
    order.forEach(function (panelIdx, k) {
      var old = S.panels[panelIdx];
      panels[panelIdx] = {
        photo: S.photos.length ? k % S.photos.length : 0,
        ox: old ? old.ox : 0, oy: old ? old.oy : 0, zoom: old ? old.zoom : 1
      };
    });
    S.panels = panels;
    if (S.selected >= n) S.selected = 0;
  }

  // ---------- history ----------
  var undoStack = [], redoStack = [];
  function snapshot() {
    return JSON.stringify({
      layout: S.layout, aspect: S.aspect, gradeParams: S.gradeParams,
      captions: S.captions, selected: S.selected, activePhoto: S.activePhoto,
      panels: S.panels,
      photos: S.photos.map(function (p) { return { src: p.src, name: p.name, tags: p.tags }; })
    });
  }
  function restore(json) {
    var d = JSON.parse(json);
    S.layout = d.layout; S.aspect = d.aspect; S.gradeParams = d.gradeParams;
    S.captions = d.captions; S.selected = d.selected; S.activePhoto = d.activePhoto;
    S.panels = d.panels;
    var keep = {};
    S.photos.forEach(function (p) { keep[p.src] = p; });
    S.photos = d.photos.map(function (pd) { return keep[pd.src] || makePhoto(pd.src, pd.name, pd.tags); });
    syncControls();
    scheduleDraw();
  }
  function pushHistory() {
    undoStack.push(snapshot());
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
  }

  // ---------- drawing ----------
  var canvas = document.getElementById('cover');
  var ctx = canvas.getContext('2d');
  var drawQueued = false;
  function scheduleDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(function () { drawQueued = false; draw(); });
  }
  function draw() {
    var dims = ASPECTS[S.aspect];
    var maxW = canvas.parentElement.clientWidth || 900;
    var scale = Math.min(1, maxW / dims[0]);
    var w = Math.round(dims[0] * scale), h = Math.round(dims[1] * scale);
    if (document.body.classList.contains('shot')) { w = window.innerWidth; h = window.innerHeight; }
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    window.PTD.drawCover(ctx, w, h, S);
  }

  // ---------- controls ----------
  function $(id) { return document.getElementById(id); }
  function syncControls() {
    $('layoutSel').value = S.layout;
    $('gradeSel').value = S.gradeParams.grade;
    $('sStrength').value = S.gradeParams.strength;
    $('sContrast').value = S.gradeParams.contrast;
    $('sSaturation').value = S.gradeParams.saturation;
    $('sGrain').value = S.gradeParams.grain;
    $('sVignette').value = S.gradeParams.vignette;
    $('sDots').value = S.gradeParams.dots;
    $('halftone').checked = S.gradeParams.halftone;
    $('inTitle').value = S.captions.title;
    $('inSubtitle').value = S.captions.subtitle;
    $('inTagline').value = S.captions.tagline;
    $('inQuote').value = S.captions.quote;
    $('inSource').value = S.captions.source;
    $('inBadge').value = S.captions.badge;
    $('inRibbon').value = S.captions.ribbon;
    $('inVolume').value = S.captions.volume;
    $('inStars').value = S.captions.stars;
    document.querySelectorAll('[data-aspect]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-aspect') === S.aspect);
    });
    syncTagInputs();
    renderThumbs();
  }
  function syncTagInputs() {
    var panel = S.panels[S.selected];
    var photo = panel ? S.photos[panel.photo] : null;
    $('tagPlace').value = photo ? photo.tags.place : '';
    $('tagTime').value = photo ? photo.tags.time : '';
    $('tagSub').value = photo ? photo.tags.sub : '';
    $('panelLabel').textContent = 'Panel ' + (S.selected + 1) + (photo ? ' — ' + photo.name : '');
  }
  function renderThumbs() {
    var box = $('thumbs');
    box.innerHTML = '';
    S.photos.forEach(function (p, idx) {
      var d = document.createElement('button');
      d.className = 'thumb' + (idx === S.activePhoto ? ' on' : '');
      d.type = 'button';
      var im = document.createElement('img');
      im.src = p.src; im.alt = p.name;
      var lb = document.createElement('span');
      lb.textContent = p.name;
      d.appendChild(im); d.appendChild(lb);
      d.addEventListener('click', function () {
        S.activePhoto = idx;
        if (S.panels[S.selected]) S.panels[S.selected].photo = idx;
        renderThumbs(); syncTagInputs(); scheduleDraw();
      });
      box.appendChild(d);
    });
  }

  function bind() {
    $('layoutSel').addEventListener('change', function () { pushHistory(); S.layout = this.value; layoutPanels(); scheduleDraw(); });
    $('gradeSel').addEventListener('change', function () { pushHistory(); S.gradeParams.grade = this.value; window.PTG.clearCache(); scheduleDraw(); });
    [['sStrength', 'strength'], ['sContrast', 'contrast'], ['sSaturation', 'saturation'],
     ['sGrain', 'grain'], ['sVignette', 'vignette'], ['sDots', 'dots']].forEach(function (pair) {
      $(pair[0]).addEventListener('input', function () {
        S.gradeParams[pair[1]] = parseFloat(this.value);
        if (pair[1] === 'strength' || pair[1] === 'contrast' || pair[1] === 'saturation' || pair[1] === 'dots') window.PTG.clearCache();
        scheduleDraw();
      });
      $(pair[0]).addEventListener('change', pushHistory);
    });
    $('halftone').addEventListener('change', function () { pushHistory(); S.gradeParams.halftone = this.checked; window.PTG.clearCache(); scheduleDraw(); });
    [['inTitle', 'title'], ['inSubtitle', 'subtitle'], ['inTagline', 'tagline'], ['inQuote', 'quote'],
     ['inSource', 'source'], ['inBadge', 'badge'], ['inRibbon', 'ribbon'], ['inVolume', 'volume']].forEach(function (pair) {
      $(pair[0]).addEventListener('input', function () { S.captions[pair[1]] = this.value; scheduleDraw(); });
      $(pair[0]).addEventListener('change', pushHistory);
    });
    $('inStars').addEventListener('input', function () { S.captions.stars = parseInt(this.value, 10) || 0; scheduleDraw(); });
    $('inStars').addEventListener('change', pushHistory);
    [['tagPlace', 'place'], ['tagTime', 'time'], ['tagSub', 'sub']].forEach(function (pair) {
      $(pair[0]).addEventListener('input', function () {
        var panel = S.panels[S.selected];
        if (panel && S.photos[panel.photo]) { S.photos[panel.photo].tags[pair[1]] = this.value; scheduleDraw(); }
      });
      $(pair[0]).addEventListener('change', pushHistory);
    });
    document.querySelectorAll('[data-aspect]').forEach(function (b) {
      b.addEventListener('click', function () {
        pushHistory();
        S.aspect = b.getAttribute('data-aspect');
        layoutPanels(); syncControls(); scheduleDraw();
      });
    });
    document.querySelectorAll('[data-variant]').forEach(function (b) {
      b.addEventListener('click', function () { pushHistory(); applyVariant(b.getAttribute('data-variant')); syncControls(); scheduleDraw(); });
    });
    $('fillAll').addEventListener('click', function () {
      pushHistory();
      S.panels.forEach(function (p) { p.photo = S.activePhoto; });
      scheduleDraw();
    });
    $('spread').addEventListener('click', function () {
      pushHistory();
      S.panels.forEach(function (p, i) { p.photo = i % S.photos.length; });
      scheduleDraw();
    });
    $('undoBtn').addEventListener('click', function () {
      if (!undoStack.length) return;
      redoStack.push(snapshot());
      restore(undoStack.pop());
    });
    $('redoBtn').addEventListener('click', function () {
      if (!redoStack.length) return;
      undoStack.push(snapshot());
      restore(redoStack.pop());
    });
    document.querySelectorAll('[data-export]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-export');
        if (v === 'all') { exportPNG(1080, 1080); exportPNG(1080, 1350); exportPNG(1920, 1080); }
        else { var parts = v.split('x'); exportPNG(parseInt(parts[0], 10), parseInt(parts[1], 10)); }
      });
    });
    $('fileInput').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
    var stage = $('stage');
    ['dragover', 'dragenter'].forEach(function (ev) { stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.add('drop'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.remove('drop'); }); });
    stage.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });

    // canvas panel interaction: select, drag to reposition, wheel to zoom
    var drag = null;
    function panelAt(evt) {
      var rect = canvas.getBoundingClientRect();
      var mx = (evt.clientX - rect.left) / rect.width, my = (evt.clientY - rect.top) / rect.height;
      var built = window.PTL.LAYOUTS[S.layout].build(ASPECTS[S.aspect][0] / ASPECTS[S.aspect][1]);
      for (var i = 0; i < built.rects.length; i++) {
        var r = built.rects[i];
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
      }
      return -1;
    }
    canvas.addEventListener('pointerdown', function (e) {
      var idx = panelAt(e);
      if (idx >= 0) {
        if (idx !== S.selected) { S.selected = idx; syncTagInputs(); }
        drag = { idx: idx, x: e.clientX, y: e.clientY, moved: false };
        canvas.setPointerCapture(e.pointerId);
        scheduleDraw();
      }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var rect = canvas.getBoundingClientRect();
      var panel = S.panels[drag.idx];
      if (!panel) return;
      var dx = (e.clientX - drag.x) / rect.width, dy = (e.clientY - drag.y) / rect.height;
      if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
      panel.ox = Math.max(-1, Math.min(1, panel.ox + dx * 2.2));
      panel.oy = Math.max(-1, Math.min(1, panel.oy + dy * 2.2));
      drag.x = e.clientX; drag.y = e.clientY;
      scheduleDraw();
    });
    canvas.addEventListener('pointerup', function () {
      if (drag && drag.moved) pushHistory();
      drag = null;
    });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var idx = panelAt(e);
      if (idx < 0 || !S.panels[idx]) return;
      S.selected = idx; syncTagInputs();
      var p = S.panels[idx];
      p.zoom = Math.max(1, Math.min(2.6, p.zoom * (e.deltaY < 0 ? 1.07 : 0.93)));
      scheduleDraw();
    }, { passive: false });
    canvas.addEventListener('dblclick', function (e) {
      var idx = panelAt(e);
      if (idx >= 0 && S.panels[idx]) {
        pushHistory();
        S.panels[idx].ox = 0; S.panels[idx].oy = 0; S.panels[idx].zoom = 1;
        scheduleDraw();
      }
    });
    window.addEventListener('resize', scheduleDraw);
  }

  function addFiles(files) {
    if (!files || !files.length) return;
    pushHistory();
    Array.prototype.forEach.call(files, function (f) {
      if (!/^image\//.test(f.type)) return;
      var url = URL.createObjectURL(f);
      var p = makePhoto(url, f.name.replace(/\.[^.]+$/, ''), { place: 'PALM TIDE', time: 'ON LOCATION', sub: 'Your Shot' });
      S.photos.push(p);
      if (S.panels[S.selected]) S.panels[S.selected].photo = S.photos.length - 1;
      S.activePhoto = S.photos.length - 1;
    });
    renderThumbs(); syncTagInputs(); scheduleDraw();
  }

  function exportPNG(w, h) {
    var off = document.createElement('canvas');
    off.width = w; off.height = h;
    var prevSelected = S.selected;
    S.selected = -1;
    window.PTD.drawCover(off.getContext('2d'), w, h, S);
    S.selected = prevSelected;
    off.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'palm-tide-cover-' + w + 'x' + h + '.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }, 'image/png');
  }

  var VARIANTS = {
    sunset: { grade: 'vice', layout: 'mosaic', subtitle: 'Vice Nights' },
    neon: { grade: 'neon', layout: 'mosaic', subtitle: 'Neon Confessions' },
    comic: { grade: 'comic', layout: 'comic', subtitle: 'Ink & Powder' }
  };
  function applyVariant(name) {
    var v = VARIANTS[name];
    if (!v) return;
    S.gradeParams.grade = v.grade;
    S.captions.subtitle = v.subtitle;
    if (S.layout !== v.layout) { S.layout = v.layout; layoutPanels(); }
    window.PTG.clearCache();
  }

  // ---------- boot ----------
  function boot() {
    S.photos = SAMPLES.map(function (s) { return makePhoto(s.src, s.name, s.tags); });
    layoutPanels();
    bind();
    syncControls();

    var q = new URLSearchParams(location.search);
    if (q.get('shot')) {
      document.body.classList.add('shot');
      var variant = q.get('variant') || 'sunset';
      applyVariant(variant);
      if (q.get('layout')) { S.layout = q.get('layout'); layoutPanels(); }
      if (q.get('grade')) { S.gradeParams.grade = q.get('grade'); window.PTG.clearCache(); }
      if (q.get('shot') === 'editor') document.body.classList.remove('shot');
      syncControls();
    }

    var waits = S.photos.map(function (p) {
      return p.loaded ? Promise.resolve() : new Promise(function (res) { p.img.onload = function () { p.loaded = true; res(); }; });
    });
    Promise.all(waits.concat([document.fonts.ready])).then(function () {
      draw();
      window.__shotReady = true;
    });
    scheduleDraw();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
