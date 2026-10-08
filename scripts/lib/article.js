/**
 * Turns a post's sanitized HTML into the final article body:
 * WebP image paths with sizes, figure captions, code frames with Prism highlighting,
 * scrollable tables, the paper "핵심 요약" card, heading ids and the table of contents.
 */
const { parse } = require('node-html-parser');
const Prism = require('prismjs');
const loadLanguages = require('prismjs/components/');
const { esc, pad2 } = require('./util');

loadLanguages(['python', 'java', 'http', 'properties', 'powershell', 'bash', 'json', 'yaml', 'typescript', 'javascript', 'sql']);

/** "2. Attack Surface — ONDE에 …" -> "Attack Surface", "서론. 공장 …" -> "서론", "① Base URL kind" -> "Base URL kind" */
const tocLabel = (t) =>
  t.replace(/^\d+\.\s*/, '')
    .replace(/^[①-⑳]\s*/, '')
    .replace(/^([^\s.\d]{1,6}(?: [^\s.\d]{1,6})?)\.\s.*$/, '$1')
    .split(' — ')[0]
    .split(' (')[0]
    .trim();

function renderArticle(post, sizes) {
  // parse <pre> as elements (node-html-parser keeps it as raw text by default)
  const root = parse(post.html, { blockTextElements: { script: true, noscript: true, style: true } });
  const result = { repo: null, deploy: null, toc: [] };

  // images: point at the WebP copy and add width/height; the first two load eagerly
  root.querySelectorAll('img').forEach((img, i) => {
    const src = (img.getAttribute('src') || '').replace(/^\.\//, '');
    const s = sizes[src];
    if (s) {
      img.setAttribute('src', s.src);
      img.setAttribute('width', String(s.width));
      img.setAttribute('height', String(s.height));
    }
    img.setAttribute('loading', i < 2 ? 'eager' : 'lazy');
    img.setAttribute('decoding', 'async');
  });

  // a paragraph holding only an image becomes a figure
  root.querySelectorAll('p').forEach((p) => {
    const kids = p.childNodes.filter((n) => n.nodeType === 1 || n.text.trim());
    if (kids.length === 1 && kids[0].tagName === 'IMG') p.replaceWith(`<figure class="article-figure-center article-figure-center--full">${kids[0].toString()}</figure>`);
  });
  // "Fig.N …" alt text becomes the caption
  root.querySelectorAll('figure').forEach((f) => {
    const img = f.querySelector('img');
    if (img && !f.querySelector('figcaption') && /^Fig\./.test(img.getAttribute('alt') || '')) {
      f.insertAdjacentHTML('beforeend', `<figcaption>${esc(img.getAttribute('alt'))}</figcaption>`);
    }
  });

  // "📦 GitHub: …" (and "🌐 배포: …") line moves into the info card under the title
  if (post.series === 'projects' || post.series === 'rookies-projects') {
    const gh = root.querySelectorAll('p').find((p) => /GitHub:/.test(p.text) && p.querySelector('a[href*="github.com"]'));
    if (gh) {
      const a = gh.querySelector('a[href*="github.com"]');
      result.repo = { href: a.getAttribute('href'), name: a.text.trim() };
      if (/배포:/.test(gh.text)) result.deploy = { domain: gh.querySelector('code')?.text.trim() || '', down: /접속되지 않습니다/.test(gh.text) };
      gh.remove();
    }
  }

  // a "핵심 요약" section at the top becomes a summary card
  const head = root.childNodes.find((n) => n.nodeType === 1);
  if (head?.tagName === 'H1' && head.text.trim() === '핵심 요약') {
    const list = head.nextElementSibling;
    if (list?.tagName === 'UL') {
      list.remove();
      head.replaceWith(`<section class="key"><div class="key-h">핵심 요약</div>${list.toString()}</section>`);
    }
  }

  // code: highlight at build time and frame with a language label + copy button
  root.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    const lang = ((code?.getAttribute('class') || '').match(/language-([\w-]+)/) || [])[1] || '';
    const text = (code || pre).text; // entity-decoded source
    const grammar = lang && Prism.languages[lang];
    const body = grammar ? Prism.highlight(text, grammar, lang) : esc(text);
    pre.replaceWith(
      `<div class="code"><div class="code-h"><span>${esc(lang || 'code')}</span><button type="button" class="copy">복사</button></div>` +
        `<pre><code class="language-${esc(lang || 'none')}">${body}</code></pre></div>`,
    );
  });

  // tables scroll sideways instead of squeezing
  root.querySelectorAll('table').forEach((t) => t.replaceWith(`<div class="tbl">${t.toString()}</div>`));

  // toc: section headings plus the next level the post actually uses (h2, or h3 when it skips h2)
  const subTag = root.querySelector('h2') ? 'H2' : 'H3';
  const heads = root.querySelectorAll('h1, h2, h3').filter((h) => h.tagName === 'H1' || h.tagName === subTag);
  const numbered = heads.some((h) => h.tagName === 'H1' && /^\d+\./.test(h.text.trim()));
  let n = 0;
  heads.forEach((h, i) => {
    const id = `sec-${i}`;
    h.setAttribute('id', id);
    const text = h.text.trim();
    if (h.tagName === 'H1') {
      n += 1;
      const num = numbered ? (text.match(/^(\d+)\./) || [])[1] : String(n);
      result.toc.push({ id, label: tocLabel(text), num: num ? pad2(num) : '·', subs: [] });
    } else if (result.toc.length) {
      result.toc.at(-1).subs.push({ id, label: tocLabel(text) });
    }
  });

  result.html = root.toString();
  result.readMinutes = Math.max(1, Math.round(root.text.replace(/\s+/g, '').length / 500));
  return result;
}

module.exports = { renderArticle };
