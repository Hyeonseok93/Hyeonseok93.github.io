---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 39 — 아르고스 PDF 결과서 생성과 다운로드"
date: 2026-07-14
tags:
  - KDT
  - "SK Rookies"
  - "SK shieldus"
  - "국비지원"
  - "루키즈 개발 5기"
  - argus
  - reportlab
  - playwright
  - security
thumbnail: thumbnail.png
---

---

# 서론

> **"오늘은 진단 결과를 화면에서만 보던 것에서 한 걸음 더 가서, 섹션별 PDF 결과서를 Diagnosis에서 받을 수 있게 맞춘 날입니다. Day 38에서 Findings·증적 UI와 아직 꺼져 있던 다운로드 버튼을 둔 뒤, 오늘은 `backend/report/` 아래에 섹션 결과서 코드를 올리고 그 버튼을 실제로 연결했습니다."**
>
> 증거 PNG와 YAML만 있으면 “화면에서 확인”까지는 됩니다. 오늘은 finding·가이드라인 문구·스크린샷을 **PDF로 묶어 내려받는** 쪽을 정리합니다.

# 1. 오늘 한 일 요약

| 영역 | 한 일 |
|------|--------|
| **폴더** | 아침 `backend/report/`, `backend/report/modules/` 뼈대 → 하루 종일 섹션 모듈이 그 아래로 모임 |
| **섹션 PDF** | 1-1 · 1-2 · 1-6 · 2-1 · 2-2 · 5-2 · 6-1 · 7-4 결과서 연결 |
| **백엔드** | diagnosis router/service, `report_generation_service`, `report/service.py` · `report/pdf.py` |
| **프론트** | `DiagnosisPage` / `api.ts`에 섹션별 다운로드 (blob 저장) |
| **Docker** | `report/` COPY·볼륨, Nanum TTF, `reportlab` |
| **2-2 문서** | SK 대응방안·필터 문자 표·finding마다 세로로 긴 페이지 |
| **테스트** | 1-2 / 7-4 final-report, report_generation_service, 2-1 report 등 |

```text
진단 실행 → 리포트 YAML/JSON · evidence PNG
  → report/modules/{section}에서 finding·가이드라인·증적으로 PDF 생성
  → /report/pdf 또는 /final-report.pdf 등으로 응답
  → Diagnosis 다운로드 버튼 → PDF 저장
```

Day 38에 넣어 둔 2-2 상세 증적, 섹션 `!` 도움말, **disabled 다운로드 자리**가 오늘은 여러 섹션에서 동작하기 시작했습니다.

# 2. 하루 흐름 (오전에 뼈대 → 오후~저녁에 섹션 PDF)

시간을 완전히 분 단위로 적을 필요는 없지만, 하루에 쌓인 순서는 대략 이렇습니다.

| 때 | 한 일 |
|------|--------|
| **오전** | `report/` · `report/modules/` 패키지 생성. 2-1 결과서 초안(`report_service`, `guideline.yaml`). 1-1 `document.py` 엔진 + diagnosis·Docker 연결, 결과서·프론트 맞춤, 1-1 임시 파일 정리, `DiagnosisPage` 다운로드 버튼 위치 정리 |
| **오후 초** | 5-2 결과서(builder·content + `report/service.py`). 2-2 PDF(ReportLab + UI 다운로드). 1-2 / 7-4 자동 PDF(`report_generation_service`, final-report, 테스트). 2-1을 `report/modules`로 옮기고 PDF 출력. Diagnosis 빌드가 깨져 import/분기 응급 수정. 2-2와 다른 섹션 다운로드 충돌 정리 후 2-2본선 합류. 1-6 PDF·다운로드 |
| **저녁** | 6-1 `renderer.py` 대량 추가·`report_summary` 보강, 예전 `report_pdf_service` 정리. 2-1 결과서(가이드라인 인용·증거 임베드·Playwright PDF) 본선. 1-5 `screenshot/modules/1-5/`(capture·engine·models·renderer·selector)이 에러페이지/증적 쪽과 함께 들어옴 |

