---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 37 — Playwright 증적 스크린샷 파이프라인 (1-2 / 7-4 / 2-2) 및 PR #43 머지"
date: 2026-07-10
tags:
  - kdt
  - sk-rookies
  - sk-shieldus
  - rookies-5기
  - devlog
  - argus
  - playwright
  - git
  - security
thumbnail: thumbnail.png
---

# 서론

> **"Playwright 기반 자동 증적 스크린샷 파이프라인을 1-2(인젝션)·7-4(CVE/보안설정)에 안착시킨 뒤, 같은 블루프린트로 2-2(파일 다운로드)까지 확장해 PR #43으로 `dev`에 합쳤습니다. 당일 `dev`에는 섹션별 증거 캡처·인증/설정 자동화 PR도 함께 들어왔습니다."**
>
> 7월 9일 원격으로 올린 1-2·7-4 코어와, 7월 10일 2-2 증거 스크린샷·Git 일일 정리를 한 글로 묶습니다.

# 1. 아르고스(Argus) 자동 증적 캡처 파이프라인 설계 아키텍처

스캔 결과 숫자만 보여 주던 방식에서 나아가, 보안 진단 보고서에 필요한 증적 이미지를 플랫폼이 직접 렌더링하고 캡처하도록 기능을 나눠 설계하고 실패도 따로 처리했습니다.

## 역할 분리 (Separation of Concerns)

- 기존 진단 엔진 코어(`diagnosis/modules/`)의 동작은 건드리지 않고, 진단 결과서(`latest.yaml`)만 받아 따로 실행되는 증적 캡처 레이어(`screenshot/modules/`)를 만들었습니다. 그래서 진단 코드와 섞이지 않은 채 스크린샷 형식만 따로 고치거나 추가할 수 있습니다.

## 캡처 실패 분리 처리 (Fault Isolation)

- 스크린샷을 찍는 중 브라우저 컨텍스트 오류나 네트워크 지연이 생겨도, **이미 만든 진단 리포트 결과가 실패로 바뀌지 않도록(`never turn a valid diagnosis into a failure`)** 처리했습니다. 캡처 전체가 실패하면 `capture-error.json`에 로그만 남깁니다.

# 2. 원격 7월 9일 마일스톤 완료 내역 (`6c09ac6` — 1-2 / 7-4 통합)

7월 9일 하루 동안 `injection_screenshot` 브랜치를 중심으로 총 **76개 파일 변경, +6,730 / -302 라인**에 달하는 대규모 연동 작업이 수행되었습니다.

```
[7월 9일 원격 주요 커밋 타임라인]
- 09:12 [f05b11f] 7-4 의존성 스캔 입력 메타데이터(gradle_dep_files.json) 신규 등록
- 09:50 [2aeacb1] PR #32 Parameter Search Engine(1-3 파라미터 조작/LLM 해석) 최종 합류
- 11:02 [5892437] injection v1 — 1-2 스크린샷 모듈 최초 구현 (+950 lines)
- 14:37 [5a23eb4] v2 진단 후 스크린샷 — 파이프라인 자동 후처리 승격 + 7-4 연동
- 16:26 [6c09ac6] 진짜 완료 — 1-2 · 7-4 브라우저 인증 및 Advisory API 실전 안정화
```

## 1-2. 삽입 (Injection) 공격 가능성 자동 캡처 모듈

