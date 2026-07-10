const { generateAllSources } = require('./generate-sources');

generateAllSources({ log: false });

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const {
  PROJECT_ROOT,
  SRC_DIR,
  compileLayout,
  renderTemplate,
  readFile,
  copyRecursiveSync,
} = require('./template-engine');
const { escapeHtml } = require(path.join(SRC_DIR, 'utils', 'escape-html.cjs'));
const { sanitizeRichHtml } = require(path.join(SRC_DIR, 'utils', 'sanitize-rich-html.cjs'));
const { fixUnparsedBoldInHtml } = require(path.join(SRC_DIR, 'utils', 'fix-markdown-bold.cjs'));

const POSTS_DIR = path.join(PROJECT_ROOT, 'content', 'posts');
const MANIFEST_PATH = path.join(SRC_DIR, 'data', 'posts-manifest.js');
const PUBLIC_POSTS_DIR = path.join(PROJECT_ROOT, 'public', 'posts');
const TEMPLATE_PATH = path.join(SRC_DIR, 'templates', 'article-page.html');
const CATEGORIES_PATH = path.join(SRC_DIR, 'data', 'categories.json');

const THUMBNAIL_CANDIDATES = ['thumbnail.png', 'thumbnail.jpg', 'thumbnail.webp', 'thumbnail.jpeg'];

const SITE_BUILD_TARGET = 'gh-pages';
const LIST_EXCERPT_MAX_CHARS = 400;

marked.setOptions({ gfm: true, breaks: false });

const { labels: CATEGORY_LABELS } = JSON.parse(readFile(CATEGORIES_PATH));
const CATEGORY_IDS = Object.keys(CATEGORY_LABELS);

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}. ${m}. ${d}`;
}

function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePostMarkdown(content) {
  const html = fixUnparsedBoldInHtml(marked.parse(content));
  return sanitizeRichHtml(html);
}

function extractExcerptFromContent(content) {
  if (!content?.trim()) return '';
  return htmlToPlainText(parsePostMarkdown(content));
}

function buildTagsHtml(tags, assetPrefix) {
  if (!tags?.length) return '';
  const items = tags
    .map((tag) => `<a href="${assetPrefix}#tag-${encodeURIComponent(tag)}" class="article-tag">#${escapeHtml(tag)}</a>`)
    .join('\n    ');
  return `<div class="article-tags">\n    ${items}\n  </div>`;
}

function buildThumbnailHtml(thumbnailSrc, title) {
  if (!thumbnailSrc) return '';
  return `
  <figure class="article-thumbnail">
    <div class="article-thumbnail__frame">
      <img src="${escapeHtml(thumbnailSrc)}" alt="${escapeHtml(title)}" loading="lazy" />
    </div>
  </figure>`;
}

function buildNavCard(direction, post, assetPrefix) {
  if (!post) return '';

  const icon =
    direction === 'prev'
      ? '<span class="article-post-nav__icon" aria-hidden="true"><i class="fa-solid fa-arrow-left"></i></span>'
      : '<span class="article-post-nav__icon" aria-hidden="true"><i class="fa-solid fa-arrow-right"></i></span>';
  const label = direction === 'prev' ? '이전 포스트' : '다음 포스트';
  const textOrder =
    direction === 'prev'
      ? `${icon}
      <span class="article-post-nav__text">
        <span class="article-post-nav__label">${label}</span>
        <span class="article-post-nav__title">${escapeHtml(post.title)}</span>
      </span>`
      : `<span class="article-post-nav__text">
        <span class="article-post-nav__label">${label}</span>
        <span class="article-post-nav__title">${escapeHtml(post.title)}</span>
      </span>
      ${icon}`;

  return `<a href="${assetPrefix}posts/${post.slug}/" class="article-post-nav__card article-post-nav__card--${direction}">${textOrder}
    </a>`;
}

function resolveMarkdownPath(postDir, folderName) {
  const indexPath = path.join(postDir, 'index.md');
  if (fs.existsSync(indexPath)) return indexPath;

  const namedPath = path.join(postDir, `${folderName}.md`);
  if (fs.existsSync(namedPath)) return namedPath;

  return null;
}

