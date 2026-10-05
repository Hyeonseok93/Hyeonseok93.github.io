import { isKnownCategoryId } from './category-context.js';

export function getSiteRoot() {
  const root = document.body.dataset.siteRoot;
  if (root) return root.endsWith('/') ? root : `${root}/`;
  return './';
}

export function hasDashboardPanels() {
  return document.querySelectorAll('[data-dashboard-panel]').length > 0;
}

export function isArticlePermalinkPage() {
  return document.body.id === 'article';
}

export function isDashboardIndexPage() {
  if (!document.getElementById('dashboard-scroll-area')) return false;
  return !isArticlePermalinkPage();
}

/** Post pages must navigate to home before switching SPA panels. */
export function shouldUseHomeSpaNavigation() {
  return isArticlePermalinkPage();
}

export function buildCategoryHash(categoryId, page = 1) {
  return `category-${categoryId}${page > 1 ? `-p${page}` : ''}`;
}

export function buildPanelHash(panelId, { categoryId = null, page = 1 } = {}) {
  if (panelId === 'category-posts' && categoryId) {
    return buildCategoryHash(categoryId, page);
  }
  return panelId;
}

export function buildHomeSpaUrl(hash, { baseUrl = getSiteRoot() } = {}) {
  const cleanHash = String(hash || '').replace(/^#/, '');
  return cleanHash ? `${baseUrl}#${cleanHash}` : baseUrl;
}

export function parseCategoryHash(hash = location.hash) {
  const raw = String(hash).replace(/^#/, '');
  if (!raw.startsWith('category-')) return null;

  const pageMatch = raw.match(/-p(\d+)$/);
  const page = pageMatch ? Number(pageMatch[1]) : 1;
  const categoryId = raw.replace(/^category-/, '').replace(/-p\d+$/, '');

  if (!isKnownCategoryId(categoryId)) return null;
  return { categoryId, page };
}

export function navigateToHomeSpa(hash) {
  window.location.href = buildHomeSpaUrl(hash);
}

export function updateDashboardHash(hash) {
  const cleanHash = String(hash).replace(/^#/, '');
  if (shouldUseHomeSpaNavigation()) {
    navigateToHomeSpa(cleanHash);
    return false;
  }

  if (history.replaceState) {
    history.replaceState(null, '', `#${cleanHash}`);
  } else {
    location.hash = cleanHash;
  }
  return true;
}

export function shouldHandleCategoryInApp(link) {
  if (link.classList.contains('category-tree__link--branch')) return false;

  if (isDashboardIndexPage()) {
    const href = link.getAttribute('href') || '';
    return href === '#' || href === '' || href.startsWith('#category-');
  }

  if (isArticlePermalinkPage()) {
    return Boolean(link.dataset.categoryId);
  }

  return false;
}

/**
 * Boot-time routing for dashboard pages.
 * Returns true when a category hash was found and handled by the caller.
 */
export function bootstrapDashboardRouting() {
  if (isArticlePermalinkPage()) return { kind: 'article' };
  if (!hasDashboardPanels()) return { kind: 'no-dashboard' };

  const parsed = parseCategoryHash(location.hash);
  if (parsed) {
    return { kind: 'category', ...parsed };
  }

  const hash = location.hash.replace('#', '');
  const initialPanel = hash === 'what-i-do' ? 'what-i-do' : 'introduce-me';
  return { kind: 'panel', panelId: initialPanel };
}
