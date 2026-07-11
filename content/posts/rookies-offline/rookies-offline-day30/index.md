---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 30 — 아르고스(Argus) 진단 모듈 6개 개발"
date: 2026-07-01
tags:
  - kdt
  - sk-rookies
  - sk-shieldus
  - rookies-5기
  - devlog
  - argus
  - security
  - diagnosis
thumbnail: thumbnail.png
---

---

# 서론

> **"수동 취약점 진단과 이행 점검을 마친 뒤, 아르고스(Argus) 자동 진단 모듈 개발에 들어갔습니다. SK쉴더스 가이드라인의 중요/일반 구분에 맞춰 일단 중요 항목부터 모듈을 만들기로 했고, 맡은 범위를 먼저 끝낸 뒤 여유가 생겨 추가로 더 진행했습니다. 이번 글에서는 그중에서 정리한 모듈 6개(2-2, 6-2, 7-1~7-4)와 httpx + ZAP 이중 엔진 백엔드 연동을 코드 기준으로 남깁니다."**
>
> 중요 항목을 우선으로 잡고, 맡은 모듈을 빠르게 마친 뒤 추가 모듈까지 이어서 진행했습니다. 그중 2-2·6-2·7-1~7-4 여섯 개와 httpx + ZAP 백엔드 구조를 정리합니다.

# 1. ARGUS 자동 진단 흐름과 공통 원칙

모듈을 붙일 때는 SK쉴더스 Web/API 취약점 진단 가이드라인의 **중요 / 일반** 표기를 보고, **일단 중요 항목부터** 만들기로 했습니다. 저는 맡은 중요 모듈을 먼저 끝냈고, 일정이 앞당겨지면서 그다음 항목들도 이어서 더 만들었습니다. 아래는 그날 기준으로 정리한 모듈 6개입니다.

## ── 이번에 정리한 진단 모듈 6개

- **2-2 (중요 정보 파일 다운로드 가능성)** · 중요: 경로 조작(Path Traversal), 은닉 파일, 무인증 다운로드 가능 여부 판정
- **6-2 (일괄적인 오류 처리 페이지 존재 여부):** 로그인 에러 분기를 통한 사용자 계정 존재 여부 열거 가능성 탐지
- **7-1 (Client Request Method):** TRACE, PUT, DELETE 등 위험하거나 불필요한 HTTP 메서드 허용 여부 판정
- **7-2 (파일 목록화 가능성):** WAS 및 웹 서버의 디렉터리 리스팅(Directory Listing) 노출 여부 점검
- **7-3 (서버 헤더정보 노출):** Server, X-Powered-By 등 소프트웨어 스택 및 버전 헤더 노출 진단
- **7-4 (취약한 보안설정):** HSTS, CSP, X-Frame-Options, 쿠키 Secure 속성 누락 여부 다각도 분석

> 가이드라인상 **중요**로 표시된 항목을 우선 큐에 두고 진행했습니다. 맡은 범위를 마친 뒤에는 같은 파이프라인에 맞춰 위 목록까지 범위를 넓혀 구현·연동했습니다.
## ── 아르고스 진단 엔진의 공통 원칙

- **두 엔진을 함께 쓰는 탐지:** 빠르게 확인하는 `httpx` 프로브를 먼저 돌리고, `OWASP ZAP`의 Active/Passive 스캐너 규칙을 함께 써서 결과를 다시 확인합니다.
- **목록 기반 자동 스캔:** 수동으로 주소를 넣지 않아도 `api-tree`와 대시보드에 등록한 Base URLs 데이터를 바탕으로 검사할 엔드포인트를 모아 스캔합니다.
- **결과 저장:** 진단이 끝나면 모듈별 결과를 `reports/latest.yaml`에 저장하고, 웹 프론트엔드의 대시보드 진단(Diagnosis) 페이지에도 표시합니다.

# 2. 공통 백엔드 아키텍처 및 실행 흐름

사용자가 웹 대시보드 UI에서 특정 모듈의 진단(Run) 버튼을 누르면 백엔드는 다음 순서로 처리합니다.

```
대시보드 화면 (DiagnosisPage)
    --> POST /api/diagnosis/modules/{section_id}/run 인입 (오버라이드 옵션 전달)
        --> diagnosis_service.run_section() 컨텍스트 초기화
            --> GxxModule.run(ctx) 모듈 동적 로드 및 실행
                --> httpx 프로브 1차 타격 및 ZAP 스캔 연동
                --> SectionReport 객체 빌드 및 결과 검출 지표 산출
                --> reports/latest.yaml 파일 저장 및 완료
```

