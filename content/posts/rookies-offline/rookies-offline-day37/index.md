---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 37 — Playwright 증적 스크린샷 (자동: 1-2 · 7-4 · 2-2 / 정리·작업중: 1-6 · 6-1)"
date: 2026-07-10
tags:
  - KDT
  - "SK Rookies"
  - "SK shieldus"
  - "국비지원"
  - "루키즈 개발 5기"
  - argus
  - playwright
  - security
thumbnail: thumbnail.png
---

---

# 서론

> **"진단 결과만 YAML로 남기던 아르고스(Argus)에, Playwright로 증적 스크린샷을 자동으로 찍는 후처리 파이프라인을 붙였습니다. 1-2(인젝션)·7-4(CVE/보안설정)·2-2(파일 다운로드)는 자동 캡처 훅까지 연결했고, 같은 날 1-6 runner 정리와 6-1 오류 페이지 캡처 작업도 진행했습니다(자동 훅은 아직). 진단 코드와 캡처 코드를 나누고, 캡처가 실패해도 진단 결과는 깨지지 않게 만들었습니다."**
>
> 공통 후처리 훅부터 섹션별 `screenshot/modules/{id}`가 실제로 어떻게 도는지, 파일·코드 기준으로 정리합니다.

# 1. 왜 증적 스크린샷 파이프라인이 필요한가

멘토링에서 강조한 것은 “취약점에 도달하는 전 과정”과 “Before / After 비교”를 눈으로 볼 수 있어야 한다는 점이었습니다. 스캔 엔진이 Finding만 `latest.yaml`에 쌓아 두면, 보고서·발표용으로 **어떤 요청이 나갔고 화면이 어떻게 바뀌었는지**를 다시 손으로 재현해야 합니다.

그래서 아르고스에는 진단 엔진과 별도로, 진단이 끝난 뒤 리포트를 읽어 **브라우저 UI · HTTP 패킷 보드 PNG**를 자동으로 남기는 레이어를 만들었습니다. 과정(Process) 캡처와 결과(Result) 캡처를 한 파이프라인에서 돌리는 쪽이 목표입니다.

# 2. 설계: 진단과 캡처를 나누기

## ① 역할 분리

| 레이어 | 경로 | 하는 일 |
| --- | --- | --- |
| 진단 | `backend/diagnosis/modules/{id}/` | 프로브·판정·`latest.yaml` 저장 |
| 캡처 | `backend/screenshot/modules/{id}/` | 리포트 읽고 Playwright/Selenium으로 PNG 생성 |
| 오케스트레이션 | `backend/app/services/evidence_capture_service.py` | 진단 직후 섹션별 `capture.py` subprocess 실행 |

입력은 진단이 만든 `latest.yaml`(및 관련 리포트)이고, 출력은 `backend/data/report/{id}/evidence/` 아래 PNG + `manifest.json`입니다.

이렇게 나누면 진단 규칙(`Confirmed` / `Suspected` 등)을 고쳐도 캡처 UI를 안 건드려도 되고, 반대로 Burp 스타일 보드 레이아웃만 바꿔도 스캔 판정은 그대로입니다.

## ② 캡처 실패 격리

스크린샷 중 브라우저 오류·네트워크 지연이 나도 **이미 끝난 진단 결과를 실패로 바꾸지 않습니다.**  
캡처 전체가 실패하면 `capture-error.json`에만 로그를 남기고, 대시보드의 진단 status는 유지합니다. (진단 성공을 캡처 실패가 덮어쓰지 않게)

# 3. 진단이 끝나면 자동으로 캡처가 돌아가는 흐름

중앙 서비스 `evidence_capture_service.py`가 진단 저장 직후, **별도 백그라운드 subprocess**로 섹션별 `capture.py`를 실행합니다. 진단 API 워커와 브라우저 프로세스를 분리해서, 캡처가 길어도 진단 응답 경로를 막지 않게 했습니다.

```
진단 모듈 실행 완료 (_run_module)
    ↓
section_id ∈ _AUTO_CAPTURE_SECTIONS ?
    ↓
evidence_capture_service.capture_after_diagnosis()
    ↓
python backend/screenshot/modules/{section_id}/capture.py --report ...
    ↓
성공 → evidence/ 아래에 PNG + manifest.json
실패 → 타임아웃(300초) 후 capture-error.json에만 기록
```

