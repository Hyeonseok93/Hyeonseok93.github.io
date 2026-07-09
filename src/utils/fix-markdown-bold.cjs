const CODE_SEGMENT_RE = /(```[\s\S]*?```|`[^`\n]+`)/g;
const UNPARSED_BOLD_RE = /\*\*([^*\n]+?)\*\*(?=[\uAC00-\uD7A3])/g;

function fixUnparsedBoldInHtml(html) {
  return String(html || '').split(CODE_SEGMENT_RE).map((segment, index) => {
    if (index % 2 === 1) return segment;
    return segment.replace(UNPARSED_BOLD_RE, '<strong>$1</strong>');
  }).join('');
}

module.exports = { fixUnparsedBoldInHtml };