## ── 아르고스 백엔드 핵심 파일 레이아웃

- `backend/diagnosis/base.py`: 모든 진단 모듈의 기반 규격을 정의하는 모듈 베이스
- `backend/diagnosis/registry.py`: 구현 완료된 모듈들을 중앙 제어하는 레지스트리
- `backend/app/routers/diagnosis.py`: 프론트엔드 API 인입을 처리하는 라우터
- `backend/app/services/diagnosis_service.py`: 전체 진단 파이프라인의 핵심 비즈니스 서비스
- `backend/diagnosis/result.py`: 심각도(Severity)와 증적 패킷을 정형화하는 Finding 데이터 모델

백엔드는 `importlib`로 각 모듈 디렉터리의 `scanner.py`를 실행할 때 불러옵니다. 스캔이 끝나면 요약 통계인 **stats finding**을 만들어 결과 배열 맨 앞에 넣고, 대시보드는 이를 상단 요약 바에만 보여 줍니다.

## ── `zap_util.py` 기반 워크스페이스 제어

Docker 컨테이너 안에서도 통신할 수 있도록 `host.docker.internal` 주소 변환을 지원합니다. 여러 모듈을 차례로 돌릴 때 이전 스캔의 알림이 섞이지 않게, 모듈 실행 전후에 ZAP 워크스페이스를 초기화(`newSession`)하고 남아 있는 alert를 지우는 `reset_zap_workspace`를 만들었습니다. ZAP이 실행 중이 아니거나 플러그인이 없으면 `ZapNotAvailableError`로 처리하고 `httpx` 결과만 돌려주며 stats에 오류 로그를 남깁니다.

## 2.3 타깃 수집 모드 (7-1 ~ 7-4 공통)

`targets.py` 구성 내에서 수집 범위를 설정하는 `probe_mode` 사양은 다음과 같습니다.

- `base_only`: 대시보드에 등록된 Base URLs 값에 루트 경로 및 엑스트라 경로만 조합하여 수집합니다.
- `sample`: Base URLs 설정값에 더해 `api-tree` 자산 내에서 도메인(Base)당 N개의 샘플 경로를 추출합니다.
- `full`: 인벤토리 파일인 `api-tree` 내부에 매칭된 매칭 경로 전수를 타깃으로 수집합니다.

- 정보 출처 및 Fallback 정책: Base URL 데이터는 `data/base-urls.json` 경로에서 로드하며, 인벤토리 트리는 `api-tree-verified.json` -> `api-tree-ready.json` -> `api-tree.json` 순서로 fallback 탐색을 지원합니다.

## 2.4 결과 모델링 및 상태 구조

- 데이터 모델: 탐지된 결함 정보는 `DiagnosisFinding` 객체에 severity, message, evidence(rule_id, engine, url, 패킷 비교 결과 등) 규격으로 바인딩됩니다.
- 섹션 상태: 전체 진단 진행 현황 스펙은 `SectionReport.status` 변수에 `pass` | `fail` | `error` | `skipped` 형태로 기록 처리됩니다.
- 프론트엔드 그룹핑: 대시보드 UI 화면에서는 직관적인 식별을 위해 판정 결과를 httpx 섹션, ZAP 섹션, info 섹션으로 분리 그룹화하여 출력합니다.

# 3. 자동화 진단 모듈 세부 구현

## ── [2-2] 중요 정보 파일 다운로드 가능성 모듈

- **동작 흐름:** `candidates.py` 코드가 주입된 `api-tree` 자산에서 download, export, report 등 파일 처리 유추 태그 및 경로 휴리스틱 연산 점수를 계산하여 최대 80개의 후보군 엔드포인트를 선별합니다. 이어서 파라미터 변수 패턴을 파싱하는 `design_review.py`가 구동된 후, `traversal_fuzz.py`가 사전에 정의된 `path-traversal-payloads.txt` 사전 파일을 기반으로 무인증 다운로드 대입 스캔을 수행합니다.
- **특화 판정 로직:** 단순 HTTP 상태 코드 대조를 넘어, 수신된 바디가 정상 응답 대조군(Baseline)과 물리적으로 달라지거나 PDF 다운로드 시 LFI에 의해 리눅스 시스템 계정 명세 등이 로드되었는지 확인하는 `response_analysis.compare_to_baseline` 심층 분석 규칙을 실행합니다.