자동 캡처 대상은 현재 아래 세 섹션입니다.

```python
_AUTO_CAPTURE_SECTIONS = {"1-2", "2-2", "7-4"}
```

대시보드 Progress에는 `evidence` 단계가 붙어, **"증거 스크린샷 생성 중..."** 안내가 나갑니다.  
`1-6`·`6-1`은 캡처 코드/runner는 있지만, 아직 이 집합에는 안 넣어 둔 상태입니다.

# 4. [1-2] 삽입(Injection) — 로그인 UI까지 포함한 5장 캡처

인젝션 Finding은 “페이로드가 들어갔고, 응답/화면이 이렇게 바뀌었다”를 한 세트로 보여 주는 게 중요합니다. 그래서 1-2는 **사이트 UI + 패킷 보드**를 같이 남깁니다.

## 모듈 구성

`backend/screenshot/modules/1-2/`

| 파일 | 역할 |
| --- | --- |
| `capture.py` | CLI 진입점. `--report`로 `latest.yaml` 경로를 받아 엔진 기동 |
| `engine.py` | Playwright Chromium 실행, 장면(scene) 순서 제어 |
| `replay.py` | Finding의 method/path/payload로 HTTP 정상·공격 요청 재현 |
| `renderer.py` | Burp 스타일 1280×720 HTML 패킷 보드 렌더 |

## 로그인 컨텍스트

헤드리스로 프론트를 열면 세션이 없을 때 “로그인이 필요합니다” 화면만 찍히는 경우가 많습니다.  
`_authenticate_browser_context()`가 `api-tree` 기준 프론트 로그인 URL을 찾고, API 로그인 후 받은 세션 쿠키를 Playwright 컨텍스트에 넣습니다.

```
api-tree에서 로그인 URL 탐색
    ↓
API 로그인 → Set-Cookie / 토큰 확보
    ↓
Playwright browser_context에 쿠키 주입
    ↓
권한이 있는 실제 UI에서 baseline / attack 캡처
```

## Playwright가 남기는 5장 (`engine.py`)

1. `01_baseline_site.png` — 정상 요청 시 프론트 UI  
2. `02_baseline_evidence.png` — 정상 Request / Response 보드  
3. `03_attack_burp.png` — 페이로드가 들어간 변조 요청 보드  
4. `04_attack_site.png` — 공격 후 프론트 UI  
5. `05_attack_evidence.png` — 공격 응답 패킷 보드  

`renderer.py`가 Request/Response를 HTML 보드로 그린 뒤 Playwright가 그 페이지를 PNG로 찍는 식입니다. 멘토링에서 말한 Full-Trace(과정 + 결과)에 가깝게 맞춘 구성입니다.

# 5. [7-4] 공개 CVE / 보안설정 — Advisory 보강 후 보드 캡처

7-4는 인젝션처럼 “클릭 한 번에 UI가 깨지는” 타입보다, **의존성 CVE·보안 헤더 누락**처럼 카드형으로 정리해서 보여주는 쪽이 맞습니다. 수동 진단 때 CORS 오설정으로 잡히던 같은 가이드라인 번호가, 자동화 단계에서는 헤더·TLS·CVE 인벤토리까지 넓어진 상태입니다.

## 모듈 구성 (요약)

| 파일 | 역할 |
| --- | --- |
| `capture.py` | CLI 진입점. `latest.yaml`을 읽어 보드 캡처 실행 |
| `advisory.py` | GitHub Advisory API 병렬 조회·심각도 정렬 |
| `dependency_check.py` 등 | 빌드/의존성 Finding 수집 (진단 쪽) |
| 보드 렌더러 | 대표 CVE·헤더 누락 케이스를 카드형 HTML로 그림 |

## 동작 흐름

```
dependency_check.py 등으로 의존성 Finding 수집
    ↓
advisory.py → GitHub Advisory API 병렬 조회 (ThreadPoolExecutor)
    ↓
심각도(critical > high) · 적용 정합성으로 대표 케이스 선정
    ↓
카드형 HTML 보드 렌더 → Playwright 스크린샷
```

