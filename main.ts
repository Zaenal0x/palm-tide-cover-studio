// PALM TIDE Cover Studio — entry point.
//
// Running `node main.ts` packages the entry: it validates the app and
// the screenshots against the bounty's caps, copies app/ and
// screenshots/ into $MAKEFUN_OUTPUT_DIR (default /output) and writes
// the dossier.json the scorer expects, using the vendored
// buildDossier so the bytes match the gate's own computation.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};
const SCREENSHOT_MIN = 3;
const INDEX_MAX_BYTES = 1024 * 1024;
const DOSSIER_LIMIT_BYTES = 1572864; // 1.5 MiB, this entry's own cap

interface FoundFile {
  rel: string;
  bytes: number;
}

function walk(dir: string, base: string, out: FoundFile[]): FoundFile[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, base, out);
    } else if (st.isFile()) {
      out.push({ rel: relative(base, full).split(sep).join('/'), bytes: st.size });
    }
  }
  return out;
}

function isImage(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png');
}

// Refuse early, with the fix named, when the entry would break a cap
// the scorer enforces anyway.
function preflight(root: string): void {
  const problems: string[] = [];
  const appDir = join(root, 'app');
  const shotsDir = join(root, 'screenshots');
  if (!existsSync(join(appDir, 'index.html'))) {
    problems.push('app/index.html is missing');
  }
  const appFiles = walk(appDir, appDir, []);
  if (appFiles.length > CAPS.app_max_files) {
    problems.push('app/ holds ' + appFiles.length + ' files, over the ' + CAPS.app_max_files + ' cap');
  }
  let appBytes = 0;
  for (const f of appFiles) {
    appBytes += f.bytes;
    if (Buffer.byteLength(f.rel) > CAPS.app_path_max_bytes) {
      problems.push('app path too long: ' + f.rel);
    }
    if (f.rel === 'index.html' && f.bytes > INDEX_MAX_BYTES) {
      problems.push('app/index.html is ' + f.bytes + ' bytes, over the 1 MiB cap');
    }
  }
  if (appBytes > CAPS.app_max_bytes) {
    problems.push('app/ totals ' + appBytes + ' bytes, over the ' + CAPS.app_max_bytes + ' cap');
  }
  const shots = walk(shotsDir, shotsDir, []).filter((f) => isImage(f.rel));
  if (shots.length < SCREENSHOT_MIN || shots.length > CAPS.screenshots.max) {
    problems.push('screenshots/ holds ' + shots.length + ' images; the bounty wants 3 or 4');
  }
  for (const s of shots) {
    if (s.bytes > CAPS.screenshots.max_bytes) {
      problems.push('screenshot ' + s.rel + ' is ' + s.bytes + ' bytes, over the 256 KiB cap');
    }
  }
  if (problems.length) {
    throw new Error('pre-flight failed:\n  - ' + problems.join('\n  - '));
  }
  console.log(
    'pre-flight ok: ' + appFiles.length + ' app files, ' +
    appBytes + ' app bytes, ' + shots.length + ' screenshots within caps',
  );
}

function main(): void {
  const root = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  preflight(root);

  mkdirSync(outDir, { recursive: true });
  for (const part of ['app', 'screenshots']) {
    const dest = join(outDir, part);
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    cpSync(join(root, part), dest, { recursive: true });
  }

  const dossier = buildDossier(outDir, CAPS);
  if (dossier.byteLength > DOSSIER_LIMIT_BYTES) {
    throw new Error('dossier.json would be ' + dossier.byteLength + ' bytes, over the 1.5 MiB cap');
  }
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  // Manifest: every file that just landed in the output, with its
  // size, so a packaged run can be eyeballed against the caps at a
  // glance and diffed against the next run.
  const written = walk(outDir, outDir, []).sort((a, b) => (a.rel < b.rel ? -1 : 1));
  let total = 0;
  console.log('--- output manifest (' + outDir + ') ---');
  for (const f of written) {
    total += f.bytes;
    console.log('  ' + f.rel + '  ' + f.bytes + ' bytes');
  }
  console.log('--- ' + written.length + ' files, ' + total + ' bytes total ---');
}

main();
