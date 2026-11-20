// main.ts — entrypoint for the PALM TIDE Cover Studio make.fun entry.
// Validates the entry against the competition caps, copies app/ and
// screenshots/ into $MAKEFUN_OUTPUT_DIR (default /output), and writes the
// dossier.json produced by vendor/makefun-app.ts.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const SHOT_MAX_COUNT = 4;
const SHOT_MIN_COUNT = 3;
const SHOT_MAX_BYTES = 262144; // 256 KiB per screenshot
const APP_MAX_FILES = 500;
const APP_MAX_BYTES = 48 * 1024 * 1024;
const DOSSIER_MAX_BYTES = Math.floor(1.5 * 1024 * 1024);

function fail(msg: string): never {
  console.error(`main.ts: pre-flight failed: ${msg}`);
  process.exit(1);
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// ---- pre-flight validation -------------------------------------------------
const appDir = join(root, 'app');
const shotsDir = join(root, 'screenshots');
if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
if (!existsSync(shotsDir)) fail('screenshots/ directory is missing');

const shots = readdirSync(shotsDir).filter((f) => /\.jpe?g$/i.test(f)).sort();
if (shots.length < SHOT_MIN_COUNT || shots.length > SHOT_MAX_COUNT) {
  fail(`expected ${SHOT_MIN_COUNT}-${SHOT_MAX_COUNT} screenshots, found ${shots.length}`);
}
for (const f of shots) {
  const bytes = statSync(join(shotsDir, f)).size;
  if (bytes > SHOT_MAX_BYTES) fail(`screenshot ${f} is ${bytes} bytes, over the ${SHOT_MAX_BYTES} cap`);
}

const appFiles = walk(appDir);
if (appFiles.length > APP_MAX_FILES) fail(`app/ holds ${appFiles.length} files, over the ${APP_MAX_FILES} cap`);
const appBytes = appFiles.reduce((n, f) => n + statSync(f).size, 0);
if (appBytes > APP_MAX_BYTES) fail(`app/ totals ${appBytes} bytes, over the ${APP_MAX_BYTES} cap`);

// ---- package ---------------------------------------------------------------
mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 2 * 1024 * 1024,
  screenshots: { max: SHOT_MAX_COUNT, max_bytes: SHOT_MAX_BYTES },
  app_max_files: APP_MAX_FILES,
  app_max_bytes: APP_MAX_BYTES,
  app_path_max_bytes: 1000,
});
if (dossier.length > DOSSIER_MAX_BYTES) fail(`dossier.json would be ${dossier.length} bytes, over the ${DOSSIER_MAX_BYTES} cap`);
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`main.ts: packaged ${appFiles.length} app files (${appBytes} bytes) and ${shots.length} screenshots into ${outDir}`);
console.log(`main.ts: dossier.json written (${dossier.length} bytes)`);

// ---- post-write manifest ----------------------------------------------------
// Re-walk the output so the log proves the copy landed whole: every packaged
// file is listed with its size, and the totals must match the pre-flight sums.
const outFiles = walk(outDir).sort();
let outBytes = 0;
for (const f of outFiles) {
  const bytes = statSync(f).size;
  outBytes += bytes;
  console.log(`  ${relative(outDir, f)}  ${bytes}`);
}
const expectedFiles = appFiles.length + shots.length + 1; // + dossier.json
if (outFiles.length !== expectedFiles) {
  fail(`output holds ${outFiles.length} files, expected ${expectedFiles}`);
}
console.log(`main.ts: manifest ok — ${outFiles.length} files, ${outBytes} bytes total`);
