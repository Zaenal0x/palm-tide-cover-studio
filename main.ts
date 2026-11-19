// main.ts — entry packaging for PALM TIDE Cover Studio (gta6-cover-art-01).
//
// Copies app/ and screenshots/ into $MAKEFUN_OUTPUT_DIR (default /output),
// then writes dossier.json with the kit's buildDossier. Before copying, a
// pre-flight pass holds the entry to the competition's caps so a bad hand-in
// fails here, loudly, instead of at the gate.
import {
  cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};
const DOSSIER_MAX_BYTES = 1.5 * 1024 * 1024;

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const appDir = join(root, 'app');
const shotsDir = join(root, 'screenshots');

function walk(dir: string, base: string, acc: { path: string; bytes: number }[] = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const st = statSync(full);
    if (st.isDirectory()) {
      acc.push({ path: rel, bytes: 0 });
      walk(full, rel, acc);
    } else {
      acc.push({ path: rel, bytes: st.size });
    }
  }
  return acc;
}

function preflight() {
  const problems: string[] = [];

  if (!existsSync(join(appDir, 'index.html'))) problems.push('app/index.html is missing');

  const appFiles = walk(appDir, '');
  if (appFiles.length > CAPS.app_max_files) {
    problems.push(`app/ holds ${appFiles.length} entries, over the ${CAPS.app_max_files} cap`);
  }
  const appBytes = appFiles.reduce((n, f) => n + f.bytes, 0);
  if (appBytes > CAPS.app_max_bytes) {
    problems.push(`app/ totals ${appBytes} bytes, over the ${CAPS.app_max_bytes} cap`);
  }
  for (const f of appFiles) {
    if (Buffer.byteLength(f.path) > CAPS.app_path_max_bytes) {
      problems.push(`app path too long: ${f.path}`);
    }
  }

  const shots = existsSync(shotsDir)
    ? readdirSync(shotsDir).filter((n) => /\.(jpe?g|png)$/i.test(n))
    : [];
  if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
    problems.push(`screenshots/ holds ${shots.length} images, need 3 or 4`);
  }
  for (const name of shots) {
    const bytes = statSync(join(shotsDir, name)).size;
    if (bytes > CAPS.screenshots.max_bytes) {
      problems.push(`screenshot ${name} is ${bytes} bytes, over the ${CAPS.screenshots.max_bytes} cap`);
    }
  }

  if (problems.length) {
    console.error('pre-flight failed:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  return { appFiles, appBytes, shots };
}

preflight();

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, CAPS);
if (dossier.length > DOSSIER_MAX_BYTES) {
  console.error(`dossier.json would be ${dossier.length} bytes, over the 1.5 MiB cap`);
  process.exit(1);
}
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Post-write manifest: what actually landed in the output directory
// (dossier.json included, it was written just above).
const written = walk(outDir, '');
const totalBytes = written.reduce((n, f) => n + f.bytes, 0);
console.log(`PALM TIDE Cover Studio packaged into ${outDir}`);
for (const f of written) {
  console.log(`  ${f.path}  ${f.bytes} bytes`);
}
console.log(`total: ${written.length} entries, ${totalBytes} bytes`);
