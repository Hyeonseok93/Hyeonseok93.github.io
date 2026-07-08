/** Tistory category tokens often arrive as "Parent/Child". Keep the leaf only. */
export function leafCategoryLabel(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const parts = text.split('/').map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : text;
}

function rewriteTextNode(el) {
  if (!el) return;
  const next = leafCategoryLabel(el.textContent);
  if (next && next !== el.textContent.trim()) {
    el.textContent = next;
  }
}

export function initCategoryLabels() {
  document
    .querySelectorAll('.article-back span, [data-category-label-source], .category-posts-hero__title')
    .forEach(rewriteTextNode);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCategoryLabels);
  } else {
    initCategoryLabels();
  }
}
