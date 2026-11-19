// studio.js — the PALM TIDE Cover Studio editor.
//
// Owns the cover state (photos, panel assignment and crops, captions,
// grade settings), wires the three-column editor, handles canvas
// interactions (click to select a panel, drag to reposition its photo,
// wheel to zoom, double-click to reset), keeps undo/redo history, and
// exports PNGs by running the same renderer at full post size.
// It also serves the ?shot= scenes used to take the entry screenshots:
// ?shot=cover&variant=<id>&size=<id> draws one cover full-frame and
// ?shot=editor shows the editor with the default cover loaded.

import { GRADES } from './grade.js';
import { LAYOUTS, panelsFor, pointInPanel } from './layouts.js';
import { createRenderer } from './render.js';

const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  landscape: [1920, 1080],
};

const VARIANTS = {
  sunset: { grade: 'vice-sunset', layout: 'hero', size: 'landscape' },
  neon: { grade: 'neon-night', layout: 'hero', size: 'landscape' },
  comic: { grade: 'poster-ink', layout: 'grid9', size: 'portrait' },
};

const SAMPLES = [
  { src: 'samples/convertible.jpg', name: 'Convertible' },
  { src: 'samples/boulevard.jpg', name: 'Boulevard' },
  { src: 'samples/rooftop.jpg', name: 'Rooftop' },
  { src: 'samples/neon-street.jpg', name: 'Neon Street' },
  { src: 'samples/pier.jpg', name: 'Pier' },
  { src: 'samples/marina.jpg', name: 'Marina' },
];

const DEFAULT_TAGS = [
  { place: 'OCEAN DRIVE', time: '6:42 PM', sub: 'LOOKING FOR TROUBLE' },
  { place: 'MARINA DEL SOL', time: '7:48 PM', sub: 'NO WITNESSES' },
  { place: 'TOWER 9', time: '6:10 PM', sub: 'LAST SWIM' },
  { place: 'PALM BOULEVARD', time: '9:15 PM', sub: 'LIGHTS OUT' },
  { place: 'INTERSTATE 6', time: '11:58 PM', sub: 'FULL THROTTLE' },
  { place: 'NEON ROW', time: '2:15 AM', sub: 'CITY OF GLASS' },
  { place: 'PIER 26', time: '3:30 AM', sub: 'GONE FISHING' },
  { place: 'SUNSET HEIGHTS', time: '9:30 PM', sub: 'BIG MONEY' },
  { place: 'THE FLATS', time: '5:05 AM', sub: 'FIRST LIGHT' },
];

const MAX_PANELS = 9;

const state = {
  size: 'landscape',
  layout: 'hero',
  grade: 'vice-sunset',
  variant: 'sunset',
  strength: 0.9,
  contrast: 0.12,
  saturation: 0.18,
  grain: 0.3,
  vignette: 0.45,
  halftone: true,
  halftoneAmt: 0.55,
  title: 'PALM TIDE',
  subtitle: 'Neon runs the coast',
  tagline: 'ONE COAST · NO RULES · COMING SOON',
  quote: 'A fever dream in neon, worth every mile.',
  quoteSource: 'The Coast Herald',
  badge: 'ORIGINAL COVER ART',
  ribbon: "Collector's Edition",
  volume: 'VOL. 06',
  hud: 'WANTED',
  stars: 5,
  photos: [],
  panelPhoto: new Array(MAX_PANELS).fill(null),
  panelCrop: Array.from({ length: MAX_PANELS }, () => ({ dx: 0, dy: 0, zoom: 1 })),
  panelTags: DEFAULT_TAGS.map((t) => ({ ...t })),
  selected: 0,
};

const renderer = createRenderer();
let photoSeq = 0;
let shotMode = false;

// ---------- state helpers ----------

function view() {
  return {
    ...state,
    showSelection: !shotMode,
    photoForPanel(i) {
      const idx = state.panelPhoto[i];
      return idx == null ? null : state.photos[idx] || null;
    },
    panelCropFor(i) {
      return state.panelCrop[i] || { dx: 0, dy: 0, zoom: 1 };
    },
  };
}

function panelCount() {
  const [w, h] = SIZES[state.size];
  return panelsFor(state.layout, w, h).length;
}

function spreadPanels() {
  if (!state.photos.length) return;
  for (let i = 0; i < MAX_PANELS; i++) state.panelPhoto[i] = i % state.photos.length;
}

