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
