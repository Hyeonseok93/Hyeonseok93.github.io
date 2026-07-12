---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 17 — 온데 실서버 배포와 2차 멘토링용 질문 정리"
date: 2026-06-12
tags:
  - KDT
  - "SK Rookie"
  - "SK shieldus"
  - "국비지원"
  - "루키즈 개발 5기"
  - onde
  - security
  - aws
  - nginx
  - argus
thumbnail: thumbnail.png
---

---

# 서론

> **"온데(onde)를 AWS에 올리고 Windows Server 연결까지 맞춘 뒤, 마이페이지 명세서 PDF API에 LFI·SSRF 진단용 코드를 심어 두었습니다. 2차 대면 멘토링용으로는 로그인 Body 토큰 중복, Nginx 스캔 범위, ZAP·Semgrep 현업 사용 여부 질문 세 가지를 정리했습니다."**
>
> 실서버 배포 + 명세서 PDF 진단용 취약점 추가, 그리고 멘토링 전에 물어볼 내용을 적어 둔 기록입니다.

# 1. 온데 실서버 · Windows Server · 명세서 PDF 진단용 취약점 심기

16일차 수동 진단에 이어, 주말 멘토링과 이후 스캔에서 확인할 항목이 있도록 인프라를 맞추고, 마이페이지 **통합 정산서(명세서) PDF** API에 진단용 취약 코드를 추가했습니다.

- **Windows Server:** 아르고스 Selenium/헤드리스 캡처가 돌 수 있게 윈도우 가상 서버와 API 쪽 연결을 맞춰 두었습니다.
- **OAuth·출력부 (백엔드):** 실서버 도메인에 맞춰 카카오 Redirect URI를 갱신하고, 차량 출력·OAuth 세션 검증을 정리했습니다.

## 명세서 PDF에 넣어 둔 진단용 취약점

### 왜 넣었나

이제 팀에서 수동 진단·스캔 연습을 해야 하는데, 온데 일반 기능만으로는 **LFI·SSRF 같은 유형을 제대로 찔러 볼 자리가 없었습니다.**  
그래서 마이페이지 명세서(통합 정산서) PDF 발급 구간에만, **연습·진단용으로** 의도적으로 취약 코드를 추가했습니다. (서비스 전체 보안을 열어 둔 게 아니라, 이 API 한곳에 모아 둔 형태입니다.)

### 어디에 / 어떻게

대상은 `POST /api/v1/report/integrated` (`IntegratedReportController`)입니다. 마이페이지 「통합 정산서 스마트 발급」이 이 API를 호출하고, Security 설정상 **`permitAll`(비로그인 호출 가능)** 입니다. Body는 대략 `{ memberId, template, logoUrl }` 입니다.

#### 1) `template` → LFI / 경로 탐색 (서버 파일 → PDF)

정상 UI는 `verification` / `business`만 보냅니다. 그 외 값이 들어오면 `/app` 기준으로 파일을 읽어 PDF 본문에 그대로 넣습니다.

```java
// 진단용 — verification/business가 아니면 로컬 파일 로드
File file = new File("/app", req.getTemplate());
String content = Files.readAllBytes(...);
document.add(new Paragraph(content));
```

예: `{"template":"../etc/passwd"}` 처럼 넣으면 컨테이너 내부 파일을 PDF로 받아볼 수 있습니다. (중요 설정·시크릿 유출로 이어질 수 있는 부분)

#### 2) `logoUrl` → SSRF (서버가 대신 URL 요청)

정상 로고는 `https://onde.click/assets/logo.png`입니다. 다른 URL이면 서버가 `RestTemplate`으로 GET 해서 응답 앞부분을 PDF에 넣고, iText 로고 로드 경로로도 원격 fetch가 될 수 있습니다.

예: 내부망·메타데이터(`169.254.169.254`)·`localhost` 관리 포트 등을 `logoUrl`에 넣으면 서버가 대신 요청하고 결과가 PDF에 실립니다.

#### 3) 같은 API의 `memberId` IDOR

인증 없이 Body의 `memberId`만 바꿔도 타인 예약·정산 명세서를 발급받을 수 있는 구조입니다. 파일/SSRF와는 별개지만 **같은 명세서 다운로드 API**에 붙어 있습니다.

## PortOne 실결제 연동 제외

앞선 구간에서 PortOne 실결제까지 구현·검증해 두었지만, API 응답·연동 안정성 쪽에서 문제가 이어져 실서비스 경로로 쓰기 어렵다고 판단했습니다. 그래서 온데에서는 PortOne 결제용 가이드 스크립트, 타입 정의(`portone.d.ts`), 유틸(`portOne.ts`) 등을 빼고 관련 주석도 정리했습니다. 예약·결제 UX는 진단 대상으로서의 흐름을 유지하는 쪽으로 맞춥니다.



# 2. 멘토링 질문 1 — 로그인 응답 Body에 토큰이 또 나옴

