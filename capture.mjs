// capture.mjs — renders screenshots/ with Playwright/Chromium and tests a
// real PNG export download. Run: node capture.mjs
// Playwright is borrowed from the workspace tools install; the app itself
// has no dependencies.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('/home/hatch/workspace/makefun/gta6/tools/package.json');
const { chromium } = require('playwright');

const root = fileURLToPath(new URL('.', import.meta.url));
const appRoot = join(root, 'app');
const shotsDir = join(root, 'screenshots');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.md': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let path = normalize(decodeURIComponent(url.pathname));
    if (path === '/' || path === '\\') path = '/index.html';
    const file = join(appRoot, path);
    if (!file.startsWith(appRoot)) throw new Error('outside root');
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();

async function shoot(name, viewport, url) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.title.includes('ready'), null, { timeout: 20000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(shotsDir, name), type: 'jpeg', quality: 88 });
  await page.close();
  console.log(`shot ${name} at ${viewport.width}x${viewport.height}`);
}

await shoot('1-cover.jpg', { width: 1280, height: 720 }, `${base}/?shot=cover&variant=sunset`);
await shoot('3-cover.jpg', { width: 1024, height: 1280 }, `${base}/?shot=cover&variant=comic`);
await shoot('4-cover.jpg', { width: 1080, height: 1080 }, `${base}/?shot=cover&variant=neon`);

// editor screenshot + a real export download at 1920x1080
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => document.title.includes('ready'), null, { timeout: 20000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(shotsDir, '2-editor.jpg'), type: 'jpeg', quality: 88 });
  console.log('shot 2-editor.jpg at 1280x800');

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('[data-export="1920x1080"]'),
  ]);
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const buf = readFileSync(path);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  console.log(`export download: ${download.suggestedFilename()} ${buf.length} bytes, PNG ${w}x${h}`);
  if (w !== 1920 || h !== 1080) throw new Error('export size mismatch');
  await page.close();
}

await browser.close();
server.close();
console.log('capture done');
