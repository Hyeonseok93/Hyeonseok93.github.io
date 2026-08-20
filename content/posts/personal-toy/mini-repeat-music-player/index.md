---
title: "[TOY] Repeat Music Player — 트랙별 개별 반복 재생 & 통합 오디오 병합 유틸리티"
date: 2026-08-14
tags:
  - python
  - pyside6
  - ffmpeg
  - pyinstaller
  - desktop-app
thumbnail: thumbnail.png
---

---

# 서론

어학 학습이나 악기 연습, 혹은 특정 음악 앨범을 들을 때 "1번 곡은 3번, 2번 곡은 5번, 3번 곡은 1번"처럼 **곡마다 서로 다른 반복 횟수를 지정해 듣고 싶은 순간**이 있습니다. 플레이리스트를 짜는 때도 비슷합니다 — 순서만 정하는 게 아니라, 그중 한두 곡만 더 돌려 듣게 만들고 싶을 때 말이죠. 일반 음악 플레이어는 전체 반복이나 한 곡 반복만 지원할 뿐, 목록 안에서 트랙별 반복 카운트를 제어할 수 없습니다.

**Repeat Music Player**는 PySide6와 FFmpeg 엔진을 기반으로 제작된 **트랙별 정밀 반복 재생 및 단일 오디오 병합 데스크톱 유틸리티**입니다. 각 트랙마다 0~999회의 반복 횟수를 지정하여 순차 재생할 수 있으며, 설정된 반복 횟수가 그대로 반영된 단일 음원 파일로 일괄 추출(Concat)할 수 있습니다.

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig1.png" alt="Repeat Music Player 메인 화면 및 재생 목록 프리뷰" loading="lazy" />
</figure>

📦 **GitHub:** [MINI_RepeatMusicPlayer](https://github.com/Hyeonseok93/MINI_RepeatMusicPlayer)

# 1. 왜 만들었나

* **트랙별 차등 반복 청취:** 곡마다 익숙한 정도가 다를 때 원하는 만큼 횟수를 조절하여 맞춤형 루프 재생을 하고 싶었습니다.
* **반복된 시퀀스를 단일 음원으로 병합:** 플레이어 없이도 스마트폰이나 스마트워치에 넣고 들을 수 있도록, 반복 설정이 반영된 하나의 긴 오디오 파일(`.mp3` 등)로 합쳐 내보내고 싶었습니다.
* **직관적인 재생 제어:** 키보드 스페이스바, 방향키 등으로 손쉽게 재생/일시정지/볼륨/시크를 제어하고 싶었습니다.

# 2. 구조 및 아키텍처

```text
MINI_RepeatMusicPlayer/
┣━━ 📄 RepeatMusicPlayerApp.py    # 진입점, Pretendard, QLockFile 단일 인스턴스
┣━━ 📄 RepeatMusicPlayerCore.py   # Track / PlayQueue, ffprobe, FFmpeg Concat
┣━━ 📄 RepeatMusicPlayerUi.py     # MainWindow, TrackRow, ElidedLabel
┗━━ 📄 build.bat                  # PyInstaller 단일 .exe
```

* `Track` — `path`, `repeats`, `duration_ms`, `uid`
* `PlayQueue` — 반복 횟수만큼 펼친 `deque`, `pop_next()`
* `MainWindow` — `QMediaPlayer` 재생, `_sofar`/`_totals` UI 카운트, `QProcess` 병합

# 3. 핵심 구현 디테일

### ① 트랙별 반복 — `deque`로 펼치기
모델은 `Track.repeats`(기본 1, UI 스핀 `0~999`)입니다. `PlayQueue.build_queue()`가 각 트랙을 **횟수만큼 같은 참조로 복제**해 `deque`에 넣고, `EndOfMedia` → `play_next()` → `popleft()`로 다음 슬롯을 재생합니다.

* **진행 표시:** 필드 `current_count`가 아니라 `MainWindow._sofar[uid]` / `_totals[uid]` → `• 반복 (k/n회)`
* **`repeats=0`:** 무한 루프가 아니라 **스킵** — 재생 큐·병합 목록 모두에서 빠짐. 전부 0이면 `build_concat_manifest`가 `ValueError`
* **이전 트랙:** `_history`에 되돌리며 `_sofar` 감소, 큐 앞에 `appendleft`

“한 곡 반복 ON/OFF”가 아니라 **목록을 평탄화한 재생 계획표**에 가깝습니다.

### ② 재생 엔진 — `QMediaPlayer` + `ffprobe`
재생은 FFmpeg가 아니라 Qt **`QMediaPlayer` + `QAudioOutput`**입니다. 길이는 `probe_duration_ms`가 `ffprobe -show_entries format=duration`으로 읽고, 재생 중 `durationChanged`로 행 라벨을 갱신합니다. `ffmpeg`/`ffprobe`는 `assets/ffmpeg/` 번들 우선, 없으면 PATH입니다.

### ③ FFmpeg Concat — 항상 재인코딩
`build_concat_manifest`가 임시 `.txt`에 `file '절대경로'`를 **반복 횟수만큼** 나열하고(`\` → `/`), `MainWindow.combine_files`가 `QProcess`로 돌립니다.

```text
ffmpeg -f concat -safe 0 -i list.txt … -c:a <코덱>
```

* **스트림 카피(`-c copy`) 없음** — 확장자별 재인코딩 (mp3 `libmp3lame` 192k, wav `pcm_s16le`, m4a/aac `aac` 192k, ogg `libvorbis`, flac `flac` …)
* 취소 시 `terminate` → 안 죽으면 `kill`
* 입력 스캔: `.mp3 .wav .flac .ogg .m4a .aac .wma` / 저장: MP3·WAV·M4A·OGG·FLAC

다른 코덱·샘플레이트가 섞인 목록을 한 파일로 묶으려면 카피만으로는 깨지기 쉽습니다. 그래서 “손실 최소화 카피”가 아니라 **안정적인 단일 트랙 출력**을 택했습니다.

### ④ 말줄임 라벨
`ElidedLabel`은 오른쪽 말줄임 + 전체 문자열 툴팁. 하단 상태용 `StatusElidedLabel`은 파일명만 줄이고 `• 반복 (k/n회)` 접미사는 남깁니다. 긴 태그·경로가 레이아웃을 밀어내지 않게 하기 위함입니다.

# 4. UI/UX 및 편의 기능

### 목록·프리셋
| 동작 | 방법 |
|------|------|
| 일괄 횟수 | `1회` / `0회` / `+1` / `-1` (`PresetCard`) |
| 셔플 | 목록 `random.shuffle` |
| 반복 반영 후 재시작 | `🔄` → 정지 · 큐 재빌드 · 재생 |
| 순서 | 행 **▲/▼**, 리스트 **드래그 InternalMove** |
| 추가 | 폴더 선택 · **창/리스트 DnD** · 지원 확장자 스캔 |
| 삭제 | 행 휴지통 |

### 단축키
| 키 | 동작 |
|----|------|
| `Space` | 재생 / 일시정지 |
| `←` / `→` | **±5초 시크** (트랙 점프 아님) |
| `↑` / `↓` | 볼륨 ±5 |
| `F1` | 도움말 |

### 그 밖의 디테일
* **단일 인스턴스** `QLockFile` (`--multi`로 해제 가능)
* 토스트만 있는 `ToastNotification` — 트레이·항상 위 핀은 없음
* 병합이 끝나면 네이티브 저장 경로로 “반복이 펼쳐진” 한 파일이 남아서, 워치·폰 플레이리스트에 그대로 넣기 좋습니다
