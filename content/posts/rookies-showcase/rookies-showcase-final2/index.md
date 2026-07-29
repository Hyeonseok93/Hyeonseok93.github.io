---
title: "[Project] SK 쉴더스 루키즈 5기 최종 프로젝트 - ARGUS"
date: 2026-07-01
tags:
  - KDT
  - "SK Rookies"
  - "SK shieldus"
  - "국비지원"
  - "루키즈 개발 5기"
  - fastapi
  - react
  - vite
  - zap
  - argus
thumbnail: thumbnail.png
---

---

# 서론

**SK쉴더스 루키즈 5기**에서 미니 프로젝트를 마친 뒤 이어진 **최종 프로젝트**입니다. 주제는 **클라우드 구축을 통한 취약점 진단 및 모의해킹**이었습니다.

최종은 **하나의 주제** 아래 두 산출물로 나뉩니다. ONDE는 진단할 **대상**, ARGUS는 그 대상을 검사하는 **플랫폼**입니다.

<table class="article-ref-table">
  <thead>
    <tr>
      <th scope="col">산출물</th>
      <th scope="col">역할</th>
      <th scope="col">글</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">ONDE</th>
      <td>바이브 코딩으로 올린 여행 플랫폼 · 진단 실증 대상</td>
      <td><a href="https://hyeonseok93.github.io/posts/rookies-showcase-final1/">ONDE 글 보기</a></td>
    </tr>
    <tr>
      <th scope="row">ARGUS</th>
      <td>웹·API 취약점 진단 플랫폼 · 증적·결과서</td>
      <td><a href="https://hyeonseok93.github.io/posts/rookies-showcase-final2/">ARGUS 글 보기</a></td>
    </tr>
  </tbody>
</table>

바이브 코딩은 서비스를 빨리 올리지만, 잘 돌아간다고 해서 취약점이 없는 것은 아닙니다. 그래서 **바이브 코딩으로 만들어진 취약점을 검증할 플랫폼**이 필요했고, ONDE 같은 대상의 URL · API · Swagger를 모아 항목별 모듈로 검사한 뒤 증적 스크린샷과 결과서 PDF까지 남기도록 만들었습니다. **ARGUS**는 그 웹·API 취약점 진단 플랫폼입니다.

React(Vite) 프론트와 FastAPI 백엔드가 나뉘어 있고, 진단에는 OWASP ZAP · Playwright · httpx를 씁니다. 배포는 Docker · Nginx · Terraform · AWS · GitHub Actions(SSM CD) 위에 올렸습니다.

