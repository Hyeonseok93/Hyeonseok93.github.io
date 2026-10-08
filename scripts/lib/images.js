/**
 * Post images are PNG/JPG masters of up to ~2 MB. The site ships smaller copies instead:
 *   <name>.webp           body images and the post cover, at most 1600 px wide
 *   thumbnail-card.webp   thumbnail for cards and lists, 640 px wide
 *   og.jpg                1200×630 share image (JPEG, since not every messenger previews WebP)
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
  full: { ext: 'webp', resize: { width: 1600, withoutEnlargement: true }, encode: (s) => s.webp({ quality: 80 }) },
  card: { ext: 'webp', resize: { width: 640, withoutEnlargement: true }, encode: (s) => s.webp({ quality: 76 }) },
  og: { ext: 'jpg', resize: { width: 1200, height: 630, fit: 'cover' }, encode: (s) => s.jpeg({ quality: 82, mozjpeg: true }) },
};

async function encode(src, variant) {
  const stat = fs.statSync(src);
  const { ext, resize, encode: format } = VARIANTS[variant];
  const key = crypto.createHash('sha1').update(`${src}|${stat.size}|${stat.mtimeMs}|${variant}`).digest('hex');
  const cached = path.join(CACHE_DIR, `${key}.${ext}`);
  const meta = `${cached}.json`;
  if (fs.existsSync(cached) && fs.existsSync(meta)) return { file: cached, ...JSON.parse(fs.readFileSync(meta, 'utf8')) };

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const info = await format(sharp(src).resize(resize)).toFile(cached);
  fs.writeFileSync(meta, JSON.stringify({ width: info.width, height: info.height }));
  return { file: cached, width: info.width, height: info.height };
}

/**
 * Write a post's assets into outDir and return the size of every image by its original name
 * (so the HTML can point at the .webp file and carry width/height), plus the card and og variants.
 */
async function processPostAssets(post, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const sizes = {};
  // only files the post uses: its thumbnail and what the body points at (./fig1.png …);
  // source files kept next to a post (e.g. a .drawio / .svg master) stay out of the site
  const used = new Set([...post.html.matchAll(/\bsrc="(?:\.\/)?([^"/:?#]+)"/g)].map((m) => m[1]));
  if (post.thumb) used.add(post.thumb);

  const put = async (src, variant, name) => {
    const out = await encode(src, variant);
    fs.copyFileSync(out.file, path.join(outDir, name));
    return { src: name, width: out.width, height: out.height };
  };

  for (const name of fs.readdirSync(post.dir)) {
    if (!used.has(name)) continue;
    const src = path.join(post.dir, name);
    if (!RASTER.test(name)) {
      fs.copyFileSync(src, path.join(outDir, name)); // svg, gif, …
      continue;
    }
    sizes[name] = await put(src, 'full', name.replace(RASTER, '.webp'));
    if (name === post.thumb) {
      sizes.card = await put(src, 'card', 'thumbnail-card.webp');
      sizes.og = await put(src, 'og', 'og.jpg');
    }
  }
  return sizes;
}

module.exports = { processPostAssets };