function fillAllPanels() {
  if (!state.photos.length) return;
  const current = state.panelPhoto[state.selected];
  const idx = current == null ? 0 : current;
  for (let i = 0; i < MAX_PANELS; i++) state.panelPhoto[i] = idx;
}

// ---------- history ----------

const undoStack = [];
const redoStack = [];

function snapshot() {
  const { photos, ...rest } = state;
  return JSON.stringify(rest);
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncHistoryButtons();
}

function restore(snap) {
  const data = JSON.parse(snap);
  const photos = state.photos;
  Object.assign(state, data);
  state.photos = photos;
  syncForm();
  render();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncHistoryButtons();
}

function syncHistoryButtons() {
  const u = document.getElementById('btnUndo');
  const r = document.getElementById('btnRedo');
  if (u) u.disabled = !undoStack.length;
  if (r) r.disabled = !redoStack.length;
}

// ---------- photo loading ----------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  for (const s of SAMPLES) {
    try {
      const img = await loadImage(s.src);
      state.photos.push({ id: `sample-${photoSeq++}`, img, name: s.name, thumb: s.src });
    } catch {
      // A missing sample simply leaves one fewer photo to spread.
    }
  }
}

async function addPhotoFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      state.photos.push({ id: `upload-${photoSeq++}`, img, name: file.name.replace(/\.[^.]+$/, ''), thumb: url });
      added++;
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  if (added) {
    for (let i = 0; i < MAX_PANELS && added > 0; i++) {
      if (state.panelPhoto[i] == null) {
        state.panelPhoto[i] = state.photos.length - added;
        added--;
      }
    }
    buildThumbs();
    buildPanelControls();
    render();
  }
}

// ---------- rendering ----------

const preview = () => document.getElementById('preview');
let renderQueued = false;

function render() {
  if (shotMode) return renderShot();
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const canvas = preview();
    if (!canvas) return;
    const [ew, eh] = SIZES[state.size];
    const wrap = document.getElementById('canvasWrap');
    const avail = Math.min(wrap.clientWidth || 900, 1150);
    const w = Math.max(320, Math.round(avail));
    const h = Math.round((w * eh) / ew);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    renderer.draw(ctx, w, h, view());
  });
}

let shotCanvas = null;
function renderShot() {
  if (!shotCanvas) return;
  const [w, h] = SIZES[state.size];
  shotCanvas.width = w;
  shotCanvas.height = h;
  const ctx = shotCanvas.getContext('2d');
  renderer.draw(ctx, w, h, { ...view(), showSelection: false });
}

// ---------- editor construction ----------

const $ = (id) => document.getElementById(id);

function buildButtons(containerId, items, current, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn chip' + (item.id === current ? ' active' : '');
    b.textContent = item.name;
    b.addEventListener('click', () => onPick(item.id));
    box.appendChild(b);
  }
}