📦 **GitHub:** [SK-Rookies5-FINAL_ARGUS](https://github.com/Hyeonseok93/SK-Rookies5-FINAL_ARGUS)  
🌐 **배포:** `rookies-argus.click` — 최종 제출 이후 인프라를 내려 **현재는 접속되지 않습니다**

# 1. 메인 화면

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig1.png" alt="Fig.1 ARGUS 메인 화면 — 대상 API·엔드포인트 수집과 응답 검증" loading="lazy" />
</figure>

# 2. 왜 만들었나

### 수동 진단의 한계

ONDE처럼 API·화면이 많은 서비스를 사람이 엔드포인트마다 눌러 보고, 패킷을 바꿔 가며 취약점을 찾는 데는 시간이 많이 듭니다. 항목이 늘수록 같은 검사를 반복하게 되고, 증적 캡처와 결과서 작성까지 손으로 맞추면 진단 자체가 병목이 됩니다.

### 자동으로, 많이, 빠르게

그래서 **URL · API · Swagger**로 대상을 모은 뒤, 항목별 진단 모듈이 응답 검증된 목록 위에서 검사를 돌리도록 잡았습니다. 사람이 하던 반복을 모듈 실행으로 바꿔 **수만 건 규모**까지 빠르게 돌릴 수 있게 하는 것이 ARGUS의 핵심이었습니다.

### 판정만 남기지 않기

진단 도구는 “취약하다/아니다”만 찍고 끝나면 보고·재현이 어렵습니다. 그래서 모듈 판정 뒤에 **증적 스크린샷**을 붙이고, **결과서 PDF**로 내려받을 수 있게 이어 두었습니다. ONDE를 타깃으로 수동 진단과 자동 진단을 같은 선상에서 비교할 수 있는 플랫폼을 목표로 한 이유입니다.

# 3. 서비스 흐름

ARGUS의 핵심 흐름은 대상을 등록하는 데서 끝나지 않습니다. **데이터 수집 → 응답 검증 → 진단 → 스크린샷 캡처 → 결과서 작성**으로 이어지며, 판정과 증적·결과서가 같은 파이프라인에서 만납니다.

<figure class="article-figure-center article-figure-center--full">
  <img src="./fig2.png" alt="Fig.2 ARGUS 서비스 흐름" loading="lazy" />
</figure>

### 1. 대상 API·엔드포인트를 수집한다

기준 URL과 **URL · API · Swagger** 목록으로 대상 서비스의 API·화면 경로를 한 목록으로 모읍니다. 이후 진단이 쓸 입력의 출발점입니다.

### 2. 응답으로 쓸 수 있는 대상만 남긴다

모아 둔 경로에 실제 HTTP 요청을 보내, 연결 실패·404처럼 쓸 수 없는 경로는 빼고 응답이 확인된 것만 남깁니다. 진단 모듈은 이 확정 목록을 우선해 읽습니다.

### 3. 항목별 모듈로 취약점을 진단한다

확정된 목록 위에서 항목별 진단 모듈이 검사를 돌립니다. 사람이 엔드포인트를 하나씩 누르던 반복을 모듈 실행으로 바꿔, 심각도·신뢰도에 따라 통과·주의·실패를 자동으로 매깁니다.

### 4. 증적 스크린샷을 남긴다

진단이 끝나면 Playwright로 재현에 필요한 화면을 캡처해 해당 진단 결과 아래에 저장합니다. 판정만 남기지 않고, 보고·재현에 쓸 화면 증거를 붙입니다.

### 5. 결과서 PDF를 만들고 내려받는다

진단 결과와 증적을 묶어 PDF 결과서를 만들고, 진단 화면에서 섹션별로 바로 내려받을 수 있게 연동합니다. 수집부터 결과서까지가 같은 플랫폼 안에서 이어집니다.

이 과정에서 React 화면은 FastAPI를 호출하고, 입력·검증·진단·증적·결과서는 **MariaDB 같은 RDB가 아니라** 백엔드 옆 `data/` 폴더의 JSON · YAML · PNG · PDF로 쌓입니다. 운영에서는 EC2 EBS(`/opt/argus/data`)가 컨테이너 `/app/data`로 붙습니다.

# 4. 데이터 · 저장 구조

핵심은 **수집한 대상을 검증한 뒤, 항목별 진단 결과·증적·결과서를 같은 `data/` 아래에서 이어 두는** 구조입니다. ARGUS에는 테이블 ERD의 실체가 없어서, 파일 역할을 논리 엔티티처럼 정리한 그림입니다.

<figure class="article-figure-center article-figure-center--full">
  <img src="./fig3.png" alt="Fig.3 ARGUS 데이터 · 저장 구조" loading="lazy" />
</figure>

### 핵심 저장 단위

| 논리 단위 | 실제 저장 | 역할 |
|-----------|-----------|------|
| **base_urls** | `data/*.json` 등 | 진단할 서비스의 기준 URL |
| **test_accounts** | 계정 JSON | 로그인·권한 검증에 쓸 테스트 계정 |
| **login / upload / download_endpoints** | 엔드포인트 JSON | 로그인·업로드·다운로드처럼 진단에 필요한 특수 경로 |
| **api_endpoints** | `api-tree*.json` | 수집된 API·경로 목록(인벤토리) |
| **verify_results** | `verify-report.json` | 응답 검증 결과. 쓸 수 있는 엔드포인트만 남김 |
| **diagnosis_sections** | 모듈·설정 | 항목별 진단 모듈(`section_id`, 모듈 경로) |
| **findings** | `data/report/{항목}/latest.yaml` | 진단 판정·상세. 섹션마다 YAML |
| **evidence_shots** | `.../evidence/` | Playwright 등 증적 스크린샷 |
| **report_documents** | 같은 `report/{항목}/` 아래 PDF·HTML | 결과서 파일 |

진행률 UI만 백엔드 프로세스 RAM에 잠깐 두고, Redis나 별도 DB에는 쌓지 않습니다. 재시작하면 진행률은 날아가도, `data/`에 쓴 파일은 남습니다.

### 관계와 흐름

1. 대시보드에서 기준 URL · 계정 · 로그인/전송 경로를 등록하면 JSON으로 저장됩니다.
2. 수집된 경로는 `api_endpoints` 인벤토리가 되고, 응답 검증이 `verify_results`를 남깁니다. 진단 모듈은 검증된 목록을 우선해 읽습니다.
3. 항목별 모듈이 돌면 `diagnosis_sections` 기준으로 `findings`가 `latest.yaml`에 쌓입니다.
4. 판정 뒤에 `evidence_shots`가 해당 섹션·finding에 붙고, `report_documents`로 PDF·HTML 결과서가 이어집니다.
5. 다운로드 API는 같은 `data/report/...` 파일을 읽어 사용자 PC로 보냅니다.

인벤토리(`api_endpoints`)와 검증(`verify_results`), 진단 결과(`findings`)를 **일부러 나눈** 이유입니다. 수집 목록과 “응답이 확인된 목록”, “취약점으로 판정된 결과”를 한 파일에 섞으면, 재진단·증적·결과서 범위를 나누기 어렵습니다. **수집 = 후보**, **검증 = 입력**, **finding = 판정**으로 역할을 갈랐습니다.

# 5. 주요 API

프론트가 쓰는 REST는 `/api` 아래에 모았습니다. 아래는 **실제 라우터 매핑** 기준 요약입니다. 플랫폼 API 자체에는 JWT·API Key 인증을 두지 않았고, 대상 서비스 로그인·계정은 `test-accounts` · `login-endpoints` 등으로 진단 입력에 씁니다.

### Dashboard · Inventory

| Method | Endpoint | 설명 |
|--------|----------|------|
| PUT | `/api/base-urls` | 대상 base URL 저장 |
| GET | `/api/base-urls` | 대상 base URL 조회 |
| PUT | `/api/test-accounts` | 테스트 계정 저장 |
| PUT | `/api/login-endpoints` | 로그인 API 저장 |
| PUT | `/api/upload-endpoints` | 업로드 API 저장 |
| PUT | `/api/download-endpoints` | 다운로드 API 저장 |
| POST | `/api/inventory/build` | 대상 등록·API 수집 |
| GET | `/api/inventory/tree` | API 트리 조회 |
| GET | `/api/inventory/endpoints` | 엔드포인트 목록 |
| GET | `/api/inventory/stats` | 인벤토리 통계 (`ready` / `verified`) |

### Verify · Diagnosis

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/inventory/verify` | 응답 검증 (쓸 수 있는 경로만 남김) |
| GET | `/api/inventory/verify-report` | 검증 리포트 조회 |
| GET | `/api/inventory/discover/progress` | 검증·디스커버 진행률 |
| GET | `/api/diagnosis/catalog` | 진단 모듈 카탈로그 |
| POST | `/api/diagnosis/modules/{section_id}/run` | 섹션 진단 실행 |
| POST | `/api/diagnosis/run-all` | 전체 섹션 진단 |
| GET | `/api/diagnosis/progress` | 진단 진행률 |
| POST | `/api/diagnosis/cancel` | 진행 중 진단 취소 |
| GET | `/api/diagnosis/modules/{section_id}/report` | 섹션 진단 결과 (JSON) |
| POST | `/api/diagnosis/modules/{section_id}/replay` | finding 리플레이 |

### Evidence · Report

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/diagnosis/modules/{section_id}/evidence` | 증적 스크린샷 등 조회 |
| GET | `/api/diagnosis/modules/{section_id}/report/pdf` | 섹션 결과서 PDF |
| GET | `/api/diagnosis/modules/{section_id}/report/document` | 증적 포함 문서 PDF |
| GET | `/api/diagnosis/modules/{section_id}/final-report.pdf` | 최종 결과서 PDF |
| GET | `/api/diagnosis/modules/{section_id}/final-report/manifest` | 최종 결과서 매니페스트 |
| GET | `/api/health` | 헬스체크 |

수집 → 검증 → 진단 → 증적·결과서가 같은 `/api` 아래에서 이어지도록 잡았습니다. 오픈 리다이렉트 프로브용 `/argus-redirect-sink/...` 만 `/api` 밖에 있습니다.
