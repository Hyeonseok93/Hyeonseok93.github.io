/**
 * Checks the built site in dist/gh-pages:
 *   - every internal link, image, script and stylesheet points at a file that exists
 *   - pages load nothing from other hosts (links to other sites are fine)
 *   - no duplicate ids on a page
 *   - every post in content/ has a page, and the old post URLs are still there
 *   node scripts/check.js
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('node-html-parser');
const { ROOT } = require('./lib/util');
const { loadSite, loadPosts } = require('./lib/content');

const OUT = path.join(ROOT, 'dist', 'gh-pages');
const problems = [];

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const files = walk(OUT);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

function resolve(fromFile, ref) {
  const clean = decodeURIComponent(ref.split('#')[0].split('?')[0]);
  if (!clean) return null;
  const base = clean.startsWith('/') ? path.join(OUT, clean) : path.join(path.dirname(fromFile), clean);
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) return path.join(base, 'index.html');
  return base;
}

for (const file of htmlFiles) {
  const rel = path.relative(OUT, file);
  const root = parse(fs.readFileSync(file, 'utf8'));
  const idList = root.querySelectorAll('[id]').map((el) => el.getAttribute('id'));
  const ids = new Set(idList);
  if (ids.size !== idList.length) problems.push(`${rel}: duplicate id ${idList.find((id, i) => idList.indexOf(id) !== i)}`);

  // resources the page loads must come from this site
  for (const [sel, attr] of [['img', 'src'], ['script', 'src'], ['link[rel=stylesheet]', 'href'], ['link[rel=icon]', 'href'], ['link[rel=apple-touch-icon]', 'href'], ['source', 'srcset'], ['video', 'src']]) {
    for (const el of root.querySelectorAll(sel)) {
      const ref = el.getAttribute(attr);
      if (!ref) continue;
      if (/^(https?:)?\/\//.test(ref)) problems.push(`${rel}: external ${sel} ${ref}`);
      else if (!fs.existsSync(resolve(file, ref))) problems.push(`${rel}: missing ${sel} ${ref}`);
    }
  }
  // the share image must exist (it is an absolute URL on this site)
  const og = root.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
  if (!og.startsWith('https://hyeonseok93.github.io/') || !fs.existsSync(resolve(file, og.replace('https://hyeonseok93.github.io', '')))) {
    problems.push(`${rel}: bad og:image ${og}`);
  }

  // internal links must resolve (page or file, and #anchor on the same page)
  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (/^(https?:|mailto:)/.test(href) && !/^https:\/\/hyeonseok93\.github\.io\//.test(href)) continue;
    const local = href.replace(/^https:\/\/hyeonseok93\.github\.io/, '');
    if (local === '#' || local === '') continue;
    if (local.startsWith('#')) {
      if (!ids.has(local.slice(1))) problems.push(`${rel}: missing anchor ${local}`);
      continue;
    }
    const target = resolve(file, local);
    if (target && !fs.existsSync(target)) problems.push(`${rel}: broken link ${href}`);
  }
}

// css url(...) must exist
for (const file of files.filter((f) => f.endsWith('.css'))) {
  const css = fs.readFileSync(file, 'utf8');
  for (const [, ref] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    if (ref.startsWith('data:')) continue;
    if (/^(https?:)?\/\//.test(ref)) problems.push(`${path.relative(OUT, file)}: external url ${ref}`);
    else if (!fs.existsSync(resolve(file, ref))) problems.push(`${path.relative(OUT, file)}: missing url ${ref}`);
  }
}

// every post has its page at the same URL as before
const { all } = loadPosts(loadSite());
for (const p of all) if (!fs.existsSync(path.join(OUT, 'posts', p.slug, 'index.html'))) problems.push(`no page for post ${p.slug}`);
for (const must of ['index.html', '404.html', 'papers/index.html', 'projects/index.html', 'rookies/log/index.html', 'rookies/projects/index.html', 'posts/privacy-policy/index.html', 'search.json', 'sitemap.xml', '.nojekyll']) {
  if (!fs.existsSync(path.join(OUT, must))) problems.push(`missing ${must}`);
}

const size = files.reduce((n, f) => n + fs.statSync(f).size, 0);
console.log(`${htmlFiles.length} html pages, ${files.length} files, ${(size / 1024 / 1024).toFixed(1)} MB`);
if (problems.length) {
  console.log(`${problems.length} problem(s):`);
  problems.forEach((p) => console.log(`  - ${p}`));
  process.exit(1);
}
console.log('ok: no missing files, no external resources, no duplicate ids, all post URLs present');