function buildThumbs() {
  const grid = $('photoGrid');
  grid.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'thumb';
    d.title = `${photo.name} — click to place in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.name;
    const label = document.createElement('span');
    label.textContent = photo.name;
    d.appendChild(img);
    d.appendChild(label);
    d.addEventListener('click', () => {
      pushHistory();
      state.panelPhoto[state.selected] = i;
      buildPanelControls();
      render();
    });
    grid.appendChild(d);
  });
  $('photoCount').textContent = `${state.photos.length} LOADED`;
}

function buildPanelControls() {
  const n = panelCount();
  if (state.selected >= n) state.selected = 0;
  const list = $('panelList');
  list.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn chip' + (i === state.selected ? ' active' : '');
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => selectPanel(i));
    list.appendChild(b);
  }
  $('selPanelName').textContent = `PANEL ${state.selected + 1} OF ${n}`;
  const sel = $('selPhoto');
  sel.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '— No photo —';
  sel.appendChild(none);
  state.photos.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = p.name;
    sel.appendChild(o);
  });
  const cur = state.panelPhoto[state.selected];
  sel.value = cur == null ? '' : String(cur);
  const tag = state.panelTags[state.selected];
  $('tagPlace').value = tag.place;
  $('tagTime').value = tag.time;
  $('tagSub').value = tag.sub;
}

function selectPanel(i) {
  state.selected = i;
  buildPanelControls();
  render();
}

function markActive(containerId, id) {
  const box = $(containerId);
  if (!box) return;
  [...box.children].forEach((b, i, arr) => {
    const items = containerId === 'layoutBtns' ? LAYOUTS : GRADES;
    b.classList.toggle('active', items[i] && items[i].id === id);
    void arr;
  });
}

function applyVariant(id, record = true) {
  const v = VARIANTS[id];
  if (!v) return;
  if (record) pushHistory();
  state.variant = id;
  state.grade = v.grade;
  state.layout = v.layout;
  state.size = v.size;
  document.querySelectorAll('[data-variant]').forEach((b) => {
    b.classList.toggle('active', b.dataset.variant === id);
  });
  syncForm();
  render();
}

function syncForm() {
  const set = (id, val) => { const el = $(id); if (el) el.value = val; };
  set('inTitle', state.title);
  set('inSubtitle', state.subtitle);
  set('inTagline', state.tagline);
  set('inQuote', state.quote);
  set('inQuoteSource', state.quoteSource);
  set('inBadge', state.badge);
  set('inRibbon', state.ribbon);
  set('inVolume', state.volume);
  set('inHud', state.hud);
  set('inStars', state.stars);
  set('starsVal', state.stars);
  const sliders = [
    ['inStrength', state.strength, 'strengthVal'],
    ['inContrast', state.contrast, 'contrastVal'],
    ['inSaturation', state.saturation, 'saturationVal'],
    ['inGrain', state.grain, 'grainVal'],
    ['inVignette', state.vignette, 'vignetteVal'],
    ['inHalftoneAmt', state.halftoneAmt, 'halftoneAmtVal'],
  ];
  for (const [id, val, label] of sliders) {
    set(id, val);
    const lab = $(label);
    if (lab) lab.textContent = Number(val).toFixed(2);
  }
  $('inHalftone').checked = state.halftone;
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  document.querySelectorAll('[data-variant]').forEach((b) => {
    b.classList.toggle('active', b.dataset.variant === state.variant);
  });
  markActive('layoutBtns', state.layout);
  markActive('gradeBtns', state.grade);
  $('btnExport').textContent = `EXPORT PNG ${SIZES[state.size][0]} × ${SIZES[state.size][1]}`;
  buildPanelControls();
  syncHistoryButtons();
}

// ---------- export ----------

function exportPng(sizeKey) {
  return new Promise((resolve) => {
    const [w, h] = SIZES[sizeKey];
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    renderer.draw(ctx, w, h, { ...view(), showSelection: false });
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `palm-tide-cover-${sizeKey}-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve();
    }, 'image/png');
  });
}

async function exportAll() {
  for (const key of ['square', 'portrait', 'landscape']) {
    await exportPng(key);
    await new Promise((r) => setTimeout(r, 350));
  }
}

// ---------- wiring ----------

function wireEditor() {
  buildButtons('layoutBtns', LAYOUTS, state.layout, (id) => {
    pushHistory();
    state.layout = id;
    markActive('layoutBtns', id);
    buildPanelControls();
    render();
  });
  buildButtons('gradeBtns', GRADES, state.grade, (id) => {
    pushHistory();
    state.grade = id;
    markActive('gradeBtns', id);
    render();
  });

  document.querySelectorAll('[data-variant]').forEach((b) => {
    b.addEventListener('click', () => applyVariant(b.dataset.variant));
  });
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.addEventListener('click', () => {
      pushHistory();
      state.size = b.dataset.size;
      syncForm();
      render();
    });
  });

  $('btnUndo').addEventListener('click', undo);
  $('btnRedo').addEventListener('click', redo);
  $('btnExport').addEventListener('click', () => exportPng(state.size));
  $('btnExportAll').addEventListener('click', exportAll);
  $('btnUpload').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', (e) => {
    addPhotoFiles([...e.target.files]);
    e.target.value = '';
  });
  $('btnFillAll').addEventListener('click', () => { pushHistory(); fillAllPanels(); render(); });
  $('btnSpread').addEventListener('click', () => { pushHistory(); spreadPanels(); render(); });
  $('btnResetCrop').addEventListener('click', () => {
    pushHistory();
    state.panelCrop[state.selected] = { dx: 0, dy: 0, zoom: 1 };
    render();
  });
  $('selPhoto').addEventListener('change', (e) => {
    pushHistory();
    state.panelPhoto[state.selected] = e.target.value === '' ? null : Number(e.target.value);
    render();
  });

  const tagFields = [['tagPlace', 'place'], ['tagTime', 'time'], ['tagSub', 'sub']];
  for (const [id, key] of tagFields) {
    $(id).addEventListener('input', (e) => {
      state.panelTags[state.selected][key] = e.target.value;
      render();
    });
    $(id).addEventListener('change', pushHistory);
  }

  const textFields = [
    ['inTitle', 'title'], ['inSubtitle', 'subtitle'], ['inTagline', 'tagline'],
    ['inQuote', 'quote'], ['inQuoteSource', 'quoteSource'], ['inBadge', 'badge'],
    ['inRibbon', 'ribbon'], ['inVolume', 'volume'], ['inHud', 'hud'],
  ];
  for (const [id, key] of textFields) {
    $(id).addEventListener('input', (e) => { state[key] = e.target.value; render(); });
    $(id).addEventListener('change', pushHistory);
  }

  const sliderFields = [
    ['inStrength', 'strength', 'strengthVal'], ['inContrast', 'contrast', 'contrastVal'],
    ['inSaturation', 'saturation', 'saturationVal'], ['inGrain', 'grain', 'grainVal'],
    ['inVignette', 'vignette', 'vignetteVal'], ['inHalftoneAmt', 'halftoneAmt', 'halftoneAmtVal'],
  ];
  for (const [id, key, label] of sliderFields) {
    $(id).addEventListener('input', (e) => {
      state[key] = Number(e.target.value);
      $(label).textContent = state[key].toFixed(2);
      render();
    });
    $(id).addEventListener('change', pushHistory);
  }
  $('inHalftone').addEventListener('change', (e) => {
    pushHistory();
    state.halftone = e.target.checked;
    render();
  });
  $('inStars').addEventListener('input', (e) => {
    state.stars = Number(e.target.value);
    $('starsVal').textContent = state.stars;
    render();
  });
  $('inStars').addEventListener('change', pushHistory);

  // Drag & drop photos onto the stage or the photo column.
  const dropTargets = [$('canvasWrap'), $('photoCol')];
  for (const t of dropTargets) {
    t.addEventListener('dragover', (e) => { e.preventDefault(); t.classList.add('dropping'); });
    t.addEventListener('dragleave', () => t.classList.remove('dropping'));
    t.addEventListener('drop', (e) => {
      e.preventDefault();
      t.classList.remove('dropping');
      addPhotoFiles([...e.dataTransfer.files]);
    });
  }

  wireCanvas();
  window.addEventListener('resize', render);
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    }
  });
}

