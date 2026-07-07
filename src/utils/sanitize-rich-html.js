import DOMPurify from 'dompurify';
import { RICH_HTML_ALLOWED_TAGS, RICH_HTML_ALLOWED_ATTR } from './rich-html-policy.js';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: RICH_HTML_ALLOWED_TAGS,
  ALLOWED_ATTR: RICH_HTML_ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
};

let hooksRegistered = false;

function ensureSanitizeHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

export function sanitizeRichHtml(value) {
  ensureSanitizeHooks();
  return DOMPurify.sanitize(String(value ?? ''), SANITIZE_CONFIG);
}
