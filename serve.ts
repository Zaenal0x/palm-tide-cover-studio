// serve.ts — a tiny static file server for previewing the app locally.
// Usage: node serve.ts [port]     (default port 5173)
// Serves this repository's app/ directory; nothing else is reachable.

import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = join(import.meta.dirname, 'app');
const port = Number(process.argv[2] ?? 5173);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
  const path = join(root, rel === '' ? 'index.html' : rel);
  if (!path.startsWith(root)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const st = statSync(path);
    if (!st.isFile()) throw new Error('not a file');
    const body = readFileSync(path);
    res.writeHead(200, {
      'content-type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
  }
});

server.listen(port, () => {
  console.log(`PALM TIDE Cover Studio preview at http://localhost:${port}/`);
});