function wireCanvas() {
  const canvas = preview();
  let drag = null;

  const toCover = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    const p = toCover(e);
    const panels = panelsFor(state.layout, canvas.width, canvas.height);
    for (let i = panels.length - 1; i >= 0; i--) {
      if (pointInPanel(panels[i], p.x, p.y)) {
        if (state.selected !== i) selectPanel(i);
        drag = { panel: i, x: p.x, y: p.y, moved: false };
        canvas.setPointerCapture(e.pointerId);
        break;
      }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toCover(e);
    const panels = panelsFor(state.layout, canvas.width, canvas.height);
    const panel = panels[drag.panel];
    const crop = state.panelCrop[drag.panel];
    crop.dx = Math.min(1, Math.max(-1, crop.dx - ((p.x - drag.x) / panel.w) * 1.6));
    crop.dy = Math.min(1, Math.max(-1, crop.dy - ((p.y - drag.y) / panel.h) * 1.6));
    drag.x = p.x;
    drag.y = p.y;
    drag.moved = true;
    render();
  });

  canvas.addEventListener('pointerup', () => {
    if (drag && drag.moved) pushHistory();
    drag = null;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const crop = state.panelCrop[state.selected];
    crop.zoom = Math.min(3.5, Math.max(1, crop.zoom * Math.exp(-e.deltaY * 0.0012)));
    render();
    clearTimeout(canvas._wheelTimer);
    canvas._wheelTimer = setTimeout(pushHistory, 450);
  }, { passive: false });

  canvas.addEventListener('dblclick', () => {
    pushHistory();
    state.panelCrop[state.selected] = { dx: 0, dy: 0, zoom: 1 };
    render();
  });
}

// ---------- boot ----------

async function boot() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // Fonts fall back to system sans/script; the app still works.
  }
  await loadSamples();
  spreadPanels();

  if (shot === 'cover') {
    shotMode = true;
    document.body.classList.add('shot');
    const variant = params.get('variant') || 'sunset';
    const v = VARIANTS[variant] || VARIANTS.sunset;
    state.variant = variant in VARIANTS ? variant : 'sunset';
    state.grade = v.grade;
    state.layout = v.layout;
    state.size = params.get('size') || v.size;
    shotCanvas = $('shotCanvas');
    shotCanvas.hidden = false;
    renderShot();
  } else {
    wireEditor();
    buildThumbs();
    syncForm();
    render();
  }
  window.__shotReady = true;
}

boot();
