/**
 * Static site build: content/ -> dist/gh-pages/
 *   node scripts/build.js
 * Every page is complete HTML; the browser scripts in src/js only add filters, tabs and the toc.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ROOT, esc, writeFile, copyDir } = require('./lib/util');
const { loadSite, loadPosts } = require('./lib/content');
const { processPostAssets } = require('./lib/images');
const { renderArticle } = require('./lib/article');
const { layout } = require('./lib/layout');
const pages = require('./lib/pages');

const OUT = path.join(ROOT, 'dist', 'gh-pages');
const SRC = path.join(ROOT, 'src');
const CSS_ORDER = ['base', 'home', 'list', 'post'];

/** Run async jobs with a small concurrency limit (image encoding is CPU heavy). */
async function pool(items, limit, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: limit }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

function pageTitle(p) {
  if (p.series === 'rookies-log') return `Day ${p.day} — ${p.title}`;
  if (p.series === 'rookies-projects') return `${p.name} · ${p.stageTitle.split(' · ')[0]}`;
  return p.title;
}

function seriesLabel(site, p) {
  if (p.series === 'papers') return site.papers.label;
  if (p.series === 'projects') return `${site.projects.label} · ${p.kind}`;
  if (p.series === 'rookies-log') return `${site.rookies.label} · ${site.rookies.log.label} · ${p.phase.name}`;
  if (p.series === 'rookies-projects') return `${site.rookies.label} · ${site.rookies.projects.label} · ${p.stage}`;
  return '';
}

async function build() {
  const started = Date.now();
  const site = loadSite();
  const c = loadPosts(site);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // static assets: one stylesheet, page scripts, fonts, icons
  // Pretendard's @font-face list (unicode-range subsets) goes first, then the site styles
  const css = [path.join(SRC, 'assets', 'fonts', 'pretendard', 'pretendard.css'), ...CSS_ORDER.map((n) => path.join(SRC, 'css', `${n}.css`))]
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');
  writeFile(path.join(OUT, 'assets', 'site.css'), css);
  copyDir(path.join(SRC, 'js'), path.join(OUT, 'assets', 'js'));
  copyDir(path.join(SRC, 'assets', 'fonts'), path.join(OUT, 'assets', 'fonts'), (name) => !name.endsWith('.css'));
  copyDir(path.join(SRC, 'assets', 'img'), path.join(OUT, 'assets', 'img'));
  const hash = crypto.createHash('sha1').update(css);
  for (const f of fs.readdirSync(path.join(SRC, 'js'))) hash.update(fs.readFileSync(path.join(SRC, 'js', f)));
  const v = hash.digest('hex').slice(0, 8);
  const page = (o) => layout(site, v, o);

  // post folders: WebP images + other assets
  const media = {};
  await pool(c.all, 4, async (p) => {
    media[p.slug] = await processPostAssets(p, path.join(OUT, 'posts', p.slug));
  });

  // posts
  for (const p of c.all) {
    const art = renderArticle(p, media[p.slug]);
    const share = media[p.slug].og;
    writeFile(path.join(OUT, 'posts', p.slug, 'index.html'), page({
      title: pageTitle(p),
      description: p.lead,
      path: p.url,
      image: share && { ...share, src: `/posts/${p.slug}/${share.src}` },
      active: { papers: 'papers', projects: 'projects', 'rookies-log': 'rookies', 'rookies-projects': 'rookies' }[p.series],
      article: true,
      body: pages.postPage(site, c, p, art, media),
      scripts: ['post'],
      after: pages.ZOOM,
    }));
  }

  // home + series lists
  const indexPages = [
    ['', { title: '', description: site.home.sub, active: 'home', body: pages.homePage(site, c, media), scripts: ['home'] }],
    ['papers/', { title: site.papers.label, description: site.papers.description, active: 'papers', body: pages.papersPage(site, c, media) }],
    ['projects/', { title: site.projects.label, description: site.projects.description, active: 'projects', body: pages.projectsPage(site, c, media), scripts: ['projects'] }],
    ['rookies/log/', { title: `${site.rookies.label} 일지`, description: site.rookies.log.description, active: 'rookies', body: pages.rookiesLogPage(site, c, media), scripts: ['log'] }],
    ['rookies/projects/', { title: `${site.rookies.label} 프로젝트`, description: site.rookies.projects.description, active: 'rookies', body: pages.rookiesProjectsPage(site, c, media) }],
  ];
  for (const [dir, o] of indexPages) writeFile(path.join(OUT, dir, 'index.html'), page({ ...o, path: `/${dir}` }));
  writeFile(path.join(OUT, '404.html'), page({ title: '페이지를 찾을 수 없음', description: '찾는 페이지가 없습니다.', path: '/404.html', body: pages.notFoundPage() }));

  // search index (visible posts only)
  const index = c.visible.map((p) => ({
    t: pageTitle(p),
    u: p.url,
    s: seriesLabel(site, p),
    d: p.date,
    g: p.tags,
    e: p.lead,
  }));
  writeFile(path.join(OUT, 'search.json'), JSON.stringify(index));

  // crawler files
  const urls = ['/', ...indexPages.slice(1).map(([d]) => `/${d}`), ...c.visible.map((p) => p.url)];
  writeFile(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(site.url + u)}</loc></url>`).join('\n')}
</urlset>
`);
  writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);

  console.log(`built ${c.all.length} posts + ${indexPages.length} pages in ${((Date.now() - started) / 1000).toFixed(1)}s -> ${path.relative(ROOT, OUT)}`);
}

module.exports = { build };

if (require.main === module) {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
