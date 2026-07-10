---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 32 — '아르고스(Argus)' 플랫폼 코어 리팩토링 및 4대 검색 엔진(1-1, 1-2, 1-4, 1-6) Staging 통합"
date: 2026-06-23
tags:
  - kdt
  - sk-rookies
  - sk-shieldus
  - rookies-5기
  - devlog
  - argus
  - security
  - refactoring
thumbnail: thumbnail.jpg
---

---

# 서론

> **"각 영역별 진단 엔진과 독립 feature 브랜치로 파편화되어 동작하던 핵심 도메인들을 아르고스(Argus) 대시보드 및 단일 파이프라인 아키텍처 위로 완전히 수렴시키기 위해 대대적인 플랫폼 리팩토링과 전사 통합 머지(Merge)를 완수했습니다. 이번 스프린트에서는 SK쉴더스 웹/API 취약점 진단 가이드라인 표준 규격 소켓에 맞추어 1-1(XSS/CSRF), 1-2(인젝션), 1-4(SSRF), 1-6(입력값 검증)의 4대 핵심 가이드라인 브랜치를 결합하고 스캔 신뢰도를 고도화했습니다. 리팩토링된 코어 레이어 구조와 병합 데이터 명세를 상세히 정리합니다."**
>
> 파편화된 feature 브랜치를 아르고스 단일 파이프라인으로 수렴하는 코어 리팩토링과 1-1·1-2·1-4·1-6 검색 엔진 Staging 통합, 인젝션 strict 검증 고도화를 완수했습니다.

# 1. 배경 및 "통합 준비" 플랫폼 코어 리팩토링 사양

아르고스(ARGUS)는 본래 공격 표면 수집(`api-tree`), 검증(Verify), 가이드라인별 자동 진단을 일원화된 대시보드 인터페이스에서 구동하는 플랫폼입니다. 그러나 초기 개발 단계에서 각 세부 진단 모듈이 독립된 CLI 및 개별 브랜치 형태로 파편화되어 빌드되면서 리포트 경로 분산, ZAP 제어 로직 중복, 프론트엔드 코드 비대화 등의 결함이 발생했습니다.

이러한 독립 파이프라인들을 아르고스 표준 소켓에 완벽하게 결합하고 외부 진단 엔진을 유연하게 플러그인하기 위해 전사적인 코어 리팩토링 시리즈를 선행 전개했습니다.

## ① 통합용 코어 레이어 분리 및 ZAP 통합 클라이언트 개편 (`change`)

- **ZAP 통합 클라이언트 분리 아키텍처:** 기존 `backend/app/services/zap_util.py`에 약 570줄로 무겁게 뭉쳐있던 탐색 및 프록시 제어 구문을 전면 해체했습니다. 독립 컴포넌트인 `backend/integrations/zap/client.py`로 격리하여 Docker, 로컬 호스트, Windows `host.docker.internal` 등 상이한 서브넷 환경에 따른 프록시 자동 탐색 및 `wait_for_zap()`, `probe_url()` 연동 로직을 단일 클라이언트로 집중 관리하도록 정돈했습니다.
- **공통 Probe 타깃 빌더 수립:** 각 가이드라인 모듈마다 중복 복사되어 존재하던 트리 분석 및 타깃 URL 추출 로직을 공통 빌더인 `probe_targets.py`로 단일화했습니다. `ProbeMode(base_only | sample | full)` 연산 구조를 통합 적용하여 7-x 계열 등 전사 모듈의 중복 코드를 수백 줄 제거하는 고도화를 달성했습니다.
- **리포트 및 증거 경로 프레임 규격화:** 런타임 결과물 위치를 `backend/data/report/{section_id}/latest.yaml` 경로로 엄격히 강제 고정하고 하위에 `evidence/` 자산 레이아웃 명세를 매핑했습니다.
- **프론트엔드 코드 다이어트 및 컴포넌트 분해:** 비대했던 `DiagnosisPage.tsx` 구조에서 finding 리스트, 심각도, httpx/ZAP/inventory 버킷 명세를 표현하는 `DiagnosisReportPanel.tsx`와 공통 모달 골격인 `StartOptionsDialog.tsx`, 진행률 폴링 훅(`useProgressPoll.ts`)을 독립 분리하여 향후 추가될 섹션별 모달 진입 공간을 깔끔하게 확보했습니다 (기존 코드에서 ~970줄 제거 완료).
- **인벤토리 로드 및 슬롯 정리:** `backend/inventory/load.py` 및 `net.py`를 신설하여 api-tree JSON 로드와 probe용 URL 정규화 로직을 diagnosis와 app 서비스가 상호 공유하도록 통제하고, 미구현 상태의 빈 플레이스홀더 모듈들을 제거하여 구조를 캡슐화했습니다.