- 선정 단위는 “베이스 URL 묶음”보다 **취약 항목(`check_type`) 단위**
- SCA는 라이브러리 단위로 중복을 줄임
- 보안 헤더 누락 등 설정 이슈도 같은 보드 포맷으로 렌더
- 보드에는 검출된 호스트도 보이게 함
- 1-2처럼 사이트 UI 5장보다는 **Finding 카드 보드 PNG** 위주

1-2와 같은 `evidence_capture_service` 훅에 묶여 있어서, 7-4 진단이 끝나면 별도 버튼 없이 캡처 subprocess가 이어집니다.

# 6. [2-2] 중요 정보 파일 다운로드 — 같은 파이프라인에 끼우기

1-2·7-4와 같은 자동 후처리에 **2-2**를 넣었습니다. 파일 다운로드/경로 조작은 API 성격이 커서, 사이트 UI 5장 대신 **패킷 보드 3장 + Baseline/Attack 바디 대조**에 맞췄습니다.

## 공통 훅 확장

```python
# diagnosis_service / evidence_capture_service
_AUTO_CAPTURE_SECTIONS = {"1-2", "2-2", "7-4"}
```

진단이 끝나는 즉시 `screenshot/modules/2-2/capture.py`가 이어집니다.

## 공용 replay 캡처와 겹치지 않게

2-2는 전용 증거 보드를 쓰므로, 공용 `diagnosis/replay/recorder.py`의 generic `evidence_screenshot`이 또 돌면 이미지가 중복됩니다. 2-2 구간에서는 그 모드만 뺍니다.

```python
def _capture_modes(self, *modes: str) -> list[str]:
    if self.section_id == "2-2":
        return [mode for mode in modes if mode != "evidence_screenshot"]
    return list(modes)
```

## `screenshot/modules/2-2/` 구성

| 파일 | 역할 |
| --- | --- |
| `capture.py` | CLI 진입점 |
| `engine.py` | 장면 순서(보드 3장) 제어 |
| `renderer.py` | Request/Response · 비교 보드 HTML |
| `replay.py` | Finding 기준 정상/공격 다운로드 재현 |
| `selector.py` | 어떤 Finding을 찍을지 고름 |
| `file_compare.py` | Baseline vs Attack 바디 대조 |
| `ui_flow.py` / redaction 등 | SPA 이동·민감정보 가림 |

### Finding 선정 (`selector.py`)

- `(rule_id, method, path, param, payload)`로 중복 제거
- 상위 `limit=3`만 캡처
- 우선순위: `severity == high` → `rule_id == 2-2-path-traversal` → `payload_leak_confirmed == True`
- 캡처 대상 rule: `2-2-path-traversal`, `2-2-input-validation`, `2-2-unauth-download`, `2-2-forced-browse`, `2-2-idor`
- 단순 설계 미흡(`2-design` 등)은 `is_capturable() == False`로 제외

### 남기는 3장

1. `01_baseline_evidence.png` — 정상 다운로드 Request / Response  
2. `02_attack_evidence.png` — 경로 변조(`../../../../etc/passwd` 등) 공격 보드  
3. `03_comparison_evidence.png` — Baseline vs Attack 응답 바디 대조 (`file_compare`)

## SPA 로그인 쿠키를 모듈 쪽으로

Playwright가 프론트 SPA를 열려면 `onde_*` 같은 쿠키가 필요합니다. 처음엔 전역 `config.yaml`에 SPA 세션 매핑을 넣었다가, **다른 설정 변경과 겹치지 않도록** 기본값을 모듈 asset으로 옮겼습니다.

- 경로 예: `diagnosis/modules/2-2/replay/assets/spa_browser_session.yaml`
- 해석 순서:
  1. (옵션) 전역 `auth.spa_browser_session`
  2. `frontend.cookies` (다른 모듈과 공유 가능)
  3. 2-2 모듈 asset
  4. 로그인 JSON 필드 기반 추론

UI flow·browser auth도 2-2 replay 쪽으로 모아, 공용 `diagnosis/replay`와 역할을 나눴습니다. (`g22_replay.py` 브리지로 패키지명 `2-2` 경로를 정적 로드)

