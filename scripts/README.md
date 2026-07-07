# Build scripts

| Script | Purpose |
|--------|---------|
| `template-engine.js` | HTML compile helpers (`@include`, block replace, layout targets) |
| `build-posts.js` | `content/posts/{category}/{slug}/` → manifest + `public/posts/{slug}/` |

## CSS note

Component styles live in `src/styles/*.css` and are imported from `src/style.css`.
Partials must stay **before** `@tailwind` (PostCSS `@import` order rule).
Do not reintroduce a CSS split script — layout rules belong in partials, not Tailwind utilities on the same node.

## Generated artifacts (gitignored)

| Path | Generator | Notes |
|------|-----------|-------|
| `index.html` | `build-html.js` | Vite entry / dev preview |
| `public/posts/` | `build-posts.js` | Per-post HTML + copied assets |
| `src/data/posts-manifest.js` | `build-posts.js` | `POSTS_BY_CATEGORY` for dev/gh-pages |
| `dist/` | Vite + `build-html.js` | Production bundles |

**Fresh clone:** run `npm install` then `npm run dev` (or `build:gh-pages`).  
`npm run dev` always runs `build:posts --target=dev` first.

## Post build targets (`build:posts --target=`)

| Target | `public/posts/` script paths | Used by |
|--------|------------------------------|---------|
| `dev` | `../../src/main.js` | `npm run dev`, `dev:article` |
| `gh-pages` | `../../assets/main.js` | `npm run build:gh-pages` |

`posts-manifest.js` is **target-agnostic** (relative links only).  
**Do not** run `vite` alone after switching targets — re-run `build:posts` with the matching `--target`.

## npm script map

| Command | What it does |
|---------|----------------|
| `build:posts` | Markdown → manifest + `public/posts/` |
| `build:html:dev` | Dashboard preview → root `index.html` |
| `build:html:article` | Article preview → root `index.html` (auto-runs `build:posts` if needed) |
| `build:html:vite-index` | Vite entry HTML only (used by `build:assets`) |
| `build:html:gh-pages` | Final site shell → `dist/gh-pages/index.html` |
| `build:html:tistory` | Tistory skin → `dist/tistory/skin.html` |
| `build:assets` | `vite-index` + `vite build` (JS/CSS bundle) |
| `build:gh-pages` | posts(gh-pages) → assets → gh-pages HTML → pagefind |
| `dev` | posts(dev) → html:dev → vite |
| `dev:article` | posts(dev) → html:article → vite |

## Shared utilities

- `src/utils/escape-html.cjs` — HTML escaping (Node + Vite via `escape-html.js` re-export)
- `src/data/chapters.js` — About Me timeline coordinates (single source)
- `src/assets/badges/tech/*.png` — Tech stack badges (PNG only; regenerate from shields SVG if needed)

## Article templates

| File | Role |
|------|------|
| `src/templates/article-page.html` | Mustache shell for `build-posts.js` (gh-pages / dev) |
| `src/components/Article.html` | Tistory `[##_…_##]` shell (structure mirrors article-page) |

`Article.gh-pages.html` was removed — article preview always comes from `build-posts` output.
