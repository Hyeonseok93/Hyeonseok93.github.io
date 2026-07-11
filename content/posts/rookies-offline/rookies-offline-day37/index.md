---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 37 — Playwright 증적 스크린샷 (1-2 · 7-4 · 2-2 · 1-6 · 6-1)"
date: 2026-07-10
tags:
  - kdt
  - sk-rookies
  - sk-shieldus
  - rookies-5기
  - devlog
  - argus
  - playwright
  - security
thumbnail: thumbnail.png
---

---

# 서론

> **"진단 결과만 YAML로 남기던 아르고스(Argus)에, Playwright로 증적 스크린샷을 자동으로 찍는 후처리 파이프라인을 붙였습니다. 1-2(인젝션)·7-4(CVE/보안설정)에 먼저 올리고, 같은 구조로 2-2(중요 정보 파일 다운로드)까지 확장했습니다. 같은 날 1-6 스크린샷 runner 정리와 6-1 오류 페이지 캡처 작업도 같이 진행됐습니다. 진단 코드와 캡처 코드를 나누고, 캡처가 실패해도 진단 결과는 깨지지 않게 만들었습니다."**
>
> 증적 캡처 레이어 설계, 진단 후 자동 후처리, 1-2·7-4·2-2·1-6·6-1 모듈별 캡처 진행 상황을 정리합니다.

# 1. 왜 증적 스크린샷 파이프라인이 필요한가

멘토링에서 강조한 것은 “취약점에 도달하는 전 과정”과 “Before / After 비교”를 눈으로 볼 수 있어야 한다는 점이었습니다. 스캔 엔진이 Finding만 쌓아 두면 보고서·발표용 증적이 부족합니다.

그래서 아르고스에는 진단 엔진과는 별도로, 진단이 끝난 뒤 `latest.yaml`을 읽어 **브라우저·패킷 보드 이미지를 자동으로 남기는 레이어**를 만들었습니다.

# 2. 설계: 진단과 캡처를 나누기

## ① 역할 분리

- 진단 코어(`backend/diagnosis/modules/`) 로직은 그대로 두고,
- 캡처는 `backend/screenshot/modules/{section_id}/` 아래에 따로 둡니다.
- 입력은 진단이 만든 `latest.yaml`(및 관련 리포트)이고, 출력은 `evidence/` 아래 PNG + `manifest.json`입니다.

이렇게 나누면 진단 규칙을 고칠 때 캡처 UI를 건드리지 않아도 되고, 반대로 보드 레이아웃만 바꿔도 스캔 판정은 그대로입니다.

## ② 캡처 실패 격리

스크린샷 중 브라우저 오류·네트워크 지연이 나도 **이미 끝난 진단 결과를 실패로 바꾸지 않습니다.**  
캡처 전체가 실패하면 `capture-error.json`에만 로그를 남기고, 대시보드의 진단 status는 유지합니다.

# 3. 진단이 끝나면 자동으로 캡처가 돌아가는 흐름

중앙 서비스 `backend/app/services/evidence_capture_service.py`가 진단 저장 직후, **별도 백그라운드 subprocess**로 섹션별 `capture.py`를 실행합니다.

```
진단 모듈 실행 완료 (_run_module)
    ↓
section_id가 자동 캡처 대상인지 확인
    ↓
evidence_capture_service.capture_after_diagnosis()
    ↓
python backend/screenshot/modules/{section_id}/capture.py --report ...
    ↓
성공 → evidence/ 아래에 PNG + manifest.json 저장
실패 → 타임아웃(300초) 후 capture-error.json에만 기록
```

대시보드 Progress에는 `evidence` 단계가 붙어, **"증거 스크린샷 생성 중..."** 안내가 나갑니다.

자동 캡처 대상은 아래 세 섹션입니다.

```text
{"1-2", "2-2", "7-4"}
```

# 4. [1-2] 삽입(Injection) — 로그인 UI까지 포함한 5장 캡처

`backend/screenshot/modules/1-2/` 구성:

| 파일 | 역할 |
| --- | --- |
| `capture.py` | CLI 진입점 |
| `engine.py` | Playwright Chromium 실행·장면 순서 |
| `replay.py` | 진단 Finding 기준 HTTP 재현 |
| `renderer.py` | Burp 스타일 1280×720 HTML 패킷 보드 |