function resolveThumbnailFile(postDir, frontmatterValue) {
  if (frontmatterValue) {
    const relative = frontmatterValue.replace(/^\.\//, '');
    if (fs.existsSync(path.join(postDir, relative))) return relative;
  }

  for (const name of THUMBNAIL_CANDIDATES) {
    if (fs.existsSync(path.join(postDir, name))) return name;
  }

  return '';
}

function discoverPostEntries() {
  const entries = [];

  for (const categoryId of CATEGORY_IDS) {
    const categoryDir = path.join(POSTS_DIR, categoryId);
    if (!fs.existsSync(categoryDir)) continue;

    for (const entry of fs.readdirSync(categoryDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const postDir = path.join(categoryDir, entry.name);
      const mdPath = resolveMarkdownPath(postDir, entry.name);
      if (!mdPath) {
        console.warn(`Skipping ${categoryId}/${entry.name}/: add index.md`);
        continue;
      }

      entries.push({
        categoryId,
        postDir,
        mdPath,
        folderSlug: entry.name,
      });
    }
  }

  return entries;
}

function loadPosts() {
  const posts = [];

  for (const entry of discoverPostEntries()) {
    const { categoryId, postDir, mdPath, folderSlug } = entry;
    const raw = readFile(mdPath);
    const { data, content } = matter(raw);
    const slug = data.slug || folderSlug;

    if (data.category && data.category !== categoryId) {
      console.warn(
        `Warning: ${categoryId}/${folderSlug}/ frontmatter category "${data.category}" differs from folder. Using folder.`
      );
    }

    const thumbnailFile = resolveThumbnailFile(postDir, data.thumbnail);

    posts.push({
      slug,
      title: data.title || slug,
      date: formatDate(data.date || ''),
      rawDate: data.date || '',
      category: categoryId,
      categoryLabel: CATEGORY_LABELS[categoryId] || categoryId,
      tags: Array.isArray(data.tags) ? data.tags : [],
      excerpt: extractExcerptFromContent(content),
      thumbnailFile,
      listThumbnail: thumbnailFile ? `./posts/${slug}/${thumbnailFile}` : '',
      pageThumbnail: thumbnailFile ? `./${thumbnailFile}` : '',
      author: data.author || 'Hyeonseok Kim',
      postDir,
      html: parsePostMarkdown(content),
    });
  }

  return posts.sort((a, b) => String(b.rawDate).localeCompare(String(a.rawDate)));
}

function buildCategoryNavMaps(posts) {
  const byCategory = {};

  for (const post of posts) {
    if (!byCategory[post.category]) byCategory[post.category] = [];
    byCategory[post.category].push(post);
  }

  const navBySlug = {};

  for (const categoryPosts of Object.values(byCategory)) {
    const sorted = [...categoryPosts].sort((a, b) =>
      String(b.rawDate).localeCompare(String(a.rawDate))
    );

    sorted.forEach((post, index) => {
      navBySlug[post.slug] = {
        prev: sorted[index + 1] || null,
        next: sorted[index - 1] || null,
      };
    });
  }

  return navBySlug;
}

function writeManifest(posts) {
  const byCategory = {};
  for (const post of posts) {
    if (!post.category) continue;
    if (!byCategory[post.category]) byCategory[post.category] = [];
    byCategory[post.category].push({
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt.slice(0, LIST_EXCERPT_MAX_CHARS),
      link: `/posts/${post.slug}/`,
      thumbnail: post.listThumbnail,
    });
  }

  const manifest = `// AUTO-GENERATED by scripts/build-posts.js — do not edit manually.
export const POSTS_BY_CATEGORY = ${JSON.stringify(byCategory, null, 2)};
`;

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, manifest, 'utf8');
  console.log(`Wrote posts manifest: ${MANIFEST_PATH}`);
}

function copyPostAssets(postDir, outDir) {
  for (const entry of fs.readdirSync(postDir, { withFileTypes: true })) {
    if (entry.name.endsWith('.md')) continue;

    const src = path.join(postDir, entry.name);
    const dest = path.join(outDir, entry.name);
    copyRecursiveSync(src, dest);
  }
}

function writePostPages(posts) {
  const categoryTreeHtml = readFile(path.join(SRC_DIR, 'components', 'CategoryTree.html')).trim();
  const assetPrefix = '../../';
  const compileTarget = SITE_BUILD_TARGET;
  const navBySlug = buildCategoryNavMaps(posts);

  fs.rmSync(PUBLIC_POSTS_DIR, { recursive: true, force: true });

  posts.forEach((post) => {
    const nav = navBySlug[post.slug] || { prev: null, next: null };
    const prevPost = nav.prev;
    const nextPost = nav.next;
    const outDir = path.join(PUBLIC_POSTS_DIR, post.slug);

    fs.mkdirSync(outDir, { recursive: true });
    copyPostAssets(post.postDir, outDir);

    const articleHtml = renderTemplate(TEMPLATE_PATH, {
      title: escapeHtml(post.title),
      date: escapeHtml(post.date),
      author: escapeHtml(post.author),
      categoryLabel: escapeHtml(post.categoryLabel),
      categoryLink: `${assetPrefix}#category-${post.category}`,
      content: post.html,
      tagsHtml: buildTagsHtml(post.tags, assetPrefix),
      thumbnailHtml: buildThumbnailHtml(post.pageThumbnail, post.title),
      prevNavHtml: buildNavCard('prev', prevPost, assetPrefix),
      nextNavHtml: buildNavCard('next', nextPost, assetPrefix),
    });

    const pageHtml = compileLayout({
      target: compileTarget,
      categoryTreeHtml,
      articleHtml,
      pageTitle: "Bulldog's House",
      bodyId: 'article',
      assetPrefix,
    });

    fs.writeFileSync(path.join(outDir, 'index.html'), pageHtml, 'utf8');
    console.log(`Built post page: posts/${post.slug}/index.html (${compileTarget})`);
  });
}

function main() {
  const posts = loadPosts();
  if (!posts.length) {
    console.warn('No posts found in content/posts/{category}/{slug}/index.md');
  }

  writeManifest(posts);
  writePostPages(posts);
}

main();
