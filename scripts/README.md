# Build scripts

| Script | Purpose |
|--------|---------|
| `template-engine.js` | HTML compile helpers (`@include`, block replace, layout targets) |
| `build-posts.js` | `content/posts/{category}/{slug}/` → manifest + `public/posts/{slug}/` |

## CSS note

Component styles live in `src/styles/*.css` and are imported from `src/style.css`.
Partials must stay **before** `@tailwind` (PostCSS `@import` order rule).

## Generated artifacts (gitignored)

| Path | Generator | Notes |
|------|-----------|-------|
| `index.html` | `build-html.js` | Vite entry / local preview |
| `public/posts/` | `build-posts.js` | Per-post HTML + copied assets |
| `src/data/posts-manifest.js` | `build-posts.js` | `POSTS_BY_CATEGORY` |
| `dist/` | Vite + `build-html.js` | Production bundles |

**Fresh clone:** `npm install` then `npm run dev`.

## npm script map

| Command | What it does |
|---------|----------------|
| `build:posts` | Markdown → manifest + `public/posts/` (gh-pages paths) |
| `build:html:preview` | Local dashboard shell → root `index.html` |
| `build:html:vite-index` | Vite entry HTML (used by `build:assets`) |
| `build:html:gh-pages` | Final site → `dist/gh-pages/index.html` |
| `build:html:tistory` | Tistory skin → `dist/tistory/skin.html` |
| `build:assets` | `vite-index` + `vite build` |
| `build:gh-pages` | posts → assets → gh-pages HTML → pagefind |
| `dev` | posts → preview HTML → vite |

## Layout targets

| Target | Script paths | Images | Used by |
|--------|--------------|--------|---------|
| `preview` | `./src/main.js` | `./src/assets/` | `npm run dev` |
| `gh-pages` | `./assets/main.js` | `./images/` | `npm run build:gh-pages` |

Post pages under `public/posts/` always use gh-pages paths. Vite dev middleware rewrites `/assets/` and `/images/` to source files.

Generated HTML includes `data-build-target="gh-pages"` on `<body>`. Preview rebuilds posts when the stamp is missing or stale.

## Shared utilities

- `src/utils/escape-html.cjs` / `.js` — HTML escaping
- `src/utils/sanitize-rich-html.cjs` / `.js` — rich HTML sanitization (Node + browser)
- `src/utils/rich-html-policy.cjs` / `.js` — shared allowlists

## Article templates

| File | Role |
|------|------|
| `src/templates/article-page.html` | Mustache shell for `build-posts.js` |
| `src/components/Article.html` | Tistory `[##_…_##]` shell |
