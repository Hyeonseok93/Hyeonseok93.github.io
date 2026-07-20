# Tech Badge Spec

README / Built With 배지 공통 규격입니다.
새 배지는 **반드시** `src/assets/badges/{dark,light}/`에 만든 뒤, 프로젝트 README로 복사합니다.

## 절대 하지 말 것

- shields.io PNG를 그대로 쓰지 마세요. 글자 간격·패딩이 인벤토리와 다릅니다.
- Arial 등으로 새로 렌더링하지 마세요. 기존 배지와 획 두께가 어긋납니다.

## 권장 생성 방식 (글리프 조립)

기존 dark 배지에서 **글자 조각(안티앨리어싱 포함)** 을 잘라 새 라벨을 조립합니다.
아이콘만 Simple Icons → 14×14 PNG로 넣고, 글자는 인벤토리에서 **잉크 밀도가 높은** 조각을 고릅니다.
배치는 **흰 글자 잉크 기준**으로 맞춥니다 (DOCKER와 동일).

## 레이아웃 (px)

| 항목 | 값 |
|------|-----|
| 높이 | **28** |
| 왼쪽 패딩 | **9** |
| 아이콘 | **14×14** 캔버스 (세로 중앙) |
| 아이콘 → 글자 잉크 | **10** |
| 글자 사이(잉크) | **3** (DOCKER/TYPESCRIPT) |
| 단어 간격(잉크) | **8** (`SPRING SECURITY`) |
| 오른쪽 패딩(잉크 뒤) | **14** |
| Dark 배경 | `#363B44` `(54,59,68)` |
| Light 배경 | `#E8ECF0` `(232,236,240)` |
| Light 글자 | `#24292F` `(36,41,47)` — dark 조립본을 재채색 |

## 도구

```bash
# 글리프 조립 (권장) — kubernetes / argocd 재생성
python src/assets/badges/compose-badge.py
```

`make-badge.py` / `make-badge.mjs`는 레거시 래퍼이며, 새 배지는 `compose-badge.py`를 쓰세요.

## README 마크업

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/readme/badges/dark/{name}.png">
  <source media="(prefers-color-scheme: light)" srcset="assets/readme/badges/light/{name}.png">
  <img src="assets/readme/badges/dark/{name}.png" alt="{Label}" height="28" />
</picture>
```
