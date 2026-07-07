export const CATEGORY_POSTS_PER_PAGE = 8;

import categories from './categories.json';

export const CATEGORY_LABELS = categories.labels;

/** Inverse map: display label → internal category id */
export const CATEGORY_ID_BY_LABEL = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).map(([id, label]) => [label, id])
);

export const CATEGORY_DESCRIPTIONS = categories.descriptions;
