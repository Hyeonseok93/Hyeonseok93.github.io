# Tech Badge Spec

README / Built With 배지 공통 규격입니다.
**새 배지는 반드시 이 규칙으로 만든 뒤** `src/assets/badges/{dark,light}/`에 넣고,
프로젝트 README에는 여기서 복사해서 사용합니다.

## 규격

| 항목 | 값 |
|------|-----|
| 높이 | **28px** (고정) |
| 너비 | 라벨 길이에 따라 가변 |
| 스타일 | shields.io **`for-the-badge`** |
| Dark 배경 | `#363B44` |
| Light 배경 | `#E8ECF0` |
| 로고 색 | Simple Icons 브랜드 컬러 (예: Kubernetes `#326CE5`) |
| 파일명 | 소문자, 공백 없음 (예: `argocd.png`, `reacthookform.png`) |
| 경로 | `src/assets/badges/dark/{name}.png`, `src/assets/badges/light/{name}.png` |

## URL 템플릿

```text
# dark
https://img.shields.io/badge/{Label}-363B44?style=for-the-badge&logo={slug}&logoColor={hex}

# light
https://img.shields.io/badge/{Label}-E8ECF0?style=for-the-badge&logo={slug}&logoColor={hex}
```

- `{Label}`: 표시 텍스트. 공백은 `_` (예: `Argo_CD`, `Spring_Boot`)
- `{slug}`: [Simple Icons](https://simpleicons.org/) 슬러그
- SVG를 받아 **PNG(높이 28)** 로 래스터라이즈해서 저장

## 생성 방법

Node + `sharp` 필요 (예: `long-screenshot-tool`).

```bash
node src/assets/badges/make-badge.mjs kubernetes kubernetes 326CE5
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

프로젝트 쪽은 깃페이지 배지를 **복사**만 하고, 여기서 직접 새로 그리지 않습니다.