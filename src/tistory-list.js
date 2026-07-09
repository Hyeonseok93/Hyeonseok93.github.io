import { leafCategoryLabel } from './category-label.js';

function normalizeMetaLine(metaEl) {
  if (!metaEl) return;

  const raw = metaEl.textContent.replace(/\s+/g, ' ').trim();
  const [datePart, ...categoryParts] = raw.split('·').map((part) => part.trim());
  const category = leafCategoryLabel(categoryParts.join(' · '));

  if (datePart && category) {
    metaEl.textContent = `${datePart} · ${category}`;
    return;
  }

  metaEl.textContent = datePart || category || raw;
}

function sanitizeListExcerpts(root) {
  root.querySelectorAll('[data-tistory-list-excerpt]').forEach((el) => {
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    el.textContent = text;
    if (!text) {
      el.remove();
    }
  });
}

function ensureListThumbnails(root) {
  root.querySelectorAll('.category-post-card__link').forEach((link) => {
    if (link.querySelector('.category-post-card__thumb')) return;

    const empty = document.createElement('div');
    empty.className = 'category-post-card__thumb category-post-card__thumb--empty';
    empty.setAttribute('aria-hidden', 'true');
    link.appendChild(empty);
  });
}

export function initTistoryListCards() {
  const root = document.getElementById('tistory-native-list');
  if (!root) return;

  root.querySelectorAll('.category-post-card__meta').forEach(normalizeMetaLine);
  sanitizeListExcerpts(root);
  ensureListThumbnails(root);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTistoryListCards);
  } else {
    initTistoryListCards();
  }
}