## ② 진단 실행 산출물 Git ignore 처리 및 대이동 (`refactor`)

- **머지 충돌 원천 차단 가드:** 개발자 및 CI 환경마다 다르게 도출되는 진단 실행 결과물 YAML 및 PDF 증적 파일들이 레포지토리에 커밋되어 유발되던 머지 충돌(지옥)을 방지하고자 구조를 개편했습니다. 2-2 모듈의 약 13,800줄 대형 최신 리포트를 포함하여 전사 `latest.yaml` 결과 파일셋 약 24,000줄을 Git 추적 대상에서 전면 삭제(`git rm --cached`)하고, 오직 런타임에만 `backend/data/report/` 하위에서 동적 생성·소멸되도록 영속화 계층을 완전히 격리했습니다.

## ③ UX 패턴 통일 및 업로드 배치 수명 주기 관리 (`refactor 2` & `3`)

- **Start Dialog / Options 표준 UX 패턴 수립:** 가이드라인 전반(`1-5, 2-2, 3-2, 3-4, 3-5, 3-6, 4-1, 4-2, 5-2, 6-1, 6-2, 7-1 ~ 7-4`)에 대해 프리셋 선택(전수 / 동작확인 / 커스텀)  API 스케일 snake_case 직렬화  `sectionHasStartDialog()` 분기로 이어지는 통일된 인터페이스 규칙을 바인딩 완료했습니다.
- **업로드 배치 retention 엔진 이식:** OpenAPI 명세 스펙 업로드 시 `data/uploads/{uuid}/` 디렉터리에 배치가 무한 누출 누적되는 현상을 방지하기 위해 최신 5개 배치만 스케줄링 유지하고 나머지는 자동 삭제(prune)하는 `upload_retention.py` 관리기를 전방 탑재했습니다. 아울러 새로 합류하는 개발자가 직관적으로 소켓 플러그인 구조를 파악할 수 있도록 모노레포 아키텍처 명세 가이드와 개발 런북을 담은 README.md를 대규모 갱신(+777줄)했습니다.

# 2. SK쉴더스 가이드 대응 4대 가이드라인 브랜치 전사 통합 명세 (1-1, 1-2, 1-4, 1-6)

오전 단계의 코어 레이어 리팩토링 소켓 아키텍처가 마감된 즉시, standalone CLI 형태로 격리 개발 중이던 팀원들의 핵심 검색 엔진 및 인젝터 소스코드를 중앙 mainline 상으로 병합하는 연동 공정을 집행했습니다.

## ── 1-1. XSS / CSRF 공격 가능성 모듈 (중요 - 머지완료)

