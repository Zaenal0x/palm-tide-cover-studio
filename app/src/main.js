// main.js — PALM TIDE Cover Studio editor: state, interactions, undo/redo,
// exports, and the ?shot= scenes used for the entry screenshots.

import { GRADES } from './grade.js';
import { LAYOUTS, LAYOUT_ORDER, panelRects } from './layouts.js';
import { drawCover } from './draw.js';

const SAMPLES = [
  { file: 'samples/boulevard.jpg', name: 'Boulevard' },
  { file: 'samples/convertible.jpg', name: 'Convertible' },
  { file: 'samples/rooftop.jpg', name: 'Rooftop' },
  { file: 'samples/neon-street.jpg', name: 'Neon Street' },
  { file: 'samples/marina.jpg', name: 'Marina' },
  { file: 'samples/pier.jpg', name: 'Pier' },
];

const TAG_DEFAULTS = [
  { place: 'OCEAN DRIVE', time: '18:42', sub: 'golden hour' },
  { place: 'NEON MILE', time: '23:15', sub: 'after dark' },
  { place: 'MARINA BAY', time: '19:03', sub: 'last light' },
  { place: 'PALM HEIGHTS', time: '12:20', sub: 'high noon' },
  { place: 'THE DOCKS', time: '06:10', sub: 'first ferry' },
  { place: 'CORAL STRIP', time: '21:47', sub: 'neon rain' },
  { place: 'VICE PORT', time: '15:30', sub: 'cargo day' },
  { place: 'SOUTH BEACH', time: '17:55', sub: 'low sun' },
  { place: 'DOWNTOWN', time: '00:05', sub: 'midnight' },
];

function freshPanels() {
  return TAG_DEFAULTS.map((t, i) => ({
    photo: null, dx: 0, dy: 0, zoom: 1,
    tag: { place: t.place, time: t.time, sub: t.sub },
    _i: i,
  }));
}

const VARIANTS = {
  sunset: { grade: 'vice', layout: 'mosaic', strength: 0.9, contrast: 1.08, saturation: 1.15, halftone: true, dots: 0.8 },
  neon: { grade: 'neon', layout: 'mosaic', strength: 0.95, contrast: 1.12, saturation: 1.2, halftone: true, dots: 0.85 },
  ink: { grade: 'comic', layout: 'grid9', strength: 1.0, contrast: 1.15, saturation: 1.05, halftone: true, dots: 1.0 },
};

function defaultState() {
  return {
    layout: 'mosaic', grade: 'vice',
    strength: 0.9, contrast: 1.08, saturation: 1.15,
    grain: 0.25, vignette: 0.35, halftone: true, dots: 0.8,
    title: 'PALM TIDE', subtitle: 'Vice Nights',
    tagline: 'ONE CITY. EVERY STORY.',
    quote: 'The tide always collects.',
    quoteSource: '— PALM TIDE GAZETTE',
    badge: 'EST. 2026', ribbon: "COLLECTOR'S EDITION", volume: 'VOL. 06', stars: 5,
    panels: freshPanels(),
  };
}

let state = defaultState();
let photos = []; // {src, img, name}
let selectedPanel = 0;
const $ = (id) => document.getElementById(id);

// ---------- history ----------
let undoStack = [], redoStack = [];
function snapshot() { return JSON.stringify(state); }
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}
function restore(json) {
  state = JSON.parse(json);
  syncControls();
  render();
}
function syncUndoButtons() {
  if ($('undoBtn')) $('undoBtn').disabled = undoStack.length === 0;
  if ($('redoBtn')) $('redoBtn').disabled = redoStack.length === 0;
}

// ---------- rendering ----------
let stageCtx = null;
let rafPending = false;
function render() {
  if (!stageCtx) return;
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const cv = $('stage');
    drawCover(stageCtx, cv.width, cv.height, state, photos, selectedPanel);
  });
}

function spreadPhotos() {
  state.panels.forEach((p, i) => { p.photo = photos.length ? i % photos.length : null; });
}

// ---------- controls sync ----------
function syncControls() {
  const set = (id, v) => { const el = $(id); if (el) el.value = v; };
  set('inTitle', state.title); set('inSubtitle', state.subtitle);
  set('inTagline', state.tagline); set('inQuote', state.quote);
  set('inQuoteSource', state.quoteSource); set('inBadge', state.badge);
  set('inRibbon', state.ribbon); set('inVolume', state.volume);
  set('inStars', state.stars);
  set('selGrade', state.grade);
  set('slStrength', state.strength); set('slContrast', state.contrast);
  set('slSaturation', state.saturation); set('slGrain', state.grain);
  set('slVignette', state.vignette); set('slDots', state.dots);
  if ($('ckHalftone')) $('ckHalftone').checked = state.halftone;
  document.querySelectorAll('#layoutChips button').forEach((b) => {
    b.classList.toggle('on', b.dataset.layout === state.layout);
  });
  syncPanelEditor();
  syncUndoButtons();
}

