/**
 * Local preview: build once, serve dist/gh-pages without caching, rebuild on changes.
 *   npm run dev            -> http://localhost:4173
 *   PORT=8020 npm run dev
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { ROOT } = require('./lib/util');

const OUT = path.join(ROOT, 'dist', 'gh-pages');
const PORT = Number(process.env.PORT) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

let building = null;
let queued = false;
function rebuild() {
  if (building) { queued = true; return; }
  // fresh module copies so edited templates / data are picked up
  for (const id of Object.keys(require.cache)) if (id.startsWith(path.join(ROOT, 'scripts'))) delete require.cache[id];
  // a syntax error in a build module throws on require; keep the server alive and wait for the fix
  building = Promise.resolve()
    .then(() => require('./build').build())
    .catch((err) => console.error(err))
    .finally(() => {
      building = null;
      if (queued) { queued = false; rebuild(); }
    });
}

let timer;
for (const dir of ['content', 'src', 'scripts']) {
  fs.watch(path.join(ROOT, dir), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 200);
  });
}

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(OUT, url);
  if (!file.startsWith(OUT)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  const found = fs.existsSync(file);
  if (!found) file = path.join(OUT, '404.html');
  res.writeHead(found ? 200 : 404, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`preview: http://localhost:${PORT}`));

rebuild();
