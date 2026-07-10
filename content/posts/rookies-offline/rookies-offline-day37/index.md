---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 37 — Playwright 기반 진단 후 자동 증적 스크린샷 파이프라인 완수 (1-2 / 7-4)"
date: 2026-07-09
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

> **"이전 스프린트에서 논의된 '취약점 증적 채취 자동화' 마일스톤을 달성하기 위해, Playwright Headless 브라우저 기반의 자동화 스크린샷 후처리 파이프라인을 전격 구축했습니다. 7월 9일 자 원격 머지를 통해 1-2(인젝션) 및 7-4(CVE/보안설정) 모듈의 실전 자동 캡처 엔진을 메인라인에 안착시켰습니다."**
>
> 오늘은 1-2·7-4 자동 증적 캡처 파이프라인의 원격 마일스톤을 정리합니다. 2-2(파일 다운로드) 모듈 확장은 **다음 날(7월 10일, Day 38)** 작업으로 이어집니다.

# 1. 아르고스(Argus) 자동 증적 캡처 파이프라인 설계 아키텍처

단순히 스캔 결과 수치만 배출하는 기존 한계를 넘어, 보안 진단 보고서의 핵심인 '실증 증적 이미지'를 플랫폼이 스스로 렌더링하고 캡처하도록 관심사와 실패 격리 원칙을 기반으로 정밀 설계했습니다.

## 관심사의 완전 분리 (Separation of Concerns)

- 기존 진단 엔진 코어(`diagnosis/modules/`)의 비즈니스 로직을 전혀 건드리지 않고, 오직 진단 결과서(`latest.yaml`)를 입력받아 독립 실행되는 증적 캡처 레이어(`screenshot/modules/`)를 평행 구축했습니다. 이로 인해 진단 코드의 오염 없이 언제든 스크린샷 사양만 유연하게 유지보수 및 플러그인할 수 있습니다.

## 완벽한 실패 격리 (Fault Isolation)

- 스크린샷 캡처 중 브라우저 컨텍스트 오류나 네트워크 지연으로 인해 캡처가 실패하더라도, **이미 성공적으로 확보된 진단 리포트 결과 자체를 실패로 뒤집지 않도록(`never turn a valid diagnosis into a failure`)** 가드를 세웠습니다. 전체 실패 시 `capture-error.json` 로그만 남긴 채 안전하게 격리 처리됩니다.

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

- **레이어드 컴포넌트 구현:** `backend/screenshot/modules/1-2/` 하위에 CLI 진입점인 `capture.py`, Playwright Chromium 구동용 `engine.py`, HTTP 재현용 `replay.py`, 그리고 Burp Suite 스타일의 1280×720 HTML 보드를 구워내는 `renderer.py`를 완비했습니다.
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

개별 진단 모듈 실행이 성공적으로 마감되고 리포트 영속화가 끝나는 즉시, 중앙 서비스 스케줄러가 **별도 백그라운드 subprocess**를 할당하여 섹션별 `capture.py` 엔진을 자동 트리거합니다.

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

파이프라인이 기동 완료된 후 `backend/data/report/` 하부에 최종 빌드 적재되는 증적 자산의 구조도는 다음과 같이 일원화됩니다.

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

# 5. Next Step: 2-2 확장 및 전사 증적 캡처 수직 통합

이번 스프린트(7월 9일)를 통해 Playwright Headless 브라우저 드라이버를 컨테이너 서브넷 네트워크 대역(`host.docker.internal` 치환 매퍼 연동) 하에서도 안정적으로 구동하는 증적 자동화 프레임워크의 코어(1-2 / 7-4)를 자산화했습니다.

- **[2-2] 파일 다운로드 모듈 전향 확장 (7월 10일):** 동일 블루프린트를 KISA 가이드라인 2-2(중요 정보 파일 다운로드 / 경로 조작) 영역으로 확장하고, 원격 `dev`에 PR로 합류합니다. → **Day 38**에서 상세 기록
- **전사 28대 가이드라인 스크린샷 소켓 수직 통합 (7/12):** 1-2, 2-2, 7-4 성공 템플릿을 기반으로 잔여 진단 도메인 캡처 소켓을 상호 연결하는 릴리즈를 이어갑니다.
