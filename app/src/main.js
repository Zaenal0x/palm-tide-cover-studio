// main.js — the PALM TIDE Cover Studio editor: photo management, per-panel
// crop, captions and tags, the grade/layout controls, undo/redo, PNG export,
// and the ?shot= scenes the screenshots are rendered from.

import { GRADE_KEYS, GRADES } from './grade.js';
import { LAYOUTS, LAYOUT_KEYS, TAGS } from './layouts.js';
import { drawCover, rectsPx } from './draw.js';

const SAMPLES = [
  { src: 'samples/convertible.jpg', name: 'Convertible' },
  { src: 'samples/rooftop.jpg', name: 'Rooftop' },
  { src: 'samples/neon-street.jpg', name: 'Neon Street' },
  { src: 'samples/marina.jpg', name: 'Marina' },
  { src: 'samples/boulevard.jpg', name: 'Boulevard' },
  { src: 'samples/pier.jpg', name: 'Pier' },
];

const VARIANTS = {
  sunset: { grade: 'vice', layout: 'mosaic' },
  neon: { grade: 'neon', layout: 'mosaic' },
  comic: { grade: 'comic', layout: 'nine' },
};

let uid = 0;

function defaultPanels() {
  return TAGS.map((tag, i) => ({
    photo: i % SAMPLES.length,
    crop: { x: 0.5, y: 0.5, zoom: 1 },
    tag: { ...tag },
  }));
}

const state = {
  layout: 'mosaic',
  grade: 'vice',
  settings: { strength: 0.9, contrast: 1.0, saturation: 1.0, grain: 0.25, vignette: 0.45, halftone: true, dots: 0.5 },
  captions: {
    title: 'PALM TIDE',
    subtitle: 'Vice Nights',
    tagline: 'WELCOME TO PALM TIDE CITY',
    quote: '“Every sunset here costs somebody something.”',
    quoteBy: '— CITY CHRONICLE',
    badge: 'PALM TIDE CITY',
    ribbon: "COLLECTOR'S EDITION",
    vol: 'VOL. 06',
    stars: 5,
  },
  photos: [],
  panels: defaultPanels(),
  selected: 0,
};

// ---------- history (edits only; the photo list itself is not snapshotted) ----------
const history = { stack: [], idx: -1 };
function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, settings: state.settings,
    captions: state.captions, panels: state.panels, selected: state.selected,
  });
}
function pushHistory() {
  history.stack.length = history.idx + 1;
  history.stack.push(snapshot());
  if (history.stack.length > 80) history.stack.shift();
  history.idx = history.stack.length - 1;
}
function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  syncUI();
  render();
}
function undo() { if (history.idx > 0) { history.idx--; restore(history.stack[history.idx]); } }
function redo() { if (history.idx < history.stack.length - 1) { history.idx++; restore(history.stack[history.idx]); } }

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const stage = $('stageCanvas');

function render() {
  const ctx = stage.getContext('2d');
  drawCover(ctx, stage.width, stage.height, state, { selected: state.selected });
  $('panelLabel').textContent =
    `Panel ${state.selected + 1} of ${LAYOUTS[state.layout].panels.length} selected — ${state.panels[state.selected].tag.place}`;
}

function setAspect() {
  const [w, h] = $('sizeSel').value.split('x').map(Number);
  let pw = 960, ph = Math.round(960 * h / w);
  if (ph > 720) { ph = 720; pw = Math.round(720 * w / h); }
  stage.width = pw; stage.height = ph;
}

function syncUI() {
  $('layoutSel').value = state.layout;
  $('gradeSel').value = state.grade;
  const s = state.settings;
  $('sStrength').value = s.strength; $('vStrength').textContent = s.strength.toFixed(2);
  $('sContrast').value = s.contrast; $('vContrast').textContent = s.contrast.toFixed(2);
  $('sSat').value = s.saturation; $('vSat').textContent = s.saturation.toFixed(2);
  $('sGrain').value = s.grain; $('vGrain').textContent = s.grain.toFixed(2);
  $('sVig').value = s.vignette; $('vVig').textContent = s.vignette.toFixed(2);
  $('sDots').value = s.dots; $('vDots').textContent = s.dots.toFixed(2);
  $('halftoneChk').checked = s.halftone;
  const c = state.captions;
  $('cTitle').value = c.title; $('cSubtitle').value = c.subtitle;
  $('cTagline').value = c.tagline; $('cQuote').value = c.quote;
  $('cQuoteBy').value = c.quoteBy; $('cBadge').value = c.badge;
  $('cRibbon').value = c.ribbon; $('cVol').value = c.vol;
  $('cStars').value = c.stars; $('vStars').textContent = c.stars;
  syncTagInputs();
  document.querySelectorAll('[data-variant]').forEach((b) => {
    const v = VARIANTS[b.dataset.variant];
    b.classList.toggle('active', v.grade === state.grade && v.layout === state.layout);
  });
}

