const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function resolveIncludes(htmlContent, baseDir = SRC_DIR) {
  let result = htmlContent;
  const includeRegex = /@include\(['"](.*?)['"]\)/g;

  while (true) {
    const match = includeRegex.exec(result);
    if (!match) break;

    const includePath = path.join(baseDir, match[1]);
    if (fs.existsSync(includePath)) {
      result = result.replace(match[0], readFile(includePath));
    } else {
      console.warn(`Warning: Component file not found at ${includePath}`);
      result = result.replace(match[0], `<!-- Component ${match[1]} not found -->`);
    }
    includeRegex.lastIndex = 0;
  }

  return result;
}

/** Replace literal tokens (@@LAYOUT@@ placeholders, asset paths, etc.) */
function replaceTokens(html, tokenMap) {
  let result = html;
  for (const [token, value] of Object.entries(tokenMap)) {
    result = result.split(token).join(value);
  }
  return result;
}

function removeSectionById(html, sectionId) {
  const openRe = new RegExp(`<section\\b[^>]*\\bid="${sectionId}"[^>]*>`, 'i');
  const openMatch = openRe.exec(html);
  if (!openMatch) return html;

  const start = openMatch.index;
  let i = start + openMatch[0].length;
  let depth = 1;

  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<section', i);
    const nextClose = html.indexOf('</section>', i);
    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + '<section'.length;
      continue;
    }

    depth -= 1;
    i = nextClose + '</section>'.length;
  }

  if (depth !== 0) return html;

  let end = i;
  while (end < html.length && /\s/.test(html[end])) end += 1;
  return html.slice(0, start) + html.slice(end);
}

function renderTemplate(templatePath, data) {
  let html = readFile(templatePath);
  for (const [key, value] of Object.entries(data)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
  }
  return html;
}

function injectBodyDataAttrs(html, { assetPrefix, site, buildTarget }) {
  const attrs = [
    `data-site-root="${assetPrefix}"`,
    site ? `data-site="${site}"` : '',
    buildTarget ? `data-build-target="${buildTarget}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return html.replace('<body id="', `<body ${attrs} id="`);
}

function wrapArticleHost(articleHtml) {
  return `<main id="article-content" class="article-content-host flex-1 min-h-screen w-full flex justify-center">
    <div class="main-content-inner w-full max-w-[1200px] flex flex-col py-10 px-[60px] max-md:px-5 max-md:pt-20">
${articleHtml}
    </div>
  </main>`;
}

function compileLayout(options = {}) {
  const {
    target,
    categoryTreeHtml = '',
    articleHtml = '',
    bodyId = 'list',
    extraTokens = {},
    assetPrefix = './',
  } = options;

  const asset = (relativePath) => `${assetPrefix}${relativePath.replace(/^\.\//, '')}`;

  let html = readFile(path.join(SRC_DIR, 'layout.html'));
  html = resolveIncludes(html);

  // Fill layout tokens before the article goes in, so post content is never rewritten.
  html = replaceTokens(html, {
    '@@BODY_ID@@': bodyId,
    '@@CATEGORY_TREE@@': categoryTreeHtml,
    ...extraTokens,
  });

  if (articleHtml) {
    html = removeSectionById(html, 'home-dashboard');
    html = replaceTokens(html, { '@@ARTICLE@@': wrapArticleHost(articleHtml) });
  } else {
    html = removeSectionById(html, 'article-section');
  }

  if (target === 'gh-pages' || target === 'preview') {
    if (target === 'gh-pages') {
      html = html.replace(
        /<script type="module" src="\.\/(src\/)?main\.js"><\/script>/g,
        `<link rel="stylesheet" href="${asset('style.css')}">\n  <script type="module" src="${asset('assets/main.js')}"></script>`
      );
      html = replaceTokens(html, {
        './src/assets/': asset('images/'),
      });
    } else {
      html = html.replace(
        /<script type="module" src="\.\/(src\/)?main\.js"><\/script>/g,
        `<script type="module" src="${asset('src/main.js')}"></script>`
      );
      html = replaceTokens(html, {
        './src/assets/': asset('src/assets/'),
      });
    }

    html = injectBodyDataAttrs(html, {
      assetPrefix,
      site: 'gh-pages',
      buildTarget: 'gh-pages',
    });
  }

  if (target !== 'gh-pages' && target !== 'preview' && !html.includes('data-site-root=')) {
    html = replaceTokens(html, {
      '<body id="': `<body data-site-root="${assetPrefix}" id="`,
    });
  }

  return html;
}

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((child) => {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

module.exports = {
  PROJECT_ROOT,
  SRC_DIR,
  readFile,
  resolveIncludes,
  replaceTokens,
  renderTemplate,
  compileLayout,
  copyRecursiveSync,
};
