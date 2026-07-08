import {
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
} from '../../data/category-meta.js';

export function isTistoryMode() {
  return Boolean(document.querySelector('[data-category-tree="tistory"]'));
}

export function isGhPagesSite() {
  return document.body.dataset.site === 'gh-pages';
}

const NON_DASHBOARD_BODY_IDS = new Set([
  'article',
  'category',
  'tag',
  'tt-body-page',
  'tt-body-category',
  'tt-body-tag',
  'tt-body-archive',
]);

export function isDashboardIndexPage() {
  if (!document.getElementById('dashboard-scroll-area')) return false;
  return !NON_DASHBOARD_BODY_IDS.has(document.body.id);
}

export function getTistoryHomeUrl() {
  return `${window.location.origin}/`;
}

function normalizePathname(pathname) {
  try {
    return decodeURIComponent(pathname).replace(/\/+$/, '') || '/';
  } catch {
    return pathname.replace(/\/+$/, '') || '/';
  }
}

export function findCategoryIdByPath(pathname = window.location.pathname) {
  const currentPath = normalizePathname(pathname);

  for (const link of document.querySelectorAll('[data-category-id][data-category-url]')) {
    try {
      const linkPath = normalizePathname(new URL(link.dataset.categoryUrl, window.location.origin).pathname);
      if (linkPath === currentPath) {
        return link.dataset.categoryId;
      }
    } catch {
      // ignore malformed category URLs
    }
  }
  return null;
}

export function redirectTistoryNativeCategoryToSpa() {
  if (!isTistoryMode() || isDashboardIndexPage()) return false;

  if (document.body.id === 'tt-body-page') {
    const hash = location.hash.replace('#', '');
    if (!hash) return false;
    window.location.replace(`${getTistoryHomeUrl()}#${hash}`);
    return true;
  }

  if (document.body.id === 'tt-body-category') {
    const categoryId = findCategoryIdByPath();
    if (categoryId) {
      const page = Number(new URLSearchParams(window.location.search).get('page')) || 1;
      const hash = `category-${categoryId}${page > 1 ? `-p${page}` : ''}`;
      window.location.replace(`${getTistoryHomeUrl()}#${hash}`);
      return true;
    }
  }

  const hash = location.hash.replace('#', '');
  if (hash) {
    window.location.replace(`${getTistoryHomeUrl()}#${hash}`);
    return true;
  }

  if (document.body.id === 'tt-body-category' || document.body.id === 'tt-body-tag' || document.body.id === 'tt-body-archive') {
    window.location.replace(getTistoryHomeUrl());
    return true;
  }

  return false;
}

export function shouldHandleCategoryInApp(link) {
  if (link.classList.contains('category-tree__link--branch')) return false;

  if (isTistoryMode()) {
    return Boolean(link.dataset.categoryId && link.dataset.categoryUrl);
  }

  if (isDashboardIndexPage()) {
    const href = link.getAttribute('href') || '';
    return href === '#' || href === '' || href.startsWith('#category-');
  }

  if (document.body.id === 'article' && !isTistoryMode()) {
    return Boolean(link.dataset.categoryId);
  }

  return false;
}

export function isKnownCategoryId(categoryId) {
  if (CATEGORY_LABELS[categoryId]) return true;
  return Boolean(document.querySelector(`[data-category-id="${categoryId}"]`));
}

export function getCategoryLink(categoryId) {
  return document.querySelector(`[data-category-id="${categoryId}"]`);
}

export function getCategoryLabel(categoryId) {
  const link = getCategoryLink(categoryId);
  return (
    link?.dataset.categoryLabel ||
    link?.querySelector('.category-tree__label')?.textContent?.trim() ||
    CATEGORY_LABELS[categoryId] ||
    categoryId
  );
}

export function getCategoryDescription(categoryId) {
  return CATEGORY_DESCRIPTIONS[categoryId] || '';
}

export function getCategoryUrl(categoryId) {
  const link = getCategoryLink(categoryId);
  return link?.dataset.categoryUrl || link?.getAttribute('href') || '';
}

export function getCategoryTotalCount(categoryId) {
  const countEl = getCategoryLink(categoryId)?.querySelector('.category-tree__count');
  const match = countEl?.textContent.match(/\((\d+)\)/);
  return match ? Number(match[1]) : null;
}

export function resolvePostAssetPath(pathValue) {
  if (!pathValue) return '';
  if (/^https?:\/\//.test(pathValue)) return pathValue;
  if (pathValue.startsWith('./posts/')) return pathValue;
  if (pathValue.startsWith('./images/') || pathValue.startsWith('./src/assets/')) {
    if (isGhPagesSite()) {
      return pathValue.replace('./src/assets/', './images/');
    }
    return pathValue;
  }
  const base = isGhPagesSite() ? './images/' : './src/assets/';
  return `${base}${pathValue.replace(/^\.\//, '')}`;
}
