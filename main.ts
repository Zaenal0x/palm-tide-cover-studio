// PALM TIDE Cover Studio — a gta6-cover-art-01 entry (Node 22, standard library only).
//
// The app is this directory's app/ folder: plain static files a desktop browser loads
// offline (app/index.html and its ES modules, no library, no network request). This
// program hands the entry in: it validates the files against the scorer's caps, copies
// app/ and screenshots/ from beside this file to /output, writes /output/dossier.json
// with the vendored make.fun library, and logs a manifest of everything it shipped.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps (reference/gate.json), checked up front so a bad entry fails
// here with a readable message instead of inside the grader: 3 or 4 screenshots of
// at most 256 KiB each, an app/ tree of at most 993 entries and 48 MiB in all.
const SCREENSHOT_MAX = 4;
const SCREENSHOT_MAX_BYTES = 262144;
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 50331648;

function walkFiles(dir: string, base: string, acc: { path: string; bytes: number }[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const stats = statSync(full);
    if (stats.isDirectory()) walkFiles(full, rel, acc);
    else acc.push({ path: rel, bytes: stats.size });
  }
}

function validateEntry(): { path: string; bytes: number }[] {
  const appDir = join(here, 'app');
  if (!existsSync(join(appDir, 'index.html'))) {
    throw new Error('app/index.html is missing: the app cannot be handed in without it');
  }
  const appFiles: { path: string; bytes: number }[] = [];
  walkFiles(appDir, 'app', appFiles);
  const appBytes = appFiles.reduce((sum, f) => sum + f.bytes, 0);
  if (appFiles.length > APP_MAX_FILES) {
    throw new Error(`app/ holds ${appFiles.length} files, over the ${APP_MAX_FILES} cap`);
  }
  if (appBytes > APP_MAX_BYTES) {
    throw new Error(`app/ is ${appBytes} bytes, over the ${APP_MAX_BYTES} byte cap`);
  }
  const shotsDir = join(here, 'screenshots');
  const shots = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter((n) => !n.startsWith('.') && /\.(png|jpe?g)$/i.test(n))
    : [];
  if (shots.length < 3 || shots.length > SCREENSHOT_MAX) {
    throw new Error(`screenshots/ holds ${shots.length} images; the gate wants 3 or 4`);
  }
  for (const name of shots) {
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > SCREENSHOT_MAX_BYTES) {
      throw new Error(`screenshots/${name} is ${bytes} bytes, over the ${SCREENSHOT_MAX_BYTES} byte cap`);
    }
  }
  return appFiles;
}

const appFiles = validateEntry();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The dossier is built with the same caps object the starter used: only
// text_max_bytes shapes the bytes; the rest restate the scorer's own limits,
// which validateEntry() has already checked in this program's own words.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: SCREENSHOT_MAX, max_bytes: SCREENSHOT_MAX_BYTES },
  app_max_files: APP_MAX_FILES,
  app_max_bytes: APP_MAX_BYTES,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// Manifest: every file this run put in /output, with its size, so the log of
// a grading run shows exactly what was handed in.
const shipped: { path: string; bytes: number }[] = [];
walkFiles(join(out, 'app'), 'app', shipped);
walkFiles(join(out, 'screenshots'), 'screenshots', shipped);
shipped.push({ path: 'dossier.json', bytes: Buffer.byteLength(dossier) });
shipped.sort((a, b) => a.path.localeCompare(b.path));
let total = 0;
for (const f of shipped) {
  total += f.bytes;
  console.log(`  ${f.path} — ${f.bytes} bytes`);
}
console.log(
  `PALM TIDE handed in: ${appFiles.length} app files, ${shipped.length} files in ${out}, ${total} bytes in all.`,
);
