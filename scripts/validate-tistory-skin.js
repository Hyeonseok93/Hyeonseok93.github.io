const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'tistory');
const ROOT_FILES = ['index.xml', 'skin.html', 'style.css', 'preview.gif'];

const INVALID_VALUE_TOKENS = [
  '[##_list_confirm_##]',
  '[##_list_rep_date_##]',
  '[##_list_rep_summary_##]',
  '[##_tag_link_##]',
  '[##_tag_name_##]',
];

const INVALID_GROUP_TAGS = ['s_article_tag', 's_tag_label_rep'];

function fail(messages) {
  console.error('\nTistory skin validation FAILED:\n');
  messages.forEach((message) => console.error(`  - ${message}`));
  console.error('\nFix the issues above, then run: npm run build:tistory\n');
  process.exit(1);
}

function main() {
  const errors = [];

  for (const name of ROOT_FILES) {
    if (!fs.existsSync(path.join(DIST_DIR, name))) {
      errors.push(`Missing required root file: ${name}`);
    }
  }

  const skinPath = path.join(DIST_DIR, 'skin.html');
  if (!fs.existsSync(skinPath)) {
    fail(errors.length ? errors : ['dist/tistory/skin.html not found']);
  }

  const skinHtml = fs.readFileSync(skinPath, 'utf8');

  if (!skinHtml.includes('<s_t3>') || !skinHtml.includes('</s_t3>')) {
    errors.push('skin.html must include both <s_t3> and </s_t3>');
  }

  for (const token of INVALID_VALUE_TOKENS) {
    if (skinHtml.includes(token)) {
      errors.push(`Invalid value token in skin.html: ${token}`);
    }
  }

  for (const tag of INVALID_GROUP_TAGS) {
    if (new RegExp(`<${tag}[\\s>]`, 'i').test(skinHtml)) {
      errors.push(`Invalid group tag in skin.html: <${tag}>`);
    }
  }

  if (skinHtml.includes('category-posts-anchor')) {
    errors.push('skin.html must not include category-posts-anchor (GH-only SPA panel)');
  }

  if (!skinHtml.includes('tistory-native-list')) {
    errors.push('skin.html must include tistory-native-list for category/tag/archive pages');
  }

  if (!/<s_paging[\s>]/i.test(skinHtml)) {
    errors.push('skin.html must include <s_paging> for native list pagination');
  }

  if (/<!-- tistory-strip-start:/.test(skinHtml)) {
    errors.push('skin.html contains unstripped tistory-strip markers');
  }

  const opens = [...skinHtml.matchAll(/<(s_[a-z0-9_]+)>/gi)].map((match) => match[1].toLowerCase());
  const closes = [...skinHtml.matchAll(/<\/(s_[a-z0-9_]+)>/gi)].map((match) => match[1].toLowerCase());
  const balance = {};
  for (const tag of opens) balance[tag] = (balance[tag] || 0) + 1;
  for (const tag of closes) balance[tag] = (balance[tag] || 0) - 1;
  for (const [tag, count] of Object.entries(balance)) {
    if (count !== 0) {
      errors.push(`Unbalanced group tag <${tag}>: ${count > 0 ? 'missing closing tag' : 'extra closing tag'}`);
    }
  }

  const previewPath = path.join(DIST_DIR, 'preview.gif');
  if (fs.existsSync(previewPath) && fs.statSync(previewPath).size < 100) {
    console.warn('Warning: preview.gif is a 1x1 placeholder. Consider adding src/assets/preview.gif (112x84).');
  }

  if (errors.length) {
    fail(errors);
  }

  console.log('Tistory skin validation passed.');
  console.log(`  Root files: ${ROOT_FILES.join(', ')}`);
  console.log(`  Group tags: ${opens.length} open / ${closes.length} close (balanced)`);
}

main();
