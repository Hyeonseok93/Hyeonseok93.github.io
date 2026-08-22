export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Decode `&mdash;`, `&amp;`, numeric entities, etc. (e.g. Tistory RSS titles in CDATA). */
export function decodeHtmlEntities(value) {
  const text = String(value ?? '');
  if (!text.includes('&')) return text;
  const template = document.createElement('textarea');
  template.innerHTML = text;
  return template.value;
}
