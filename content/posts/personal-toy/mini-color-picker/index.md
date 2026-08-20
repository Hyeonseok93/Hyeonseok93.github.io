---
title: "[TOY] Color Picker — 정사각형 돋보기 & 다중 포맷 컬러 픽커 유틸리티"
date: 2026-08-10
tags:
  - python
  - pyside6
  - win32-api
  - pyinstaller
  - desktop-app
thumbnail: thumbnail.png
---

---

# 서론

포토샵·브라우저 개발자 도구처럼 **특정 프로그램 안에서만** 스포이트를 쓸 수 있는 경우가 많습니다. 바탕화면·다른 앱·게임 오버레이처럼 그 프로그램 밖에서는 같은 방식으로 색을 집기 어렵고, 필요할 때마다 해당 툴을 켜야 하는 제약이 있었습니다. **윈도우에서 언제든**, 지금 떠 있는 화면이 무엇이든 픽셀 색을 집고 싶어서 이 유틸을 만들었습니다. 1px 단위로 맞추려면 커서만으로는 부족해서 **돋보기(정밀 확대)** 도 같이 넣었습니다.

**Color Picker**는 PySide6와 Win32 API(`ctypes`)를 기반으로 제작된 **정밀 픽셀 스포이트 및 다중 포맷 컬러 픽커 데스크톱 유틸리티**입니다. 전역 단축키와 돋보기로 마우스 이동 간섭 없이 조준·캡처하고, HEX · RGB · HSL · CMYK로 바로 클립보드에 복사할 수 있습니다.

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig1.png" alt="Color Picker 메인 화면 및 주요 기능 프리뷰" loading="lazy" />
</figure>