- **구성 요소:** `backend/screenshot/modules/1-2/` 아래에 CLI 시작점 `capture.py`, Playwright Chromium 실행용 `engine.py`, HTTP 재현용 `replay.py`, Burp Suite 스타일의 1280×720 HTML 보드를 만드는 `renderer.py`를 넣었습니다.
- **실전 브라우저 로그인 연동 (`6c09ac6`):** `_authenticate_browser_context()` 엔진을 리팩터링하여 `api-tree.json` 기반 프론트엔드 로그인 주소를 자동 추적하고, Playwright API 로그인을 수행한 뒤 세션 쿠키를 브라우저 컨텍스트에 복사 이식하여 **실제 로그인 권한이 유지된 타깃 사이트 UI 화면**을 정밀 캡처해 냅니다.
- **Playwright 결정적 5장 캡처 사양 (`engine.py`):**
  1. `01_baseline_site.png`: 정상 요청 시의 실제 프론트엔드 UI 화면
  2. `02_baseline_evidence.png`: 정상 요청 시의 원문 HTTP Request / Response 대조 보드
  3. `03_attack_burp.png`: 해커 공격 페이로드가 인젝션된 변조 요청 보드
  4. `04_attack_site.png`: 공격 패킷 투사 후 취약점이 발현된 실서버 프론트엔드 UI 화면
  5. `05_attack_evidence.png`: 공격 성공 시 도출된 취약점 반사 응답 패킷 상세 보드

## 7-4. 공개된 취약점 (Public CVE) 존재 여부 모듈

- **GitHub Advisory API 병렬 인리치먼트 (`advisory.py`):** `dependency_check.py`가 수집한 빌드 의존성 Finding 데이터를 기반으로, `ThreadPoolExecutor`를 가동하여 GitHub Advisory API 주소를 병렬 고속 fetch 조회합니다. 수신된 보안 권고 메타데이터를 기반으로 취약점 심각도(`critical > high`) 및 적용 정합성 순위로 Advisory 랭킹을 정렬 인리치먼트합니다.
- **자동 캡처 결과물:** 선별된 대표 CVE 케이스별 데이터셋과 보안 헤더 누락 설정을 가독성 높은 카드 형태의 HTML 보드로 렌더링한 후 Playwright 스크린샷 파일로 바인딩 출력합니다.

# 3. 핵심 메커니즘: 진단 후 자동 후처리 서비스 (`evidence_capture_service`)

**신규 연동 파일:** `backend/app/services/evidence_capture_service.py`

개별 진단 모듈 실행과 리포트 저장이 끝나면, 중앙 서비스가 **별도 백그라운드 subprocess**에서 섹션별 `capture.py`를 자동 실행합니다.

```
진단 프로세스 완료 (_run_module)
    ↓
section_id 검증 (지원 스코프인 {1-2, 7-4} 내에 존재 여부 판정)
    ↓
evidence_capture_service.capture_after_diagnosis() 호출
    ↓
python backend/screenshot/modules/{section_id}/capture.py --report ... 실행
    ↓
[성공 시] -> 지정된 evidence/ 디렉터리 하위에 고유 해시명으로 PNG + manifest.json 영속화
[실패 시] -> 타임아웃(300s) 가드 발동 및 capture-error.json에 에러 로그 격리 기재
```

- **대시보드 UI 연동:** 진단 구동 중 프로그레스 바(Progress Bar) 상에 `evidence` 페이즈가 동적 추가되어, 사용자에게 **"증거 스크린샷 생성 중..." (99%)** 상태 메시지를 가시적으로 실시간 안내합니다.

# 4. 최종 산출물 데이터 구조 및 디렉터리 레이아웃 스냅샷

파이프라인이 끝나면 `backend/data/report/` 아래에 저장되는 증적 파일 구조는 다음과 같습니다.

```
backend/data/report/
├── 1-2/ (삽입 공격 가능성 모듈)
│   ├── latest.yaml
│   └── evidence/
│       ├── capture-summary.json
│       └── 1-2-{hash_id}/
│           ├── manifest.json
│           ├── 01_baseline_site.png
│           ├── 02_baseline_evidence.png
│           ├── 03_attack_burp.png
│           ├── 04_attack_site.png
│           └── 05_attack_evidence.png
└── 7-4/ (공개 CVE / 보안설정 모듈)
    ├── latest.yaml
    └── evidence/
        ├── capture-summary.json
        └── 7-4-{hash_id}/
            ├── manifest.json
            └── (CVE·보안설정 보드 스크린샷)
```

