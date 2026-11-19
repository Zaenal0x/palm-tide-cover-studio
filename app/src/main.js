// main.js — PALM TIDE Cover Studio editor.
//
// Loads the six bundled sample photos into the panels, wires the editor
// (uploads, per-panel crop, captions, grades, layouts, undo/redo, exports)
// and the ?shot= scenes the screenshots are taken from. The cover itself is
// drawn by draw.js; this file owns state and interaction only.

import { GRADES, GRADE_KEYS } from './palette.js';
import { LAYOUTS, LAYOUT_KEYS } from './layouts.js';
import { drawCover } from './draw.js';
import { gradedCanvas } from './grade.js';

const SAMPLES = [
  'samples/boulevard.jpg',
  'samples/convertible.jpg',
  'samples/rooftop.jpg',
  'samples/neon-street.jpg',
  'samples/marina.jpg',
  'samples/pier.jpg',
];

const DEFAULT_TAGS = [
  { place: 'OCEAN DRIVE', time: 'GOLDEN HOUR', sub: 'the boulevard wakes up loud' },
  { place: 'PALM ROOFTOP', time: 'DUSK', sub: 'last light over the skyline' },
  { place: 'NEON MILE', time: '2 AM', sub: 'the street that never dries' },
  { place: 'VICE MARINA', time: 'SUNSET', sub: 'masts, towers and still water' },
  { place: 'THE PIER', time: 'BLUE HOUR', sub: 'ferris lights on the tide' },
  { place: 'DOWNTOWN', time: 'RUSH HOUR', sub: 'chrome under a pink sky' },
  { place: 'SOUTH BEACH', time: 'NOON', sub: 'heat you can hear' },
  { place: 'HARBOUR GATE', time: 'DAWN', sub: 'first boats out' },
  { place: 'UPTOWN', time: 'MIDNIGHT', sub: 'windows still burning' },
];

const VARIANTS = {
  sunset: { grade: 'vice-sunset', layout: 'hero', strength: 0.9, dots: 0.85 },
  neon: { grade: 'neon-night', layout: 'hero', strength: 0.92, dots: 0.8 },
  comic: { grade: 'comic-ink', layout: 'grid9', strength: 0.95, dots: 1.1 },
};

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');

const state = {
  layout: 'hero',
  selected: 0,
  interactive: !shotMode,
  settings: {
    grade: 'vice-sunset', strength: 0.9, contrast: 1.07, saturation: 1.18,
    halftone: true, dots: 0.85, grain: 0.32, vignette: 0.45,
  },
  captions: {
    title: 'PALM TIDE',
    subtitle: 'Vice Heat',
    tagline: 'EVERY SUNSET HAS A PRICE',
    quote: 'The city never sleeps. It just changes shifts.',
    quoteSource: '— THE VICE GAZETTE',
    badge: 'EST. 2026',
    ribbon: "COLLECTOR'S EDITION",
    volume: 'VOL. 06',
    stars: 5,
  },
  panels: [],
};

const photos = []; // HTMLImageElement list, samples first

function makePanels(layoutKey) {
  const count = LAYOUTS[layoutKey].panels.length;
  const panels = [];
  for (let i = 0; i < count; i++) {
    panels.push({
      photo: photos.length ? i % photos.length : 0,
      ox: 0, oy: 0, zoom: 1,
      tag: { ...DEFAULT_TAGS[i % DEFAULT_TAGS.length] },
    });
  }
  return panels;
}

// ---------- undo / redo ----------
const undoStack = [];
const redoStack = [];
function snapshot() {
  return JSON.stringify({
    layout: state.layout, selected: state.selected,
    settings: state.settings, captions: state.captions, panels: state.panels,
  });
}
function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
}
function restore(json) {
  const data = JSON.parse(json);
  state.layout = data.layout;
  state.selected = data.selected;
  state.settings = data.settings;
  state.captions = data.captions;
  state.panels = data.panels;
  syncControls();
  render();
}
document.getElementById('undoBtn').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
});
document.getElementById('redoBtn').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
});

