const sanitizeHtml = require('sanitize-html');
const {
  RICH_HTML_ALLOWED_TAGS,
  buildSanitizeHtmlAllowedAttributes,
} = require('./rich-html-policy.cjs');

function sanitizeRichHtml(value) {
  return sanitizeHtml(String(value ?? ''), {
    allowedTags: RICH_HTML_ALLOWED_TAGS,
    allowedAttributes: buildSanitizeHtmlAllowedAttributes(),
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}

module.exports = { sanitizeRichHtml };
