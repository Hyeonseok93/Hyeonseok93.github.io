import {
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
} from '../../data/category-meta.js';

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

export function resolvePostAssetPath(pathValue) {
  if (!pathValue) return '';
  if (/^https?:\/\//.test(pathValue)) return pathValue;
  if (pathValue.startsWith('./posts/')) return pathValue;
  if (pathValue.startsWith('./images/') || pathValue.startsWith('./src/assets/')) {
    return pathValue.replace('./src/assets/', './images/');
  }
  return `./images/${pathValue.replace(/^\.\//, '')}`;
}
