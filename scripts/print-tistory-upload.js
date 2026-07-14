const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'tistory');

const ROOT_FILES = ['index.xml', 'skin.html', 'style.css', 'preview.gif'];
const OPTIONAL_ROOT_PREVIEWS = ['preview256.jpg', 'preview560.jpg', 'preview1600.jpg'];

/** Known-invalid tokens that cause silent Tistory skin save failures. */
const INVALID_TOKENS = [
  '[##_list_confirm_##]',
  '[##_list_rep_date_##]',
  '[##_list_rep_summary_##]',
];

/** Files required for dashboard UI (images + JS), beyond the 4 root registration files. */
const RUNTIME_ESSENTIALS = [
  'images/tistory.js',
  'images/banner.png',
  'images/greeting.gif',
  'images/profile.png',
  'images/contact-vercel.png',
  'images/contact-github.png',
  'images/contact-githubpages.png',
  'images/contact-tistory.png',
  'images/contact-linkedin.png',
  'images/typescript.png',
  'images/react.png',
];

function walkFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, relative));
    } else {
      const size = fs.statSync(fullPath).size;
      files.push({ relative: relative.replace(/\\/g, '/'), size });
    }
  }

  return files;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('dist/tistory not found. Run: npm run build:tistory');
    process.exit(1);
  }

  const files = walkFiles(DIST_DIR).sort((a, b) => a.relative.localeCompare(b.relative));
  const total = files.reduce((sum, file) => sum + file.size, 0);

  console.log('Tistory skin upload checklist');
  console.log('Folder:', DIST_DIR);
  console.log('');
  console.log('Official required root files (티스토리 공식 4종):');
  console.log('  index.xml, skin.html, style.css, preview.gif');
  console.log('');
  console.log('All other files go under images/ in the file list (flat — no subfolders).');
  console.log('');

  console.log('--- Root files (1st upload batch) ---');
  for (const name of ROOT_FILES) {
    const file = files.find((entry) => entry.relative === name);
    if (file) {
      console.log(`  ${file.relative} (${formatSize(file.size)})`);
    } else {
      console.log(`  MISSING: ${name}`);
    }
  }

  console.log('');
  console.log('--- Optional root previews (same batch) ---');
  console.log('  preview.gif from greeting.gif | preview*.jpg from profile.png');
  for (const name of OPTIONAL_ROOT_PREVIEWS) {
    const file = files.find((entry) => entry.relative === name);
    if (file) {
      console.log(`  ${file.relative} (${formatSize(file.size)})`);
    } else {
      console.log(`  (not generated) ${name}`);
    }
  }

  console.log('');
  console.log(`--- images/ (${files.filter((f) => f.relative.startsWith('images/')).length} files, 2nd upload batch) ---`);
  for (const file of files.filter((f) => f.relative.startsWith('images/'))) {
    console.log(`  ${file.relative} (${formatSize(file.size)})`);
  }

  console.log('');
  console.log(`Total: ${files.length} files, ${formatSize(total)}`);
  console.log('');
  console.log('Note: 보관함 저장에는 루트 4종만 있어도 됩니다.');
  console.log('하지만 블로그에 적용 후 대시보드/탭/배지가 동작하려면 images/ 업로드가 필요합니다.');
  console.log('특히 images/tistory.js — 없으면 What I Do 탭, Tech Stack, About 타임라인이 전부 안 됩니다.');
  console.log('');

  const missingRuntime = RUNTIME_ESSENTIALS.filter(
    (rel) => !files.some((file) => file.relative === rel)
  );
  if (missingRuntime.length) {
    console.log('MISSING runtime files in dist/tistory:');
    missingRuntime.forEach((rel) => console.log(`  ${rel}`));
    console.log('');
  } else {
    console.log('Runtime essentials present in dist/tistory (upload these in the 2nd batch).');
    console.log('');
  }

  const skinPath = path.join(DIST_DIR, 'skin.html');
  if (fs.existsSync(skinPath)) {
    const skinHtml = fs.readFileSync(skinPath, 'utf8');
    const bad = INVALID_TOKENS.filter((token) => skinHtml.includes(token));
    if (bad.length) {
      console.log('WARNING: invalid Tistory tokens in skin.html (save may fail silently):');
      bad.forEach((token) => console.log(`  ${token}`));
      console.log('');
    }
  }

  console.log('After both batches are listed, click 저장 and enter a skin name.');
}

main();
