# Posts (GitHub Pages)

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

## frontmatter 예시

```markdown
---
title: 글 제목
date: 2026-07-07
tags: [tag1, tag2]
excerpt: 목록에 보일 한 줄 요약
thumbnail: thumbnail.png   # 생략 시 폴더 안 thumbnail.* 자동 탐색
---

본문에서 이미지: ![설명](./images/screenshot.png)
```

## 빌드

```bash
npm run dev              # posts(dev) + dashboard
npm run dev:article      # posts(dev) + 글 페이지 미리보기
npm run build:gh-pages   # posts(gh-pages) + 배포 산출물
```

`public/posts/`와 `src/data/posts-manifest.js`는 **자동 생성**(gitignore)입니다.  
타겟마다 글 HTML의 JS 경로가 다릅니다 — `vite`만 단독 실행하지 말고 위 명령을 쓰세요.

| 타겟 | `build:posts --target` | 글 페이지 JS |
|------|------------------------|--------------|
| 로컬 dev | `dev` | `../../src/main.js` |
| GitHub Pages | `gh-pages` | `../../assets/main.js` |

빌드 시 `public/posts/{slug}/`로 HTML + 에셋이 복사됩니다.

## 새 글 추가

1. `content/posts/{category}/{slug}/` 폴더 생성
2. `index.md` + 필요하면 `thumbnail.png`, `images/` 추가
3. `npm run dev` 또는 `npm run build:gh-pages` 후 push