function syncTagInputs() {
  const tag = state.panels[state.selected].tag;
  $('tPlace').value = tag.place;
  $('tTime').value = tag.time;
  $('tSub').value = tag.sub;
}

// ---------- photos ----------
function addPhoto(img, name) {
  img.__uid = ++uid;
  state.photos.push({ img, name });
  const fig = document.createElement('figure');
  const thumb = document.createElement('img');
  thumb.src = img.src;
  thumb.alt = name;
  const cap = document.createElement('figcaption');
  cap.textContent = name;
  fig.append(thumb, cap);
  const idx = state.photos.length - 1;
  fig.addEventListener('click', () => {
    state.panels[state.selected].photo = idx;
    pushHistory();
    markThumb(idx);
    render();
  });
  $('thumbs').append(fig);
  markThumb(idx);
  return idx;
}
function markThumb(idx) {
  [...$('thumbs').children].forEach((f, i) => f.classList.toggle('sel', i === idx));
}
function loadFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => { addPhoto(img, file.name.replace(/\.[^.]+$/, '')); render(); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
}

// ---------- export ----------
function renderTo(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  drawCover(cv.getContext('2d'), w, h, state, {});
  return cv;
}
function download(canvas, name) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}
function exportSize() {
  const [w, h] = $('sizeSel').value.split('x').map(Number);
  download(renderTo(w, h), `palm-tide-cover-${w}x${h}.png`);
}
function exportAll() {
  [[1080, 1080], [1080, 1350], [1920, 1080]].forEach(([w, h], i) => {
    setTimeout(() => download(renderTo(w, h), `palm-tide-cover-${w}x${h}.png`), i * 450);
  });
}

