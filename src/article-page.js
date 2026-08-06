import { bindCategoryScrollHeader } from './scroll-header.js';
import { escapeHtml } from './utils/escape-html.js';

function slugifyHeading(text) {
  const trimmed = text.trim();
  const slug = trimmed
    .replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  if (slug) return slug;

  return `section-${Array.from(trimmed)
    .slice(0, 12)
    .map((char) => char.charCodeAt(0).toString(36))
    .join('')}`;
}

function getScrollOffset() {
  const header = document.getElementById('dashboard-scroll-header');
  const headerHeight = header?.classList.contains('is-visible') ? header.offsetHeight : 0;
  const mobileTopBar = window.innerWidth < 768 ? 56 : 0;
  return headerHeight + mobileTopBar + 20;
}

function isGitHubArticlePage() {
  return document.body?.id === 'article';
}

/** Images that precede `el` in document order (their load shifts heading Y). */
function imagesBeforeElement(el) {
  const content = document.querySelector('.article-content');
  if (!content || !el) return [];

  return [...content.querySelectorAll('img')].filter((img) =>
    Boolean(img.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
  );
}

function waitForImage(img) {
  if (img.complete && img.naturalHeight > 0) return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => resolve();
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
    if (typeof img.decode === 'function') {
      img.decode().then(done).catch(done);
    }
  });
}

function headingScrollTop(heading) {
  return heading.getBoundingClientRect().top + window.scrollY - getScrollOffset();
}

async function scrollToHeading(heading) {
  const before = imagesBeforeElement(heading);

  before.forEach((img) => {
    if (img.loading === 'lazy') img.loading = 'eager';
  });

  await Promise.all(before.map((img) => waitForImage(img)));

  window.scrollTo({ top: headingScrollTop(heading), behavior: 'smooth' });

  // Smooth scroll + late paints: snap once more if we drifted.
  window.setTimeout(() => {
    const target = headingScrollTop(heading);
    if (Math.abs(window.scrollY - target) > 4) {
      window.scrollTo({ top: target, behavior: 'auto' });
    }
  }, 450);
}

function buildTocLinks(items) {
  return items
    .map(
      (item) => `
    <a
      href="#${item.id}"
      class="article-toc__link article-toc__link--h${item.level}"
      data-toc-link="${item.id}"
    >${escapeHtml(item.text)}</a>
  `
    )
    .join('');
}

function bindTocNavigation(nav) {
  if (!nav) return;

  nav.addEventListener('click', (event) => {
    const link = event.target.closest('[data-toc-link]');
    if (!link) return;

    event.preventDefault();
    const target = document.getElementById(link.dataset.tocLink);
    if (!target) return;

    void scrollToHeading(target);
  });
}

function setActiveTocLink(activeId) {
  document.querySelectorAll('[data-toc-link]').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.tocLink === activeId);
  });
}

function initTocScrollSpy(sectionIds) {
  if (!sectionIds.length) return;

  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length) {
        setActiveTocLink(visible[0].target.id);
      }
    },
    {
      rootMargin: `-${getScrollOffset()}px 0px -55% 0px`,
      threshold: [0, 0.25, 0.5, 1],
    }
  );

  sections.forEach((section) => observer.observe(section));
}

function getArticleContentRoot() {
  const content = document.querySelector('.article-content');
  if (!content) return null;

  // Tistory often injects sibling wrappers beside the editor shell, so
  // children.length is not always 1 — find the real contents root explicitly.
  const nested =
    content.querySelector(':scope > .contents_style') ||
    content.querySelector(':scope > .tt_article_useless_p_margin') ||
    content.querySelector('.contents_style') ||
    content.querySelector('.tt_article_useless_p_margin');

  return nested || content;
}

