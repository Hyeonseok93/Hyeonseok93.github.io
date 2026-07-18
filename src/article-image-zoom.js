/**
 * GitHub Pages only: click article images to open a scrollable lightbox.
  * Imported from main.js - never from tistory.entry.js (Tistory has its own viewer).
 */
import './styles/article-image-zoom.css';

let overlay = null;
let stageImg = null;
let lastFocused = null;

function isGitHubArticlePage() {
  // Extra guard: Tistory pages use #tt-body-page and must not get this UX.
  if (document.body?.id === 'tt-body-page') return false;
  return document.body?.id === 'article' || Boolean(document.querySelector('.article-content'));
}

function ensureOverlay() {
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'article-image-zoom';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Image preview');
  overlay.hidden = true;

  overlay.innerHTML = `
    <button type="button" class="article-image-zoom__close" aria-label="Close">&times;</button>
    <div class="article-image-zoom__stage">
      <img alt="" />
    </div>
  `;

  stageImg = overlay.querySelector('.article-image-zoom__stage img');
  const closeBtn = overlay.querySelector('.article-image-zoom__close');

  closeBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    closeZoom();
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay || event.target === stageImg) {
      closeZoom();
    }
  });

  document.body.appendChild(overlay);
  return overlay;
}

function openZoom(img) {
  const src = img.currentSrc || img.src;
  if (!src) return;

  ensureOverlay();
  lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  stageImg.src = src;
  stageImg.alt = img.alt || '';

  overlay.hidden = false;
  requestAnimationFrame(() => {
    overlay.classList.add('is-open');
  });

  document.body.classList.add('article-image-zoom-open');
  overlay.querySelector('.article-image-zoom__close')?.focus();
}

function closeZoom() {
  if (!overlay?.classList.contains('is-open')) return;

  overlay.classList.remove('is-open');
  document.body.classList.remove('article-image-zoom-open');

  const finish = () => {
    if (!overlay || overlay.classList.contains('is-open')) return;
    overlay.hidden = true;
    if (stageImg) {
      stageImg.removeAttribute('src');
      stageImg.alt = '';
    }
    lastFocused?.focus?();
    lastFocused = null;
  };

  overlay.addEventListener('transitionend', finish, { once: true });
  window.setTimeout(finish, 220);
}

function onDocumentClick(event) {
  if (!isGitHubArticlePage()) return;
  if (overlay?.classList.contains('is-open')) return;

  const img = event.target.closest?('.article-content img');
  if (!img || !document.querySelector('.article-content')?.contains(img)) return;

  // Leave real links alone (e.g. badge / external image links).
  if (img.closest('a[href]')) return;

  event.preventDefault();
  openZoom(img);
}

function onKeyDown(event) {
  if (event.key === 'Escape') closeZoom();
}

function initArticleImageZoom() {
  // Always bind: SPA may open an article after the first paint on the home page.
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeyDown);
}

document.addEventListener('DOMContentLoaded', initArticleImageZoom);
