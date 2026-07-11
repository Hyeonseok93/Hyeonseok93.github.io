import { closeSidebar } from '../../sidebar.js';
import { bindCategoryScrollHeader } from '../../scroll-header.js';
import { CATEGORY_POSTS_PER_PAGE, RECENT_POSTS_LIMIT } from '../../data/category-meta.js';
import {
  isKnownCategoryId,
  isTistoryMode,
  getCategoryLabel,
  getCategoryDescription,
} from './category-context.js';
import { loadCategoryPosts, getStaticPostCount, getRecentPosts } from './load-posts.js';
import { getTistoryRecentPosts } from './tistory-recent.js';
import {
  renderPostCard,
  renderCategoryPagination,
  renderLoadingState,
  renderErrorState,
} from './render.js';
import {
  getActiveCategoryId,
  setActiveCategoryId,
  setCategoryActive,
  setDashboardPanel,
  initDashboardNav,
  isDashboardNavReady,
} from './dashboard-nav.js';
import {
  shouldHandleCategoryInApp,
  buildCategoryHash,
  navigateToHomeSpa,
  redirectTistoryNativeUrlsToSpa,
  redirectTistoryCategoryHashToNative,
  buildNativeCategoryUrl,
  bootstrapDashboardRouting,
  shouldUseHomeSpaNavigation,
  hasDashboardPanels,
} from './spa-router.js';

let activeCategoryPage = 1;
let activeCategoryRequest = 0;
let recentPostsRendered = false;

async function renderRecentPosts() {
  const listEl = document.getElementById('what-i-do-posts-list');
  if (!listEl || recentPostsRendered) return;

  listEl.innerHTML = renderLoadingState();

  try {
    if (isTistoryMode()) {
      const posts = await getTistoryRecentPosts(RECENT_POSTS_LIMIT);
      if (!posts.length) {
        listEl.innerHTML = renderErrorState('아직 작성된 글이 없습니다.');
      } else {
        listEl.innerHTML = posts
          .map((post) => renderPostCard(post, post.categoryLabel))
          .join('');
      }
    } else {
      const posts = getRecentPosts(RECENT_POSTS_LIMIT);
      if (!posts.length) {
        listEl.innerHTML = renderErrorState('아직 작성된 글이 없습니다.');
      } else {
        listEl.innerHTML = posts
          .map((post) => renderPostCard(post, getCategoryLabel(post.categoryId)))
          .join('');
      }
    }
  } catch {
    listEl.innerHTML = renderErrorState('최근 글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  recentPostsRendered = true;
}

async function renderCategoryPosts(categoryId, page = 1) {
  const titleEl = document.getElementById('category-posts-title');
  const descEl = document.getElementById('category-posts-desc');
  const listEl = document.getElementById('category-posts-list');
  if (!titleEl || !descEl || !listEl) return;

  const requestId = ++activeCategoryRequest;
  const label = getCategoryLabel(categoryId);
  const description = getCategoryDescription(categoryId);

  titleEl.textContent = label;
  descEl.textContent = description;
  listEl.innerHTML = renderLoadingState();
  renderCategoryPagination(0, 1);

  let result;
  try {
    result = await loadCategoryPosts(categoryId, page);
  } catch {
    if (requestId !== activeCategoryRequest) return;
    listEl.innerHTML = renderErrorState('글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    renderCategoryPagination(0, 1);
    bindCategoryScrollHeader(titleEl.closest('.category-posts-hero') || titleEl, label);
    return;
  }

  if (requestId !== activeCategoryRequest) return;

  const totalPosts = result.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalPosts / CATEGORY_POSTS_PER_PAGE));
  const safePage = result.safePage ?? Math.min(Math.max(page, 1), totalPages);
  activeCategoryPage = safePage;

  if (!result.posts.length) {
    listEl.innerHTML = renderErrorState('아직 작성된 글이 없습니다.');
    renderCategoryPagination(0, 1);
    bindCategoryScrollHeader(titleEl.closest('.category-posts-hero') || titleEl, label);
    return;
  }

  listEl.innerHTML = result.posts.map((post) => renderPostCard(post, label)).join('');
  renderCategoryPagination(totalPosts, safePage);
  bindCategoryScrollHeader(titleEl.closest('.category-posts-hero') || titleEl, label);
}

async function showCategoryPosts(categoryId, page = 1) {
  if (!isKnownCategoryId(categoryId)) return;

  if (isTistoryMode()) {
    const target = buildNativeCategoryUrl(categoryId, page);
    if (target) {
      window.location.href = target;
      return;
    }
  }

  if (shouldUseHomeSpaNavigation() || !hasDashboardPanels()) {
    navigateToHomeSpa(buildCategoryHash(categoryId, page));
    return;
  }

  setActiveCategoryId(categoryId);
  setCategoryActive(categoryId);
  setDashboardPanel('category-posts', page);
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await renderCategoryPosts(categoryId, page);
}

function initCategoryPosts() {
  if (isTistoryMode()) return;

  const host = document.getElementById('sidebar-category-host');
  const paginationEl = document.getElementById('category-posts-pagination');

  if (host) {
    host.addEventListener('click', (event) => {
      const link = event.target.closest('[data-category-id]');
      if (!link || link.classList.contains('category-tree__link--branch')) return;
      if (!shouldHandleCategoryInApp(link)) return;

      const categoryId = link.dataset.categoryId;
      if (!categoryId) return;

      event.preventDefault();
      showCategoryPosts(categoryId, 1);
    });
  }

  if (paginationEl) {
    paginationEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-page], [data-page-action]');
      const categoryId = getActiveCategoryId();
      if (!button || !categoryId || button.disabled) return;

      const totalPages = Math.max(1, Math.ceil((getStaticPostCount(categoryId) || 1) / CATEGORY_POSTS_PER_PAGE));

      let nextPage = activeCategoryPage;
      if (button.dataset.pageAction === 'prev') {
        nextPage = Math.max(1, activeCategoryPage - 1);
      } else if (button.dataset.pageAction === 'next') {
        nextPage = Math.min(totalPages, activeCategoryPage + 1);
      } else if (button.dataset.page) {
        nextPage = Number(button.dataset.page);
      }

      if (nextPage === activeCategoryPage) return;
      showCategoryPosts(categoryId, nextPage);
    });
  }
}

function bootstrapHomeSpa() {
  if (redirectTistoryNativeUrlsToSpa()) return;
  if (redirectTistoryCategoryHashToNative()) return;

  initDashboardNav();
  initCategoryPosts();
  void renderRecentPosts();

  if (!isDashboardNavReady()) return;

  const boot = bootstrapDashboardRouting();
  if (boot.kind === 'redirected' || boot.kind === 'article' || boot.kind === 'no-dashboard') return;

  if (boot.kind === 'native-list') {
    if (boot.categoryId) {
      // Category tree may still be enhancing Tistory markup; sync after DOM settles.
      requestAnimationFrame(() => setCategoryActive(boot.categoryId));
    }
    return;
  }

  if (boot.kind === 'category') {
    showCategoryPosts(boot.categoryId, boot.page);
    return;
  }

  if (boot.kind === 'panel') {
    setDashboardPanel(boot.panelId);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
}

document.addEventListener('DOMContentLoaded', bootstrapHomeSpa);
