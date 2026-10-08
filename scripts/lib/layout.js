/** Page shell shared by every page: head meta, header with tabs + search, footer. */
const { esc } = require('./util');

const TABS = [
  ['home', '홈', '/'],
  ['papers', '논문', '/papers/'],
  ['projects', '프로젝트', '/projects/'],
  ['rookies', '루키즈 5기', '/rookies/log/'],
];

const SEARCH_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

/**
 * @param {object} o
 * @param {string} o.title      page title (site name is appended)
 * @param {string} o.description
 * @param {string} o.path       absolute path, e.g. /papers/
 * @param {string} [o.image]    absolute path of the share image
 * @param {string} [o.active]   tab key
 * @param {string} o.body       html inside <main>
 * @param {string[]} [o.scripts] extra page scripts under /assets/js/
 * @param {string} [o.after]    html after <main> (overlays)
 */
function layout(site, assetVersion, o) {
  const fullTitle = o.title ? `${o.title} | ${site.title}` : site.title;
  const url = site.url + o.path;
  const image = site.url + (o.image || '/assets/img/profile-512.png');
  const tabs = TABS.map(([key, label, href]) => `<a href="${href}"${key === o.active ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const scripts = ['site', ...(o.scripts || [])].map((s) => `<script src="/assets/js/${s}.js?v=${assetVersion}" defer></script>`).join('\n');
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#121110">
<meta property="og:type" content="${o.article ? 'article' : 'website'}">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(o.title || site.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/img/favicon-64.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/site.css?v=${assetVersion}">
${scripts}
</head>
<body>
<header class="site-h"><div class="w">
  <a class="logo" href="/"><img src="/assets/img/profile-96.webp" width="38" height="38" alt="">${esc(site.title)}</a>
  <nav aria-label="사이트 메뉴">${tabs}</nav>
  <button type="button" class="search-btn" data-search-open aria-label="글 검색">${SEARCH_ICON}<span class="t">글 검색</span><kbd>/</kbd></button>
  <a class="pf" href="${esc(site.portfolio)}" target="_blank" rel="noopener">포트폴리오 ↗</a>
</div></header>
<main>
${o.body}
</main>
<footer class="site-f"><div class="w">
  <span>© ${new Date().getFullYear()} ${esc(site.author)} · ${esc(site.title)}</span>
  <nav><a href="${esc(site.github)}" target="_blank" rel="noopener">GitHub</a><a href="${esc(site.portfolio)}" target="_blank" rel="noopener">포트폴리오</a><a href="/posts/privacy-policy/">개인정보 처리방침</a></nav>
</div></footer>
<div class="search" data-search role="dialog" aria-modal="true" aria-label="글 검색">
  <div class="box">
    <label>${SEARCH_ICON}<input type="search" placeholder="제목, 태그, 내용으로 찾기" autocomplete="off" aria-label="검색어"><button type="button" class="close" data-search-close>Esc</button></label>
    <ul data-search-results></ul>
  </div>
</div>
${o.after || ''}
</body>
</html>
`;
}

module.exports = { layout };