한 줄로 보면, **아침에 “결과서는 `backend/report/`로 모은다”는 자리만 잡혀 있고, 오후엔 섹션 PDF가 동시에 붙고, 저녁엔 6-1·2-1·1-5까지 이어서** 화면 다운로드가 여러 가이드라인에서 열리기 시작한 날입니다.

# 3. 왜 PDF가 필요했나

이전에는 섹션마다 진단 YAML·증거 PNG가 `data/report/{section}/`에 쌓이고, UI에서는 finding 카드를 열어 보는 쪽이 중심이었습니다. 오늘은 아래가 들어왔습니다.

- 섹션별 PDF 생성 — `backend/report/modules/{section-id}/…`
- 백엔드 다운로드 API — 경로가 섹션마다 조금 다르지만, “결과 PDF/문서를 내려준다”는 점은 같음
- 프론트 다운로드 — `DiagnosisPage` 버튼, `api.ts` blob 저장
- Docker — 이미지에 `report/` 포함, compose volume, 한글 폰트 경로

캡처만 있고 파일로 넘길 결과서가 없던 상태를 벗어나, finding·가이드라인·스크린샷을 **한 PDF로 받는** 흐름이 생겼습니다.

# 4. `backend/report/` 아래 구조

하루가 끝날 때 대략 이렇게 모여 있었습니다.

```text
backend/report/
  __main__.py          # CLI로 PDF 재생성 (로컬에서 문구·레이아웃 확인)
  service.py / pdf.py
  modules/
    1-1/   document.py
    1-2/   builder · generate · guidelines · models · pdf_exporter · renderer · README
    1-6/   report.py
    2-1/   report.py (+ diagnosis/modules/2-1/guideline.yaml)
    2-2/   content · shots · generate · __main__
    5-2/   builder · content
    6-1/   renderer.py
    7-4/   1-2와 비슷한 풀세트
```

만드는 방식은 아직 통일되지 않았습니다.

| 방식 | 예 | 특징 |
|------|------|------|
| ReportLab로 직접 그리기 | 2-2 | finding마다 페이지 높이 재서 병합, CLI `python -m report` / 모듈 `__main__`로 재생성 |
| HTML 조립 후 Playwright `page.pdf()` | 2-1 (`report/pdf.py`) | 가이드라인 YAML 인용, 증거 JPEG·Base64 임베드 |
| generate.py + `report_generation_service` | 1-2, 7-4 | 진단·증적 준비되면 generate를 subprocess로 돌리고 `data/report/{section}/final/`에 둠. 타임아웃 약 300초 |
| builder가 큰 모듈 | 5-2 | 요청/응답 주요정보 결과를 문서 빌드 |
| renderer가 큰 모듈 | 6-1 | 보고서 렌더 (renderer 한 파일이 매우 큼). 옆에 1-5 스크린샷 모듈 |

같은 `report/modules` 아래에 섹션별로 한꺼번에 올라와서, 다운로드 API와 Diagnosis 버튼도 하루 동안 여러 번 겹쳤다가 다시 맞췄습니다.

# 5. 섹션별로 한 일

## ① 1-1 — XSS / CSRF 결과서

오전 중 `document.py`로 검출 결과·재현 맥락을 문서로 만들고, diagnosis router/service·Docker 경로와 붙였습니다. 이어 결과서·`DiagnosisReportPanel`을 맞추고, 모듈 안 임시 파일을 정리했습니다. 다운로드 버튼은 `DiagnosisPage` / 패널에서 위치를 단순화해, **오후부터 다른 섹션이 같은 자리**를 쓰게 했습니다.

## ② 1-2 / 7-4 — final-report

