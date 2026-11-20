// main.ts — entry plumbing for the PALM TIDE Cover Studio make.fun entry.
// Copies app/ and screenshots/ into $MAKEFUN_OUTPUT_DIR (default /output),
// validates the entry caps before writing anything, then emits dossier.json
// via buildDossier from vendor/makefun-app.ts and logs a manifest.

import {
  cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};
const DOSSIER_MAX_BYTES = 1572864; // 1.5 MiB

interface FoundFile { rel: string; bytes: number }

function walk(dir: string, base: string): FoundFile[] {
  const out: FoundFile[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, base));
    else out.push({ rel: relative(base, full), bytes: st.size });
  }
  return out;
}

function fail(msg: string): never {
  console.error(`main.ts: entry validation failed — ${msg}`);
  process.exit(1);
}

// ---- pre-flight validation -------------------------------------------------
const appDir = join(root, 'app');
const shotsDir = join(root, 'screenshots');
if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');

const appFiles = walk(appDir, appDir);
if (appFiles.length > CAPS.app_max_files) {
  fail(`app/ holds ${appFiles.length} files, over the ${CAPS.app_max_files} cap`);
}
const appBytes = appFiles.reduce((n, f) => n + f.bytes, 0);
if (appBytes > CAPS.app_max_bytes) {
  fail(`app/ totals ${appBytes} bytes, over the ${CAPS.app_max_bytes} cap`);
}
for (const f of appFiles) {
  if (Buffer.byteLength(f.rel) > CAPS.app_path_max_bytes) {
    fail(`app/${f.rel} has a path over the ${CAPS.app_path_max_bytes}-byte cap`);
  }
}

if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shots = walk(shotsDir, shotsDir)
  .filter((f) => /\.(jpe?g|png)$/i.test(f.rel))
  .sort((a, b) => (a.rel < b.rel ? -1 : 1));
if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
  fail(`screenshots/ holds ${shots.length} images, outside the 3–${CAPS.screenshots.max} range`);
}
for (const shot of shots) {
  if (shot.bytes > CAPS.screenshots.max_bytes) {
    fail(`screenshots/${shot.rel} is ${shot.bytes} bytes, over the ${CAPS.screenshots.max_bytes} cap`);
  }
}

// ---- copy + dossier ----------------------------------------------------------
mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true, force: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true, force: true });

const dossier = buildDossier(outDir, CAPS);
if (dossier.length > DOSSIER_MAX_BYTES) {
  fail(`dossier.json would be ${dossier.length} bytes, over the ${DOSSIER_MAX_BYTES} cap`);
}
writeFileSync(join(outDir, 'dossier.json'), dossier);

// ---- manifest ------------------------------------------------------------------
const written = walk(outDir, outDir).sort((a, b) => (a.rel < b.rel ? -1 : 1));
console.log(`PALM TIDE Cover Studio → ${outDir}`);
for (const f of written) console.log(`  ${f.rel}  ${f.bytes} bytes`);
console.log(`manifest: ${written.length} files, ${written.reduce((n, f) => n + f.bytes, 0)} bytes total`);