// ---------- wiring ----------
function wire() {
  const layoutSel = $('layoutSel');
  for (const k of LAYOUT_KEYS) {
    const o = document.createElement('option');
    o.value = k; o.textContent = LAYOUTS[k].name;
    layoutSel.append(o);
  }
  const gradeSel = $('gradeSel');
  for (const k of GRADE_KEYS) {
    const o = document.createElement('option');
    o.value = k; o.textContent = GRADES[k].name;
    gradeSel.append(o);
  }
  layoutSel.addEventListener('change', () => {
    state.layout = layoutSel.value;
    if (state.selected >= LAYOUTS[state.layout].panels.length) state.selected = 0;
    pushHistory(); syncUI(); render();
  });
  gradeSel.addEventListener('change', () => { state.grade = gradeSel.value; pushHistory(); syncUI(); render(); });

  const slider = (id, valId, apply) => {
    const el = $(id);
    el.addEventListener('input', () => { apply(parseFloat(el.value)); $(valId).textContent = parseFloat(el.value).toFixed(2); render(); });
    el.addEventListener('change', pushHistory);
  };
  slider('sStrength', 'vStrength', (v) => state.settings.strength = v);
  slider('sContrast', 'vContrast', (v) => state.settings.contrast = v);
  slider('sSat', 'vSat', (v) => state.settings.saturation = v);
  slider('sGrain', 'vGrain', (v) => state.settings.grain = v);
  slider('sVig', 'vVig', (v) => state.settings.vignette = v);
  slider('sDots', 'vDots', (v) => state.settings.dots = v);
  $('halftoneChk').addEventListener('change', () => { state.settings.halftone = $('halftoneChk').checked; pushHistory(); render(); });

  const caption = (id, key, isNum = false) => {
    const el = $(id);
    el.addEventListener('input', () => {
      state.captions[key] = isNum ? parseInt(el.value, 10) || 0 : el.value;
      if (isNum) $('vStars').textContent = el.value;
      render();
    });
    el.addEventListener('change', pushHistory);
  };
  caption('cTitle', 'title'); caption('cSubtitle', 'subtitle');
  caption('cTagline', 'tagline'); caption('cQuote', 'quote');
  caption('cQuoteBy', 'quoteBy'); caption('cBadge', 'badge');
  caption('cRibbon', 'ribbon'); caption('cVol', 'vol');
  caption('cStars', 'stars', true);

  const tagInput = (id, key) => {
    const el = $(id);
    el.addEventListener('input', () => { state.panels[state.selected].tag[key] = el.value.toUpperCase(); render(); });
    el.addEventListener('change', pushHistory);
  };
  tagInput('tPlace', 'place'); tagInput('tTime', 'time'); tagInput('tSub', 'sub');

  document.querySelectorAll('[data-variant]').forEach((b) => {
    b.addEventListener('click', () => {
      Object.assign(state, VARIANTS[b.dataset.variant]);
      pushHistory(); syncUI(); render();
    });
  });

  $('uploadBtn').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', (e) => loadFiles(e.target.files));
  const photosCol = document.querySelector('.photos');
  photosCol.addEventListener('dragover', (e) => e.preventDefault());
  photosCol.addEventListener('drop', (e) => { e.preventDefault(); loadFiles(e.dataTransfer.files); });

  $('fillAllBtn').addEventListener('click', () => {
    const p = state.panels[state.selected].photo;
    state.panels.forEach((panel) => panel.photo = p);
    pushHistory(); render();
  });
  $('spreadBtn').addEventListener('click', () => {
    state.panels.forEach((panel, i) => panel.photo = i % state.photos.length);
    pushHistory(); render();
  });
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  $('sizeSel').addEventListener('change', () => { setAspect(); render(); });
  $('exportBtn').addEventListener('click', exportSize);
  $('exportAllBtn').addEventListener('click', exportAll);

  // per-panel crop: click selects, drag pans, wheel zooms, double-click resets
  let drag = null;
  const pos = (e) => {
    const r = stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) * stage.width / r.width, y: (e.clientY - r.top) * stage.height / r.height };
  };
  stage.addEventListener('pointerdown', (e) => {
    const p = pos(e);
    const rects = rectsPx(stage.width, stage.height, state.layout);
    const hit = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (hit >= 0) {
      state.selected = hit;
      syncTagInputs();
      drag = { x: p.x, y: p.y, crop: { ...state.panels[hit].crop }, rect: rects[hit] };
      stage.setPointerCapture(e.pointerId);
      render();
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pos(e);
    const crop = state.panels[state.selected].crop;
    crop.x = Math.min(1, Math.max(0, drag.crop.x - (p.x - drag.x) / (drag.rect.w * drag.crop.zoom)));
    crop.y = Math.min(1, Math.max(0, drag.crop.y - (p.y - drag.y) / (drag.rect.h * drag.crop.zoom)));
    render();
  });
  stage.addEventListener('pointerup', () => { if (drag) { drag = null; pushHistory(); } });
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const crop = state.panels[state.selected].crop;
    crop.zoom = Math.min(4, Math.max(1, crop.zoom * Math.exp(-e.deltaY * 0.0012)));
    render();
  }, { passive: false });
  stage.addEventListener('dblclick', () => {
    state.panels[state.selected].crop = { x: 0.5, y: 0.5, zoom: 1 };
    pushHistory(); render();
  });
}

// ---------- boot ----------
async function loadSamples() {
  // sequential, so photo indices always match SAMPLES order (panel tags
  // and the mosaic hero assignment are written against that order)
  for (const s of SAMPLES) {
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { addPhoto(img, s.name); resolve(); };
      img.onerror = resolve;
      img.src = s.src;
    });
  }
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');

async function boot() {
  wire();
  await loadSamples();
  await document.fonts.ready;
  if (shot === 'cover') {
    document.body.classList.add('shot');
    const v = VARIANTS[params.get('variant')] || VARIANTS.sunset;
    Object.assign(state, v);
    const cv = $('shotCanvas');
    cv.hidden = false;
    cv.width = parseInt(params.get('w'), 10) || 1280;
    cv.height = parseInt(params.get('h'), 10) || 720;
    drawCover(cv.getContext('2d'), cv.width, cv.height, state, {});
  } else {
    setAspect();
    syncUI();
    pushHistory();
    render();
  }
  window.__shotReady = true;
}
boot();
