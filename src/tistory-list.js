import { leafCategoryLabel } from './category-label.js';

const LIST_EXCERPT_MAX_CHARS = 400;
const NEW_ICON_SELECTOR = 'img[alt="N"], img[alt="NEW"], img[alt="new"]';

function htmlToPlainText(html) {
  const template = document.createElement('div');
  template.innerHTML = html;
  template.querySelectorAll('script, style, img, figure, iframe, video').forEach((node) => node.remove());
  return template.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

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

function cleanTitleElement(title) {
  if (!title) return;

  title.querySelectorAll(NEW_ICON_SELECTOR).forEach((img) => img.remove());
  const text = title.textContent.replace(/\s+/g, ' ').trim();
  if (text) title.textContent = text;
}

function promoteNewPostBadges(root) {
  root.querySelectorAll('.category-post-card').forEach((card) => {
    const body = card.querySelector('.category-post-card__body');
    const title = card.querySelector('.category-post-card__title');
    if (!body || !title) return;

    const newImg = card.querySelector(NEW_ICON_SELECTOR);
    cleanTitleElement(title);
    if (!newImg) return;

    newImg.remove();
    if (body.querySelector('.category-post-card__new')) return;

    const badge = document.createElement('span');
    badge.className = 'category-post-card__new';
    badge.textContent = 'NEW';
    body.insertBefore(badge, title);
  });
}

function sanitizeListExcerpts(root) {
  root.querySelectorAll('[data-tistory-list-excerpt]').forEach((el) => {
    const text = htmlToPlainText(el.innerHTML).slice(0, LIST_EXCERPT_MAX_CHARS);
    if (!text) {
      el.remove();
      return;
    }
    el.textContent = text;
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

  promoteNewPostBadges(root);
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
