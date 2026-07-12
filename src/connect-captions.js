/**
 * Keep Connect captions on one line: shrink font first, ellipsis only at min size.
 */
const SELECTOR = '.connect-links-caption, .connect-links-note';
const MAX_PX = { caption: 14.4, note: 13.6 };
const MIN_PX = 10;

function maxFor(el) {
  return el.classList.contains('connect-links-note') ? MAX_PX.note : MAX_PX.caption;
}

function fitOne(el) {
  const full = el.dataset.fullText || el.textContent.trim();
  el.dataset.fullText = full;
  el.textContent = full;
  el.title = '';

  let size = maxFor(el);
  el.style.fontSize = `${size}px`;

  // Shrink until it fits, or hit the floor.
  while (size > MIN_PX && el.scrollWidth > el.clientWidth + 1) {
    size -= 0.25;
    el.style.fontSize = `${size}px`;
  }

  // Still overflowing at min → ellipsis; keep full text in title.
  if (el.scrollWidth > el.clientWidth + 1) {
    el.title = full;
  }
}

export function fitConnectCaptions() {
  document.querySelectorAll(SELECTOR).forEach(fitOne);
}

function init() {
  fitConnectCaptions();
  window.addEventListener('resize', fitConnectCaptions);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
