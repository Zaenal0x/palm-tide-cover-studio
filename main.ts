// main.ts — PALM TIDE Cover Studio entry packaging for gta6-cover-art-01.
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Validates the entry against the bounty's caps, copies app/ and
// screenshots/ into the output directory, writes dossier.json there with
// the vendored buildDossier, and logs a manifest of what was written.
// Node 22, standard library only; the TypeScript here is erasable syntax,
// so the file runs as-is with no build step.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

/** The gate's caps, mirrored from the bounty's gate.json keys. */
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};
const SHOTS_MIN = 3;
const DOSSIER_MAX_BYTES = 1536 * 1024; // 1.5 MiB
const INDEX_MAX_BYTES = 1024 * 1024;

const repo = import.meta.dirname;
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

interface Walked {
  path: string; // POSIX path relative to the walked root
  bytes: number;
}

/** Every file under dir, with sizes, in stable path order. */
function walk(dir: string): Walked[] {
  const out: Walked[] = [];
  const visit = (rel: string): void => {
    const entries = readdirSync(join(dir, rel), { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const e of entries) {
      const path = rel === '' ? e.name : `${rel}/${e.name}`;
      if (e.isDirectory()) visit(path);
      else if (e.isFile()) out.push({ path, bytes: statSync(join(dir, path)).size });
      else fail(`${path}: not a plain file or directory`);
    }
  };
  visit('');
  return out;
}

const IMAGE_MAGIC: Record<string, number[]> = {
  '.jpg': [0xff, 0xd8, 0xff],
  '.jpeg': [0xff, 0xd8, 0xff],
  '.png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

function isImageName(name: string): boolean {
  const dot = name.lastIndexOf('.');
  return dot > 0 && name.slice(dot).toLowerCase() in IMAGE_MAGIC;
}

function hasImageMagic(path: string, name: string): boolean {
  const magic = IMAGE_MAGIC[name.slice(name.lastIndexOf('.')).toLowerCase()]!;
  const head = readFileSync(path).subarray(0, magic.length);
  return magic.every((b, i) => head[i] === b);
}

/** A PNG or JPEG's pixel size from its header, or null when unreadable. */
function imageSize(path: string, name: string): { w: number; h: number } | null {
  const data = readFileSync(path);
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (ext === '.png') {
    // IHDR: width and height are big-endian uint32 at bytes 16 and 20.
    if (data.length < 24) return null;
    return { w: data.readUInt32BE(16), h: data.readUInt32BE(20) };
  }
  // JPEG: walk the segments to a start-of-frame marker (SOF0..SOF15).
  let i = 2;
  while (i + 9 < data.length) {
    if (data[i] !== 0xff) return null;
    const marker = data[i + 1]!;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { w: data.readUInt16BE(i + 7), h: data.readUInt16BE(i + 5) };
    }
    i += 2 + data.readUInt16BE(i + 2);
  }
  return null;
}

/** Pre-flight: refuse early, with a named cap, before anything is copied. */
function validate(): { appFiles: Walked[]; shots: Walked[] } {
  const appDir = join(repo, 'app');
  if (!existsSync(appDir)) fail('app/ is missing');
  const appFiles = walk(appDir);
  const entries = appFiles.length; // files; directories counted below
  let dirCount = 0;
  const countDirs = (rel: string): void => {
    for (const e of readdirSync(join(appDir, rel), { withFileTypes: true })) {
      if (e.isDirectory()) {
        dirCount++;
        countDirs(rel === '' ? e.name : `${rel}/${e.name}`);
      }
    }
  };
  countDirs('');
  if (entries + dirCount > CAPS.app_max_files) {
    fail(`app/ holds ${entries + dirCount} entries, over app_max_files ${CAPS.app_max_files}`);
  }
  const appBytes = appFiles.reduce((n, f) => n + f.bytes, 0);
  if (appBytes > CAPS.app_max_bytes) {
    fail(`app/ totals ${appBytes} bytes, over app_max_bytes ${CAPS.app_max_bytes}`);
  }
  for (const f of appFiles) {
    if (Buffer.byteLength(f.path, 'utf8') > CAPS.app_path_max_bytes) {
      fail(`app/${f.path}: path over app_path_max_bytes ${CAPS.app_path_max_bytes}`);
    }
  }
  const index = appFiles.find((f) => f.path === 'index.html');
  if (index === undefined) fail('app/index.html is missing');
  if (index!.bytes > INDEX_MAX_BYTES) fail(`app/index.html is ${index!.bytes} bytes, over ${INDEX_MAX_BYTES}`);

  const shotsDir = join(repo, 'screenshots');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  const shots = walk(shotsDir).filter((f) => !f.path.includes('/'));
  const images = shots.filter((f) => isImageName(f.path));
  if (images.length !== shots.length) fail('screenshots/ holds a file that is not a PNG or JPEG image');
  if (images.length < SHOTS_MIN || images.length > CAPS.screenshots.max) {
    fail(`screenshots/ holds ${images.length} images; the gate wants ${SHOTS_MIN}..${CAPS.screenshots.max}`);
  }
  for (const s of images) {
    if (s.bytes > CAPS.screenshots.max_bytes) {
      fail(`screenshots/${s.path} is ${s.bytes} bytes, over screenshots.max_bytes ${CAPS.screenshots.max_bytes}`);
    }
    if (!hasImageMagic(join(shotsDir, s.path), s.path)) {
      fail(`screenshots/${s.path}: bytes do not match its image extension`);
    }
  }
  return { appFiles, shots: images };
}

function main(): void {
  const { appFiles, shots } = validate();
  console.log(
    `pre-flight ok: app/ ${appFiles.length} files (${appFiles.reduce((n, f) => n + f.bytes, 0)} bytes), ` +
      `screenshots/ ${shots.length} images`,
  );

  mkdirSync(outDir, { recursive: true });
  cpSync(join(repo, 'app'), join(outDir, 'app'), { recursive: true });
  cpSync(join(repo, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outDir, CAPS);
  if (dossier.length > DOSSIER_MAX_BYTES) {
    fail(`dossier.json would be ${dossier.length} bytes, over the ${DOSSIER_MAX_BYTES} allowed`);
  }
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  // Manifest: everything now in the output directory, in path order.
  // Screenshots also report their pixel size, read back from the copies.
  const written = walk(outDir);
  let total = 0;
  for (const f of written) {
    total += f.bytes;
    let note = '';
    if (f.path.startsWith('screenshots/') && isImageName(f.path)) {
      const size = imageSize(join(outDir, f.path), f.path);
      if (size !== null) note = `, ${size.w}x${size.h}px`;
    }
    console.log(`  ${f.path} (${f.bytes} bytes${note})`);
  }
  console.log(`wrote ${written.length} files, ${total} bytes total, to ${relative(process.cwd(), outDir) || outDir}`);
  console.log(`dossier.json: ${dossier.length} bytes`);
}

main();
