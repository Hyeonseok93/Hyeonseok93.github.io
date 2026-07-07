import { closeSidebar } from '../../sidebar.js';
import { bindCategoryScrollHeader } from '../../scroll-header.js';
import { CATEGORY_POSTS_PER_PAGE } from '../../data/category-meta.js';
import {
  isKnownCategoryId,
  shouldHandleCategoryInApp,
  getCategoryLabel,
  getCategoryDescription,
  getCategoryTotalCount,
  isTistoryMode,
} from './category-context.js';
import { loadCategoryPosts, getStaticPostCount } from './load-posts.js';
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
} from './dashboard-nav.js';

let activeCategoryPage = 1;
let activeCategoryRequest = 0;

function parseCategoryHash(hash) {
  const raw = hash.replace('#', '');
  if (!raw.startsWith('category-')) return null;

  const pageMatch = raw.match(/-p(\d+)$/);
  const page = pageMatch ? Number(pageMatch[1]) : 1;
  const categoryId = raw.replace(/^category-/, '').replace(/-p\d+$/, '');

  if (!isKnownCategoryId(categoryId)) return null;
  return { categoryId, page };
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

  const panels = document.querySelectorAll('[data-dashboard-panel]');
  if (!panels.length) {
    const root = document.body.dataset.siteRoot || '../../';
    const base = root.endsWith('/') ? root : `${root}/`;
    const hash = `category-${categoryId}${page > 1 ? `-p${page}` : ''}`;
    window.location.href = `${base}#${hash}`;
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

      const totalHint = isTistoryMode() ? getCategoryTotalCount(categoryId) : getStaticPostCount(categoryId);
      const totalPages = Math.max(1, Math.ceil((totalHint || 1) / CATEGORY_POSTS_PER_PAGE));

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

  const parsed = parseCategoryHash(location.hash);
  if (parsed) {
    showCategoryPosts(parsed.categoryId, parsed.page);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboardNav(() => Boolean(parseCategoryHash(location.hash)));
  initCategoryPosts();
});