# 5. 이어서: 2-2 확장 및 당일 `dev` Git 정리

1-2·7-4 자동 캡처 훅이 올라간 뒤, 동일 구조를 **2-2 중요 정보 파일 다운로드**로 확장하고 PR #43으로 `dev`에 합쳤습니다. 아래는 그 기술 상세와 당일 원격 Git 흐름입니다.

# 6. 하루 한눈에 보기 (`dev` 원격)

| 구분 | 내용 |
| --- | --- |
| `dev`에 머지된 PR | #34 (1-5), #38 (1-6), #39 (4-4·5-2), #42 (1-2/7-4·auth·config), #43 (2-2) |
| `main` 쪽 | #35 머지 후 곧바로 #40으로 revert (2-1 악성파일 업로드) |
| 미머지 브랜치 활동 | `feat/errorpage_screenshot` (6-1 캡쳐, yoojisoo99) |
| 본인 핵심 산출물 | 2-2 Playwright 증거 캡처, SPA 세션을 모듈 asset으로 이전, `dev` 충돌 사전 정리 후 PR |

# 7. 시간순 전체 진행 (원격 기준)

```
00:36  Eojinn     2-1 악성코드 업로드 작업 커밋 (분석/스캔 산출물·pyc 등 포함)
10:19  Eojinn     2-1 프론트 옵션/리포트 UI + 스키마
12:39  pjcosmos   7-4 스크린샷 선정 로직 일반화 (항목 단위 + 호스트 표시)
13:11  nirey-l    4-4 / 5-2 스크린샷 대량 추가
14:11  yoojisoo99 1-5 리플렉티드 XSS 도커 환경 성공
14:17  yoojisoo99 PR #34 → dev 머지
14:37  Eojinn     2-1 추가 커밋 (log.txt)
14:54  Eojinn     PR #35 → main 머지 (악성파일 업로드)
15:23  pjcosmos   base_urls → config targets/inventory 자동 동기화
15:33  pjcosmos   로그인 cookie/bearer 자동 감지
17:06  JangSeonguk1011  1-6 Selenium 중복 제거·runner 정리
17:16  JangSeonguk1011  PR #38 → dev 머지
17:16  nirey-l    5-2 front_capture (프론트 사진) 추가
17:20  Eojinn     PR #40 → main (PR #35 revert)
17:21  nirey-l    PR #39 → dev 머지
17:21  pjcosmos   1-2/7-4 증거 스크린샷 모듈 + auth/config 묶음 푸시
17:26  pjcosmos   Dockerfile 정리
17:29  Bulldog    2-2 스크린샷 모듈 + SPA session config (본인 메인 커밋)
17:42  Bulldog    origin/dev 머지 (7-4·compose는 dev 우선)
17:46  yoojisoo99 6-1 캡쳐 (별도 브랜치, 아직 미머지)
17:57  pjcosmos   login endpoints ↔ runtime config 동기화
18:04  pjcosmos   PR #42 → dev 머지
19:45  Bulldog    SPA 매핑을 2-2 모듈 asset으로 이동 (config 충돌 완화)
19:52  Bulldog    inventory.base_urls를 우리 config에 선반영
20:04  Bulldog    PR #43 → dev 머지 (2-2 증거 스크린샷)
```

# 8. [2-2] 파일 다운로드 모듈 확장 (기술 상세)

7월 9일에 만든 자동 스크린샷 구조를 **KISA 가이드라인 2-2 중요 정보 파일 다운로드 가능성 / 경로 조작** 항목에도 확장했습니다.

## 기존 공통 핵심 레이어의 2-2 연동 스펙 확장

- **`diagnosis_service.py` & `evidence_capture_service.py` 수정:** 공통 자동 캡처 지원 가드 세트 `_AUTO_CAPTURE_SECTIONS`에 `2-2`를 신규 주입하여, 진단 마감 즉시 후처리 프로세스가 이어달리도록 세팅했습니다.

## 중복 자산 생성 방지를 위한 generic 캡처 바이패스

