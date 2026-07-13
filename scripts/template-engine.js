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

function removeSectionById(html, sectionId) {
  const re = new RegExp(`<section id="${sectionId}"[\\s\\S]*?<\\/section>\\s*`, 'g');
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

function stripGhPagesRegions(html) {
  return html.replace(
    /<!-- gh-pages-strip-start:tistory-native-list -->[\s\S]*?<!-- gh-pages-strip-end:tistory-native-list -->\s*/g,
    ''
  );
}

function stripTistoryRegions(html) {
  return html.replace(
    /<!-- tistory-strip-start:category-posts-spa -->[\s\S]*?<!-- tistory-strip-end:category-posts-spa -->\s*/g,
    ''
  );
}

function removeTistoryStripMarkers(html) {
  return html
    .replace(/<!-- tistory-strip-start:[\w-]+ -->\s*/g, '')
    .replace(/\s*<!-- tistory-strip-end:[\w-]+ -->\s*/g, '\n');
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
    '\\[##_list_conform_##\\]': 'Recent Posts',
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
      '<link rel="stylesheet" href="./style.css">'
    );
    html = html.replace(
      '</s_t3>',
      '  <script src="./images/tistory.js" defer></script>\n</s_t3>'
    );
    html = replaceTokens(html, {
      './src/assets/profile.png': '[##_image_##]',
      './src/assets/badges/dark/': './images/',
      './src/assets/badges/': './images/',
      './src/assets/': './images/',
    });
    html = stripTistoryRegions(html);
    return html;
  }

  html = html.replace(/<s_list_rep>[\s\S]*?<\/s_list_rep>/g, '');

  if (articleHtml) {
    html = removeSectionById(html, 'home-dashboard');
    html = removeSectionById(html, 'list-section');
    html = replaceBlock(html, 's_article_rep', wrapArticleHost(articleHtml));
  } else {
    html = removeSectionById(html, 'article-section');
    html = removeSectionById(html, 'list-section');
    html = removeBlock(html, 's_article_rep');
  }

  html = replacePatternMap(html, previewPatternMap);
  html = replaceTokens(html, extraTokens);
  html = stripGhPagesRegions(html);
  html = removeTistoryStripMarkers(html);

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

  if (target !== 'tistory' && target !== 'gh-pages' && target !== 'preview' && !html.includes('data-site-root=')) {
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
  replacePatternMap,
  removeBlock,
  replaceBlock,
  unwrapBlock,
  renderTemplate,
  compileLayout,
  copyRecursiveSync,
};
