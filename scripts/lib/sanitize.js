/** Allowlist for post HTML (markdown output plus the inline HTML the posts use). */
const sanitizeHtml = require('sanitize-html');

const TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li',
  'blockquote', 'pre', 'code', 'div', 'figure', 'figcaption', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'span', 'del', 'sup', 'sub',
];

function sanitizeRichHtml(value) {
  return sanitizeHtml(String(value ?? ''), {
    allowedTags: TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel', 'class', 'id'],
      img: ['src', 'alt', 'title', 'width', 'height', 'class'],
      code: ['class'],
      span: ['class'],
      '*': ['class', 'id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
  });
}

module.exports = { sanitizeRichHtml };
