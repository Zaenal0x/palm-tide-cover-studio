// capture.mjs — renders the entry screenshots with Playwright/Chromium
// and proves a real export download. Run from the repository root:
//
//   node capture.mjs
//
// It starts serve.ts on a scratch port, loads each scene from shots.json,
// waits for the app to signal __shotReady, and saves PNG frames to
// /tmp/palm-tide-shots/ (a PIL pass afterwards turns them into the final
// JPEGs under screenshots/). Finally it clicks the 1920x1080 export
// button in the editor and saves the downloaded PNG for inspection.

import { chromium } from '/home/hatch/workspace/makefun/gta6/tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repo = import.meta.dirname;
const outTmp = '/tmp/palm-tide-shots';
mkdirSync(outTmp, { recursive: true });

const PORT = 8141;
const base = `http://localhost:${PORT}/`;
const shots = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(base);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('serve.ts did not come up');
}

const server = spawn('node', ['serve.ts', String(PORT)], { cwd: repo, stdio: 'ignore' });
try {
  await waitForServer();
  const browser = await chromium.launch();
  for (const shot of shots) {
    const page = await browser.newPage({
      viewport: { width: shot.w, height: shot.h },
      deviceScaleFactor: 1,
    });
    await page.goto(base + shot.url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
    await page.waitForTimeout(400);
    const path = join(outTmp, `${shot.file}.png`);
    await page.screenshot({ path });
    console.log(`shot ${shot.file}: ${shot.w}x${shot.h} -> ${path}`);
    await page.close();
  }

  // Real export test: click the landscape export and keep the download.
  const page = await browser.newPage({
    viewport: { width: 1400, height: 950 },
    acceptDownloads: true,
  });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('#expLand'),
  ]);
  const target = join(outTmp, 'export-landscape.png');
  await download.saveAs(target);
  console.log(`export download: ${download.suggestedFilename()} -> ${target}`);
  await page.close();
  await browser.close();
} finally {
  server.kill();
}
