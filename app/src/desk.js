// desk.js — the PALM TIDE editor: state, controls, pointer work,
// history, exports and the ?shot= screenshot scenes.
//
// The model is plain data (no image objects inside it), so history
// snapshots are cheap JSON clones. Photographs live in a separate
// array and panels refer to them by index.

import { GRADES } from './tones.js';
import { LAYOUTS, slotCount, layoutSlots } from './panels.js';
import { createComposer } from './artwork.js';

const SIZES = {
  landscape: [1920, 1080],
  square: [1080, 1080],
  portrait: [1080, 1350],
};

const SAMPLES = [
  ['samples/boulevard.jpg', 'Boulevard'],
  ['samples/convertible.jpg', 'Convertible'],
  ['samples/rooftop.jpg', 'Rooftop'],
  ['samples/neon-street.jpg', 'Neon Street'],
  ['samples/marina.jpg', 'Marina'],
  ['samples/pier.jpg', 'Pier'],
];

const TAG_POOL = [
  { place: 'Marina del Sol', time: '7:48 PM', sub: 'No witnesses' },
  { place: 'Tower 9', time: '6:10 PM', sub: 'Last swim' },
  { place: 'Ocean Drive', time: '6:42 PM', sub: 'Looking for trouble' },
  { place: 'Palm Boulevard', time: '9:15 PM', sub: 'Lights out' },
  { place: 'Interstate 6', time: '11:58 PM', sub: 'Full throttle' },
  { place: 'Neon Row', time: '2:15 AM', sub: 'City of glass' },
  { place: 'Vice Beach', time: '5:57 PM', sub: 'Golden hour' },
  { place: 'Port of Vice', time: '8:03 PM', sub: 'Cargo unknown' },
  { place: 'Calle Sol', time: '4:44 PM', sub: 'Heat wave' },
];

const VARIANTS = {
  sunset: { layoutId: 'hero', gradeId: 'vice' },
  neon: { layoutId: 'hero', gradeId: 'neon' },
  comic: { layoutId: 'nine', gradeId: 'comic' },
};

function defaultModel() {
  return {
    sizeId: 'landscape',
    layoutId: 'hero',
    gradeId: 'vice',
    fx: {
      strength: 0.9,
      contrast: 1.06,
      saturation: 1.12,
      grain: 0.25,
      vignette: 0.45,
      halftone: true,
      dots: 0.6,
    },
    slots: TAG_POOL.map((tag, i) => ({
      photo: i,
      ox: 0,
      oy: 0,
      zoom: 1,
      tag: { place: tag.place, time: tag.time, sub: tag.sub },
    })),
    text: {
      title: 'PALM TIDE',
      subtitle: 'Neon runs the coast',
      tagline: 'One coast · No rules · Coming soon',
      quote: 'A fever dream in neon, worth every mile.',
      source: 'The Coast Herald',
      badge: 'Original Cover Art',
      ribbon: "Collector's Edition",
      volume: 'VOL. 06',
      stars: 5,
    },
  };
}

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const composer = createComposer();

let model = defaultModel();
let photos = [];
let photoNames = [];
let selectedPanel = 0;
let selectedPhoto = 0;
let shotMode = false;

const undoStack = [];
const redoStack = [];
let historyTimer = null;

function snapshot() {
  return JSON.stringify(model);
}

function pushHistory(immediate) {
  const record = () => {
    undoStack.push(snapshot());
    if (undoStack.length > 80) undoStack.shift();
    redoStack.length = 0;
  };
  if (immediate) {
    record();
    return;
  }
  clearTimeout(historyTimer);
  historyTimer = setTimeout(record, 300);
}

function restore(json) {
  model = JSON.parse(json);
  syncControls();
  render();
}

function render() {
  const [W, H] = SIZES[model.sizeId];
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  composer.draw(ctx, W, H, model, photos, { selected: shotMode ? -1 : selectedPanel });
}

/* ---------------- controls ---------------- */

const $ = (id) => document.getElementById(id);

function fillSelect(sel, items) {
  sel.innerHTML = '';
  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name;
    sel.appendChild(opt);
  }
}

function syncControls() {
  $('layoutSel').value = model.layoutId;
  $('gradeSel').value = model.gradeId;
  $('sizeSel').value = model.sizeId;
  $('strengthR').value = model.fx.strength;
  $('contrastR').value = model.fx.contrast;
  $('saturationR').value = model.fx.saturation;
  $('grainR').value = model.fx.grain;
  $('vignetteR').value = model.fx.vignette;
  $('dotsR').value = model.fx.dots;
  $('halftoneC').checked = model.fx.halftone;
  $('titleI').value = model.text.title;
  $('subtitleI').value = model.text.subtitle;
  $('taglineI').value = model.text.tagline;
  $('quoteI').value = model.text.quote;
  $('sourceI').value = model.text.source;
  $('badgeI').value = model.text.badge;
  $('ribbonI').value = model.text.ribbon;
  $('volumeI').value = model.text.volume;
  $('starsSel').value = String(model.text.stars);
  syncTagInputs();
  document.querySelectorAll('[data-variant]').forEach((btn) => {
    const v = VARIANTS[btn.dataset.variant];
    btn.classList.toggle('active', v.layoutId === model.layoutId && v.gradeId === model.gradeId);
  });
}

