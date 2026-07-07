import { CATEGORY_ID_BY_LABEL } from './data/category-meta.js';
import { POSTS_BY_CATEGORY } from './data/posts-manifest.js';
import { escapeHtml } from './utils/escape-html.js';
function parseCategoryText(text) {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  const match = trimmed.match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (match) {
    return { label: match[1].trim(), count: match[2] };
  }
  return { label: trimmed, count: null };
}

function parseCategoryAnchor(anchor) {
  const cntNode = anchor.querySelector('.c_cnt, .cnt, span');
  if (cntNode) {
    const countMatch = cntNode.textContent.match(/(\d+)/);
    const label = anchor.cloneNode(true);
    label.querySelectorAll('.c_cnt, .cnt, span').forEach((node) => node.remove());
    const parsed = parseCategoryText(label.textContent);
    return {
      label: parsed.label,
      count: countMatch ? countMatch[1] : parsed.count,
    };
  }
  return parseCategoryText(anchor.textContent);
}

function renderCount(count) {
  if (count === null || count === undefined || count === '') return '';
  return `<span class="category-tree__count">(${count})</span>`;
}

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

function folderIconClass(child = false) {
  return child ? 'fa-regular fa-folder' : 'fa-solid fa-folder';
}

function getCategoryId(label) {
  return CATEGORY_ID_BY_LABEL[label] || null;
}

function getCategorySlug(href) {
  if (!href || href === '#') return null;

  try {
    const url = new URL(href, window.location.origin);
    const match = url.pathname.match(/\/category\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function resolveCategoryId(label, href) {
  return getCategoryId(label) || getCategorySlug(href) || label.trim().toLowerCase().replace(/\s+/g, '-');
}

function buildCategoryLink(anchor, { child = false, branch = false } = {}) {
  const { label, count } = parseCategoryAnchor(anchor);
  const href = anchor.getAttribute('href') || '#';

  const link = document.createElement('a');
  link.href = href;
  if (branch) {
    link.className = 'category-tree__link category-tree__link--branch';
  } else if (child) {
    link.className = 'category-tree__link category-tree__link--child';
  } else {
    link.className = 'category-tree__link';
  }
  link.innerHTML = `
    <i class="${folderIconClass(child)} text-accentAmber w-4 text-center shrink-0" aria-hidden="true"></i>
    <span class="category-tree__label">${escapeHtml(label)}</span>
    ${renderCount(count)}
  `;

  const categoryId = child || (!branch && !child) ? resolveCategoryId(label, href) : null;
  if (categoryId) {
    link.dataset.categoryId = categoryId;
    link.dataset.categoryLabel = label;
  }
  if (href && href !== '#') {
    link.dataset.categoryUrl = href;
  }

  return link;
}

function enhanceTistoryCategoryList(host) {
  if (host.querySelector('[data-category-tree]')) return;

  const rootList = host.querySelector('ul');
  if (!rootList) return;

  rootList.classList.add('category-tree', 'sidebar-menu', 'list-none');
  rootList.dataset.categoryTree = 'tistory';

  Array.from(rootList.children).forEach((item) => {
    if (item.tagName !== 'LI') return;

    const childList = item.querySelector(':scope > ul');
    const originalLink = item.querySelector(':scope > a');
    if (!originalLink) return;

    if (childList) {
      item.classList.add('category-tree__item', 'category-tree__item--branch');
      item.dataset.categoryBranch = '';
      item.innerHTML = '';

      const row = document.createElement('div');
      row.className = 'category-tree__row';
      row.append(buildCategoryLink(originalLink, { branch: true }));

      childList.classList.add('category-tree__children', 'list-none');

      Array.from(childList.children).forEach((childItem) => {
        if (childItem.tagName !== 'LI') return;
        const childLink = childItem.querySelector(':scope > a');
        if (!childLink) return;
        childItem.classList.add('category-tree__item', 'category-tree__item--leaf');
        childItem.replaceChildren(buildCategoryLink(childLink, { child: true }));
      });

      item.append(row, childList);
    } else {
      item.classList.add('category-tree__item', 'category-tree__item--leaf');
      item.replaceChildren(buildCategoryLink(originalLink));
    }
  });

  bindCategoryBranches(rootList);
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
}

function syncStaticCategoryCounts(root) {
  if (root.dataset.categoryTree === 'tistory') return;

  root.querySelectorAll('[data-category-id]').forEach((link) => {
    const count = POSTS_BY_CATEGORY[link.dataset.categoryId]?.length ?? 0;
    const countEl = link.querySelector('.category-tree__count');
    if (!countEl) return;
    countEl.textContent = count > 0 ? `(${count})` : '';
  });

  updateBranchCounts(root);
}

function initCategoryTree() {
  const host = document.getElementById('sidebar-category-host');
  if (!host) return;

  if (host.querySelector('[data-category-tree]')) {
    bindCategoryBranches(host);
    syncStaticCategoryCounts(host.querySelector('[data-category-tree]'));
    return;
  }

  enhanceTistoryCategoryList(host);
  updateBranchCounts(host);
}

document.addEventListener('DOMContentLoaded', initCategoryTree);