function groupArticleChapters() {
  const content = getArticleContentRoot();
  if (!content?.children.length) return;
  if ([...content.children].some((el) => el.classList?.contains('article-chapter'))) return;

  const nodes = Array.from(content.children);
  const fragment = document.createDocumentFragment();
  let body = null;

  nodes.forEach((node) => {
    if (node.tagName === 'H1') {
      const chapter = document.createElement('div');
      chapter.className = 'article-chapter';
      body = document.createElement('div');
      body.className = 'article-chapter__body';
      chapter.appendChild(node);
      chapter.appendChild(body);
      fragment.appendChild(chapter);
      return;
    }

    if (body) body.appendChild(node);
    else fragment.appendChild(node);
  });

  content.replaceChildren(fragment);
}

function collectHeadings(content) {
  const headings = content.querySelectorAll('h1');
  const usedIds = new Set();
  const items = [];

  headings.forEach((heading, index) => {
    let id = heading.id || slugifyHeading(heading.textContent || '') || `section-${index + 1}`;

    while (usedIds.has(id)) {
      id = `${id}-${index + 1}`;
    }

    usedIds.add(id);
    heading.id = id;
    heading.classList.add('article-heading-anchor');

    items.push({
      id,
      text: heading.textContent.trim(),
      level: 1,
    });
  });

  return items;
}

function initArticleToc() {
  const content = document.querySelector('.article-content');
  const tocNav = document.getElementById('article-toc-nav');
  const tocBox = document.getElementById('article-toc');

  if (!content || !tocNav) return;

  const items = collectHeadings(content);
  tocNav.innerHTML = buildTocLinks(items);

  if (!items.length) {
    tocBox?.classList.add('is-empty');
    return;
  }

  bindTocNavigation(tocNav);
  initTocScrollSpy(items.map((item) => item.id));
  setActiveTocLink(items[0].id);
}

function initArticleScrollHeader() {
  const titleEl = document.querySelector('.article-title');
  const title = titleEl?.textContent?.trim();
  if (!titleEl || !title) return;

  bindCategoryScrollHeader(titleEl, title);
}

function isArticlePage() {
  const bodyId = document.body.id;
  return bodyId === 'article' || bodyId === 'tt-body-page';
}

function initPostNavTitles() {
  document.querySelectorAll('.article-post-nav__title').forEach((el) => {
    const text = el.textContent?.trim();
    if (text) el.title = text;
  });
}

function initArticleThumbnail() {
  document.querySelectorAll('.article-thumbnail img').forEach((img) => {
    const figure = img.closest('.article-thumbnail');
    if (!figure) return;

    const applyBackdrop = () => {
      const src = img.currentSrc || img.src;
      if (src) figure.style.setProperty('--thumb-bg', `url("${src}")`);
    };

    if (img.complete) applyBackdrop();
    else img.addEventListener('load', applyBackdrop, { once: true });
  });
}

/**
 * GitHub Pages: ensure width/height attrs (aspect-ratio hint) once metadata is known,
 * and eager-load the first couple of content images if markdown still marks them lazy.
 */
function initGitHubArticleImages() {
  if (!isGitHubArticlePage()) return;

  const imgs = [...document.querySelectorAll('.article-content img')];
  imgs.forEach((img, index) => {
    if (index < 2 && img.loading === 'lazy') {
      img.loading = 'eager';
      if (!img.getAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'high');
    }

    const applySize = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      if (!img.hasAttribute('width')) img.setAttribute('width', String(img.naturalWidth));
      if (!img.hasAttribute('height')) img.setAttribute('height', String(img.naturalHeight));
    };

    if (img.complete) applySize();
    else img.addEventListener('load', applySize, { once: true });
  });
}

/** Strip Tistory's literal "," separators between tag links. */
function normalizeArticleTags() {
  document.querySelectorAll('.article-tags').forEach((el) => {
    [...el.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && /^[\s,]*$/.test(node.textContent || '')) {
        node.remove();
      }
    });
  });
}

function initArticlePage() {
  if (!isArticlePage()) return;

  normalizeArticleTags();
  groupArticleChapters();
  initGitHubArticleImages();
  initArticleToc();
  initArticleScrollHeader();
  initPostNavTitles();
  initArticleThumbnail();

  if (window.Prism?.highlightAll) {
    window.Prism.highlightAll();
  }
}

document.addEventListener('DOMContentLoaded', initArticlePage);
