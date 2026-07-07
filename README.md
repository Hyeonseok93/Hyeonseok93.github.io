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

Download the Tistory skin: repo **Actions** tab → latest run → **Artifacts** → `tistory-skin` → unzip once.  
You should see `index.xml`, `skin.html`, `style.css`, `tistory.js`, `images/` at the top level. Zip those files for Tistory upload.

> Tistory has no official upload API (Open API ended 2024). CI builds the skin; you upload the ZIP in Tistory admin (**꾸미기 → 스킨 업로드**).

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
