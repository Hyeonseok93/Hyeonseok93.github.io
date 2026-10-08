/**
 * marked leaves `**text**` unparsed when a Hangul syllable follows the closing `**`
 * (e.g. `**굵게**입니다`). Turn those into <strong>, skipping code.
 */
const CODE_SEGMENT_RE = /(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/g;
const UNPARSED_BOLD_RE = /\*\*([^*\n]+?)\*\*(?=[가-힣])/g;

const fixUnparsedBold = (html) =>
  String(html || '')
    .split(CODE_SEGMENT_RE)
    .map((segment, i) => (i % 2 === 1 ? segment : segment.replace(UNPARSED_BOLD_RE, '<strong>$1</strong>')))
    .join('');

module.exports = { fixUnparsedBold };
