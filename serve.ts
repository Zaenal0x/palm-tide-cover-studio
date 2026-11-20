// serve.ts — tiny static preview server for the app/ folder.
// Usage: node serve.ts [port]   (default 8371)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const port = Number(process.argv[2]) || 8371;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.md': 'text/plain; charset=utf-8',
  '.json': 'application/json',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let path = normalize(decodeURIComponent(url.pathname));
    if (path.endsWith('/')) path += 'index.html';
    const file = join(root, path);
    if (!file.startsWith(root)) { res.writeHead(403).end('forbidden'); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => {
  console.log(`PALM TIDE preview at http://localhost:${port}/`);
});
