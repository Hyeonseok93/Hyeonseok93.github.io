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
content/posts/     Markdown source (category/slug/index.md)
src/               HTML components, JS, styles, data
scripts/           build-posts.js, template-engine.js
build-html.js      Compiles layout → index.html / dist/
public/posts/      Generated article HTML (gitignored)
dist/gh-pages/     GitHub Pages deploy artifact
```

## Writing posts

See [content/posts/README.md](content/posts/README.md).

## Deploy (GitHub Pages)

Push to `main` — GitHub Actions runs `npm run build:gh-pages` and deploys `dist/gh-pages/`.

Site settings: **Source → GitHub Actions**.

## Build targets

| Target | Output | Notes |
|--------|--------|-------|
| `preview` | Root `index.html` | Local dev shell (`npm run dev`) |
| `gh-pages` | `dist/gh-pages/` | Production site |
| `tistory` | `dist/tistory/skin.html` | Tistory skin upload |

Post pages always use **gh-pages asset paths** (`../../assets/main.js`). Vite dev middleware maps them to `/src/` sources.

## Security

- Markdown → HTML is sanitized at build time (`sanitize-html`)
- Runtime `innerHTML` uses `escapeHtml` / `DOMPurify` where needed

More detail: [scripts/README.md](scripts/README.md).