## ── [6-2] 일괄적인 오류 처리 페이지 존재 여부 모듈

- **로그인 타깃 수집 엔진:** Base URLs 설정부와 분리되어 작동하며, `login_discovery_service.py` 코드가 인벤토리 내 POST 메서드 중 `/auth/login` 등 키워드 매핑 및 body 내 email/password 필드를 자동 디스커버리합니다. 탐지되지 않은 비정형 모달 로그인 주소는 `login_endpoints.json` 수동 등록 관리 패널 데이터를 결합하여 최종 싱크를 맞춥니다.
- **시나리오 3가지 자동 대조:** 탐지된 로그인 엔드포인트를 대상으로 총 3회의 상이한 인증 요청 패킷을 연속 보냅니다.
  - **시나리오 A:** 실제 존재하는 계정 주소 주입 + 일부러 틀린 패스워드 전송
  - **시나리오 B:** 아예 존재하지 않는 가짜 계정 주소 주입 + 틀린 패스워드 전송
  - **시나리오 C:** 존재하지 않는 가짜 계정 주소 주입 + 올바른 패스워드 포맷 전송
- **일괄성 판정 규칙:** `login_rules.py` 내의 `compare_login_snapshot_set()` 메서드가 A, B, C 시나리오 응답의 HTTP 상태 코드, JSON 에러 코드 및 내부 에러 메시지 텍스트를 상호 Pairwise 교차 비교 연산합니다. 단 하나라도 공백이나 포맷 분기 차이가 발견되면 사용자 계정 유추가 가능한 보안 결함(`fail`)으로 즉각 동적 판정합니다. ZAP 연동 시에는 Username Enumeration 전용 Active Scanner Rule 40023번을 바인딩하여 정확성을 검증합니다.
- **필수 구동 설정:** 본 시나리오 테스트 작동을 위해서는 `test-accounts.json` 내에 패스워드 인자가 사전에 바인딩되어 있어야 하며, `config.yaml` 명세 내에 body 매핑 키 매칭 데이터(`auth.id_field`, `auth.pw_field`)가 선언되어 있어야 정상 작동합니다.

## ── [7-1] Client Request Method 모듈

- **메서드 제어 판정 규칙:** 수집된 타깃 경로를 대상으로 변조 메서드를 전송합니다. `TRACE` 전송 시 HTTP 2xx 코드와 함께 보낸 요청 패킷 본문이 그대로 에코 반사되어 출력되면 위험 등급(`high finding`)을 발출합니다. `OPTIONS` 질의 시 응답 `Allow:` 헤더 내부 규격에 TRACE/TRACK/CONNECT 허용 문자가 인덱싱되어 나오거나 PUT/DELETE 노출 시 부적절한 설정으로 식별하며, ZAP Active scanner 90028번 규칙과 연계 실행합니다.

## ── [7-2] 파일 목록화 가능성 모듈

- **디렉터리 Fuzzing 파이프라인:** 대량의 WAS/CMS 경로가 집약된 `directory-wordlist-comprehensive.txt`와 단일 세그먼트 사전 파일을 업스트림 경로와 조합하여 trailing slash(뒤 항목 슬래시) 존재 유무별로 쌍방 덤프 요청을 발송합니다.
- **시그니처 매칭:** 수신 바디 내부에서 Apache `Index of`, nginx `autoindex`, IIS `- Directory listing`, Tomcat `<hr>` 등의 텍스트 스트링 키워드가 포착되면 즉각 목록화 취약점 결함으로 판정 처리하며, ZAP Active 스캔 0번(Directory Browsing) 규칙을 통해 하위 폴더 트리 재귀 스캔 검증을 지원합니다.

## ── [7-3] 서버 헤더정보 노출 모듈

- **헤더 종합 파싱:** 가이드라인 컴플라이언스 기준 고정 헤더 25종을 직렬화 추적하고 `X-Custom-Version`, `powered-by` 등 변형 문자열도 이름 휴리스틱 엔진으로 자동 식별해 냅니다. strict 모드가 켜지면 구체적인 버전 숫자가 빠진 단순 제품 명칭 노출조차도 예외 없이 미흡 지표(`medium`)로 가차 없이 판정 처리합니다. 결과 리포트 가독성을 위해 동일 내용의 헤더 정보 노출 건들은 1건으로 그룹화하되, 영향도가 발견된 세부 엔드포인트 URL 리스트 개수로 누적 집계하여 통계를 표출합니다.

