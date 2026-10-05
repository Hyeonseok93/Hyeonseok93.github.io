import { CATEGORY_ID_BY_LABEL } from './data/category-meta.js';
import { POSTS_BY_CATEGORY } from './data/posts-manifest.js';
import { setCategoryActive } from './features/category-posts/dashboard-nav.js';

function setBranchOpen(branch, open) {
  branch.classList.toggle('is-open', open);
  const link = branch.querySelector(':scope > .category-tree__row > .category-tree__link--branch');
  if (link) {
    link.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
}

function bindCategoryBranches(root) {
  root.querySelectorAll('[data-category-branch]').forEach((branch) => {
    const link = branch.querySelector(':scope > .category-tree__row > .category-tree__link--branch');
    if (!link || link.dataset.bound === 'true') return;

    link.dataset.bound = 'true';
    link.setAttribute('role', 'button');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      setBranchOpen(branch, !branch.classList.contains('is-open'));
    });
  });
}

function syncBranchOpenState(root) {
  root.querySelectorAll('[data-category-branch]').forEach((branch) => {
    setBranchOpen(branch, branch.classList.contains('is-open'));
  });
}

function finalizeCategoryTree(rootList) {
  syncBranchOpenState(rootList);
  bindCategoryBranches(rootList);
  updateBranchCounts(rootList);
}

function updateBranchCounts(root) {
  root.querySelectorAll('[data-category-branch]').forEach((branch) => {
    const countEl = branch.querySelector(':scope > .category-tree__row .category-tree__count');
    if (!countEl) return;

    const childCountEls = branch.querySelectorAll(':scope > .category-tree__children .category-tree__count');
    let total = 0;
    let hasChildCounts = false;

    childCountEls.forEach((el) => {
      const match = el.textContent.match(/\((\d+)\)/);
      if (match) {
        total += Number(match[1]);
        hasChildCounts = true;
      }
    });

    if (hasChildCounts) {
      countEl.textContent = `(${total})`;
    }
  });

  const rootBranch = root.querySelector('[data-category-root]');
  if (rootBranch) {
    const rootCountEl = rootBranch.querySelector(':scope > .category-tree__row .category-tree__count');
    if (!rootCountEl) return;

    let total = 0;
    let hasCounts = false;
    rootBranch.querySelectorAll(':scope > .category-tree__children [data-category-id] .category-tree__count').forEach((el) => {
      const match = el.textContent.match(/\((\d+)\)/);
      if (match) {
        total += Number(match[1]);
        hasCounts = true;
      }
    });

    if (hasCounts) {
      rootCountEl.textContent = `(${total})`;
    }
  }
}

function syncStaticCategoryCounts(root) {
  root.querySelectorAll('[data-category-id]').forEach((link) => {
    const count = POSTS_BY_CATEGORY[link.dataset.categoryId]?.length ?? 0;
    const countEl = link.querySelector('.category-tree__count');
    if (!countEl) return;
    countEl.textContent = count > 0 ? `(${count})` : '';
  });

  updateBranchCounts(root);
}

function getActiveCategoryIdFromArticle() {
  const backLink = document.querySelector('.article-back');
  if (!backLink) return null;

  const href = backLink.getAttribute('href') || '';
  const hashMatch = href.match(/#category-([^/?#]+)/);
  if (hashMatch && document.querySelector(`[data-category-id="${hashMatch[1]}"]`)) {
    return hashMatch[1];
  }

  const label = backLink.querySelector('span')?.textContent?.trim();
  if (label && CATEGORY_ID_BY_LABEL[label]) {
    return CATEGORY_ID_BY_LABEL[label];
  }

  try {
    const match = window.location.pathname.match(/\/posts\/([^/]+)\/?$/);
    if (!match) return null;
    const slug = decodeURIComponent(match[1]);
    for (const [categoryId, posts] of Object.entries(POSTS_BY_CATEGORY)) {
      if (posts.some((post) => post.slug === slug)) return categoryId;
    }
  } catch {
    // ignore
  }

  return null;
}

function restoreActiveCategoryHighlight() {
  if (document.body.id !== 'article') return;

  const categoryId = getActiveCategoryIdFromArticle();
  if (!categoryId) return;

  setCategoryActive(categoryId);
}

function initCategoryTree() {
  const host = document.getElementById('sidebar-category-host');
  if (!host) return;

  const tree = host.querySelector('[data-category-tree]');
  if (!tree) return;

  finalizeCategoryTree(tree);
  syncStaticCategoryCounts(tree);
  restoreActiveCategoryHighlight();
}

document.addEventListener('DOMContentLoaded', initCategoryTree);