Burp로 온데 로그인 트래픽을 보면, `Set-Cookie`로 토큰을 주면서 **JSON Body에도 `accessToken` / `refreshToken`을 같이** 내려줍니다. 가이드라인 기준으로 어떻게 보는지가 궁금해서 질문으로 가져가기로 했습니다.

## ① 캡처한 패킷

### 요청

```http
POST /user-api/api/v1/auth/login HTTP/2
Host: onde.click
Accept: application/json, text/plain, */*
Content-Type: application/json
Origin: https://onde.click
Referer: https://onde.click/login

{
  "email": "yerin@travel.com",
  "password": "12341234a"
}
```

### 응답

```http
HTTP/2 200 OK
Server: nginx/1.31.1
Access-Control-Allow-Origin: https://onde.click
Access-Control-Allow-Credentials: true
Set-Cookie: accessToken=eyJhbGciOiJIUzUxMiJ9...; Path=/; Max-Age=1800; Secure; HttpOnly; SameSite=None
Set-Cookie: refreshToken=eyJhbGciOiJIUzUxMiJ9...; Path=/; Max-Age=1209600; Secure; HttpOnly; SameSite=None

{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 1800,
    "memberId": 1,
    "role": "USER"
  },
  "message": "로그인에 성공하였습니다."
}
```

## ② 가이드라인과 맞춰 본 점

쿠키에는 `HttpOnly` / `Secure`가 붙어 있지만, Body에 토큰 원문이 또 있으면 XSS 등으로 Body를 읽을 수 있을 때 쿠키 쪽 방어 효과가 줄어듭니다. 대략 아래 항목과 겹칩니다.

1. **5-2** 응답에 주요정보(토큰) 평문 포함
2. **4-1 / 1-1** HttpOnly를 우회할 수 있는 Body 노출
3. **4-2** 토큰 전달 방식의 안전성

## ③ 코드로 보면 (AS-IS → TO-BE)

```java
// AS-IS: Body DTO에도 토큰 포함
return LoginResponse.builder()
        .accessToken(accessToken)
        .refreshToken(refreshTokenString)
        .tokenType("Bearer")
        .expiresIn(1800L)
        .memberId(member.getId())
        .role(member.getRole().name())
        .build();

// TO-BE: 토큰은 Set-Cookie만, DTO에서는 제외
return LoginResponse.builder()
        .tokenType("Bearer")
        .expiresIn(1800L)
        .memberId(member.getId())
        .role(member.getRole().name())
        .build();
```

- **물어볼 것:** Zustand 등 때문에 Body+Header 둘 다 주는 경우가 실무에도 많은데, 진단할 때 Body 중복을 무조건 취약으로 보고 헤더만 쓰라고 해야 하는지.

# 3. 멘토링 질문 2 — Nginx로 갈라진 경로, 스캔 범위를 어떻게 잡나

실서버는 대략 이렇게 나뉩니다.

- `/` — 프론트
- `/user-api/` — 사용자 API
- `/admin-api/` — 관리자 API

## 발견한 점

- `/robots.txt`를 치면 SPA가 가로채서 루트 HTML이 나옵니다.
- `/user-api/robots.txt`, `/admin-api/robots.txt`는 백엔드 Spring Security 쪽 응답으로 갑니다.

- **물어볼 것:** 이런 구조에서 ZAP 등으로 루트만 찍어도 되는지, 아니면 프론트·user-api·admin-api를 스코프를 나눠 각각 돌려야 하는지.

# 4. 멘토링 질문 3 — ZAP · Semgrep을 현업에서 얼마나 쓰나

아르고스는 DAST로 **OWASP ZAP**, SAST로 **Semgrep**을 붙이려는 상태입니다.

- **물어볼 것:** SK쉴더스/실무 모의해킹에서도 오픈소스 툴을 주력으로 쓰는지, 상용(Acunetix, Fortify 등) 대비 한계와 어떻게 보완하는지.

# 5. 다음 단계

오늘은 실서버 배포·진단용 취약점 심기·PortOne 제외까지 온데 쪽을 정리했고, 질문은 멘토링용으로 모아 둔 상태입니다.

- **2차 대면 멘토링:** Body 토큰 중복, Nginx 스캔 스코프, ZAP·Semgrep 실무 비중 질문을 공유하고 피드백 받기
- **스캔 범위 반영:** 답변을 기준으로 프론트 / `user-api` / `admin-api` 스코프를 나눌지 정한 뒤 아르고스 ZAP 연동부터 이어가기
- **온데 안정화:** PortOne 제거 이후 예약·결제 UX와 명세서 PDF 진단 경로가 의도대로 동작하는지 한 번 더 수동 확인
- **아르고스:** Semgrep은 MVP 보류 축으로 두고, DAST(ZAP)·증적 캡처 쪽 설계를 우선 구체화