- **통합 명세 및 소스 변경:** `feat/xss&csrf-search-engine` 브랜치(PR #7)의 최종 릴리즈를 통해 `modules/1-1/` 하부 소켓으로 완전히 머지 완료되었습니다. `module.py` 내에 `DiagnosisModule` 상속 기반의 G11 진단 엔트리를 정립했습니다.
- **코어 컴포넌트 구조:** httpx/ZAP 기반의 크로스 사이트 스캐닝 오케스트레이션을 제어하는 `scanner.py`, ZAP active/passive 동적 연동을 대규모로 전개하는 `zap_runner.py` 및 ZAP alert 로그를 내부 정형화 Finding 구조로 치환하는 `zap_adapter.py`가 탑재되었습니다. 이와 더불어 `payloads.py`, `rules.py`, `auth.py`, `auth_extractor.py` 및 OpenAPI 문서 내에서 XSS/CSRF 후보군을 자동 디스커버리 추출하는 `openapi_utils.py` 엔진이 통합 탑재되었습니다. 해당 소스코드는 `origin/main` 브랜치 상에 성공적으로 수렴 완료되었습니다.

## ── 1-2. 삽입 (Injection) 공격 가능성 모듈 (중요 - 머지완료)

- **통합 명세 및 소스 변경:** `feature/injection-scan` 브랜치에서 standalone CLI 형태로 작동하던 파이프라인을 `merge/ja` 브랜치(PR #4) 튜닝 세션을 거쳐 `Staging` 통합 본진 소켓에 전격 수렴 안착시켰습니다. 진입점을 `modules/1-2/module.py` 내부의 `G12Module` 클래스로 정형화 등록했습니다.
- **코어 컴포넌트 구조:** SQL/Command/NoSQL/SSTI/XML 변조 페이로드를 직접 투사하고 에러·시간 기반 검증을 집행하는 `payload_injector.py` 핵심 엔진과 INSANE 정책 기반의 ZAP injection 전용 정책(`zap_engine.py`)의 원형 규칙을 안전하게 보존하여 포팅했습니다. 타깃 소스를 기존 단일 Swagger에서 **`api-tree-verified.json`** 전사 인벤토리 구조로 변경하고, `test-accounts.json` 내의 쿠키 세션 및 `probe_auth` 인증 모듈을 재사용하도록 주변 연결부를 재접합했습니다.

## ── 1-4. SSRF / File Inclusion 공격 가능성 모듈 (중요 - 머지완료)

- **통합 명세 및 소스 변경:** `feat/SSRF.File_Inclusion_search_engine` 브랜치(PR #1)의 성과를 단일 mainline 파이프라인 레이어에 일제히 머지 완료했습니다. 1-2 모듈의 포팅 성공 아키텍처 패턴을 공유하여 구조적 일치성을 달성했습니다.
- **코어 컴포넌트 구조:** 파라미터 식별자 네이밍 및 스키마 구조를 정밀 연산하여 SSRF/LFI/RFI 취약 평면 후보군을 가려내는 `search_engine.py` 기제와 타이밍 및 baseline 구조 대조용 `payload_injector.py`, 역할별 토큰 경계를 다루는 `role_boundary.py`를 원형 그대로 흡수 이식했습니다. 인벤토리 연동을 위해 `inventory_bridge.py` 컴포넌트를 신설하여 수집된 `Endpoint` 데이터가 코어 검색 엔진의 `ScanTarget` 객체 형식으로 유기적으로 변환되도록 다리를 놓았으며, 이 과정에서 `probe_url` 함수 호출을 통한 `host.docker.internal` 컨테이너 네트워크 치환 매퍼를 동일 적용했습니다.

## ── 1-6. 입력 값 크기 및 무결성 검증오류 모듈 (일반 - 1차 완료)

- **통합 명세 및 소스 변경:** 성욱 담당의 `feat/input-search-engine` 브랜치(PR #3) 성과를 `Staging` 통합 mainline에 1차 수렴 완료했습니다. ONDE 여행 플랫폼 로컬 타깃 대역 및 다중 OpenAPI 명세 소스 자동 해석 파이프라인 규칙이 정상 맞물려 기동하도록 세팅했습니다.
- **코어 컴포넌트 구조:** ONDE 입력값 검증 타깃(8080/8081/5173)과 ZAP 프록시 연동 가이드 및 다중 OpenAPI 소스 지원 해석 운영 경로를 담은 `docs/ONDE_INPUT_SEARCH_ENGINE_RUNBOOK.md` 명세 가이드라인 문서 및 업로드 배치 통합 구조를 동시 안착시켰습니다.

# 3. 1-2 인젝션 모듈 통합 이후 탐지 신뢰도 및 strict 검증 제어 고도화

## ① 문제 현상 및 원인 분석

통합 직후 실서버 환경 타깃 모의침투 테스트베드 점검을 수행한 결과, `GET /api/v1/posts?type=REVIEW&status=ACTIVE` 경로의 `status` 인자에 심어둔 명확한 타임 기반 Blind SQL 인젝션 취약점을 아르고스 자동화 스캐너가 포착하지 못하고 미탐(0건 검출)하는 치명적 런타임 현상이 식별되었습니다.

추적 결과, `api-tree` 자산 내에 `type` 파라미터에 대한 정합성 있는 샘플 인자 매핑이 결여되어 아르고스 프로브가 기본 fallback 데이터인 `type=argus-test` 값으로 위조 송신했던 것이 원인이었습니다. 이로 인해 백엔드가 컨트롤러 진입 단계에서 500 내부 에러 검증 오류를 배출했고, 불안정한 baseline 응답을 마주한 코어 인젝션 엔진이 이를 위험 취약점이 아닌 단순 오류(기각)로 판단하여 미탐 레이어로 격리시켰던 것으로 규명되었습니다.

## ② 샘플 품질 필터 개편 및 strict 판정 규칙 이식

- **샘플 품질 정상 복원 (`sample_values.py`):** enum형 데이터 포맷 파싱 시 이름 룰셋 매퍼를 보완하여 `type` 질의 시 `REVIEW`, `status` 질의 시 `ACTIVE` 표준 원문 샘플 상수가 정밀하게 캐스팅되어 매핑되도록 복원했습니다. `openapi.py` 내의 예제 값 추출기 역시 enum 인덱스의 첫 번째 값[0] 명세를 의무 사용하도록 정돈하여 baseline 요청 시 500 에러가 터지면 즉각 다른 대체 샘플 조합 레이어로 재시도 순회하는 `stable_target_request()` 안전 장치를 구축했습니다.
- **노이즈 소멸 strict 판정 컴플라이언스 규칙 수립:** 기존의 완화된 검증 모드 적용 시 불필요한 단순 5xx 내부 서버 오류나 단순 참/거짓 분기 차이 지표가 수백 건의 의심(`SUSPECTED`) 노이즈 findings로 쏟아져 대시보드를 오염시키던 런타임 유해 패턴을 제어하고자 strict 통제 규칙을 선언했습니다.

| 탐지 기동 신호 지표 | strict 모드 내부 세부 판정 컴플라이언스 규칙                   | 최종 리포트 출력 상태             |
| ------------------- | -------------------------------------------------------------- | --------------------------------- |
| **Time-based**      | 공격 페이로드 주입에 의한 실제 `SLEEP` 시간 지연 지표 포착 시  | **`VERIFIED` (최종 확정 취약점)** |
| **Error-based**     | 응답 본문 내 명확한 DB 구조 및 SQL 구문 에러 시그니처 매칭 시  | **`VERIFIED` (최종 확정 취약점)** |
| **Boolean-only**    | 단순 참/거짓 바디 분기 차이만 발견되고 인젝션 증거가 미비할 시 | **`FALSE_POSITIVE` (결함 기각)**  |
| **Simple 5xx**      | SQL 패턴의 흔적 없이 단순 내부 서버 오류 코드만 배출 시        | **`FALSE_POSITIVE` (결함 기각)**  |

이와 같은 정밀 필터링 스펙인 `should_report_injection_finding()` 라인을 가동한 결과, 수백 건의 의심 의심 노이즈를 완벽하게 멸균 소멸시키고 실서버 상에 심어둔 진짜 코어 취약점 1건을 정확하게 포획 자산화하는 데 최종 성공했습니다.

```http
GET /api/v1/posts?page=0&size=20&status=ACTIVE&type=REVIEW
Parameter: status
Classification: CONFIRMED_INJECTION_TIME_BASED
Engine: ARGUS_DIRECT
```

# 5. 결론 및 Next Milestone: 전사 검색 엔진 모듈 통합 마감 및 동적 스크린샷 증적 자동화 기능 구현

오늘 자로 독립적인 CLI 브랜치 형태로 파편화되어 움직이던 4대 핵심 검색 엔진(1-1, 1-2, 1-4, 1-6) 및 인젝터 파이프라인의 통합 연동 릴리즈를 완전히 성공시켰습니다.

이것으로 플랫폼 핵심 검색 엔진 모듈의 1차적인 연동 트랙이 무결하게 마감된 만큼, 우리 팀의 최종 프로덕션 빌드를 위한 다음 넥스트 스텝 마일스톤은 전사 병합 안정화 및 시각적 신뢰 지표 자동화 공정으로 신속히 진입합니다.

- **Next Milestone 세부 계획:**
  1. **전사 브랜치 교차 동기화 마감:** 현재 `Staging` 브랜치에 통합 완료된 1-2, 1-4, 1-6(1차) 내역과 `main` 브랜치 상에 머지 완료된 1-1 XSS/CSRF 모듈(PR #7) 간의 양방향 동기화 및 역머지 공정을 집행하여, 전사 28개 마스터 체크리스트 항목의 완전체 단일 mainline 코드망 결합을 최종 선언할 예정입니다. 또한 `feat/input-validation-serach-engine` 브랜치에 잔재한 1-6 내장 검증 예외 제어기(`module.py`) 소스코드를 Staging 2차 PR로 최종 병합 처리하겠습니다.
  2. **Playwright/Selenium 기반 실시간 증적 스크린샷 캡처 엔진 구축:** 검색 엔진 통합이 완료된 직후, 오늘 자로 백엔드 내에 폴더 슬롯 구축을 완료한 `backend/screenshot/modules/{id}` 컴포넌트( 총 28개 섹션 번호 매핑 디렉터리 세트)를 기반으로 **실시간 화면 스크린샷 캡처 기능**을 전격 전개합니다. 아르고스 자동화 스캐너 파이프라인이 ONDE 플랫폼을 타격하여 실제 취약점을 도출해 내는 결정적 순간(XSS 스크립트 페이로드 가동으로 인해 브라우저 경고창 Alert이 팝업되는 시점, 인가 제어 우회로 인해 비정상 페이지로 Bounce 처리되는 시점 등)의 **실시간 브라우저 렌더링 화면을 포착하여 시각 증적 자료로 자동 캡처하고 S3 버킷으로 파일링하는 핵심 증적 자동화 기능**을 완비하겠습니다. 다음 스프린트에서 이어서 계속 진행합니다.
