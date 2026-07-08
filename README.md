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

One `src/layout.html` is compiled differently per target. Tistory skin tags define **which HTML exists on each page type** — we do not hide overlapping regions with CSS.

| Region | Tistory tag | Rendered on | Contents |
|--------|-------------|-------------|----------|
| Home dashboard | `<s_list>` | Index, category, tag, archive | Introduce Me, What I Do, category SPA, paging |
| Article | `<s_article_rep>` | Permalink only (`/1`, `/2`, …) | Post title, body, prev/next |

GitHub Pages mirrors this at build time (`scripts/template-engine.js`):

- **Home** (`index.html`) — unwraps `<s_list>`, removes `<s_article_rep>`
- **Post** (`posts/{slug}/`) — removes `<s_list>`, injects article HTML into `<s_article_rep>`

Sidebar + mobile chrome stay outside both blocks on every page.

## Home SPA routing

Dashboard panels share one home URL and use **hash routes** (not separate HTML pages):

| Hash | Panel |
|------|-------|
| `#introduce-me` | Introduce Me (default) |
| `#what-i-do` | What I Do |
| `#category-{id}` | Category posts (`-p2` for page 2) |

Implementation: `src/features/category-posts/spa-router.js` (page detection, hash build/parse, Tistory native URL redirects). UI state: `dashboard-nav.js`. Category data: `category-context.js`.

### Why hash URLs on Tistory?

Tistory cannot serve custom paths (e.g. `/introduce-me`) from the skin. Native category URLs (`/category/...`) trigger a **full page load** with only `<s_list>` — fine for a plain blog, but this skin keeps the portfolio dashboard on home. So:

1. **In-app navigation** — sidebar clicks stay on `/` and swap panels via hash (`history.replaceState` on home, full navigation from article pages).
2. **Native Tistory URLs** — `/category/...`, `/tag/...`, or article pages with `#panel` hash redirect to `/#…` on boot (`redirectTistoryNativeUrlsToSpa`).
3. **Shareable category links** — sidebar leaf `href` points to `/#category-{id}`; `data-category-url` keeps the native path for redirect matching.

GH Pages uses the same hash scheme on `https://Hyeonseok93.github.io/` for a consistent UX. Post permalinks remain real paths: `/posts/{slug}/`.

## Security

- Markdown → HTML is sanitized at build time (`sanitize-html`)
- Runtime `innerHTML` uses `escapeHtml` / `DOMPurify` where needed

More detail: [scripts/README.md](scripts/README.md).
