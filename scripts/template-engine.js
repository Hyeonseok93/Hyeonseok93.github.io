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

/** Replace literal tokens (Tistory placeholders, {{mustache}} keys, etc.) */
function replaceTokens(html, tokenMap) {
  let result = html;
  for (const [token, value] of Object.entries(tokenMap)) {
    result = result.split(token).join(value);
  }
  return result;
}

/** Replace tokens whose keys are RegExp source strings (legacy preview map). */
function replacePatternMap(html, patternMap) {
  let result = html;
  for (const [pattern, value] of Object.entries(patternMap)) {
    result = result.replace(new RegExp(pattern, 'g'), value);
  }
  return result;
}

function removeBlock(html, tagName) {
  const re = new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>\\s*`, 'g');
  return html.replace(re, '');
}

function replaceBlock(html, tagName, content) {
  const re = new RegExp(`<${tagName}>[\\s\\S]*?<\\/${tagName}>`);
  return html.replace(re, content);
}

function unwrapBlock(html, tagName) {
  const re = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'g');
  return html.replace(re, '$1');
}

function renderTemplate(templatePath, data) {
  let html = readFile(templatePath);
  for (const [key, value] of Object.entries(data)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
  }
  return html;
}

function compileLayout(options = {}) {
  const {
    target,
    categoryTreeHtml = '',
    articleHtml = '',
    pageTitle = "Bulldog's House",
    bodyId = 'list',
    extraTokens = {},
    assetPrefix = './',
  } = options;

  const asset = (relativePath) => `${assetPrefix}${relativePath.replace(/^\.\//, '')}`;

  let html = readFile(path.join(SRC_DIR, 'layout.html'));
  html = resolveIncludes(html);

  const previewPatternMap = {
    '\\[##_page_title_##\\]': pageTitle,
    '\\[##_body_id_##\\]': bodyId,
    '\\[##_blogger_##\\]': 'Hyeonseok Kim',
    '\\[##_image_##\\]': asset('images/profile.png'),
    '\\[##_blog_link_##\\]': '#',
    '\\[##_tag_board_link_##\\]': '#',
    '\\[##_guestbook_link_##\\]': '#',
    '\\[##_category_list_##\\]': categoryTreeHtml,
    '\\[##_search_name_##\\]': 'search',
    '\\[##_search_text_##\\]': '',
    '\\[##_search_onclick_submit_##\\]': 'return false',
    '\\[##_list_confirm_##\\]': 'Recent Posts',
    '\\[##_desc_##\\]': 'I LOVE BULLDOG',
    '<s_list>': '',
    '</s_list>': '',
    '<s_search>': '',
    '</s_search>': '',
    '<s_t3>': '',
    '</s_t3>': '',
  };

  if (target === 'tistory') {
    html = html.replace(
      /<script type="module" src="\.\/(src\/)?main\.js"><\/script>/g,
      '<link rel="stylesheet" href="./style.css">\n  <script src="./tistory.js" defer></script>'
    );
    html = replaceTokens(html, {
      './src/assets/profile.png': '[##_image_##]',
      './src/assets/': './images/',
    });
    return html;
  }

  html = html.replace(/<s_list_rep>[\s\S]*?<\/s_list_rep>/g, '');

  if (articleHtml) {
    html = removeBlock(html, 's_list');
    html = removeBlock(html, 's_paging');
    html = replaceBlock(html, 's_article_rep', articleHtml);
  } else {
    html = removeBlock(html, 's_article_rep');
    html = removeBlock(html, 's_paging');
    html = unwrapBlock(html, 's_list');
  }

  html = replacePatternMap(html, previewPatternMap);
  html = replaceTokens(html, extraTokens);

  if (target === 'gh-pages') {
    html = configureGhPagesSearch(html);
    html = html.replace(
      /<script type="module" src="\.\/(src\/)?main\.js"><\/script>/g,
      `<link rel="stylesheet" href="${asset('style.css')}">\n  <script type="module" src="${asset('assets/main.js')}"></script>`
    );
    html = replaceTokens(html, {
      './src/assets/': asset('images/'),
    });
    html = replaceTokens(html, {
      '<body id="': `<body data-site-root="${assetPrefix}" data-site="gh-pages" data-pagefind="true" id="`,
    });
  } else if (target === 'dev' || target === 'dev-article') {
    html = html.replace(
      /<script type="module" src="\.\/(src\/)?main\.js"><\/script>/g,
      `<script type="module" src="${asset('src/main.js')}"></script>`
    );
    html = replaceTokens(html, {
      './src/assets/': asset('src/assets/'),
      '<body id="': `<body data-site-root="${assetPrefix}" id="`,
    });
  }

  if (target !== 'tistory' && target !== 'gh-pages' && !html.includes('data-site-root=')) {
    html = replaceTokens(html, {
      '<body id="': `<body data-site-root="${assetPrefix}" id="`,
    });
  }

  return html;
}

function configureGhPagesSearch(html) {
  const withoutTistorySearch = html.replace(
    /<div class="search-box[\s\S]*?<\/div>\s*/g,
    ''
  );

  return withoutTistorySearch.replace(
    '<div class="search-container mb-4 w-full">',
    '<div class="search-container mb-4 w-full">\n    <div id="pagefind-search" class="pagefind-search-host w-full"></div>'
  );
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
  replacePatternMap,
  removeBlock,
  replaceBlock,
  unwrapBlock,
  renderTemplate,
  compileLayout,
  copyRecursiveSync,
};
