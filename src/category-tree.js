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
    label.querySelectorAll('.c_cnt, .cnt, span, img').forEach((node) => node.remove());
    const parsed = parseCategoryText(label.textContent);
    return {
      label: parsed.label,
      count: countMatch ? countMatch[1] : parsed.count,
    };
  }

  const label = anchor.cloneNode(true);
  label.querySelectorAll('img').forEach((node) => node.remove());
  return parseCategoryText(label.textContent);
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

function folderIconClass({ root = false, branch = false, child = false } = {}) {
  if (root) return 'fa-solid fa-folder';
  if (child) return 'fa-regular fa-folder-open';
  if (branch) return 'fa-regular fa-folder';
  return 'fa-regular fa-folder';
}

function getPostsRootLabel(host) {
  return host?.dataset.postsRootLabel?.trim() || "Bulldog's Posts";
}

function wrapCategoryTreeRoot(rootList, rootLabel) {
  if (!rootList || rootList.querySelector('[data-category-root]')) return;

  const wrapper = document.createElement('li');
  wrapper.className = 'category-tree__item category-tree__item--root category-tree__item--branch is-open';
  wrapper.dataset.categoryRoot = '';
  wrapper.dataset.categoryBranch = '';

  const row = document.createElement('div');
  row.className = 'category-tree__row';

  const rootLink = document.createElement('a');
  rootLink.href = '#';
  rootLink.className = 'category-tree__link category-tree__link--root category-tree__link--branch';
  rootLink.setAttribute('aria-expanded', 'true');
  rootLink.innerHTML = `
    <i class="${folderIconClass({ root: true })} text-accentAmber w-4 text-center shrink-0" aria-hidden="true"></i>
    <span class="category-tree__label">${escapeHtml(rootLabel)}</span>
    <span class="category-tree__count"></span>
  `;

  const childList = document.createElement('ul');
  childList.className = 'category-tree__children list-none';

  while (rootList.firstChild) {
    childList.appendChild(rootList.firstChild);
  }

  row.append(rootLink);
  wrapper.append(row, childList);
  rootList.appendChild(wrapper);
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
    link.className = 'category-tree__link category-tree__link--branch-level';
  }
  link.innerHTML = `
    <i class="${folderIconClass({ branch, child })} text-accentAmber w-4 text-center shrink-0" aria-hidden="true"></i>
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

function transformTistoryItem(li, { nested = false } = {}) {
  const anchor = li.querySelector(':scope > a');
  const childList = li.querySelector(':scope > ul');
  if (!anchor) return null;

  if (childList) {
    const item = document.createElement('li');
    item.className = 'category-tree__item category-tree__item--branch';
    item.dataset.categoryBranch = '';

    const row = document.createElement('div');
    row.className = 'category-tree__row';
    row.append(buildCategoryLink(anchor, { branch: true }));

    childList.classList.add('category-tree__children', 'list-none');
    const nextChildren = Array.from(childList.children)
      .filter((childItem) => childItem.tagName === 'LI')
      .map((childItem) => transformTistoryItem(childItem, { nested: true }))
      .filter(Boolean);
    childList.replaceChildren(...nextChildren);

    item.append(row, childList);
    return item;
  }

  const item = document.createElement('li');
  item.classList.add('category-tree__item', nested ? 'category-tree__item--leaf' : 'category-tree__item--leaf');
  item.replaceChildren(buildCategoryLink(anchor, nested ? { child: true } : {}));
  return item;
}

function buildTistoryCategoryRoot(rootLabel, items) {
  const rootList = document.createElement('ul');
  rootList.className = 'category-tree sidebar-menu list-none';
  rootList.dataset.categoryTree = 'tistory';

  const rootItem = document.createElement('li');
  rootItem.className = 'category-tree__item category-tree__item--root category-tree__item--branch is-open';
  rootItem.dataset.categoryRoot = '';
  rootItem.dataset.categoryBranch = '';

  const row = document.createElement('div');
  row.className = 'category-tree__row';

  const rootLink = document.createElement('a');
  rootLink.href = '#';
  rootLink.className = 'category-tree__link category-tree__link--root category-tree__link--branch';
  rootLink.setAttribute('aria-expanded', 'true');
  rootLink.innerHTML = `
    <i class="${folderIconClass({ root: true })} text-accentAmber w-4 text-center shrink-0" aria-hidden="true"></i>
    <span class="category-tree__label">${escapeHtml(rootLabel)}</span>
    <span class="category-tree__count"></span>
  `;

  const childList = document.createElement('ul');
  childList.className = 'category-tree__children list-none';
  childList.append(...items);

  row.append(rootLink);
  rootItem.append(row, childList);
  rootList.append(rootItem);
  return rootList;
}

function enhanceTistoryCategoryList(host) {
  if (host.querySelector('[data-category-tree]')) return;

  const ttCategory = host.querySelector('ul.tt_category');
  let rootLabel = getPostsRootLabel(host);
  let sourceItems = [];

  if (ttCategory) {
    const rootLi = ttCategory.querySelector(':scope > li');
    const rootAnchor = rootLi?.querySelector(':scope > a');
    const categoryList = rootLi?.querySelector(':scope > ul.category_list, :scope > ul');

    if (rootAnchor) {
      const parsed = parseCategoryAnchor(rootAnchor);
      if (parsed.label) rootLabel = parsed.label;
    }

    if (categoryList) {
      sourceItems = Array.from(categoryList.children).filter((item) => item.tagName === 'LI');
    }
  } else {
    const fallbackList = host.querySelector('ul');
    if (!fallbackList) return;
    sourceItems = Array.from(fallbackList.children).filter((item) => item.tagName === 'LI');
  }

  const transformedItems = sourceItems
    .map((item) => transformTistoryItem(item))
    .filter(Boolean);

  if (!transformedItems.length) return;

  const rootList = buildTistoryCategoryRoot(rootLabel, transformedItems);
  host.replaceChildren(rootList);
  bindCategoryBranches(rootList);
}

function finalizeCategoryTree(host) {
  const rootList = host.querySelector('[data-category-tree]') || host.querySelector('ul');
  if (!rootList) return;

  if (rootList.dataset.categoryTree !== 'tistory') {
    wrapCategoryTreeRoot(rootList, getPostsRootLabel(host));
  }

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
    finalizeCategoryTree(host);
    syncStaticCategoryCounts(host.querySelector('[data-category-tree]'));
    return;
  }

  enhanceTistoryCategoryList(host);
  finalizeCategoryTree(host);
}

document.addEventListener('DOMContentLoaded', initCategoryTree);
