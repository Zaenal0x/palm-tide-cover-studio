// capture.mjs — renders the entry screenshots from the real app with
// Playwright/Chromium and verifies a true 1920x1080 PNG export download.
// Serves app/ itself on a throwaway port; writes only into screenshots/.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('.', import.meta.url));
const appDir = join(root, 'app');

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  ({ chromium } = createRequire('/home/hatch/workspace/makefun/gta6/tools/package.json')('playwright'));
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.ttf': 'font/ttf', '.md': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let path = normalize(decodeURIComponent(url.pathname));
    if (path === '/' || path === '\\') path = '/index.html';
    if (path.includes('..')) throw new Error('bad path');
    const data = await readFile(join(appDir, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(8139, r));
const base = 'http://localhost:8139';

const browser = await chromium.launch();
async function shotPage(viewport, url) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
  await page.waitForTimeout(350);
  return page;
}

const shots = [
  { file: '1-cover.jpg', viewport: { width: 1280, height: 720 }, url: `${base}/?shot=cover&variant=sunset&w=1280&h=720` },
  { file: '3-cover.jpg', viewport: { width: 1024, height: 1280 }, url: `${base}/?shot=cover&variant=comic&w=1024&h=1280` },
  { file: '4-cover.jpg', viewport: { width: 1080, height: 1080 }, url: `${base}/?shot=cover&variant=neon&w=1080&h=1080` },
];
for (const s of shots) {
  const page = await shotPage(s.viewport, s.url);
  await page.screenshot({ path: join(root, 'screenshots', s.file), type: 'jpeg', quality: 88 });
  await page.close();
  console.log('captured', s.file);
}

// editor shot: the full studio with the samples loaded
{
  const page = await shotPage({ width: 1280, height: 800 }, `${base}/`);
  await page.screenshot({ path: join(root, 'screenshots', '2-editor.jpg'), type: 'jpeg', quality: 88 });
  console.log('captured 2-editor.jpg');

  // real export test: download a 1920x1080 PNG through the app's own button
  await page.selectOption('#sizeSel', '1920x1080');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.click('#exportBtn'),
  ]);
  await download.saveAs('/tmp/palm-tide-export-test.png');
  console.log('export download saved:', await download.suggestedFilename());
  await page.close();
}

await browser.close();
server.close();
console.log('capture complete');