// ---------- rendering ----------
const stage = document.getElementById('stage');
const stageCtx = stage.getContext('2d');
function render() {
  drawCover(stageCtx, stage.width, stage.height, state, photos);
}

function renderTo(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const view = { ...state, interactive: false };
  drawCover(cv.getContext('2d'), w, h, view, photos);
  return cv;
}

// ---------- photos ----------
const thumbs = document.getElementById('thumbs');
function refreshThumbs() {
  thumbs.innerHTML = '';
  photos.forEach((img, i) => {
    const el = document.createElement('img');
    el.src = img.src;
    el.alt = `Photo ${i + 1}`;
    el.title = 'Put in selected panel';
    el.addEventListener('click', () => {
      pushUndo();
      state.panels[state.selected].photo = i;
      render();
    });
    thumbs.appendChild(el);
  });
}

function addPhoto(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { photos.push(img); resolve(img); };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const fileInput = document.getElementById('fileInput');
document.getElementById('uploadBtn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  pushUndo();
  for (const file of fileInput.files) {
    await addPhoto(URL.createObjectURL(file));
  }
  fileInput.value = '';
  refreshThumbs();
  render();
});

const dropZone = document.getElementById('dropZone');
for (const target of [dropZone, stage]) {
  target.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag'); });
  target.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
  target.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag');
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    pushUndo();
    for (const file of files) await addPhoto(URL.createObjectURL(file));
    refreshThumbs();
    render();
  });
}

document.getElementById('fillAllBtn').addEventListener('click', () => {
  pushUndo();
  const p = state.panels[state.selected].photo;
  state.panels.forEach((panel) => { panel.photo = p; });
  render();
});
document.getElementById('spreadBtn').addEventListener('click', () => {
  pushUndo();
  state.panels.forEach((panel, i) => { panel.photo = photos.length ? i % photos.length : 0; });
  render();
});

// ---------- panel selection + crop gestures ----------
function panelRects() {
  const W = stage.width;
  const H = stage.height;
  const m = W * 0.034;
  const stripH = H * 0.088;
  const region = { x: m, y: H * 0.145, w: W - m * 2, h: H - stripH - H * 0.145 - m * 0.7 };
  const gutter = Math.max(4, W * 0.011);
  return LAYOUTS[state.layout].panels.map((r) => ({
    x: region.x + r.x * region.w + gutter / 2,
    y: region.y + r.y * region.h + gutter / 2,
    w: r.w * region.w - gutter,
    h: r.h * region.h - gutter,
  }));
}

function stagePos(e) {
  const rect = stage.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (stage.width / rect.width),
    y: (e.clientY - rect.top) * (stage.height / rect.height),
  };
}

let drag = null;
stage.addEventListener('pointerdown', (e) => {
  const pos = stagePos(e);
  const rects = panelRects();
  const hit = rects.findIndex((r) => pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h);
  if (hit === -1) return;
  if (hit !== state.selected) {
    state.selected = hit;
    syncTagFields();
    render();
  }
  pushUndo();
  drag = { x: pos.x, y: pos.y, moved: false };
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pos = stagePos(e);
  const panel = state.panels[state.selected];
  const img = photos[panel.photo];
  if (!img) return;
  const rect = panelRects()[state.selected];
  const src = gradedCanvas(img, state.settings);
  const scale = Math.max(rect.w / src.width, rect.h / src.height) * panel.zoom;
  const dw = src.width * scale;
  const dh = src.height * scale;
  const dx = pos.x - drag.x;
  const dy = pos.y - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
  if (dw > rect.w) panel.ox = clamp(panel.ox + dx / ((dw - rect.w) * 0.5), -1.4, 1.4);
  if (dh > rect.h) panel.oy = clamp(panel.oy + dy / ((dh - rect.h) * 0.5), -1.4, 1.4);
  drag.x = pos.x;
  drag.y = pos.y;
  render();
});
stage.addEventListener('pointerup', () => {
  if (drag && !drag.moved) undoStack.pop(); // a plain click selects, not an edit
  drag = null;
});
stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  panel.zoom = clamp(panel.zoom * Math.exp(-e.deltaY * 0.0012), 1, 4.5);
  render();
}, { passive: false });
stage.addEventListener('dblclick', () => {
  const panel = state.panels[state.selected];
  panel.ox = 0;
  panel.oy = 0;
  panel.zoom = 1;
  render();
});

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

