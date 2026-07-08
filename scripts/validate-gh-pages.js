const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'gh-pages');

function fail(messages) {
  console.error('\nGitHub Pages validation FAILED:\n');
  messages.forEach((message) => console.error(`  - ${message}`));
  console.error('\nFix the issues above, then run: npm run build:gh-pages\n');
  process.exit(1);
}

function collectHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectHtmlFiles(full));
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function main() {
  const errors = [];

  if (!fs.existsSync(DIST_DIR)) {
    fail(['dist/gh-pages not found — run npm run build:gh-pages first']);
  }

  const htmlFiles = collectHtmlFiles(DIST_DIR);
  if (!htmlFiles.length) {
    errors.push('No HTML files found under dist/gh-pages/');
  }

  for (const filePath of htmlFiles) {
    const rel = path.relative(DIST_DIR, filePath).replace(/\\/g, '/');
    const html = fs.readFileSync(filePath, 'utf8');

    if (/\[##_/.test(html)) {
      errors.push(`${rel}: contains unreplaced Tistory placeholder tokens`);
    }
    if (html.includes('tistory-native-list')) {
      errors.push(`${rel}: contains tistory-native-list (should be stripped on gh-pages)`);
    }
    if (/<s_paging[\s>]/i.test(html)) {
      errors.push(`${rel}: contains <s_paging> (Tistory-only paging leak)`);
    }
    if (/<!-- (gh-pages|tistory)-strip-start:/.test(html)) {
      errors.push(`${rel}: contains unstripped build-strip markers`);
    }
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    errors.push('Missing dist/gh-pages/index.html');
  } else {
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    if (!indexHtml.includes('data-site="gh-pages"')) {
      errors.push('index.html: missing data-site="gh-pages"');
    }
    if (!indexHtml.includes('category-posts-anchor')) {
      errors.push('index.html: missing category-posts-anchor (GH category SPA panel)');
    }
    if (indexHtml.includes('article-content')) {
      errors.push('index.html: article shell leaked into home page');
    }
  }

  const postPages = htmlFiles.filter((filePath) => /[/\\]posts[/\\]/.test(filePath));
  for (const filePath of postPages) {
    const rel = path.relative(DIST_DIR, filePath).replace(/\\/g, '/');
    const html = fs.readFileSync(filePath, 'utf8');
    if (!html.includes('article-content')) {
      errors.push(`${rel}: missing article-content host`);
    }
    if (html.includes('dashboard-scroll-area')) {
      errors.push(`${rel}: dashboard shell leaked into post page`);
    }
  }

  if (errors.length) {
    fail(errors);
  }

  console.log('GitHub Pages validation passed.');
  console.log(`  HTML files checked: ${htmlFiles.length}`);
  console.log(`  Post pages checked: ${postPages.length}`);
}

main();