- **`backend/diagnosis/replay/recorder.py` 수정:** 2-2 모듈은 고유 증거 보드 HTML 스크린샷 엔진을 쓰므로, 리플레이 레코더의 범용 `evidence_screenshot`이 중복 기동하지 않도록 2-2 세션 진입 시 generic 캡처를 비활성화했습니다.

```python
def _capture_modes(self, *modes: str) -> list[str]:
    if self.section_id == "2-2":
        return [mode for mode in modes if mode != "evidence_screenshot"]
    return list(modes)
```

## `screenshot/modules/2-2/` 단독 레이어 구현

1-2 및 7-4와 구조적 대칭을 이루는 컴포넌트 세트를 빌드했습니다.

- **정밀 중복 필터링 및 랭킹 셀렉터 (`selector.py`):** Findings 중 상위 `limit=3` 건만 추출하기 위해 `(rule_id, method, path, param, payload)` 튜플 기준 dedupe를 진행합니다. 랭킹 우선순위는 `severity == high` → `rule_id == 2-2-path-traversal` → `payload_leak_confirmed == True` 계층입니다.
- **가이드라인 부합 rule_id 감시:** `2-2-path-traversal`, `2-2-input-validation`, `2-2-unauth-download`, `2-2-forced-browse`, `2-2-idor`를 수용하고, 단순 설계 미흡 지표(`2-design`) 등은 `is_capturable() == False`로 배제합니다.
- **Playwright 2-2 전용 3장 캡처 규격 (`engine.py`):** 파일 다운로드(API 레벨) 성격에 맞춰 프론트 UI 사이트 화면 캡처는 배제하고 전송 데이터 증적에 집중합니다.
  1. `01_baseline_evidence.png`: 정상 파일 다운로드 요청/응답 패킷 보드
  2. `02_attack_evidence.png`: 경로 변조 페이로드(`../../../../etc/passwd` 등) 공격 요청/응답 보드
  3. `03_comparison_evidence.png`: Baseline vs Attack 응답 바디 대조 보드

자동 캡처 훅 최종 집합은 `{"1-2", "2-2", "7-4"}`로, 직전 인프라의 1-2/7-4에 **2-2를 같은 파이프라인에 끼워 넣은 형태**입니다.

# 9. 본인(Bulldog) 작업 상세 (Git / PR 관점)

## 목표

- 2-2(인가되지 않은 파일 다운로드 등) 진단 결과를 **증거 스크린샷**으로 남기기
- 로그인 후 SPA가 요구하는 쿠키(`onde_*` 등)를 Playwright에 주입해 “로그인이 필요합니다”만 찍히는 문제 해결
- 2-2 전용 replay/UI flow를 공용 `diagnosis/replay`에서 분리
- 전역 `config.yaml`의 SPA 하드코딩을 줄여 **다른 팀원 `dev` 작업과 머지 충돌 최소화**

## 커밋별 세부

### `030fa1e` — 17:29 — feat(2-2): dedicated screenshot evidence module and SPA session config

- **규모:** 40 files, +3423 / −203
- `backend/screenshot/modules/2-2/` 신설: `capture`, `engine`, `renderer`, `replay`, `file_compare`, `selector`, `ui_flow`, redaction 등
- `backend/diagnosis/modules/2-2/replay/` 로 UI flow·browser auth·SPA session 이전
- `backend/diagnosis/g22_replay.py` 브리지 (폴더명 `2-2`가 패키지가 아니라 동적 로드)
- 공용 `diagnosis/replay/browser_auth.py` 제거·recorder/runner 정리
- `diagnosis_service` / `evidence_capture_service` 자동 캡처 대상에 **`2-2` 추가** (`1-2`, `7-4`와 함께)
- 당시에는 `auth.spa_browser_session`을 `config.yaml` / `config.docker.yaml`에 두고 SPA 쿠키 매핑
- 테스트: `test_g22_*`, `test_spa_browser_session`, evidence capture 2-2 지원 등

