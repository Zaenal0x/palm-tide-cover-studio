// studio.js — the PALM TIDE editor: state, controls, canvas interaction,
// history, exports, and the ?shot= scenes used for the entry screenshots.

import { GRADES, GRADE_ORDER } from './grades.js';
import { LAYOUTS, LAYOUT_ORDER, TAG_DEFAULTS } from './layouts.js';
import { drawCover } from './render.js';

const SAMPLES = [
  { src: 'samples/convertible.jpg', name: 'Convertible' },
  { src: 'samples/boulevard.jpg', name: 'Boulevard' },
  { src: 'samples/rooftop.jpg', name: 'Rooftop' },
  { src: 'samples/neon-street.jpg', name: 'Neon Street' },
  { src: 'samples/pier.jpg', name: 'Pier' },
  { src: 'samples/marina.jpg', name: 'Marina' },
];

const VARIANTS = {
  sunset: { label: 'Sunset', layout: 'hero', grade: 'vice', lettering: 0 },
  neon: { label: 'Neon Night', layout: 'hero', grade: 'neon', lettering: 1 },
  comic: { label: 'Comic Ink', layout: 'grid9', grade: 'comic', lettering: 2 },
};

function defaultPanels() {
  return TAG_DEFAULTS.map((tag, i) => ({
    photo: i % SAMPLES.length,
    dx: 0,
    dy: 0,
    zoom: 1,
    place: tag.place,
    time: tag.time,
    sub: tag.sub,
  }));
}

const state = {
  layout: 'hero',
  grade: 'vice',
  lettering: 0,
  strength: 0.9,
  contrast: 1.06,
  saturation: 1.12,
  grain: 0.22,
  vignette: 0.38,
  halftone: true,
  dots: 0.65,
  title: 'PALM TIDE',
  subtitle: 'Neon runs the coast',
  tagline: 'ONE COAST · NO RULES · COMING SOON',
  quote: 'A fever dream in neon, worth every mile.',
  quoteSrc: 'THE COAST HERALD',
  badge: 'ORIGINAL COVER ART',
  ribbon: "COLLECTOR'S EDITION",
  vol: 'VOL. 06',
  stars: 5,
  panels: defaultPanels(),
};

let photos = []; // HTMLImageElement by photo id
let photoNames = [];
let selected = 0;
let activePhoto = 0;

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');

// ------------------------------------------------------------ history

const history = [JSON.stringify(state)];
let hIndex = 0;

function record() {
  history.length = hIndex + 1;
  history.push(JSON.stringify(state));
  if (history.length > 80) history.shift();
  hIndex = history.length - 1;
  syncHistoryButtons();
}

function applySnapshot(json) {
  const snap = JSON.parse(json);
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, snap);
  selected = Math.min(selected, LAYOUTS[state.layout].panels.length - 1);
  refreshControls();
  render();
}

function undo() {
  if (hIndex > 0) {
    hIndex--;
    applySnapshot(history[hIndex]);
    syncHistoryButtons();
  }
}

function redo() {
  if (hIndex < history.length - 1) {
    hIndex++;
    applySnapshot(history[hIndex]);
    syncHistoryButtons();
  }
}

function syncHistoryButtons() {
  document.getElementById('btnUndo').disabled = hIndex <= 0;
  document.getElementById('btnRedo').disabled = hIndex >= history.length - 1;
}

// ------------------------------------------------------------ rendering

function render() {
  if (!canvas.width) return;
  drawCover(ctx, canvas.width, canvas.height, state, photos, {
    selection: document.body.classList.contains('shot') ? null : selected,
  });
}

function sizeCanvas() {
  if (document.body.classList.contains('shot')) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } else {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (w > 0 && h > 0) {
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
    }
  }
  render();
}

// ------------------------------------------------------------ controls

const SLIDERS = [
  ['strength', 'Grade strength', 0, 1, 0.01],
  ['contrast', 'Contrast', 0.6, 1.6, 0.01],
  ['saturation', 'Saturation', 0, 2, 0.01],
  ['grain', 'Grain', 0, 1, 0.01],
  ['vignette', 'Vignette', 0, 1, 0.01],
  ['dots', 'Halftone dots', 0, 1, 0.01],
];

const FIELDS = [
  ['title', 'Title'],
  ['subtitle', 'Subtitle (script)'],
  ['tagline', 'Bottom tagline'],
  ['quote', 'Quote'],
  ['quoteSrc', 'Quote source'],
  ['badge', 'Badge text'],
  ['ribbon', 'Ribbon text'],
  ['vol', 'Volume tag'],
];

const els = {};

