// capture.mjs — renders this entry's screenshots with headless
// Chromium, and (with the `export` argument) proves the editor's PNG
// export really downloads at full size.
//
//   node capture.mjs          rewrite screenshots/*.jpg from shots.json
//   node capture.mjs export   click Export PNG, save the download
//
// It serves app/ itself on a loopback port, so nothing here touches
// the network beyond the machine it runs on.

import { createServer } from 'node:http';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/home/hatch/workspace/makefun/gta6/tools/package.json');
const { chromium } = require('playwright');

const APP_DIR = join(process.cwd(), 'app');
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.md': 'text/plain',
  '.json': 'application/json',
};

function serve() {
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = normalize(path === '/' ? 'index.html' : path.replace(/^\/+/, ''));
    const full = join(APP_DIR, rel);
    if (!full.startsWith(APP_DIR)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    try {
      const body = readFileSync(full);
      res.writeHead(200, { 'content-type': MIME[extname(full)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function readyPage(browser, url, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ptReady === true, null, { timeout: 45000 });
  await page.waitForTimeout(600);
  return page;
}

async function shootCovers(browser, base) {
  const scenes = JSON.parse(readFileSync(join(process.cwd(), 'shots.json'), 'utf8'));
  for (const scene of scenes) {
    const page = await readyPage(browser, base + '/' + scene.query, scene.w, scene.h);
    let quality = 88;
    let buffer = await page.screenshot({ type: 'jpeg', quality });
    while (buffer.length > 262144 && quality > 55) {
      quality -= 8;
      buffer = await page.screenshot({ type: 'jpeg', quality });
    }
    const dest = join(process.cwd(), 'screenshots', scene.name);
    writeFileSync(dest, buffer);
    console.log(scene.name + ': ' + scene.w + 'x' + scene.h + ', ' + buffer.length + ' bytes (q' + quality + ')');
    await page.close();
  }
}

async function testExport(browser, base) {
  const page = await readyPage(browser, base + '/', 1280, 800);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('#exportBtn'),
  ]);
  const dest = join(process.cwd(), 'export-test.png');
  await download.saveAs(dest);
  const st = statSync(dest);
  console.log('export download: ' + (await download.suggestedFilename()) + ', ' + st.size + ' bytes -> ' + dest);
  await page.close();
}

const server = await serve();
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch();
try {
  if (process.argv[2] === 'export') {
    await testExport(browser, base);
  } else {
    await shootCovers(browser, base);
  }
} finally {
  await browser.close();
  server.close();
}