### `e4d8743` — 17:42 — Merge origin/dev

- 팀원들이 올린 최신 `dev`(1-2/7-4 스크린샷, compose 등)를 본인 브랜치에 합침
- 충돌 전략: **2-2 증거 작업은 유지**, **7-4·docker-compose는 dev 쪽 채택**
- 규모(머지 결과): 51 files, +3757 / −1747 수준으로 기록됨

### `aa7631a` — 19:45 — refactor(2-2): move SPA cookie mapping into module asset

- **규모:** 7 files, +216 / −58
- `auth.spa_browser_session`을 전역 config에서 **삭제**
- 기본 매핑을 `diagnosis/modules/2-2/replay/assets/spa_browser_session.yaml`로 이동
- resolve 순서:
  1. (옵션) `auth.spa_browser_session`
  2. `frontend.cookies` (5-2와 공유 가능)
  3. 2-2 모듈 asset (`prefer_module_asset` 또는 onde 계열 app)
  4. 로그인 JSON 필드 기반 best-effort infer
- 목적: `dev`의 `inventory.base_urls` 등과 config 충돌을 줄이기

### `123306d` — 19:52 — chore(config): add inventory.base_urls from dev

- `config.yaml` / `config.docker.yaml`에 pjcosmos가 넣은 `inventory.base_urls`를 **선반영**
- 실제 `git merge` 전에 충돌 지점을 우리 쪽에서 맞춰 둔 작업

### `5f7adf7` / `b26e33f` — 20:04

- feature 브랜치에 `dev` 재머지 후 **PR #43** 머지
- `origin/dev` tip이 본인 2-2 작업 포함 상태로 갱신

## 본인 작업의 하루 스토리라인

1. 2-2 스크린샷·SPA 로그인·파일 비교 등 **기능 본체**를 브랜치에 올림 (`030fa1e`)
2. 낮~저녁에 들어온 팀원 `dev` 변경을 받아 **7-4/compose는 팀원 쪽**, 2-2는 유지 (`e4d8743`)
3. SPA를 config에서 빼 **모듈 로컬 asset**으로 옮겨 충돌 면적 축소 (`aa7631a`)
4. `base_urls`만 미리 맞춰 두고 (`123306d`) PR에서 `diagnosis_service`·evidence 테스트 등 남은 충돌을 수동 해결
5. **PR #43 머지**로 `dev`에 안착

# 10. 팀원별 작업 상세

## pjcosmos — 인프라·1-2/7-4 증거·인증/설정

가장 많은 “플랫폼성” 커밋을 `dev`에 넣은 축입니다.

| 시각 | 커밋 | 요약 |
| --- | --- | --- |
| 12:39 | `23a5839` | **7-4** 스크린샷 대상을 base_url 그룹 → **취약 항목(check_type)** 단위로 변경. SCA는 라이브러리 단위 dedup. 상한 3·금지 필터 제거. 오버레이에 검출 호스트 표시. (4 files, +78/−36) |
| 15:23 | `e0759ce` | **base_urls 저장 → config 동기화**. `targets` / `inventory.frontend_base_url` / `openapi.base_url` / `inventory.base_urls` 갱신. docker는 `host.docker.internal` 변환. compose에 config bind-mount. |
| 15:33 | `e0234ba` | **auth 자동 감지**. Set-Cookie → cookie, body token → Bearer. config는 힌트만. onde/mate 대응. |
| 17:21 | `cd21595` | **1-2·7-4 증거 스크린샷 모듈** 대량 추가(+2375). auth/base_urls 서비스·테스트 포함. (당시 Dockerfile·자동캡처 훅은 보류라고 커밋 메시지에 명시) |
| 17:26 | `3341e29` | Dockerfile pip/COPY 정리 |
| 17:57 | `cc6a48d` | **login endpoints ↔ runtime config** 동기화 + 테스트 + compose/config 정리 |
| 18:04 | **PR #42** | 위 묶음을 `injection_screenshot` 브랜치로 `dev`에 머지 |

