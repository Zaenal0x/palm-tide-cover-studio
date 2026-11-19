// make-shots.mjs — renders the entry's screenshots from the real app.
//
// Starts the repo's own static server (serve.ts), drives headless
// Chromium (Playwright, installed outside the repo) through the app's
// ?shot= scenes, and writes JPEGs into screenshots/. Every image is a
// genuine capture of the app running: three exported covers (sunset
// hero landscape, comic-ink 9-panel portrait, neon hero square) and
// the editor with the default cover loaded.
//
//   node make-shots.mjs

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire('/home/hatch/workspace/makefun/gta6/tools/package.json');
const { chromium } = require('playwright');

const PORT = 8123;
const BASE = `http://localhost:${PORT}`;

const SCENES = [
  { name: '1-cover.jpg', url: `${BASE}/?shot=cover&variant=sunset&size=landscape`, w: 1280, h: 720 },
  { name: '2-editor.jpg', url: `${BASE}/`, w: 1280, h: 800 },
  { name: '3-cover.jpg', url: `${BASE}/?shot=cover&variant=comic&size=portrait`, w: 1024, h: 1280 },
  { name: '4-cover.jpg', url: `${BASE}/?shot=cover&variant=neon&size=square`, w: 1080, h: 1080 },
];

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(BASE + '/');
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('serve.ts did not come up');
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'ignore' });
try {
  await waitForServer();
  const browser = await chromium.launch();
  for (const scene of SCENES) {
    const page = await browser.newPage({ viewport: { width: scene.w, height: scene.h } });
    await page.goto(scene.url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(here, 'screenshots', scene.name), type: 'jpeg', quality: 88 });
    console.log(`shot ${scene.name} at ${scene.w}x${scene.h}`);
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}