function syncPanelEditor() {
  const p = state.panels[selectedPanel];
  if (!$('panelInfo')) return;
  $('panelInfo').textContent = `Panel ${selectedPanel + 1} of ${LAYOUTS[state.layout].panels.length} in this layout`;
  $('tagPlace').value = p.tag.place;
  $('tagTime').value = p.tag.time;
  $('tagSub').value = p.tag.sub;
  const sel = $('panelPhotoSel');
  sel.innerHTML = '';
  const none = document.createElement('option');
  none.value = '-1'; none.textContent = '— no photo —';
  sel.appendChild(none);
  photos.forEach((ph, i) => {
    const o = document.createElement('option');
    o.value = String(i); o.textContent = ph.name;
    sel.appendChild(o);
  });
  sel.value = p.photo == null ? '-1' : String(p.photo);
}

function renderLibrary() {
  const lib = $('photoLib');
  lib.innerHTML = '';
  photos.forEach((ph, i) => {
    const d = document.createElement('button');
    d.className = 'thumb';
    d.title = `${ph.name} — click to put in selected panel`;
    const im = document.createElement('img');
    im.src = ph.src; im.alt = ph.name;
    const cap = document.createElement('span');
    cap.textContent = ph.name;
    d.appendChild(im); d.appendChild(cap);
    d.addEventListener('click', () => {
      pushHistory();
      state.panels[selectedPanel].photo = i;
      render();
    });
    lib.appendChild(d);
  });
}

// ---------- photo loading ----------
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

async function addPhoto(src, name) {
  const img = await loadImage(src);
  photos.push({ src, img, name });
  renderLibrary();
  syncPanelEditor();
  return photos.length - 1;
}

