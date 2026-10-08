/**
 * Post images are PNG/JPG masters of up to ~2 MB. The site ships WebP copies instead:
 *   <name>.webp        body images and the post cover, at most 1600 px wide
 *   thumbnail-card.webp  thumbnail for cards and lists, 640 px wide
 * Results are cached in .cache/images keyed by source size + mtime, so rebuilds are fast.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { ROOT } = require('./util');

const CACHE_DIR = path.join(ROOT, '.cache', 'images');
const RASTER = /\.(png|jpe?g)$/i;

const VARIANTS = {
  full: { width: 1600, quality: 80 },
  card: { width: 640, quality: 76 },
};

async function toWebp(src, variant) {
  const stat = fs.statSync(src);
  const key = crypto.createHash('sha1').update(`${src}|${stat.size}|${stat.mtimeMs}|${variant}`).digest('hex');
  const cached = path.join(CACHE_DIR, `${key}.webp`);
  const meta = `${cached}.json`;
  if (fs.existsSync(cached) && fs.existsSync(meta)) return { file: cached, ...JSON.parse(fs.readFileSync(meta, 'utf8')) };

  const { width, quality } = VARIANTS[variant];
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const info = await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(cached);
  fs.writeFileSync(meta, JSON.stringify({ width: info.width, height: info.height }));
  return { file: cached, width: info.width, height: info.height };
}

/**
 * Write a post's assets into outDir and return the size of every image by its original name
 * (so the HTML can point at the .webp file and carry width/height).
 */
async function processPostAssets(post, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const sizes = {};
  // only files the post uses: its thumbnail and what the body points at (./fig1.png …);
  // source files kept next to a post (e.g. a .drawio / .svg master) stay out of the site
  const used = new Set([...post.html.matchAll(/\bsrc="(?:\.\/)?([^"/:?#]+)"/g)].map((m) => m[1]));
  if (post.thumb) used.add(post.thumb);
  for (const name of fs.readdirSync(post.dir)) {
    const src = path.join(post.dir, name);
    if (!used.has(name)) continue;
    if (RASTER.test(name)) {
      const base = name.replace(RASTER, '');
      const full = await toWebp(src, 'full');
      fs.copyFileSync(full.file, path.join(outDir, `${base}.webp`));
      sizes[name] = { src: `${base}.webp`, width: full.width, height: full.height };
      if (name === post.thumb) {
        const card = await toWebp(src, 'card');
        fs.copyFileSync(card.file, path.join(outDir, 'thumbnail-card.webp'));
        sizes.card = { src: 'thumbnail-card.webp', width: card.width, height: card.height };
      }
    } else {
      fs.copyFileSync(src, path.join(outDir, name)); // svg, gif, …
    }
  }
  return sizes;
}

module.exports = { processPostAssets };