브라우저 쪽에서는 `_authenticate_browser_context()`로 `api-tree` 기준 프론트 로그인 URL을 찾고, API 로그인 후 받은 세션 쿠키를 Playwright 컨텍스트에 넣습니다. 그래서 **“로그인이 필요합니다” 화면만 찍히는 경우**를 줄이고, 실제 권한이 있는 UI를 캡처합니다.

Playwright가 남기는 5장:

1. `01_baseline_site.png` — 정상 요청 시 프론트 UI  
2. `02_baseline_evidence.png` — 정상 Request / Response 보드  
3. `03_attack_burp.png` — 페이로드가 들어간 변조 요청 보드  
4. `04_attack_site.png` — 공격 후 프론트 UI  
5. `05_attack_evidence.png` — 공격 응답 패킷 보드  

즉 1-2는 **사이트 화면 + 패킷 보드**를 같이 남겨, 멘토링에서 말한 Full-Trace에 가깝게 맞춥니다.

# 5. [7-4] 공개 CVE / 보안설정 — Advisory 보강 후 보드 캡처

7-4는 의존성·보안설정 Finding을 카드형 HTML로 그린 뒤 스크린샷으로 남깁니다.

- `dependency_check.py` 등으로 모은 의존성 Finding을 기준으로
- `advisory.py`가 GitHub Advisory API를 `ThreadPoolExecutor`로 병렬 조회
- 심각도(`critical` > `high`)와 적용 정합성을 보고 대표 케이스를 고름
- 보안 헤더 누락 등 설정 이슈도 같은 보드 형식으로 렌더링

선정 단위는 “베이스 URL 묶음”보다 **취약 항목(check_type) 단위**로 맞추고, SCA는 라이브러리 단위로 중복을 줄입니다. 보드에는 검출된 호스트도 보이게 했습니다.

# 6. [2-2] 중요 정보 파일 다운로드 — 같은 파이프라인에 끼우기

1-2·7-4와 같은 자동 후처리에 **2-2**를 넣었습니다.

## 공통 훅 확장

- `diagnosis_service.py` / `evidence_capture_service.py`의 자동 캡처 목록에 `2-2` 추가
- 진단이 끝나는 즉시 2-2용 `screenshot/modules/2-2/capture.py`가 이어짐

## 공용 replay 캡처와 겹치지 않게

2-2는 전용 증거 보드를 쓰므로, 공용 `diagnosis/replay/recorder.py`의 generic `evidence_screenshot`이 또 돌면 이미지가 중복됩니다. 2-2 구간에서는 그 모드만 빼도록 했습니다.

```python
def _capture_modes(self, *modes: str) -> list[str]:
    if self.section_id == "2-2":
        return [mode for mode in modes if mode != "evidence_screenshot"]
    return list(modes)
```

## `screenshot/modules/2-2/` 구성

Finding을 고르는 `selector.py`:

- `(rule_id, method, path, param, payload)`로 중복 제거
- 상위 `limit=3`만 캡처
- 우선순위: `severity == high` → `rule_id == 2-2-path-traversal` → `payload_leak_confirmed == True`
- 캡처 대상 rule: `2-2-path-traversal`, `2-2-input-validation`, `2-2-unauth-download`, `2-2-forced-browse`, `2-2-idor`
- 단순 설계 미흡(`2-design` 등)은 `is_capturable() == False`로 제외

파일 다운로드는 API 성격이 커서, 1-2처럼 사이트 UI 5장 대신 **패킷 보드 3장**에 맞춥니다.

1. `01_baseline_evidence.png` — 정상 다운로드 Request / Response  
2. `02_attack_evidence.png` — 경로 변조(`../../../../etc/passwd` 등) 공격 보드  
3. `03_comparison_evidence.png` — Baseline vs Attack 응답 바디 대조  

## SPA 로그인 쿠키을 모듈 쪽으로

Playwright가 프론트 SPA를 열려면 `onde_*` 같은 쿠키가 필요합니다. 처음엔 전역 `config.yaml`에 SPA 세션 매핑을 넣었다가, **다른 설정 변경과 겹치지 않도록** 기본값을 모듈 asset으로 옮겼습니다.

