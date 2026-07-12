import { leafCategoryLabel } from '../../category-label.js';

const EXCERPT_MAX_CHARS = 400;

function htmlToPlainText(html) {
  const template = document.createElement('div');
  template.innerHTML = String(html || '');
  template.querySelectorAll('script, style, img, figure, iframe, video').forEach((node) => node.remove());
  return template.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatRssDate(pubDate) {
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return String(pubDate || '').trim();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}. ${m}. ${d}`;
}

function isUsableThumbnailUrl(url) {
  const value = String(url || '').trim();
  if (!value) return false;
  // Tistory RSS img tags embed onerror="this.src='.../no-image-v1.png'".
  // A greedy src= regex can pick that fallback instead of the real image.
  if (/no-image/i.test(value)) return false;
  return true;
}

function extractThumbnailFromDescription(descriptionHtml) {
  const template = document.createElement('div');
  template.innerHTML = String(descriptionHtml || '');

  const dataUrl = template.querySelector('[data-url]')?.getAttribute('data-url');
  if (isUsableThumbnailUrl(dataUrl)) return dataUrl.trim();

  const img = template.querySelector('img');
  const src = img?.getAttribute('src');
  if (isUsableThumbnailUrl(src)) return src.trim();

  return '';
}

function extractThumbnail(item, descriptionHtml) {
  const enclosure = item.querySelector('enclosure')?.getAttribute('url');
  if (isUsableThumbnailUrl(enclosure)) return enclosure.trim();

  const mediaThumb =
    item.querySelector('media\\:thumbnail, thumbnail')?.getAttribute('url') ||
    item.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url');
  if (isUsableThumbnailUrl(mediaThumb)) return mediaThumb.trim();

  return extractThumbnailFromDescription(descriptionHtml);
}

/**
 * Latest posts from the live Tistory blog RSS feed (same-origin).
 * Shape matches renderPostCard() expectations, plus categoryLabel.
 */
export async function getTistoryRecentPosts(limit = 8) {
  const response = await fetch(`${window.location.origin}/rss`, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Tistory RSS fetch failed: ${response.status}`);
  }

  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Tistory RSS parse failed');
  }

  return [...doc.querySelectorAll('item')].slice(0, Math.max(0, limit)).map((item) => {
    const title = item.querySelector('title')?.textContent?.trim() || 'Untitled';
    const link = item.querySelector('link')?.textContent?.trim() || '#';
    const description = item.querySelector('description')?.textContent || '';
    const categoryRaw = item.querySelector('category')?.textContent?.trim() || '';
    const categoryLabel = leafCategoryLabel(categoryRaw) || categoryRaw || 'Post';
    const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';

    return {
      title,
      link,
      date: formatRssDate(pubDate),
      excerpt: htmlToPlainText(description).slice(0, EXCERPT_MAX_CHARS),
      thumbnail: extractThumbnail(item, description),
      categoryLabel,
    };
  });
}