# 7. [1-6] 입력값 크기·정확성 — 진단 엔진과 스크린샷 runner

1-6은 처음부터 진단 모듈 안에 캡처가 붙어 있던 구조입니다. 오늘은 그걸 **공통 `screenshot/modules/` 레이아웃에 맞게 정리**한 날입니다.

## 진단 쪽이 하는 일

`backend/diagnosis/modules/1-6/`

| 파일 | 역할 |
| --- | --- |
| `fuzzer.py` | 파라미터에 길이·포맷·경계값 페이로드를 넣는 fuzzing 코어 |
| `collector.py` | 응답·증적 메타를 모아 Finding으로 정리 |
| `screenshot.py` | (기존) 진단 중 UI 자동 캡처 유틸 |
| `zap_engine.py` | ZAP 연동·스파이더/액티브 스캔 제어 |
| `session_manager.py` | 로그인 세션·브라우저 드라이버 준비 |

대시보드에서는 `DiagnosisG16RunOptions`로 `skip_zap` / `skip_spider` / `skip_selenium` 같은 옵션을 넘길 수 있고, Docker용 `config.docker.yaml`의 `diagnosis_1_6` 블록과 맞춰 둡니다.

Selenium은 슬림 이미지에서 없으면 import만으로도 백엔드가 죽을 수 있어서, 모듈 최상단 import를 빼고 **쓸 때만** 불러오도록 바꿨습니다.

```python
def _load_selenium(self):
    # 드라이버가 필요한 순간에만 import
    from selenium import webdriver
    ...
```

## 오늘 한 스크린샷 쪽 정리

캡처 엔진이 **진단 모듈 안(`screenshot.py` 등)과 `screenshot/modules/1-6/`에 겹쳐** 있던 게 문제였습니다.

1. 진단 모듈에 남아 있던 **중복 Selenium screenshot engine 제거**
2. 실행 진입을 `backend/screenshot/modules/1-6/runner.py` 한곳으로 맞춤
3. capture 설정 재정리, 남아 있던 **오래된/고아 run 산출물 prune**

```
1-6 진단 (fuzzer → collector → latest.yaml)
        ↓
screenshot/modules/1-6/runner.py
        ↓
Selenium(또는 설정된 캡처 백엔드)로 Finding 장면 캡처
        ↓
report/1-6/evidence/ 아래에 PNG + 메타 저장
```

`_AUTO_CAPTURE_SECTIONS`에는 아직 없습니다. runner 정리 후, 1-2와 같은 자동 훅 연결이 다음입니다.

# 8. [6-1] 오류 페이지 정보 노출 — 진단 프로브와 캡처 모듈

6-1은 “오류 페이지에 스택·경로·내부 메시지가 새는지”를 보는 항목입니다. 진단은 이미 돌아가고 있고, 오늘은 **그 결과를 눈으로 남길 캡처 레이어**를 붙이는 작업이 진행됐습니다.

## 진단 쪽이 하는 일

프로브는 `backend/diagnosis/modules/6-1/triggers.py`에서 요청을 만듭니다. Docker 안에서는 `localhost`로 치면 컨테이너 자신으로 돌아가서 전부 실패하므로, 화면/리포트용 URL과 실제 퍼징 URL을 나눕니다.

```python
# 대시보드·리포트에는 localhost 형태로 보이고
# 실제 HTTP 프로브만 probe_url()로 호스트 대역에 보냄
build_probe_request(..., probe_base_fn=probe_url)
```

실행은 비동기로 잡습니다. 6-1 프로브가 무거워서 게이트웨이 타임아웃이 잘 나기 때문입니다.

```
POST /api/diagnosis/modules/6-1/run  →  202 Accepted + 백그라운드 워커
GET  /api/diagnosis/progress         →  대시보드 진행률 폴링
POST /api/diagnosis/cancel           →  DiagnosisCancelled
                                      (지금까지 모은 증적만 latest.yaml에 저장)
```

Type confusion·스택 누출 같은 케이스는 자동 탐지 후에도 **진단자가 화면을 한 번 더 보는** 쪽이 맞아서, 멘토링에서도 “부분 자동화 + 육안 확인”으로 잡아 둔 상태입니다. 그래서 스크린샷 증적이 특히 중요합니다.

