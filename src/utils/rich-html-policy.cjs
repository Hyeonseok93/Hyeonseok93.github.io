/** Shared allowlist for blog/chapter rich HTML (Node + browser). */
const RICH_HTML_ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'div',
  'figure',
  'figcaption',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'span',
  'del',
  'sup',
  'sub',
];

const RICH_HTML_ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'title',
  'class',
  'id',
  'target',
  'rel',
  'loading',
  'width',
  'height',
];

function buildSanitizeHtmlAllowedAttributes() {
  const allowed = new Set(RICH_HTML_ALLOWED_ATTR);
  const pick = (...names) => names.filter((name) => allowed.has(name));

  return {
    a: pick('href', 'title', 'target', 'rel', 'class', 'id'),
    img: pick('src', 'alt', 'title', 'loading', 'width', 'height', 'class'),
    code: pick('class'),
    span: pick('class'),
    '*': pick('class', 'id'),
  };
}

module.exports = {
  RICH_HTML_ALLOWED_TAGS,
  RICH_HTML_ALLOWED_ATTR,
  buildSanitizeHtmlAllowedAttributes,
};
