/**
 * Generate a tech badge PNG pair (dark/light) matching the shared Spec.
 *
 * Usage:
 *   node make-badge.mjs <Label> <simpleicons-slug> <logoHex> [filename]
 * Example:
 *   node make-badge.mjs Kubernetes kubernetes 326CE5
 *   node make-badge.mjs "Argo CD" argo EF7B4D argocd
 *
 * Requires: npm package `sharp` resolvable from cwd (or set SHARP_CWD).
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outRoot = __dirname;

const [label, slug, logoHex, filenameArg] = process.argv.slice(2);
if (!label || !slug || !logoHex) {
  console.error('Usage: node make-badge.mjs <Label> <slug> <logoHex> [filename]');
  process.exit(1);
}

const filename = (filenameArg || label)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')
  .replace(/^-+|-+$/g, '');

const labelPath = label.replace(/ /g, '_');
const hex = logoHex.replace(/^#/, '');

const urls = {
  dark: `https://img.shields.io/badge/${labelPath}-363B44?style=for-the-badge&logo=${slug}&logoColor=${hex}`,
  light: `https://img.shields.io/badge/${labelPath}-E8ECF0?style=for-the-badge&logo=${slug}&logoColor=${hex}`,
};

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

async function loadSharp() {
  const candidates = [
    process.env.SHARP_CWD,
    path.resolve(__dirname, '../../../../long-screenshot-tool'),
    process.cwd(),
  ].filter(Boolean);
  for (const cwd of candidates) {
    try {
      const require = createRequire(pathToFileURL(path.join(cwd, 'package.json')).href);
      return require('sharp');
    } catch {
      /* try next */
    }
  }
  throw new Error('Cannot find sharp. Set SHARP_CWD or run near a project with sharp installed.');
}

const sharp = await loadSharp();

for (const theme of ['dark', 'light']) {
  const svg = await get(urls[theme]);
  const dir = path.join(outRoot, theme);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${filename}.png`);
  const info = await sharp(svg).png().toFile(dest);
  console.log(`wrote ${dest} (${info.width}x${info.height})`);
  if (info.height !== 28) {
    console.warn(`warning: expected height 28, got ${info.height}`);
  }
}