function button(label, cls) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn ${cls ?? ''}`.trim();
  b.textContent = label;
  return b;
}

function buildControls() {
  // Variants
  const vWrap = document.getElementById('variantBtns');
  els.variantBtns = {};
  for (const [id, v] of Object.entries(VARIANTS)) {
    const b = button(v.label, 'btn-variant');
    b.addEventListener('click', () => {
      state.layout = v.layout;
      state.grade = v.grade;
      state.lettering = v.lettering;
      record();
      refreshControls();
      render();
    });
    els.variantBtns[id] = b;
    vWrap.appendChild(b);
  }

  // Layouts
  const lWrap = document.getElementById('layoutBtns');
  els.layoutBtns = {};
  for (const id of LAYOUT_ORDER) {
    const b = button(LAYOUTS[id].name, 'btn-chip');
    b.addEventListener('click', () => {
      state.layout = id;
      selected = Math.min(selected, LAYOUTS[id].panels.length - 1);
      record();
      refreshControls();
      render();
    });
    els.layoutBtns[id] = b;
    lWrap.appendChild(b);
  }

  // Grades
  const gWrap = document.getElementById('gradeBtns');
  els.gradeBtns = {};
  for (const id of GRADE_ORDER) {
    const b = button(GRADES[id].name, 'btn-chip');
    const sw = document.createElement('span');
    sw.className = 'swatch';
    const lut = GRADES[id].lut;
    const mid = lut[170];
    const top = lut[235];
    sw.style.background = `linear-gradient(135deg, rgb(${mid[0]},${mid[1]},${mid[2]}), rgb(${top[0]},${top[1]},${top[2]}))`;
    b.prepend(sw);
    b.addEventListener('click', () => {
      state.grade = id;
      record();
      refreshControls();
      render();
    });
    els.gradeBtns[id] = b;
    gWrap.appendChild(b);
  }

  // Sliders
  const sWrap = document.getElementById('sliders');
  els.sliders = {};
  for (const [key, label, min, max, step] of SLIDERS) {
    const row = document.createElement('label');
    row.className = 'slider-row';
    const name = document.createElement('span');
    name.textContent = label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    const val = document.createElement('span');
    val.className = 'slider-val';
    input.addEventListener('input', () => {
      state[key] = Number(input.value);
      val.textContent = Number(input.value).toFixed(2);
      render();
    });
    input.addEventListener('change', record);
    row.append(name, input, val);
    sWrap.appendChild(row);
    els.sliders[key] = { input, val };
  }

  // Halftone toggle
  els.halftone = document.getElementById('optHalftone');
  els.halftone.addEventListener('change', () => {
    state.halftone = els.halftone.checked;
    record();
    render();
  });

  // Text fields
  const fWrap = document.getElementById('fields');
  els.fields = {};
  for (const [key, label] of FIELDS) {
    const row = document.createElement('label');
    row.className = 'field-row';
    const name = document.createElement('span');
    name.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.addEventListener('input', () => {
      state[key] = input.value;
      render();
    });
    input.addEventListener('change', record);
    row.append(name, input);
    fWrap.appendChild(row);
    els.fields[key] = input;
  }

  // Stars
  els.stars = document.getElementById('optStars');
  els.stars.addEventListener('change', () => {
    state.stars = Number(els.stars.value);
    record();
    render();
  });

  // Panel tag fields
  els.tagPlace = document.getElementById('tagPlace');
  els.tagTime = document.getElementById('tagTime');
  els.tagSub = document.getElementById('tagSub');
  const tagEdit = (key, el) => {
    el.addEventListener('input', () => {
      state.panels[selected][key] = el.value;
      render();
    });
    el.addEventListener('change', record);
  };
  tagEdit('place', els.tagPlace);
  tagEdit('time', els.tagTime);
  tagEdit('sub', els.tagSub);

  document.getElementById('btnFillAll').addEventListener('click', () => {
    for (const p of state.panels) p.photo = activePhoto;
    record();
    render();
  });
  document.getElementById('btnSpread').addEventListener('click', () => {
    state.panels.forEach((p, i) => {
      p.photo = photos.length ? i % photos.length : null;
    });
    record();
    render();
  });
  document.getElementById('btnClearPanel').addEventListener('click', () => {
    state.panels[selected].photo = null;
    record();
    render();
  });

  document.getElementById('btnUndo').addEventListener('click', undo);
  document.getElementById('btnRedo').addEventListener('click', redo);

  const doExport = (w, h, name) => () => exportPNG(w, h, name);
  document.getElementById('expSquare').addEventListener('click', doExport(1080, 1080, 'palm-tide-cover-square-1080x1080.png'));
  document.getElementById('expPortrait').addEventListener('click', doExport(1080, 1350, 'palm-tide-cover-portrait-1080x1350.png'));
  document.getElementById('expLand').addEventListener('click', doExport(1920, 1080, 'palm-tide-cover-landscape-1920x1080.png'));
  document.getElementById('expAll').addEventListener('click', () => {
    exportPNG(1080, 1080, 'palm-tide-cover-square-1080x1080.png');
    setTimeout(() => exportPNG(1080, 1350, 'palm-tide-cover-portrait-1080x1350.png'), 400);
    setTimeout(() => exportPNG(1920, 1080, 'palm-tide-cover-landscape-1920x1080.png'), 800);
  });

  document.getElementById('btnUpload').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  document.getElementById('fileInput').addEventListener('change', (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
  });
  window.addEventListener('resize', sizeCanvas);
}

function refreshControls() {
  for (const [id, b] of Object.entries(els.layoutBtns)) b.classList.toggle('on', state.layout === id);
  for (const [id, b] of Object.entries(els.gradeBtns)) b.classList.toggle('on', state.grade === id);
  for (const [key, s] of Object.entries(els.sliders)) {
    s.input.value = String(state[key]);
    s.val.textContent = Number(state[key]).toFixed(2);
  }
  els.halftone.checked = state.halftone;
  for (const [key, input] of Object.entries(els.fields)) input.value = state[key];
  els.stars.value = String(state.stars);
  const panel = state.panels[selected];
  document.getElementById('selLabel').textContent = `Panel ${selected + 1} of ${LAYOUTS[state.layout].panels.length}`;
  els.tagPlace.value = panel.place;
  els.tagTime.value = panel.time;
  els.tagSub.value = panel.sub;
  buildTray();
}

// ------------------------------------------------------------ photo tray

function buildTray() {
  const tray = document.getElementById('trayList');
  tray.innerHTML = '';
  photos.forEach((img, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `thumb${i === activePhoto ? ' on' : ''}`;
    const im = document.createElement('img');
    im.src = img.src;
    im.alt = photoNames[i] ?? '';
    const name = document.createElement('span');
    name.textContent = photoNames[i] ?? `Photo ${i + 1}`;
    b.append(im, name);
    b.title = 'Send to the selected panel';
    b.addEventListener('click', () => {
      activePhoto = i;
      state.panels[selected].photo = i;
      record();
      refreshControls();
      render();
    });
    tray.appendChild(b);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function addFiles(files) {
  let first = null;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      photos.push(img);
      photoNames.push(file.name.replace(/\.[^.]+$/, ''));
      if (first === null) first = photos.length - 1;
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  if (first !== null) {
    activePhoto = first;
    state.panels[selected].photo = first;
    record();
  }
  refreshControls();
  render();
}

// ------------------------------------------------------------ canvas play

function panelAt(x, y) {
  const layout = LAYOUTS[state.layout];
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    const cx = (p.x + p.w / 2) * canvas.width;
    const cy = (p.y + p.h / 2) * canvas.height;
    const rot = ((-(p.rot ?? 0)) * Math.PI) / 180;
    const dx = x - cx;
    const dy = y - cy;
    const lx = dx * Math.cos(rot) - dy * Math.sin(rot);
    const ly = dx * Math.sin(rot) + dy * Math.cos(rot);
    if (Math.abs(lx) <= (p.w * canvas.width) / 2 && Math.abs(ly) <= (p.h * canvas.height) / 2) return i;
  }
  return -1;
}

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const i = panelAt(pt.x, pt.y);
  if (i < 0) return;
  selected = i;
  const panel = state.panels[i];
  drag = { x: pt.x, y: pt.y, dx: panel.dx, dy: panel.dy, moved: false };
  canvas.setPointerCapture(e.pointerId);
  refreshControls();
  render();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = canvasPoint(e);
  const panel = state.panels[selected];
  panel.dx = drag.dx + (pt.x - drag.x);
  panel.dy = drag.dy + (pt.y - drag.y);
  if (Math.abs(pt.x - drag.x) + Math.abs(pt.y - drag.y) > 3) drag.moved = true;
  render();
});

canvas.addEventListener('pointerup', () => {
  if (drag?.moved) record();
  drag = null;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const pt = canvasPoint(e);
  const i = panelAt(pt.x, pt.y);
  if (i < 0) return;
  selected = i;
  const panel = state.panels[i];
  panel.zoom = Math.min(4, Math.max(1, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
  refreshControls();
  render();
}, { passive: false });

let wheelTimer = null;
canvas.addEventListener('wheel', () => {
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(record, 450);
});

canvas.addEventListener('dblclick', (e) => {
  const pt = canvasPoint(e);
  const i = panelAt(pt.x, pt.y);
  if (i < 0) return;
  const panel = state.panels[i];
  panel.dx = 0;
  panel.dy = 0;
  panel.zoom = 1;
  record();
  render();
});

// ------------------------------------------------------------ export

function exportPNG(w, h, name) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  drawCover(cv.getContext('2d'), w, h, state, photos, {});
  cv.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

// ------------------------------------------------------------ boot / shots

async function init() {
  buildControls();
  const loaded = await Promise.all(SAMPLES.map((s) => loadImage(s.src)));
  photos = loaded;
  photoNames = SAMPLES.map((s) => s.name);

  const params = new URLSearchParams(location.search);
  if (params.get('shot') === 'cover') {
    document.body.classList.add('shot');
    const v = VARIANTS[params.get('variant')] ?? VARIANTS.sunset;
    state.layout = params.get('layout') ?? v.layout;
    state.grade = params.get('grade') ?? v.grade;
    state.lettering = v.lettering;
  }

  try {
    await document.fonts.load('100px Anton');
    await document.fonts.load('60px Pacifico');
    await document.fonts.ready;
  } catch {
    /* fonts fall back to system faces; the render still works */
  }

  refreshControls();
  sizeCanvas();
  render();
  window.__shotReady = true;
}

init();