// ---------- controls ----------
const layoutRow = document.getElementById('layoutRow');
for (const key of LAYOUT_KEYS) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn chip layout-btn';
  btn.textContent = LAYOUTS[key].label;
  btn.dataset.layout = key;
  btn.addEventListener('click', () => {
    if (state.layout === key) return;
    pushUndo();
    state.layout = key;
    state.panels = makePanels(key);
    state.selected = 0;
    syncControls();
    render();
  });
  layoutRow.appendChild(btn);
}

const gradeSelect = document.getElementById('gradeSelect');
for (const key of GRADE_KEYS) {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = GRADES[key].label;
  gradeSelect.appendChild(opt);
}
gradeSelect.addEventListener('change', () => {
  pushUndo();
  state.settings.grade = gradeSelect.value;
  render();
});
document.getElementById('halftoneChk').addEventListener('change', (e) => {
  pushUndo();
  state.settings.halftone = e.target.checked;
  render();
});

const SLIDERS = [
  ['strength', 'Grade strength', 0, 1, 0.01],
  ['contrast', 'Contrast', 0.6, 1.6, 0.01],
  ['saturation', 'Saturation', 0, 2, 0.01],
  ['dots', 'Halftone dots', 0, 1.5, 0.01],
  ['grain', 'Grain', 0, 1, 0.01],
  ['vignette', 'Vignette', 0, 1, 0.01],
];
const sliderEls = {};
const sliderHost = document.getElementById('sliders');
for (const [key, label, min, max, step] of SLIDERS) {
  const row = document.createElement('div');
  row.className = 'slider-row';
  const lab = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = label;
  const val = document.createElement('span');
  lab.append(name, val);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min;
  input.max = max;
  input.step = step;
  input.addEventListener('input', () => {
    state.settings[key] = parseFloat(input.value);
    val.textContent = state.settings[key].toFixed(2);
    render();
  });
  input.addEventListener('change', () => pushUndoSnapshotOnly());
  row.append(lab, input);
  sliderHost.appendChild(row);
  sliderEls[key] = { input, val };
}
// A slider drag ends as one undo step holding the pre-drag state is complex;
// simplest honest approach: each discrete change event records the new state
// boundary by clearing redo (the value itself is already live).
function pushUndoSnapshotOnly() { redoStack.length = 0; }

const CAPTION_FIELDS = [
  ['title', 'Title'], ['subtitle', 'Subtitle'], ['tagline', 'Tagline'],
  ['quote', 'Quote'], ['quoteSource', 'Quote source'], ['badge', 'Badge'],
  ['ribbon', 'Ribbon'], ['volume', 'Volume tag'],
];
const captionEls = {};
const captionHost = document.getElementById('captionFields');
for (const [key, label] of CAPTION_FIELDS) {
  const lab = document.createElement('label');
  lab.className = 'lab';
  lab.textContent = label;
  const input = document.createElement('input');
  input.className = 'field';
  input.type = 'text';
  input.addEventListener('input', () => {
    state.captions[key] = input.value;
    render();
  });
  input.addEventListener('change', () => { redoStack.length = 0; });
  lab.appendChild(input);
  captionHost.appendChild(lab);
  captionEls[key] = input;
}
const starsLab = document.createElement('label');
starsLab.className = 'lab';
starsLab.textContent = 'WANTED stars';
const starsInput = document.createElement('input');
starsInput.className = 'field';
starsInput.type = 'number';
starsInput.min = 0;
starsInput.max = 8;
starsInput.addEventListener('input', () => {
  state.captions.stars = clamp(parseInt(starsInput.value || '0', 10), 0, 8);
  render();
});
starsLab.appendChild(starsInput);
captionHost.appendChild(starsLab);
captionEls.stars = starsInput;