- 경로 예: `diagnosis/modules/2-2/replay/assets/spa_browser_session.yaml`
- 해석 순서 대략:
  1. (옵션) 전역 `auth.spa_browser_session`
  2. `frontend.cookies` (다른 모듈과 공유 가능)
  3. 2-2 모듈 asset
  4. 로그인 JSON 필드 기반 추론

UI flow·browser auth도 2-2 replay 쪽으로 모아, 공용 `diagnosis/replay`와 역할을 나눴습니다.

# 7. [1-6] 입력값 크기·정확성 — 스크린샷 runner 정리

1-6은 이미 진단 모듈 안에 Selenium 기반 캡처 유틸이 들어 있던 상태였습니다. 이번엔 그걸 **공통 `screenshot/modules/1-6/` 쪽으로 맞춰** 정리했습니다.

- 진단 모듈 쪽에 남아 있던 **중복 Selenium screenshot engine을 제거**
- 실행 진입을 `screenshot/modules/1-6/runner.py` 기준으로 맞춤
- capture 설정을 다시 보고, 남아 있던 오래된 run 산출물을 prune

즉 1-6은 오늘 새로 보드를 만든 날이라기보다, **기존 캡처 경로를 공통 screenshot 레이아웃에 맞게 정리한 날**에 가깝습니다. 자동 후처리 훅(`{"1-2", "2-2", "7-4"}`)에는 아직 안 넣었고, runner 쪽 정비를 먼저 마친 상태입니다.

# 8. [6-1] 오류 페이지 정보 노출 — 캡처 모듈 작업 중

6-1(오류 페이지를 통한 정보 노출)도 같은 증적 스크린샷 흐름으로 붙이려는 작업이 진행됐습니다.

- `backend/screenshot/modules/6-1/capture.py` 등 오류 페이지 전용 캡처 모듈을 작성 중
- 스택 트레이스·상세 에러 HTML처럼 **오류 응답 화면을 눈으로 남기는** 쪽에 맞춤
- 다만 아직 공통 자동 캡처 훅에는 연결되지 않았고, **별도 작업 브랜치에서 이어가는 상태**입니다

그래서 오늘은 1-2·7-4·2-2가 자동 후처리까지 들어간 구간이고, 6-1은 **캡처 코드는 생겼지만 파이프라인 합류는 다음 단계**로 보면 됩니다.

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
└── 2-2/
    ├── latest.yaml
    └── evidence/
        ├── capture-summary.json
        └── 2-2-{hash}/
            ├── manifest.json
            ├── 01_baseline_evidence.png
            ├── 02_attack_evidence.png
            └── 03_comparison_evidence.png
```

# 10. 같이 맞춰 둔 주변 인프라 (요약)

증적 캡처가 실서버·도커에서 돌아가려면 인증·베이스 URL이 맞아야 합니다. 같은 기간에 플랫폼 쪽으로도 아래를 맞춰 두었습니다.

- 로그인 응답을 보고 cookie / Bearer를 고르는 인증 감지
- 대시보드에 넣은 Base URL을 `config` / Docker용 config에 반영 (`host.docker.internal` 변환 포함)
- login endpoint와 런타임 config 동기화

2-2 SPA 매핑을 모듈 asset으로 뺀 이유도, 이런 전역 config 정리와 **서로 덮어쓰지 않게** 하기 위해서입니다.

# 11. 다음 작업

- 6-1 오류 페이지 캡처를 공통 자동 캡처 훅에 연결하기
- 1-6 runner 정리를 같은 후처리 목록(`1-2`·`2-2`·`7-4`) 패턴으로 확장하기
- 캡처 보드·선정 규칙을 가이드라인 항목별로 더 맞추기
- 대시보드에서 evidence 폴더를 보고서·발표 장표로 바로 쓰기 쉽게 연결하기

한 줄로 말하면, 오늘은 **진단이 끝난 뒤 Playwright가 증적을 자동으로 남기는 파이프라인**을 1-2·7-4·2-2에 올리고, 1-6 runner 정리와 6-1 오류 페이지 캡처 작업까지 같이 진행한 날입니다.