두 섹션 모두 builder · guidelines · models · renderer · pdf_exporter · generate와 README가 들어가고, `report_generation_service`가 “해당 섹션에 generate.py가 있으면 돌린다”는 공통 진입점이 됐습니다. 입력은 섹션 리포트 경로 + evidence 디렉터리이고, 결과는 `data/report/{section}/final/` 쪽입니다. 프론트는 `final-report.pdf`로 받고, `test_g12_final_report` / `test_g74_final_report` / `test_report_generation_service`가 같이 올라갔습니다. config yaml에도 report 관련 설정이 맞춰졌습니다.

## ③ 1-6 — PDF 다운로드

`modules/1-6/report.py`와 diagnosis router, `api.ts` · `DiagnosisPage` 다운로드가 붙었습니다. 앞에서 열린 다운로드 UI 자리에 1-6도 끼워 넣은 형태입니다.

## ④ 2-1 — 악성 업로드 결과서 (HTML → PDF)

오전 초안은 `report_service` + `diagnosis/modules/2-1/guideline.yaml` + 테스트로 시작했고, 오후에는 `report/modules/2-1/report.py`로 옮겨 다른 섹션과 폴더를 맞췄습니다. 저녁에 본선으로 들어온 내용은 대략 다음과 같습니다.

- 문서 흐름: 탐지 기법 → 결과(URL) → 대응방안(가이드라인 인용)
- `guideline.yaml`로 reason → 근거/대응 연결
- finding별 스크린샷, 증거 PNG를 JPEG로 줄여 Base64로 넣음 (용량)
- capture-summary로 “미선정 / 캡처 실패 / 미실행” 표시
- HTML 조립 후 Playwright `page.pdf()`로 PDF 바이트 생성
- Diagnosis에 결과서 버튼, `test_g21_report_service` 등 테스트

## ⑤ 2-2 — 파일 다운로드 결과서 (ReportLab)

한 번에 들어간 축이 큽니다. `content.py` · `shots.py` · `generate.py`(ReportLab, 꽤 긴 빌더) · diagnosis `supports_pdf` / `build_section_pdf` · `/report/pdf` · `api.ts` blob · Docker `reportlab`·폰트·볼륨입니다. `/report/pdf`는 **받을 때 생성**합니다.

`content.py`에는 rule_id별 문구가 들어 있습니다. 예:

| rule_id | 유형 라벨 (요지) |
|---------|------------------|
| `2-2-path-traversal` | 경로 조작 · 파일 유출 |
| `2-2-unauth-download` | 비로그인 다운로드 |
| `2-2-forced-browse` | 강제 파일 탐색 |
| `2-2-input-validation` | 입력값 검증 미흡 |