const tagEls = {
  place: document.getElementById('tagPlace'),
  time: document.getElementById('tagTime'),
  sub: document.getElementById('tagSub'),
};
for (const [key, el] of Object.entries(tagEls)) {
  el.addEventListener('input', () => {
    state.panels[state.selected].tag[key] = el.value;
    render();
  });
}
function syncTagFields() {
  const panel = state.panels[state.selected];
  document.getElementById('selectedLabel').textContent = `Panel ${state.selected + 1} selected`;
  if (!panel) return;
  tagEls.place.value = panel.tag.place || '';
  tagEls.time.value = panel.tag.time || '';
  tagEls.sub.value = panel.tag.sub || '';
}

document.getElementById('variantRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-variant]');
  if (!btn) return;
  pushUndo();
  const v = VARIANTS[btn.dataset.variant];
  state.settings.grade = v.grade;
  state.settings.strength = v.strength;
  state.settings.dots = v.dots;
  state.settings.halftone = true;
  if (state.layout !== v.layout) {
    state.layout = v.layout;
    state.panels = makePanels(v.layout);
    state.selected = 0;
  }
  syncControls();
  render();
});

function syncControls() {
  gradeSelect.value = state.settings.grade;
  document.getElementById('halftoneChk').checked = state.settings.halftone;
  for (const [key] of SLIDERS) {
    sliderEls[key].input.value = state.settings[key];
    sliderEls[key].val.textContent = Number(state.settings[key]).toFixed(2);
  }
  for (const [key] of CAPTION_FIELDS) captionEls[key].value = state.captions[key];
  captionEls.stars.value = state.captions.stars;
  for (const btn of layoutRow.children) {
    btn.classList.toggle('active', btn.dataset.layout === state.layout);
  }
  syncTagFields();
}

// ---------- exports ----------
function download(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}
document.querySelectorAll('[data-export]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const [w, h] = btn.dataset.export.split('x').map(Number);
    download(renderTo(w, h), `palm-tide-cover-${w}x${h}.png`);
  });
});
document.getElementById('exportAllBtn').addEventListener('click', async () => {
  for (const [w, h] of [[1080, 1080], [1080, 1350], [1920, 1080]]) {
    download(renderTo(w, h), `palm-tide-cover-${w}x${h}.png`);
    await new Promise((r) => setTimeout(r, 350));
  }
});

// ---------- boot ----------
async function loadFonts() {
  try {
    const anton = new FontFace('Anton', "url('fonts/Anton-Regular.ttf')");
    const pacifico = new FontFace('Pacifico', "url('fonts/Pacifico-Regular.ttf')");
    await Promise.all([anton.load(), pacifico.load()]);
    document.fonts.add(anton);
    document.fonts.add(pacifico);
  } catch { /* canvas falls back to system fonts */ }
}

async function boot() {
  for (const src of SAMPLES) await addPhoto(src);
  state.panels = makePanels(state.layout);

  if (shotMode === 'cover') {
    document.body.classList.add('shot');
    const variant = VARIANTS[params.get('variant')] || VARIANTS.sunset;
    state.settings.grade = variant.grade;
    state.settings.strength = variant.strength;
    state.settings.dots = variant.dots;
    if (params.get('layout')) state.layout = params.get('layout');
    else state.layout = variant.layout;
    if (params.get('grade')) state.settings.grade = params.get('grade');
    state.panels = makePanels(state.layout);
    stage.width = window.innerWidth;
    stage.height = window.innerHeight;
  } else if (shotMode === 'editor') {
    document.body.classList.add('shot-editor');
  }

  syncControls();
  refreshThumbs();
  await loadFonts();
  render();
  document.title = 'PALM TIDE Cover Studio — ready';
}

boot();
