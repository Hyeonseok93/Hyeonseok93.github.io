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

See [content/posts/README.md](content/posts/README.md).

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

More detail: [scripts/README.md](scripts/README.md).
