// capture.mjs — renders the entry screenshots from the real app and
// verifies a full-size PNG export download, using Playwright/Chromium.
// Run from the repo root: node capture.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const require = createRequire('/home/hatch/workspace/makefun/gta6/tools/package.json');
const { chromium } = require('playwright');

const root = new URL('.', import.meta.url).pathname;
const appDir = join(root, 'app');
const shotsDir = join(root, 'screenshots');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.ttf': 'font/ttf', '.md': 'text/plain; charset=utf-8'
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let path = normalize(decodeURIComponent(url.pathname));
    if (path === '/') path = '/index.html';
    const data = await readFile(join(appDir, path));
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

const browser = await chromium.launch();
async function shot(name, url, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(base + url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(shotsDir, name), type: 'jpeg', quality: 88 });
  await page.close();
  console.log('captured', name, width + 'x' + height);
}

await shot('1-cover.jpg', '/?shot=cover&variant=sunset', 1280, 720);
await shot('2-editor.jpg', '/?shot=editor', 1280, 800);
await shot('3-cover.jpg', '/?shot=cover&variant=comic&layout=grid9', 1024, 1280);
await shot('4-cover.jpg', '/?shot=cover&variant=neon', 1080, 1080);

// Real export test: click the 1920x1080 export button, catch the download.
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
await page.goto(base + '/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  page.click('[data-export="1920x1080"]')
]);
const exportPath = join(root, 'out', 'export-test-1920x1080.png');
await download.saveAs(exportPath);
console.log('export download saved:', exportPath);

await browser.close();
server.close();
