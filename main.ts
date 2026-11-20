// main.ts — entrypoint for the PALM TIDE Cover Studio make.fun entry.
// Validates the hand-in against the bounty caps, copies app/ and
// screenshots/ into $MAKEFUN_OUTPUT_DIR (default /output) and writes the
// dossier there with the kit's buildDossier. Node 22, standard library
// only, no build step.
import { cpSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648
};
const DOSSIER_MAX_BYTES = 1572864; // 1.5 MiB

const here = new URL('.', import.meta.url).pathname;
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');

function fail(msg: string): never {
  console.error('main.ts: ' + msg);
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

// ---- pre-flight validation, mirroring the caps the scorer enforces ----
if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');

const appFiles = walk(appDir);
if (appFiles.length > CAPS.app_max_files) {
  fail('app/ holds ' + appFiles.length + ' files, over the cap of ' + CAPS.app_max_files);
}
let appBytes = 0;
for (const f of appFiles) appBytes += statSync(f).size;
if (appBytes > CAPS.app_max_bytes) {
  fail('app/ totals ' + appBytes + ' bytes, over the cap of ' + CAPS.app_max_bytes);
}

if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shots = readdirSync(shotsDir).filter((n) => /\.(jpe?g|png)$/i.test(n)).sort();
if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
  fail('screenshots/ holds ' + shots.length + ' images; the bounty wants 3 to ' + CAPS.screenshots.max);
}
for (const name of shots) {
  const bytes = statSync(join(shotsDir, name)).size;
  if (bytes > CAPS.screenshots.max_bytes) {
    fail('screenshots/' + name + ' is ' + bytes + ' bytes, over the cap of ' + CAPS.screenshots.max_bytes);
  }
}

// ---- copy the entry into the output directory ----
cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// ---- dossier, byte-identical to what the scorer computes ----
const dossier = buildDossier(outDir, CAPS);
if (dossier.byteLength > DOSSIER_MAX_BYTES) {
  fail('dossier.json would be ' + dossier.byteLength + ' bytes, over the 1.5 MiB cap');
}
writeFileSync(join(outDir, 'dossier.json'), dossier);

// ---- post-write manifest: everything now sitting in the output ----
const written = walk(outDir).sort();
console.log('main.ts: output manifest (' + written.length + ' files):');
for (const f of written) {
  console.log('  ' + f.slice(outDir.length + 1) + ' — ' + statSync(f).size + ' bytes');
}

console.log('main.ts: validated ' + appFiles.length + ' app files (' + appBytes + ' bytes) and ' + shots.length + ' screenshots');
console.log('main.ts: wrote ' + outDir + '/app, ' + outDir + '/screenshots and dossier.json (' + dossier.byteLength + ' bytes)');
