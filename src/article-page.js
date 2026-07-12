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

function scrollToHeading(heading) {
  const top = heading.getBoundingClientRect().top + window.scrollY - getScrollOffset();
  window.scrollTo({ top, behavior: 'smooth' });
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

    scrollToHeading(target);
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

function initArticlePage() {
  if (!isArticlePage()) return;

  groupArticleChapters();
  initArticleToc();
  initArticleScrollHeader();
  initPostNavTitles();
  initArticleThumbnail();

  if (window.Prism?.highlightAll) {
    window.Prism.highlightAll();
  }
}

document.addEventListener('DOMContentLoaded', initArticlePage);
