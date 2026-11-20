// capture.mjs — renders the entry screenshots with headless Chromium and
// verifies a real 1920x1080 PNG export download from the editor.
// Usage: node capture.mjs

import { chromium } from '/home/hatch/workspace/makefun/gta6/tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const PORT = 8399;
const BASE = `http://localhost:${PORT}`;

const server = spawn('node', ['serve.ts', String(PORT)], { cwd: root, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitServer() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE + '/'); if (r.ok) return; } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('preview server did not start');
}

const SHOTS = [
  { file: '1-cover.jpg', w: 1280, h: 720, url: '/?shot=cover&variant=sunset&w=1280&h=720' },
  { file: '2-editor.jpg', w: 1280, h: 800, url: '/' },
  { file: '3-cover.jpg', w: 1024, h: 1280, url: '/?shot=cover&variant=ink&w=1024&h=1280' },
  { file: '4-cover.jpg', w: 1080, h: 1080, url: '/?shot=cover&variant=neon&w=1080&h=1080' },
];

try {
  await waitServer();
  const browser = await chromium.launch();
  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
    await page.goto(BASE + shot.url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
    await sleep(350);
    const out = join(root, 'screenshots', shot.file);
    await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
    console.log(`${shot.file}: ${statSync(out).size} bytes`);
    if (shot.file === '2-editor.jpg') {
      // real export test: the 1920x1080 button must download a true-size PNG
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 20000 }),
        page.click('#expWide'),
      ]);
      const path = await download.path();
      const { readFileSync } = await import('node:fs');
      const buf = readFileSync(path);
      const isPNG = buf.subarray(1, 4).toString() === 'PNG';
      const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
      console.log(`export test: PNG=${isPNG} size=${w}x${h}`);
      if (!isPNG || w !== 1920 || h !== 1080) throw new Error('export test failed');
    }
    await page.close();
  }
  await browser.close();
  console.log('capture.mjs: done');
} finally {
  server.kill();
}
