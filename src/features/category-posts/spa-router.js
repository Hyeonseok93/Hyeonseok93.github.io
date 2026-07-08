import { isTistoryMode, isKnownCategoryId, getCategoryUrl } from './category-context.js';

const NON_DASHBOARD_BODY_IDS = new Set([
  'article',
  'category',
  'tag',
  'tt-body-page',
  'tt-body-category',
  'tt-body-tag',
  'tt-body-archive',
]);

const TISTORY_LIST_BODY_IDS = new Set([
  'tt-body-category',
  'tt-body-tag',
  'tt-body-archive',
]);

const PANEL_IDS = new Set(['introduce-me', 'what-i-do', 'category-posts']);

export function getSiteRoot() {
  const root = document.body.dataset.siteRoot;
  if (root) return root.endsWith('/') ? root : `${root}/`;
  return './';
}

export function getTistoryHomeUrl() {
  return `${window.location.origin}/`;
}

export function getHomeSpaBaseUrl() {
  return isTistoryMode() ? getTistoryHomeUrl() : getSiteRoot();
}

export function hasDashboardPanels() {
  return document.querySelectorAll('[data-dashboard-panel]').length > 0;
}

export function isDashboardIndexPage() {
  if (!document.getElementById('dashboard-scroll-area')) return false;
  return !NON_DASHBOARD_BODY_IDS.has(document.body.id);
}

export function isArticlePermalinkPage() {
  return document.body.id === 'article' || document.body.id === 'tt-body-page';
}

export function isTistoryListPage() {
  return TISTORY_LIST_BODY_IDS.has(document.body.id);
}

/** Off-dashboard pages must navigate to home before switching SPA panels. */
export function shouldUseHomeSpaNavigation() {
  if (isTistoryMode()) return !isDashboardIndexPage();
  return document.body.id === 'article';
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

export function buildHomeSpaUrl(hash, { baseUrl = getHomeSpaBaseUrl() } = {}) {
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

export function parsePanelHash(hash = location.hash) {
  const raw = String(hash).replace(/^#/, '');
  if (!raw) return null;

  const category = parseCategoryHash(raw);
  if (category) {
    return { panelId: 'category-posts', ...category };
  }

  if (PANEL_IDS.has(raw)) {
    return { panelId: raw, categoryId: null, page: 1 };
  }

  return null;
}

export function navigateToHomeSpa(hash) {
  window.location.href = buildHomeSpaUrl(hash);
}

export function replaceHomeSpa(hash) {
  window.location.replace(buildHomeSpaUrl(hash));
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

export function buildNativeCategoryUrl(categoryId, page = 1) {
  const href = getCategoryUrl(categoryId);
  if (!href || href === '#') return null;

  try {
    const url = new URL(href, window.location.origin);
    if (page > 1) url.searchParams.set('page', String(page));
    else url.searchParams.delete('page');
    return url.toString();
  } catch {
    return href;
  }
}

export function redirectTistoryCategoryHashToNative() {
  if (!isTistoryMode() || !isDashboardIndexPage()) return false;

  const parsed = parseCategoryHash(location.hash);
  if (!parsed) return false;

  const target = buildNativeCategoryUrl(parsed.categoryId, parsed.page);
  if (!target) return false;

  window.location.replace(target);
  return true;
}

/**
 * Tistory article pages with a panel hash still route to the home SPA.
 */
export function redirectTistoryNativeUrlsToSpa() {
  if (!isTistoryMode() || isDashboardIndexPage()) return false;

  if (document.body.id === 'tt-body-page') {
    const hash = location.hash.replace('#', '');
    if (!hash) return false;
    replaceHomeSpa(hash);
    return true;
  }

  return false;
}

export function shouldHandleCategoryInApp(link) {
  if (link.classList.contains('category-tree__link--branch')) return false;

  if (isTistoryMode()) {
    return false;
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

/**
 * Boot-time routing for dashboard pages (after Tistory native URL redirects).
 * Returns true when a category hash was found and handled by the caller.
 */
export function bootstrapDashboardRouting() {
  if (isArticlePermalinkPage()) return { kind: 'article' };
  if (!hasDashboardPanels()) return { kind: 'no-dashboard' };

  if (isTistoryMode() && isTistoryListPage()) {
    return { kind: 'native-list', categoryId: findCategoryIdByPath() };
  }

  const parsed = parseCategoryHash(location.hash);
  if (parsed) {
    return { kind: 'category', ...parsed };
  }

  const hash = location.hash.replace('#', '');
  const initialPanel = hash === 'what-i-do' ? 'what-i-do' : 'introduce-me';
  return { kind: 'panel', panelId: initialPanel };
}
