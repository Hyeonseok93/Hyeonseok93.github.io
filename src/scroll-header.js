let categoryMode = false;
let categoryObserver = null;

function setScrollHeaderVisible(visible) {
  const header = document.getElementById('dashboard-scroll-header');
  if (!header) return;

  header.classList.toggle('is-visible', visible);
  header.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

export function bindCategoryScrollHeader(titleElement, categoryLabel = '') {
  const header = document.getElementById('dashboard-scroll-header');
  const titleEl = header?.querySelector('.dashboard-scroll-header__title');
  const iconEl = header?.querySelector('.dashboard-scroll-header__icon');
  if (!header || !titleEl || !titleElement) return;

  if (categoryObserver) {
    categoryObserver.disconnect();
    categoryObserver = null;
  }

  categoryMode = true;
  const fullTitle = categoryLabel ? `Bulldog's House - ${categoryLabel}` : "Bulldog's House";
  titleEl.textContent = fullTitle;
  titleEl.title = categoryLabel ? fullTitle : '';
  if (iconEl) iconEl.classList.remove('hidden');
  header.classList.add('is-category-mode');
  setScrollHeaderVisible(false);

  categoryObserver = new IntersectionObserver(
    ([entry]) => {
      setScrollHeaderVisible(!entry.isIntersecting);
    },
    { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
  );

  categoryObserver.observe(titleElement);
}

export function resetScrollHeader() {
  const header = document.getElementById('dashboard-scroll-header');
  const titleEl = header?.querySelector('.dashboard-scroll-header__title');
  const iconEl = header?.querySelector('.dashboard-scroll-header__icon');
  if (!header || !titleEl) return;

  if (categoryObserver) {
    categoryObserver.disconnect();
    categoryObserver = null;
  }

  categoryMode = false;
  titleEl.textContent = "Bulldog's House";
  titleEl.removeAttribute('title');
  if (iconEl) iconEl.classList.remove('hidden');
  header.classList.remove('is-category-mode');
  setScrollHeaderVisible(false);
}

function initHomeScrollHeader() {
  const banner = document.getElementById('dashboard-banner');
  const header = document.getElementById('dashboard-scroll-header');
  if (!banner || !header) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (categoryMode) return;
      setScrollHeaderVisible(!entry.isIntersecting);
    },
    { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
  );

  observer.observe(banner);
}

/** Tistory native category/tag/archive list — hero title drives mini header. */
function initNativeListScrollHeader() {
  const bodyId = document.body?.id || '';
  if (!['tt-body-category', 'tt-body-tag', 'tt-body-archive', 'list'].includes(bodyId)) {
    return;
  }

  // GH SPA category list binds from category-posts/index.js instead.
  if (bodyId === 'list' && document.getElementById('category-posts-panel')) return;

  const hero = document.querySelector('#list-section .category-posts-hero, .tistory-native-list .category-posts-hero');
  const titleEl = hero?.querySelector('.category-posts-hero__title');
  const label = titleEl?.textContent?.trim();
  if (!hero || !label) return;

  bindCategoryScrollHeader(hero, label);
}

function initScrollHeader() {
  initHomeScrollHeader();
  initNativeListScrollHeader();
}

document.addEventListener('DOMContentLoaded', initScrollHeader);