공통 대응방안에는 DocBase 밖·타 드라이브 격리, 경로 변수 대신 **키 값**, IT보안 경유 필터, path traversal 문자 거부, 권한·세션 검증, 파일 정보 최소화가 들어가고, 필터 문자는 `../` `./` `..\` `.\` `%` `;` 를 **표**로 그려야 해서 문구를 표 앞·뒤로 나눠 둔 상태입니다.

문서 형식은 피드백 받아 이렇게 맞췄습니다.

1. **대응방안** — 위 SK 가이드 내용 고정  
2. **필터 문자** — 줄글로 나열하지 않고 표 (`[표] 12` 같은 잡문구 제거)  
3. **제목** — **1. 탐지 기법 / 2. 취약점 확인 결과 / 3. 대응방안**  
4. **결과** — 영문 판정·Payload·Trigger·Classification 빼고 **URL(+파라미터)** 표  
5. **finding 헤더** — severity·rule_id·finding_id 빼고 유형 라벨 위주  
6. **레이아웃** — finding마다 세로로 긴 페이지 1장, 증거는 캡션·테두리, 높이에 맞춰 `pagesize` 잡은 뒤 병합  

로컬에서는 CLI로 PDF를 여러 번 다시 만들며 문구·표를 확인했습니다. Docker에서는 Nanum CJK TTC가 ReportLab에서 안 먹혀 Nanum TTF로 바꿨습니다.

여러 섹션이 다운로드 버튼을 동시에 고치다 Diagnosis에서 충돌이 났습니다. 기존 1-1/1-2/7-4/5-2 분기는 두고, PDF를 여는 섹션 목록에 **2-2만 추가**하는 쪽으로 맞췄습니다. `/report/pdf` 라우트도 겹치지 않게 정리했습니다. 화면 버튼은 비슷해 보여도, 백엔드 URL은 아직 섹션마다 다릅니다.

## ⑥ 5-2 — 요청/응답 주요정보 결과서

`builder.py`(큰 빌더) · `content.py`, `report/service.py`, diagnosis router/service, `DiagnosisPage` / `api.ts`, Docker `report/` 경로가 붙었습니다. 요청·응답에 주요정보가 있는지를 결과로 받아 PDF로 내립니다. Day 38에 맞춰 둔 5-2 도움말·문구와도 이어집니다.

## ⑦ 6-1 / 1-5 — 보고서 + 스크린샷

6-1은 `renderer.py`를 크게 올리고 `report_summary`를 보강했으며, 예전에 두껍게 있던 공용 `report_pdf_service` 쪽은 정리·재배치됐습니다. evidence capture·6-1 screenshot runner도 같이 손봤습니다.

같은 흐름에서 **1-5** `screenshot/modules/1-5/`(capture · engine · models · renderer · selector)이 들어와, 리플렉티드 XSS류 증적을 캡처·패널·리포트 쪽으로 이을 수 있게 됐습니다. (모듈 폴더는 Day 38 이전에 자리만 있던 상태에서도 오늘 본격 파일이 채워진 쪽입니다.)

# 6. 다운로드 경로가 아직 나뉜 이유

지금은 대략 이렇게 받습니다.

| 구분 | 받기 |
|------|------|
| **1-1** | document / download 계열 |
| **1-2, 7-4** | `final-report.pdf` (final 산출물) |
| **2-2, 5-2 등** | `/report/pdf` (요청 시 생성인 경우 포함) |
| **2-1** | 결과서 전용 경로 |

먼저 버튼이 동작하게 하는 쪽을 우선했고, 경로를 하나로 합치지는 않았습니다. 오후에는 그 때문에 Diagnosis import/분기가 깨져 **빌드 오류 수정**도 있었습니다.

# 7. Docker에서 한글 PDF

컨테이너에서 만들면 한글이 깨지거나, ReportLab이 CFF/TTC 글꼴을 못 써서 실패하는 경우가 있었습니다. `fonts-nanum`을 넣고 **Nanum TTF**를 쓰도록 바꿨고, compose에 `./backend/report:/app/report` 볼륨을 맞춰 두었습니다. Dockerfile에 `report/` COPY도 섹션 모듈이 늘 때마다 같이 맞춰졌습니다. 로컬뿐 아니라 **컨테이너에서도 PDF가 나오게** 맞춘 작업입니다.

# 8. 다음에 할 일

결과서·다운로드는 오늘 붙은 상태고, 앞으로는 **인프라 정리와 함께 최종 발표 준비·최종 산출물**을 마감하는 쪽으로 갑니다. 데모·발표 자료, 제출용 결과물, 배포·환경 쪽을 맞춰 루키즈 최종을 마무리할 차례입니다.

# 9. 마무리

오늘은 증적을 화면에만 보여 주던 것에서 더 나가, 섹션별 **PDF 결과서 다운로드**를 붙이기 시작한 날입니다. 아침 `report/` 폴더만 있던 상태에서, 오후~저녁에 1-1·1-2·1-6·2-1·2-2·5-2·6-1·7-4와 1-5 캡처까지 이어졌습니다. Diagnosis에서 결과서 버튼이 켜지기 시작했고, 다음은 인프라와 최종 발표·산출물 마감입니다.