## ── [7-4] 취약한 보안설정 모듈

- **보안 헤더 컴플라이언스 규칙:** 네트워크 스캐닝 범위가 아닌 오직 HTTP 응답 공식 메시지 상에서 식별 가능한 필수 보안 프로토콜 누락 상태를 `security_rules.py` 코드가 체크합니다. CSP 설정 부재, HSTS 설정 결여, 보안 전송 속성이 빠진 세션 쿠키 조합 상태(`Cookie Secure/HttpOnly 미비`) 검출 시 결함 처리하며 ZAP Passive 스캔 규칙군과 동기화됩니다.

# 4. 대시보드(Frontend) 연동 및 테스트 환경 검증

프론트엔드 계층인 `frontend/src/components/DiagnosisPage.tsx` 코드 영역은 백엔드 자동 진단 모듈과 자연스러운인 리액티브 연동 인터페이스 환경을 완비했습니다.

## ── 아르고스 대시보드 프론트엔드 연동 명세

- `gXXDiagnosisOptions.ts`: 각 모듈별 주입 실행할 파라미터 타입 및 fuzzing 범위 설정 파일 명세
- `GXXDiagnosisStartDialog.tsx`: 진단 컨트롤 옵션을 주입받고 스캔을 트리거하는 모달 창 컴포넌트
- `GXXDiagnosisOptionsPanel.tsx`: 퀵 스캔(Quick) 및 표준 스캔(Standard) 프리셋 구성을 동적 제어하는 옵션 패널
- `GroupedFindingsPanel.tsx`: 진단 완료 후 검출 결과를 httpx 영역, ZAP 영역, info 영역으로 파싱해 주는 결과 패널

6-2 모듈 연동의 경우, 인벤토리 검증 결과 자동 탐지된 로그인 API와 계정 매칭 결과 명세를 읽기 전용 뷰로 직관적으로 제공하는 `LoginEntriesPanel` 컴포넌트와 시나리오 C 테스트베드 구동을 위한 비밀번호 세팅 패널 구성을 완비했습니다.

## ── 자동화 진단 파이프라인 수직 검증 방법 (Powershell)

모든 백엔드 자동화 모듈 코드는 `pytest` 기반의 하이브리드 통합 테스트 스크립트 빌드를 마쳤습니다. 터미널 환경에서 아래 명령어를 기동하면, 수동 진단 시 애매하게 도출되던 결함 밸리데이션 규칙이 아르고스 코어 파이프라인 내부에서 오탐 없이 자동 판정 처리 및 차단 제어되는지 전수 예외 검증을 검증합니다.

```powershell
cd backend
python -m pytest tests/test_g22_candidates.py tests/test_g22_zap_hybrid.py -q
python -m pytest tests/test_g62_login.py tests/test_g62_zap.py -q
python -m pytest tests/test_g71_methods.py -q
python -m pytest tests/test_g72_listing.py -q
python -m pytest tests/test_g73_headers.py tests/test_g73_targets.py tests/test_g73_zap.py -q
python -m pytest tests/test_g74_security.py tests/test_g74_zap.py -q
python -m pytest tests/test_diagnosis.py -q
```

# 5. 마무리와 다음 작업: 남은 모듈과 자동화 기능 개발

이번 스프린트에서는 가이드라인 **중요** 항목을 우선으로 아르고스(Argus) 진단 모듈을 붙였고, 맡은 범위를 마친 뒤 추가로 넓혀 모듈 6개 뼈대까지 잡고 연동 테스트를 진행했습니다.

플랫폼 전체 기능이 끝난 것은 아니고, 자동 진단의 기본 구조를 만든 단계입니다. 다음에는 아직 부족하거나 더 다듬어야 하는 진단 모듈(예: 6-1 에러 페이지 정보 노출, 2-2 v2 IDOR 및 인가 매트릭스 엔진 등)의 탐지 로직을 설계하고 계속 넓혀 갈 예정입니다.

더불어 발견된 결함들의 탐지 자세한도를 높이고 오탐을 최소화할 수 있도록 백엔드 스캐너 파이프라인을 튜닝하는 한편, 수동 점검의 한계를 채우기 위한 백엔드 패치 연동 스크립트 코딩 작업을 다음 스프린트에서도 끊김 없이 이어서 진행할 예정입니다.
