const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'tistory');

const ROOT_FILES = ['index.xml', 'skin.html', 'style.css', 'preview.gif'];

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
  console.log('All other files (including tistory.js) go under images/ in the file list.');
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
  console.log(`--- images/ (${files.filter((f) => f.relative.startsWith('images/')).length} files, 2nd upload batch) ---`);
  for (const file of files.filter((f) => f.relative.startsWith('images/'))) {
    console.log(`  ${file.relative} (${formatSize(file.size)})`);
  }

  console.log('');
  console.log(`Total: ${files.length} files, ${formatSize(total)}`);
  console.log('');
  console.log('After both batches are listed, click 저장 and enter a skin name.');
}

main();