## 오늘 붙인 캡처 쪽

`backend/screenshot/modules/6-1/` 아래에 오류 페이지 전용 캡처를 만들고 있습니다. 중심은 `capture.py`이고, Finding(오류 응답 HTML·스택 텍스트 등)을 읽어 **에러 화면 / 응답 보드**를 PNG로 남기는 구조입니다.

```
6-1 진단 (triggers → Finding → latest.yaml)
        ↓
screenshot/modules/6-1/capture.py
        ↓
오류 페이지 UI · 응답 본문(스택/경로 노출) 보드 캡처
        ↓
report/6-1/evidence/ 아래에 PNG + manifest 저장
```

아직 `_AUTO_CAPTURE_SECTIONS`에 `6-1`이 없어서, 진단 저장 직후 자동 subprocess로는 안 돌아갑니다.

| 섹션 | 진단 | 캡처 코드 | 자동 후처리 훅 |
| --- | --- | --- | --- |
| 1-2 / 7-4 / 2-2 | 있음 | 있음 | **연결됨** |
| 1-6 | 있음 | runner 정리 완료 | 아직 |
| 6-1 | 있음 | capture 작성 중 | 아직 |

# 9. 결과물이 쌓이는 위치

```
backend/data/report/
├── 1-2/
│   ├── latest.yaml
│   └── evidence/
│       ├── capture-summary.json
│       └── 1-2-{hash}/
│           ├── manifest.json
│           ├── 01_baseline_site.png
│           ├── 02_baseline_evidence.png
│           ├── 03_attack_burp.png
│           ├── 04_attack_site.png
│           └── 05_attack_evidence.png
├── 7-4/
│   ├── latest.yaml
│   └── evidence/
│       ├── capture-summary.json
│       └── 7-4-{hash}/
│           ├── manifest.json
│           └── (CVE·보안설정 보드 PNG)
├── 2-2/
│   ├── latest.yaml
│   └── evidence/
│       ├── capture-summary.json
│       └── 2-2-{hash}/
│           ├── manifest.json
│           ├── 01_baseline_evidence.png
│           ├── 02_attack_evidence.png
│           └── 03_comparison_evidence.png
├── 1-6/ .../evidence/   (runner 경로로 적재, 자동 훅 미연결)
└── 6-1/ .../evidence/   (capture 작성 중, 자동 훅 미연결)
```

`manifest.json`에는 어떤 Finding을 찍었는지, 파일명·rule_id·시각 같은 메타가 들어가서 대시보드·보고서에서 다시 묶기 쉽게 합니다.

# 10. 같이 맞춰 둔 주변 인프라

증적 캡처가 실서버·도커에서 돌아가려면 인증·베이스 URL이 맞아야 합니다. 같은 기간에 플랫폼 쪽으로도 아래를 맞춰 두었습니다.

- 로그인 응답을 보고 cookie / Bearer를 고르는 **인증 자동 감지**
- 대시보드 Base URL → `config` / Docker용 config 반영 (`host.docker.internal` 변환 포함)
- login endpoint와 런타임 config 동기화

2-2 SPA 매핑을 모듈 asset으로 뺀 이유도, 이런 전역 config 정리와 **서로 덮어쓰지 않게** 하기 위해서입니다. Playwright가 Docker 안에서 타깃에 붙을 때도 같은 호스트 매퍼를 탑니다.

# 11. 다음 작업

- 6-1 오류 페이지 캡처를 `_AUTO_CAPTURE_SECTIONS`에 연결하기
- 1-6 runner를 1-2·2-2·7-4와 같은 자동 후처리 패턴으로 확장하기
- 캡처 보드·선정 규칙을 가이드라인 항목별로 더 맞추기
- 대시보드에서 evidence 폴더를 보고서·발표 장표로 바로 쓰기 쉽게 연결하기

한 줄로 말하면, 오늘은 **진단이 끝난 뒤 Playwright가 증적을 자동으로 남기는 파이프라인**을 1-2·7-4·2-2에 올리고, 1-6 runner 정리와 6-1 오류 페이지 캡처까지 같이 진행한 날입니다.
