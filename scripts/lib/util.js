const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** 2026-07-13 -> 2026. 07. 13 */
const fmtDate = (iso) => iso.replace(/-/g, '. ');
/** 2026-07-13 -> 07.13 */
const shortDate = (iso) => iso.slice(5).replace('-', '.');
const pad2 = (n) => String(n).padStart(2, '0');

/** Korean topic particle (은/는) for the last syllable of a word. */
const topic = (word) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 ? '은' : '는';
};

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** Recursive copy; `keep(name)` can skip files. */
function copyDir(src, dest, keep = () => true) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to, keep);
    else if (keep(entry.name)) fs.copyFileSync(from, to);
  }
}

module.exports = { ROOT, esc, fmtDate, shortDate, pad2, topic, writeFile, copyDir };