## yoojisoo99 — 1-5 리플렉티드 / 6-1 캡쳐

| 시각 | 커밋 | 요약 |
| --- | --- | --- |
| 14:11 | `558e148` | **1-5 리플렉티드** 도커 환경 성공. probes/bridge/detector/scanner·Dockerfile·openapi/probe_build 등 (12 files, +206/−54). `REFLECTED_FIX_LOG.md` 추가 |
| 14:17 | **PR #34** | `feat/parameter_search_engine` → `dev` |
| 17:46 | `fc2947f` | **6-1 캡쳐** 모듈 (`screenshot/modules/6-1/capture.py` 등, +1084). 브랜치 `feat/errorpage_screenshot` — **당일 `dev` 미머지** |

## nirey-l — 4-4 / 5-2 스크린샷

| 시각 | 커밋 | 요약 |
| --- | --- | --- |
| 13:11 | `48d29a9` | 비인증 중요 페이지 접근(4-4) + 요청/응답 주요정보(5-2) 스크린샷. 4-4 모듈 신설, 5-2 보강 (9 files, +1013/−45) |
| 17:16 | `ca77eee` | 5-2 **front_capture** (프론트 사진) + config.docker 일부 (+416) |
| 17:21 | **PR #39** | 위 작업 → `dev` |

## JangSeonguk1011 — 1-6 정리

| 시각 | 커밋 | 요약 |
| --- | --- | --- |
| 17:06 | `d36ec6d` | 1-6 **중복 Selenium screenshot engine 삭제**, `screenshot/modules/1-6/runner.py`로 정리, capture 다양화·오래된 run prune (5 files, +380/−868) |
| 17:16 | **PR #38** | `fix/g16-admin-login-8080` → `dev` |

## Eojinn — 2-1 악성파일 업로드 (main 쪽 출렁)

| 시각 | 커밋/PR | 요약 |
| --- | --- | --- |
| 00:36 | `23d6d0d` | 2-1 probes/rules/scanner/targets 등 + 대용량 스캔 결과·pyc 등 혼재 |
| 10:19 | `9c55467` | 프론트 `G21DiagnosisOptionsPanel` / 리포트 패널 / `g21DiagnosisOptions` + schemas |
| 14:37 | `b121e6b` | `log.txt` 추가 |
| 14:54 | **PR #35 → main** | 악성코드 파일 업로드 기능 머지 |
| 17:20 | **PR #40 → main** | 바로 **revert** (`Revert "Feat/malicious file upload"`) |

당일 `main`에서는 2-1이 들어갔다가 빠진 상태입니다. `dev` tip 기준 본 문서의 핵심 스토리와는 축이 다릅니다.

# 11. 당일 `dev`에 합쳐진 PR 목록

| PR | 시각(대략) | 작성/머지 | 제목·의미 |
| --- | --- | --- | --- |
| #34 | 14:17 | yoojisoo99 | 1-5 리플렉티드 도커 환경 성공 |
| #38 | 17:16 | JangSeonguk1011 | 1-6 admin login / screenshot engine 정리 |
| #39 | 17:21 | nirey-l | 4-4·5-2 스크린샷 |
| #42 | 18:04 | pjcosmos | 1-2/7-4 증거 스크린샷 + auth 자동감지 + base_urls/login config 동기화 |
| #43 | 20:04 | Bulldog (본인) | **2-2 스크린샷 증거 + SPA 모듈화** |

# 12. 테마별로 본 오늘 `dev` 변화

## 증거 스크린샷 파이프라인 확장

