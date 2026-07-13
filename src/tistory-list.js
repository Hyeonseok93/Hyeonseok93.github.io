import { leafCategoryLabel } from './category-label.js';
import { POSTS_BY_CATEGORY } from './data/posts-manifest.js';

const LIST_EXCERPT_MAX_CHARS = 400;

function htmlToPlainText(html) {
  const template = document.createElement('div');
  template.innerHTML = html;
  template.querySelectorAll('script, style, img, figure, iframe, video').forEach((node) => node.remove());
  return template.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizePostPath(url) {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    return pathname.replace(/\/$/, '') || '/';
  } catch {
    return String(url || '').replace(/\/$/, '') || '/';
  }
}

function isTistoryNewIcon(img) {
  if (!img || img.tagName !== 'IMG') return false;

  const alt = (img.getAttribute('alt') || '').trim().toLowerCase();
  if (alt === 'n' || alt === 'new') return true;

  const src = img.getAttribute('src') || '';
  return /new_ico/i.test(src);
}

function normalizeTitleKey(title) {
  return String(title || '')
    .replace(/\u00a0/g, ' ')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDayKey(title) {
  const match = String(title || '').match(/\bDay\s*(\d+)\b/i);
  return match ? `day-${match[1]}` : '';
}

function buildManifestExcerptMaps() {
  const byTitle = new Map();
  const byDay = new Map();

  for (const posts of Object.values(POSTS_BY_CATEGORY)) {
    for (const post of posts) {
      if (!post.title || !post.excerpt) continue;
      byTitle.set(normalizeTitleKey(post.title), post.excerpt);
      const dayKey = extractDayKey(post.title);
      if (dayKey && !byDay.has(dayKey)) byDay.set(dayKey, post.excerpt);
    }
  }

  return { byTitle, byDay };
}

async function fetchRssExcerptMap() {
  const response = await fetch(`${window.location.origin}/rss`, { credentials: 'same-origin' });
  if (!response.ok) return new Map();

  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const map = new Map();

  doc.querySelectorAll('item').forEach((item) => {
    const link = item.querySelector('link')?.textContent?.trim();
    const description = item.querySelector('description')?.textContent;
    if (!link || !description) return;

    const text = htmlToPlainText(description);
    if (text) map.set(normalizePostPath(link), text);
  });

  return map;
}

function normalizeMetaLine(metaEl) {
  if (!metaEl) return;

  const raw = metaEl.textContent.replace(/\s+/g, ' ').trim();
  const [datePart, ...categoryParts] = raw.split('·').map((part) => part.trim());
  const category = leafCategoryLabel(categoryParts.join(' · '));

  if (datePart && category) {
    metaEl.textContent = `${datePart} · ${category}`;
    return;
  }

  metaEl.textContent = datePart || category || raw;
}

function promoteNewPostBadges(root) {
  root.querySelectorAll('.category-post-card').forEach((card) => {
    const body = card.querySelector('.category-post-card__body');
    const title = card.querySelector('.category-post-card__title');
    if (!body || !title) return;

    const newImg = [...title.querySelectorAll('img')].find(isTistoryNewIcon);
    if (newImg) newImg.remove();

    const titleText = title.textContent.replace(/\s+/g, ' ').trim();
    if (titleText) title.textContent = titleText;

    if (!newImg || body.querySelector('.category-post-card__new')) return;

    const badge = document.createElement('span');
    badge.className = 'category-post-card__new';
    badge.textContent = 'NEW';
    body.insertBefore(badge, title);
  });
}

async function enrichListExcerpts(root) {
  const { byTitle: manifestByTitle, byDay: manifestByDay } = buildManifestExcerptMaps();
  const excerptEls = [...root.querySelectorAll('[data-tistory-list-excerpt]')];
  const needsFallback = excerptEls.some((el) => !htmlToPlainText(el.innerHTML));

  let rssByPath = new Map();
  if (needsFallback) {
    try {
      rssByPath = await fetchRssExcerptMap();
    } catch {
      rssByPath = new Map();
    }
  }

  excerptEls.forEach((el) => {
    let text = htmlToPlainText(el.innerHTML).slice(0, LIST_EXCERPT_MAX_CHARS);

    if (!text) {
      const card = el.closest('.category-post-card');
      const href = card?.querySelector('.category-post-card__link')?.getAttribute('href');
      const title = card?.querySelector('.category-post-card__title')?.textContent?.trim();

      if (href) {
        text = (rssByPath.get(normalizePostPath(href)) || '').slice(0, LIST_EXCERPT_MAX_CHARS);
      }
      if (!text && title) {
        const key = normalizeTitleKey(title);
        text = (manifestByTitle.get(key) || manifestByDay.get(extractDayKey(title)) || '').slice(
          0,
          LIST_EXCERPT_MAX_CHARS,
        );
      }
    }

    if (!text) {
      el.remove();
      return;
    }

    el.textContent = text;
  });
}

function ensureListThumbnails(root) {
  root.querySelectorAll('.category-post-card__link').forEach((link) => {
    if (link.querySelector('.category-post-card__thumb')) return;

    const empty = document.createElement('div');
    empty.className = 'category-post-card__thumb category-post-card__thumb--empty';
    empty.setAttribute('aria-hidden', 'true');
    link.appendChild(empty);
  });
}

export async function initTistoryListCards() {
  const root = document.getElementById('tistory-native-list');
  if (!root) return;

  promoteNewPostBadges(root);
  root.querySelectorAll('.category-post-card__meta').forEach(normalizeMetaLine);
  await enrichListExcerpts(root);
  ensureListThumbnails(root);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void initTistoryListCards();
    });
  } else {
    void initTistoryListCards();
  }
}
