# Bulldog's House

Tistory-style Notion dashboard skin for [GitHub Pages](https://Hyeonseok93.github.io/) and Tistory.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/` for the dashboard. Article pages: `http://localhost:5173/posts/{slug}/`.

## Commands

| Command | When to use |
|---------|-------------|
| `npm run dev` | Local development (Vite HMR) |
| `npm run build:gh-pages` | Production build → `dist/gh-pages/` |
| `npm run build:tistory` | Tistory skin → `dist/tistory/` |

### Do not run `vite` alone

Always use `npm run dev` or `npm run build:gh-pages`. Generated files (`index.html`, `public/posts/`, `posts-manifest.js`) must be built first.

## Project layout

```
content/posts/              Markdown source (category/slug/index.md)
src/data/categories.json    Category labels, descriptions, sidebar tree
src/templates/article-shell.source.html  Shared article layout source
scripts/generate-sources.js Generates CategoryTree + article shells
src/                        HTML components, JS, styles
build-html.js               Compiles layout → index.html / dist/
public/posts/               Generated article HTML (gitignored)
dist/gh-pages/              GitHub Pages deploy artifact
```

## Writing posts

글은 **카테고리 → 포스트 폴더** 구조로 둡니다.

```
content/posts/
├── personal-web/              # 카테고리 ID
│   └── tmux-guide/            # 포스트 slug (폴더명)
│       ├── index.md           # 본문
│       ├── thumbnail.png      # 목록/상단 썸네일 (선택)
│       └── images/            # 본문 이미지 (선택)
│           └── screenshot.png
└── ...
```

- **카테고리 폴더명** = `src/data/categories.json` ID
- **포스트 폴더명** = URL slug (`/posts/tmux-guide/`)
- frontmatter `category` / `slug`는 생략 가능 (폴더가 우선)

### frontmatter 예시

```markdown
---
title: 글 제목
date: 2026-07-07
tags: [tag1, tag2]
thumbnail: thumbnail.png   # 생략 시 폴더 안 thumbnail.* 자동 탐색
---

본문 첫 부분이 카테고리 목록 요약(최대 3줄)으로 자동 표시됩니다.
```

### 빌드

```bash
npm run dev              # 로컬 미리보기
npm run build:gh-pages   # 배포 산출물
```

`public/posts/`와 `src/data/posts-manifest.js`는 **자동 생성**(gitignore)입니다.

글 페이지 미리보기: `npm run dev` 후 `http://localhost:5173/posts/{slug}/`

### 새 글 추가

1. `content/posts/{category}/{slug}/` 폴더 생성
2. `index.md` + 필요하면 `thumbnail.png`, `images/` 추가
3. `npm run dev` 또는 `npm run build:gh-pages` 후 push

## Deploy (GitHub Pages)

Push to `main` — GitHub Actions runs `npm run build:all` and:

1. **GitHub Pages** — deploys `dist/gh-pages/` automatically
2. **Tistory skin** — builds `dist/tistory/` and uploads `tistory-skin.zip` as a workflow artifact

Download the Tistory skin: repo **Actions** tab → latest run → **Artifacts** → `tistory-skin` (folder contents).

Upload in Tistory admin (**꾸미기 → 스킨 → 스킨 등록**). Do **not** zip; add files individually:

1. **1st batch (root):** `index.xml`, `skin.html`, `style.css`, `preview.gif`
2. **2nd batch:** all files under `images/` (including `images/tistory.js`)
3. Click **저장**, enter a skin name → appears in **보관함**

Run `npm run tistory:upload-list` locally for the full checklist.

> Tistory has no official upload API (Open API ended 2024). CI builds the skin; you upload files manually.

Site settings: **Source → GitHub Actions**.

## Build targets

| Target | Output | Notes |
|--------|--------|-------|
| `preview` | Root `index.html` | Local dev shell (`npm run dev`) |
| `gh-pages` | `dist/gh-pages/` | Production site |
| `tistory` | `dist/tistory/skin.html` | Tistory skin upload |

Post pages always use **gh-pages asset paths** (`../../assets/main.js`). Vite dev middleware maps them to `/src/` sources.

| Target | Script paths | Images | Used by |
|--------|--------------|--------|---------|
| `preview` | `./src/main.js` | `./src/assets/` | `npm run dev` |
| `gh-pages` | `./assets/main.js` | `./images/` | `npm run build:gh-pages` |

Post pages under `public/posts/` always use gh-pages paths. Vite dev middleware rewrites `/assets/` and `/images/` to source files.

Generated HTML includes `data-build-target="gh-pages"` on `<body>`. Preview rebuilds posts when the stamp is missing or stale.

## Build scripts

| Script | Purpose |
|--------|---------|
| `generate-sources.js` | `categories.json` + `article-shell.source.html` → CategoryTree / Article shells |
| `template-engine.js` | HTML compile helpers (`@include`, block replace, layout targets) |
| `build-posts.js` | `content/posts/{category}/{slug}/` → manifest + `public/posts/{slug}/` |

### CSS note

Component styles live in `src/styles/*.css` and are imported from `src/style.css`.
Partials must stay **before** `@tailwind` (PostCSS `@import` order rule).

### Generated artifacts (gitignored)

| Path | Generator | Notes |
|------|-----------|-------|
| `index.html` | `build-html.js` | Vite entry / local preview |
| `public/posts/` | `build-posts.js` | Per-post HTML + copied assets |
| `src/data/posts-manifest.js` | `build-posts.js` | `POSTS_BY_CATEGORY` |
| `dist/` | Vite + `build-html.js` | Production bundles |

**Fresh clone:** `npm install` then `npm run dev`.

### Source of truth

| Edit this | Generates |
|-----------|-----------|
| `src/data/categories.json` (`tree` + `labels`) | `src/components/CategoryTree.html` |
| `src/templates/article-shell.source.html` | `article-page.html`, `Article.html` |

Run manually: `npm run generate:sources` (also runs automatically before `build-posts` / `build-html`).

### npm script map

| Command | What it does |
|---------|----------------|
| `generate:sources` | Regenerate CategoryTree + article shells |
| `build:posts` | Markdown → manifest + `public/posts/` (gh-pages paths) |
| `build:html:preview` | Local dashboard shell → root `index.html` |
| `build:html:vite-index` | Vite entry HTML (used by `build:assets`) |
| `build:html:gh-pages` | Final site → `dist/gh-pages/index.html` |
| `build:html:tistory` | Tistory skin → `dist/tistory/skin.html` |
| `build:assets` | `vite-index` + `vite build` |
| `build:gh-pages` | posts → assets → gh-pages HTML → validate |
| `validate:gh-pages` | Assert GH output has no Tistory leaks / correct shells |
| `dev` | posts → preview HTML → vite |

### Shared utilities

- `src/utils/escape-html.cjs` / `.js` — HTML escaping
- `src/utils/sanitize-rich-html.cjs` / `.js` — rich HTML sanitization (Node + browser)
- `src/utils/rich-html-policy.cjs` / `.js` — shared allowlists

### Article templates

| File | Role |
|------|------|
| `src/templates/article-shell.source.html` | **Edit this** — shared article layout |
| `src/templates/article-page.html` | Generated Mustache shell for `build-posts.js` |
| `src/components/Article.html` | Generated Tistory `[##_…_##]` shell |

## Layout & page model

One `src/layout.html` compiles per target. Tistory uses **three page regions** plus official group tags:

| Region | HTML | Tistory tags | When it appears |
|--------|------|--------------|-----------------|
| Home dashboard | `#home-dashboard` | *(none — static section)* | Home SPA only (`#tt-body-index`) |
| Posts | `#article-section` | `<s_article_rep>` → `<s_index_article_rep>` / `<s_permalink_article_rep>` | Index summaries vs permalink body (structural) |
| Category list | `#list-section` | `<s_list>` | Category / tag / archive |

**Introduce Me / About Me live in `#home-dashboard`, not in `<s_list>`.**  
`<s_list>` is only for category/tag/archive post lists ([Tistory list docs](https://tistory.github.io/document-tistory-skin/list/list.html)).

**Permalink post body is inside `<s_permalink_article_rep>`** — without it, the full article template renders on the home page too ([Tistory post docs](https://tistory.github.io/document-tistory-skin/contents/post.html)). That was the root cause of Introduce Me overlapping with post content.

`src/layout.html` structure:

```
sidebar (always)
#home-dashboard          ← Introduce Me / What I Do SPA (outside s_list)
#article-section
  <s_article_rep>
    <s_index_article_rep>   ← home post summaries (What I Do)
    <s_permalink_article_rep> ← permalink body only
#list-section
  <s_list>                ← category/tag/archive native list + paging
```

- **Permalink vs index** — structural via `s_permalink_article_rep` / `s_index_article_rep` (Tistory official).
- **Home vs category** — `#home-dashboard` vs `#list-section` selected by `body#tt-body-*` (Tistory standard section routing).
- **GH Pages compile** — `template-engine.js` removes whole `<section>` blocks per output file (no overlapping DOM).

GitHub Pages mirrors this at build time (`scripts/template-engine.js`):

- **Home** — keeps `#home-dashboard`, removes `#article-section` and `#list-section`
- **Post** — keeps `#article-section` only, removes `#home-dashboard` and `#list-section`

Section visibility on Tistory (`#tt-body-index`, `#tt-body-page`, `#tt-body-category`, …) follows the [standard skin pattern](https://tistory.github.io/document-tistory-skin/common/basic.html): each `body` id shows one primary region. Index vs permalink inside `s_article_rep` is handled by Tistory tags, not CSS.

## Home SPA routing

Dashboard panels share one home URL and use **hash routes** (not separate HTML pages):

| Hash | Panel |
|------|-------|
| `#introduce-me` | Introduce Me (default) |
| `#what-i-do` | What I Do |
| `#category-{id}` | Category posts (`-p2` for page 2) |

Implementation: `src/features/category-posts/spa-router.js` (page detection, hash build/parse, Tistory native URL redirects). UI state: `dashboard-nav.js`. Category data: `category-context.js`.

### Why hash URLs on Tistory?

Tistory cannot serve custom paths (e.g. `/introduce-me`) from the skin. **Introduce Me / What I Do** stay on the home hash SPA (`/#introduce-me`, `/#what-i-do`).

**Category posts on Tistory** use native list URLs (`/category/...?page=N`) with `<s_list_rep>` + `<s_paging>` — not the GitHub Pages JS pager. Sidebar category links go to the real Tistory category page.

GitHub Pages keeps hash SPA + `category-posts-pagination` because there is no Tistory server. Post permalinks remain real paths: `/posts/{slug}/`.

## Security

- Markdown → HTML is sanitized at build time (`sanitize-html`)
- Runtime `innerHTML` uses `escapeHtml` / `DOMPurify` where needed
- Shared helpers: `src/utils/escape-html`, `sanitize-rich-html`, `rich-html-policy`