// ---------- wiring ----------
function wire() {
  const cv = $('stage');
  stageCtx = cv.getContext('2d');

  // layout chips
  const chips = $('layoutChips');
  for (const name of LAYOUT_ORDER) {
    const b = document.createElement('button');
    b.className = 'btn chip' + (name === state.layout ? ' on' : '');
    b.dataset.layout = name;
    b.textContent = LAYOUTS[name].label;
    b.addEventListener('click', () => { pushHistory(); state.layout = name; syncControls(); render(); });
    chips.appendChild(b);
  }

  // variants
  const variant = (key) => () => {
    pushHistory();
    Object.assign(state, VARIANTS[key]);
    syncControls(); render();
  };
  $('variantSunset').addEventListener('click', variant('sunset'));
  $('variantNeon').addEventListener('click', variant('neon'));
  $('variantInk').addEventListener('click', variant('ink'));

  // text inputs
  const bindText = (id, key) => {
    $(id).addEventListener('input', (e) => { state[key] = e.target.value; render(); });
    $(id).addEventListener('change', () => pushHistorySoft());
  };
  // history on focus, so a typing run is one undo step
  let focusSnap = null;
  const pushHistorySoft = () => { if (focusSnap && focusSnap !== snapshot()) { undoStack.push(focusSnap); redoStack = []; syncUndoButtons(); } focusSnap = null; };
  document.querySelectorAll('input[type="text"], input[type="number"]').forEach((el) => {
    el.addEventListener('focus', () => { focusSnap = snapshot(); });
    el.addEventListener('blur', pushHistorySoft);
  });
  bindText('inTitle', 'title'); bindText('inSubtitle', 'subtitle');
  bindText('inTagline', 'tagline'); bindText('inQuote', 'quote');
  bindText('inQuoteSource', 'quoteSource'); bindText('inBadge', 'badge');
  bindText('inRibbon', 'ribbon'); bindText('inVolume', 'volume');
  $('inStars').addEventListener('input', (e) => { state.stars = Math.max(0, Math.min(8, Number(e.target.value) || 0)); render(); });

  $('selGrade').addEventListener('change', (e) => { pushHistory(); state.grade = e.target.value; render(); });

  const bindSlider = (id, key) => {
    $(id).addEventListener('input', (e) => { state[key] = Number(e.target.value); render(); });
    $(id).addEventListener('change', () => pushHistorySoft());
    $(id).addEventListener('focus', () => { focusSnap = snapshot(); });
  };
  bindSlider('slStrength', 'strength'); bindSlider('slContrast', 'contrast');
  bindSlider('slSaturation', 'saturation'); bindSlider('slGrain', 'grain');
  bindSlider('slVignette', 'vignette'); bindSlider('slDots', 'dots');
  $('ckHalftone').addEventListener('change', (e) => { pushHistory(); state.halftone = e.target.checked; render(); });

  // panel tag editor
  const bindTag = (id, key) => {
    $(id).addEventListener('input', (e) => { state.panels[selectedPanel].tag[key] = e.target.value; render(); });
  };
  bindTag('tagPlace', 'place'); bindTag('tagTime', 'time'); bindTag('tagSub', 'sub');
  $('panelPhotoSel').addEventListener('change', (e) => {
    pushHistory();
    const v = Number(e.target.value);
    state.panels[selectedPanel].photo = v < 0 ? null : v;
    render();
  });
  $('resetPanelBtn').addEventListener('click', () => {
    pushHistory();
    const p = state.panels[selectedPanel];
    p.dx = 0; p.dy = 0; p.zoom = 1;
    render();
  });

  // library actions
  $('fillAllBtn').addEventListener('click', () => {
    if (!photos.length) return;
    pushHistory();
    const idx = state.panels[selectedPanel].photo ?? 0;
    state.panels.forEach((p) => { p.photo = idx; });
    render();
  });
  $('spreadBtn').addEventListener('click', () => { pushHistory(); spreadPhotos(); render(); });

  // upload
  const fi = $('fileInput');
  $('dropZone').addEventListener('click', () => fi.click());
  fi.addEventListener('change', async () => {
    for (const f of fi.files) await readFile(f);
    fi.value = '';
  });
  const dz = $('dropZone');
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', async (e) => {
    e.preventDefault(); dz.classList.remove('over');
    for (const f of e.dataTransfer.files) if (f.type.startsWith('image/')) await readFile(f);
  });
  async function readFile(f) {
    const src = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
    await addPhoto(src, f.name.replace(/\.[^.]+$/, ''));
    render();
  }

  // canvas interactions
  let drag = null;
  const toLocal = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
  };
  const panelAt = (pt) => {
    const rects = panelRects(state.layout, cv.width, cv.height);
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) return i;
    }
    return -1;
  };
  cv.addEventListener('pointerdown', (e) => {
    const pt = toLocal(e);
    const idx = panelAt(pt);
    if (idx < 0) return;
    if (idx !== selectedPanel) { selectedPanel = idx; syncPanelEditor(); render(); }
    drag = { idx, startX: pt.x, startY: pt.y, dx: state.panels[idx].dx, dy: state.panels[idx].dy, moved: false, snap: snapshot() };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pt = toLocal(e);
    const rects = panelRects(state.layout, cv.width, cv.height);
    const r = rects[drag.idx];
    const p = state.panels[drag.idx];
    p.dx = Math.max(-1.5, Math.min(1.5, drag.dx + (pt.x - drag.startX) / (r.w * 0.3)));
    p.dy = Math.max(-1.5, Math.min(1.5, drag.dy + (pt.y - drag.startY) / (r.h * 0.3)));
    drag.moved = true;
    render();
  });
  cv.addEventListener('pointerup', () => {
    if (drag && drag.moved) { undoStack.push(drag.snap); redoStack = []; syncUndoButtons(); }
    drag = null;
  });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const pt = toLocal(e);
    const idx = panelAt(pt);
    if (idx < 0) return;
    if (idx !== selectedPanel) { selectedPanel = idx; syncPanelEditor(); }
    const p = state.panels[idx];
    p.zoom = Math.max(0.6, Math.min(4, p.zoom * Math.exp(-e.deltaY * 0.0012)));
    render();
  }, { passive: false });
  cv.addEventListener('dblclick', (e) => {
    const idx = panelAt(toLocal(e));
    if (idx < 0) return;
    pushHistory();
    const p = state.panels[idx];
    p.dx = 0; p.dy = 0; p.zoom = 1;
    render();
  });

  // undo / redo
  $('undoBtn').addEventListener('click', () => {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
    syncUndoButtons();
  });
  $('redoBtn').addEventListener('click', () => {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
    syncUndoButtons();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? $('redoBtn') : $('undoBtn')).click(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); $('redoBtn').click(); }
  });

  // exports
  const doExport = (w, h) => exportPNG(w, h);
  $('expSquare').addEventListener('click', () => doExport(1080, 1080));
  $('expPortrait').addEventListener('click', () => doExport(1080, 1350));
  $('expWide').addEventListener('click', () => doExport(1920, 1080));
  $('expAll').addEventListener('click', async () => {
    await exportPNG(1080, 1080);
    await exportPNG(1080, 1350);
    await exportPNG(1920, 1080);
  });
}

function exportPNG(w, h) {
  return new Promise((resolve) => {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    drawCover(cv.getContext('2d'), w, h, state, photos, -1);
    cv.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `palm-tide-cover-${w}x${h}.png`;
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); resolve(); }, 400);
    }, 'image/png');
  });
}

// ---------- shot scenes ----------
async function initShot(params) {
  document.body.classList.add('shot');
  const variant = params.get('variant') || 'sunset';
  if (VARIANTS[variant]) Object.assign(state, VARIANTS[variant]);
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('grade')) state.grade = params.get('grade');
  const w = Number(params.get('w') || 1280), h = Number(params.get('h') || 720);
  const cv = document.createElement('canvas');
  cv.id = 'shotCanvas';
  cv.width = w; cv.height = h;
  document.body.appendChild(cv);
  await loadSamples();
  spreadPhotos();
  await document.fonts.ready;
  drawCover(cv.getContext('2d'), w, h, state, photos, -1);
  window.__ready = true;
}

async function loadSamples() {
  for (const s of SAMPLES) {
    try { await addPhoto(s.file, s.name); } catch { /* sample missing: skip */ }
  }
}

// ---------- boot ----------
(async function boot() {
  const params = new URLSearchParams(location.search);
  if (params.has('shot')) { await initShot(params); return; }
  wire();
  await loadSamples();
  spreadPhotos();
  await document.fonts.ready;
  syncControls();
  render();
  window.__ready = true;
})();