| 섹션 | 누가 | 무엇 |
| --- | --- | --- |
| 1-2 | pjcosmos | 증거 캡처 모듈 (`screenshot/modules/1-2`) |
| 1-5 | yoojisoo99 | 리플렉티드 검증/도커 (진단 쪽 중심) |
| 1-6 | JangSeonguk1011 | 스크린샷 runner 일원화 |
| 2-2 | **Bulldog** | 전용 모듈 + 자동 캡처 훅에 섹션 추가 |
| 4-4 / 5-2 | nirey-l | 비인증 페이지·민감정보·프론트 캡처 |
| 7-4 | pjcosmos | 모듈 + 선정 로직 일반화 |
| 6-1 | yoojisoo99 | 캡쳐 코드는 브랜치에만 (미머지) |

자동 캡처 훅(`diagnosis_service` / `evidence_capture_service`) 최종 집합:

```text
{"1-2", "2-2", "7-4"}
```

원래 팀 인프라에 1-2/7-4가 있었고, **본인이 2-2를 같은 파이프라인에 끼워 넣었습니다.**

## 인증·설정 자동화 (pjcosmos)

- 로그인 방식: 응답 보고 cookie vs Bearer 자동 선택
- 대시보드 base URL 저장 → `config.yaml` / `config.docker.yaml` 동기화
- login endpoints 런타임 동기화
- compose에 config·app 마운트 강화 → 재빌드 없이 설정 반영 용이

본인은 이 흐름과 충돌하지 않도록 SPA를 **2-2 asset**으로 빼고 `base_urls`를 미리 맞췄습니다.

## 충돌·머지 이슈 (본인 관점)

당일 후반 본인 브랜치 vs `dev`에서 손댄 지점:

| 파일 | 해결 방향 |
| --- | --- |
| `diagnosis_service.py` | **우리** — 자동캡처에 `2-2` 유지 |
| `evidence_capture_service.py` | **우리** — `_AUTO_CAPTURE_SECTIONS`에 `2-2` |
| `test_evidence_capture_service.py` | **우리** — 2-2 지원/에러 테스트 유지 (dev는 2-2를 unsupported로 봄) |
| `config.yaml` / `config.docker.yaml` | **섞기** — spa 블록 제거(우리), `base_urls`는 dev 내용 유지 |
| `docker-compose.yml` | **dev** |

# 13. 커밋 해시 빠른 색인

## 본인

- `030fa1e` feat(2-2) 본체
- `e4d8743` merge origin/dev
- `aa7631a` SPA → module asset
- `123306d` base_urls 선반영
- `5f7adf7` merge dev into feature
- `b26e33f` **Merge PR #43**

## 팀

- `23a5839` 7-4 selector 일반화
- `e0759ce` base_urls sync
- `e0234ba` auth auto-detect
- `cd21595` 1-2/7-4 screenshot modules
- `cc6a48d` login endpoints sync
- `7b8aa10` **Merge PR #42**
- `558e148` / `3b9aea4` 1-5 / PR #34
- `48d29a9` / `ca77eee` / `40888df` 4-4·5-2 / PR #39
- `d36ec6d` / `64f8990` 1-6 / PR #38
- `fc2947f` 6-1 (미머지)
- `c277f1f` / `f70c0bc` main 2-1 merge & revert

# 14. 마무리

- **로컬/원격 `dev`:** `b26e33f` — PR #43 포함, 2-2 증거 스크린샷이 `dev`에 존재
- **본인 feature 브랜치:** `origin/feat/g22-screenshot-evidence`도 동일 계열 tip (`5f7adf7` 등)으로 정리된 상태
- **남은 외부 작업:** `feat/errorpage_screenshot`(6-1), `main`의 2-1은 revert로 빠진 상태 → 별도 재작업 가능

한 줄로 정리하면, 오늘은 팀이 **섹션별 증거 스크린샷·인증/URL 설정 자동화**를 `dev`에 집중적으로 쌓은 날이고, 본인은 그 인프라 위에 **2-2 전용 캡처·SPA 세션·모듈 로컬 설정**을 얹어 PR #43으로 마감했습니다. 저녁 작업의 상당 부분은 “기능 추가”뿐 아니라 **다른 팀원 커밋과의 충돌을 줄이는 구조 정리**였습니다.
