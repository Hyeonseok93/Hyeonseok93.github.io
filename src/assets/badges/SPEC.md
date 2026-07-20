# Tech Badge Spec

README / Built With 배지 공통 규격입니다.
**새 배지는 반드시 이 규칙으로 만든 뒤** `src/assets/badges/{dark,light}/`에 넣고,
프로젝트 README에는 여기서 복사해서 사용합니다.

> 주의: shields.io 결과물은 글자 간격·좌우 패딩이 기존 인벤토리와 다릅니다.
> 반드시 아래 레이아웃 + `make-badge.mjs`(또는 동일 파라미터)로 생성하세요.

## 레이아웃 (px)

| 항목 | 값 |
|------|-----|
| 높이 | **28** (고정) |
| 왼쪽 패딩 | **9** |
| 아이콘 | **14×14** (세로 중앙) |
| 아이콘→글자 간격 | **9** |
| 글자 간격 (tracking) | **1** (글자 사이 1px) |
| 단어 간격 (공백) | **7** (예: `ARGO CD`, `SPRING BOOT`) |
| 오른쪽 패딩 | **13** |
| 너비 | `9 + 14 + 9 + textWidth + 13` (가변) |

## 스타일

| 항목 | Dark | Light |
|------|------|-------|
| 배경 | `#363B44` = `(54,59,68)` | `#E8ECF0` = `(232,236,240)` |
| 글자색 | `#FFFFFF` | `#24292F` = `(36,41,47)` |
| 폰트 | **Arial Bold 11px** (`arialbd.ttf`) | 동일 |
| 텍스트 | 대문자 | 동일 |
| 아이콘 | Simple Icons SVG → PNG 14px, 브랜드 컬러 | 동일 |

## 파일

- 경로: `src/assets/badges/dark/{name}.png`, `src/assets/badges/light/{name}.png`
- 파일명: 소문자, 공백 없음 (`argocd.png`, `reacthookform.png`)

## 생성

Node + `sharp` 필요. `SHARP_CWD`에 sharp가 있는 프로젝트 경로를 지정하거나,
`long-screenshot-tool`이 형제 디렉터리에 있으면 자동 탐색합니다.

```bash
node src/assets/badges/make-badge.mjs Kubernetes kubernetes 326CE5
node src/assets/badges/make-badge.mjs "Argo CD" argo EF7B4D argocd
```

인자: `<Label> <simpleicons-slug> <logoHex> [filename]`

## README에 붙일 때

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/readme/badges/dark/{name}.png">
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/badges/light/{name}.png">
  <img src="assets/readme/badges/dark/{name}.png" alt="{Label}" height="28" />
</picture>
```

프로젝트 쪽은 깃페이지 배지를 **복사**만 합니다.