function syncTagInputs() {
  const slot = model.slots[selectedPanel];
  $('tagPanelName').textContent = 'panel ' + (selectedPanel + 1);
  if (!slot) return;
  $('tagPlaceI').value = slot.tag.place;
  $('tagTimeI').value = slot.tag.time;
  $('tagSubI').value = slot.tag.sub;
}

function bindControls() {
  fillSelect($('layoutSel'), LAYOUTS);
  fillSelect($('gradeSel'), GRADES);

  $('layoutSel').addEventListener('change', (e) => {
    pushHistory(true);
    model.layoutId = e.target.value;
    if (selectedPanel >= slotCount(model.layoutId)) selectedPanel = 0;
    syncControls();
    render();
  });
  $('gradeSel').addEventListener('change', (e) => {
    pushHistory(true);
    model.gradeId = e.target.value;
    syncControls();
    render();
  });
  $('sizeSel').addEventListener('change', (e) => {
    model.sizeId = e.target.value;
    render();
  });

  const slider = (id, key, parse) => {
    $(id).addEventListener('input', (e) => {
      pushHistory(false);
      model.fx[key] = parse(e.target.value);
      render();
    });
  };
  slider('strengthR', 'strength', Number);
  slider('contrastR', 'contrast', Number);
  slider('saturationR', 'saturation', Number);
  slider('grainR', 'grain', Number);
  slider('vignetteR', 'vignette', Number);
  slider('dotsR', 'dots', Number);
  $('halftoneC').addEventListener('change', (e) => {
    pushHistory(true);
    model.fx.halftone = e.target.checked;
    render();
  });

  const textField = (id, key) => {
    $(id).addEventListener('input', (e) => {
      pushHistory(false);
      model.text[key] = e.target.value;
      render();
    });
  };
  textField('titleI', 'title');
  textField('subtitleI', 'subtitle');
  textField('taglineI', 'tagline');
  textField('quoteI', 'quote');
  textField('sourceI', 'source');
  textField('badgeI', 'badge');
  textField('ribbonI', 'ribbon');
  textField('volumeI', 'volume');
  $('starsSel').addEventListener('change', (e) => {
    pushHistory(true);
    model.text.stars = Number(e.target.value);
    render();
  });

  const tagField = (id, key) => {
    $(id).addEventListener('input', (e) => {
      pushHistory(false);
      model.slots[selectedPanel].tag[key] = e.target.value;
      render();
    });
  };
  tagField('tagPlaceI', 'place');
  tagField('tagTimeI', 'time');
  tagField('tagSubI', 'sub');

  document.querySelectorAll('[data-variant]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pushHistory(true);
      const v = VARIANTS[btn.dataset.variant];
      model.layoutId = v.layoutId;
      model.gradeId = v.gradeId;
      if (selectedPanel >= slotCount(model.layoutId)) selectedPanel = 0;
      syncControls();
      render();
    });
  });

  $('undoBtn').addEventListener('click', () => {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
  });
  $('redoBtn').addEventListener('click', () => {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) $('redoBtn').click();
      else $('undoBtn').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      $('redoBtn').click();
    }
  });

  $('fillAllBtn').addEventListener('click', () => {
    if (!photos.length) return;
    pushHistory(true);
    model.slots.forEach((slot) => { slot.photo = selectedPhoto; });
    render();
  });
  $('spreadBtn').addEventListener('click', () => {
    if (!photos.length) return;
    pushHistory(true);
    model.slots.forEach((slot, i) => { slot.photo = i % photos.length; });
    render();
  });

  $('exportBtn').addEventListener('click', () => exportPNG(model.sizeId));
  $('exportAllBtn').addEventListener('click', () => {
    exportPNG('square');
    setTimeout(() => exportPNG('portrait'), 350);
    setTimeout(() => exportPNG('landscape'), 700);
  });

  $('fileInput').addEventListener('change', (e) => {
    addPhotoFiles(e.target.files);
    e.target.value = '';
  });
  const stage = $('stage');
  stage.addEventListener('dragover', (e) => e.preventDefault());
  stage.addEventListener('drop', (e) => {
    e.preventDefault();
    addPhotoFiles(e.dataTransfer.files);
  });
}

/* ---------------- photos ---------------- */

function renderThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  photos.forEach((img, i) => {
    const fig = document.createElement('figure');
    if (i === selectedPhoto) fig.className = 'selected';
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = photoNames[i] || '';
    const cap = document.createElement('figcaption');
    cap.textContent = photoNames[i] || ('Photo ' + (i + 1));
    fig.appendChild(thumb);
    fig.appendChild(cap);
    fig.addEventListener('click', () => {
      selectedPhoto = i;
      pushHistory(true);
      model.slots[selectedPanel].photo = i;
      renderThumbs();
      render();
    });
    box.appendChild(fig);
  });
}

function addPhotoFiles(files) {
  const list = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
  if (!list.length) return;
  let pending = list.length;
  for (const file of list) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      photos.push(img);
      photoNames.push(file.name.replace(/\.[^.]+$/, ''));
      if (selectedPhoto >= photos.length) selectedPhoto = 0;
      pending--;
      if (pending === 0) {
        renderThumbs();
        render();
      }
    };
    img.src = url;
  }
}

function loadSamples() {
  return Promise.all(SAMPLES.map(([src, name]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ img, name });
    img.onerror = () => resolve(null);
    img.src = src;
  }))).then((loaded) => {
    for (const item of loaded) {
      if (!item) continue;
      photos.push(item.img);
      photoNames.push(item.name);
    }
    // Auto-fill: the first thing anyone sees is a finished cover.
    model.slots.forEach((slot, i) => {
      slot.photo = photos.length ? i % photos.length : -1;
    });
    renderThumbs();
  });
}

/* ---------------- pointer work on the cover ---------------- */

function canvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (canvas.width / rect.width),
    y: (evt.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function panelRects() {
  const [W, H] = SIZES[model.sizeId];
  const stripH = Math.round(H * 0.085);
  return layoutSlots(model.layoutId, W, H, stripH);
}

function bindPointer() {
  let drag = null;
  canvas.addEventListener('pointerdown', (evt) => {
    const p = canvasPoint(evt);
    const rects = panelRects();
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        selectedPanel = i;
        const slot = model.slots[i];
        drag = { x: p.x, y: p.y, ox: slot.ox, oy: slot.oy, moved: false };
        canvas.setPointerCapture(evt.pointerId);
        syncTagInputs();
        render();
        break;
      }
    }
  });
  canvas.addEventListener('pointermove', (evt) => {
    if (!drag) return;
    const p = canvasPoint(evt);
    const rects = panelRects();
    const r = rects[selectedPanel];
    const slot = model.slots[selectedPanel];
    const dx = (p.x - drag.x) / r.w;
    const dy = (p.y - drag.y) / r.h;
    if (Math.abs(dx) + Math.abs(dy) > 0.002 && !drag.moved) {
      pushHistory(true);
      drag.moved = true;
    }
    slot.ox = Math.max(-1, Math.min(1, drag.ox + dx));
    slot.oy = Math.max(-1, Math.min(1, drag.oy + dy));
    render();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (evt) => {
    evt.preventDefault();
    const slot = model.slots[selectedPanel];
    pushHistory(false);
    slot.zoom = Math.max(1, Math.min(4, slot.zoom * Math.exp(-evt.deltaY * 0.0012)));
    render();
  }, { passive: false });
  canvas.addEventListener('dblclick', () => {
    const slot = model.slots[selectedPanel];
    pushHistory(true);
    slot.ox = 0;
    slot.oy = 0;
    slot.zoom = 1;
    render();
  });
}

/* ---------------- export ---------------- */

function exportPNG(sizeId) {
  const [W, H] = SIZES[sizeId];
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  const octx = off.getContext('2d');
  const keepSize = model.sizeId;
  model.sizeId = sizeId;
  composer.draw(octx, W, H, model, photos, { selected: -1 });
  model.sizeId = keepSize;
  off.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'palm-tide-cover-' + sizeId + '-' + W + 'x' + H + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
}

/* ---------------- boot ---------------- */

function applyShotScene() {
  const params = new URLSearchParams(location.search);
  if (!params.has('shot')) return;
  const kind = params.get('shot');
  if (kind === 'cover') {
    shotMode = true;
    document.body.classList.add('shot');
    const v = VARIANTS[params.get('variant')] || VARIANTS.sunset;
    model.layoutId = v.layoutId;
    model.gradeId = v.gradeId;
    const size = params.get('size');
    if (SIZES[size]) model.sizeId = size;
  }
}

async function boot() {
  bindControls();
  bindPointer();
  applyShotScene();
  syncControls();
  render();
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('40px Anton'),
        document.fonts.load('40px Pacifico'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 3500)),
    ]);
  } catch (err) {
    /* fonts fall back to local stacks; the render below still runs */
  }
  await loadSamples();
  syncControls();
  render();
  window.__ptReady = true;
}

boot();