📦 **GitHub:** [MINI_ColorPicker](https://github.com/Hyeonseok93/MINI_ColorPicker)

# 1. 왜 만들었나

* **1px 미세 조준의 어려움:** 고해상도 모니터나 복잡한 UI 디자인에서 원하는 정확한 픽셀 색상을 조준하기 어렵습니다.
* **마우스 이동 시 색상 변경 간섭:** 스포이트 툴 사용 중 클릭하려는 순간 마우스가 1px만 움직여도 엉뚱한 색이 캡처되는 문제를 방지하고 싶었습니다.
* **다양한 컬러 포맷 변환:** 개발/디자인 작업 시 HEX, RGB 외에도 CSS HSL, 인쇄용 CMYK 등 여러 포맷 변환이 즉시 필요했습니다.
* **색상 배색 추천:** 캡처한 색상을 기준으로 어울리는 보색(Complementary)이나 유사색(Analogous)을 바로 확인하고 싶었습니다.

# 2. 구조 및 아키텍처

데스크톱 애플리케이션의 유지보수성과 확장성을 위해 역할을 3개의 계층으로 명확히 분리했습니다.

```text
ColorPicker/
┣━━ 📄 ColorPickerApp.py    # 진입점, Pretendard 폰트 로드, 전역 단축키 훅
┣━━ 📄 ColorPickerCore.py   # Win32 API 픽셀 추출, 색상 포맷 변환, 조화색 연산
┣━━ 📄 ColorPickerUi.py     # PySide6 메인 윈도우, 8배 돋보기, 포맷 카드 & 토스트 UI
┗━━ 📄 build.bat            # PyInstaller 단일 .exe 자동 빌드 파이프라인
```

# 3. 핵심 구현 디테일

### ① 정사각형 돋보기 & 십자선 조준

조준 정확도가 이 앱의 전부라, 돋보기는 `ColorPickerUi.PixelMagnifier`로 따로 뒀습니다.

* 커서 주변 **21×21** 픽셀을 `Core.capture_screen_region`으로 가져와, **200×200** 캔버스에 셀 단위로 그립니다. UI 배지는 `🔍 8x`로 표시합니다.
* `paintEvent`에서 각 셀을 채우고, **중앙 셀**은 흰색·검정 이중 테두리로 강조합니다. 가운데에는 `#58D082` 점선 **십자선**을 그어 1px 타깃을 눈으로 맞춥니다.
* 라이브 프리뷰는 `MainWindow.update_live_preview`가 **약 33ms** `QTimer`로 커서 좌표와 돋보기를 갱신합니다. 마우스를 움직이는 동안에도 중앙 픽셀이 어디에 있는지 바로 보이게 했습니다.

### ② 전역 훅 기반 무간섭 색상 고정 (`Ctrl+클릭` / `Ctrl+C`)

클릭하는 순간 커서가 1px만 밀려도 색이 바뀌는 문제를 막기 위해, **캡처와 복사를 분리**했습니다.

* `ColorPickerApp.App`가 `pynput`으로 **전역 마우스·키보드 리스너**를 켭니다. Win32 `SetWindowsHookEx`가 아니라, 클릭/키 이벤트만 받고 Ctrl 여부는 `Core.is_ctrl_pressed()`(`GetAsyncKeyState`)로 확인합니다.
* **왼쪽 클릭 + Ctrl**이면 현재 커서 좌표의 픽셀을 고정합니다. 앱 창 안 클릭은 `contains_native_point`로 걸러, UI 조작과 캡처가 겹치지 않게 했습니다.
* **Ctrl+C**(VK `67` / `c`)도 같은 `capture_current_position()` 경로로 들어갑니다. 픽셀 읽기는 `GetDC` / `GetPixel`(`get_pixel_color_at`)이고, UI 스레드로는 `QMetaObject.invokeMethod`로 넘깁니다.
* 한 번 Lock되면 마우스를 움직여도 카드·조화색은 고정값을 유지합니다. 그다음에야 포맷 카드나 조화 칩을 눌러 복사하면 됩니다.

### ③ HSL 기반 색상 조화(Color Harmony)

캡처한 RGB만 보여 주면 배색을 다시 계산해야 해서, `ColorPickerCore`에서 HSL로 올린 뒤 조화색을 바로 붙였습니다.

* `rgb_to_hsl` / `hsl_to_rgb`는 `colorsys`의 HLS 변환을 감싼 형태입니다. Hue는 **0°~360°** 기준입니다.
* **보색 (Complementary):** `get_complementary_color` — $(H + 180^\circ) \bmod 360^\circ$, S·L 유지 후 RGB로 되돌립니다.
* **유사색 (Analogous):** `get_analogous_colors` — $(H \pm 30^\circ) \bmod 360^\circ` 두 색을 만듭니다.
* UI `ColorHarmonyWidget`에는 Main / Comp / Ana-1 / Ana-2 칩이 나오고, 칩을 누르면 해당 HEX가 클립보드로 들어가며 토스트가 뜹니다.

# 4. UI/UX 및 편의 기능

포맷 변환·히스토리·상주 방식까지, “집어서 바로 쓰는” 쪽에 맞췄습니다.

* **포맷 카드 원클릭 복사:** `FormatRow`가 HEX · RGB · HSL · CMYK 네 장을 그립니다. `set_captured_color`에서 `#RRGGBB`, `rgb(...)`, `hsl(...°)`, `cmyk(...%)` 문자열을 채우고, 카드 클릭 시 클립보드 복사 후 `copied` 시그널을 냅니다.
* **플로팅 토스트:** `ToastNotification.show_toast` — 페이드 인(약 200ms) → 표시(기본 2초) → 페이드 아웃(약 250ms). 복사·조화색 선택 피드백을 우측 하단에 짧게 남깁니다.
* **세션 복원:** 히스토리는 `assets/session_history.json`에 `{rgb, hex, timestamp}`로 저장합니다(`utf-8`, `ensure_ascii=False`). 창을 닫거나 앱 종료(`App.quit`) 때도 남깁니다.
* **CSV 내보내기:** `export_csv`는 **`utf-8-sig`(BOM)** 로 써서 Excel에서도 한글·헤더가 깨지지 않게 했습니다. 컬럼은 `Timestamp, R, G, B, HEX, HSL`입니다. (엑셀 전용 `cp949`가 아니라 BOM UTF-8을 택했습니다.)
* **트레이 & 항상 위:** `QSystemTrayIcon`으로 최소화 시 트레이에 두고(`setQuitOnLastWindowClosed(False)`), 기본으로 `WindowStaysOnTopHint` 핀을 켜 둡니다. 핀 토글로 다른 창 위에 고정할지 풀지 고를 수 있습니다.
