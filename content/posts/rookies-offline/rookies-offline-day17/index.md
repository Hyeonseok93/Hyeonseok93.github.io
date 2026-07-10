---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 17 — Onde 클라우드 실서버 배포 완수 및 2차 대면 멘토링 연계 3대 보안 진단 RFC 수립"
date: 2026-06-12
tags:
  - kdt
  - sk-rookies
  - sk-shieldus
  - rookies-5기
  - devlog
  - onde
  - security
  - aws
  - nginx
  - argus
thumbnail: thumbnail.jpg
---

---

# 서론

> **"우리가 구축한 진단 대상 플랫폼 '온데(onde)'의 AWS 클라우드 실서버 환경 배포와 인프라 윈도우 서버(Windows Server) 연결을 성공적으로 완수했습니다. 또한, 다가오는 2차 대면 멘토링을 대비하여 알파 테스트 피드백 반영(SSRF, 파일 다운로드 취약점 등)과 함께 실제 수동 패킷 분석(Actual Traffic Dump) 결과를 바탕으로 한 시큐어 코딩 및 진단 범위 산정에 관한 3대 핵심 보안 진단 요청서(RFC)를 정교하게 수립했습니다."**
>
> onde.click 실서버 배포와 윈도우 서버 연결을 마치고, 로그인 토큰 이중 반환·Nginx 스캔 스코프·ZAP/Semgrep 가용성에 대한 3대 RFC를 수립했습니다.

# 1. 온데(Onde) 클라우드 실서버 인프라 확장 및 알파 테스트 피드백 반영

16일차에 진행된 수동 모의침투 진단 1차 스프린트에 이어, 주말 대면 멘토링 및 실전 자동화 스캔 테스트베드 가동을 위해 인프라 확장과 비즈니스 로직 보완 작업을 전격 수행했습니다.

- **윈도우 서버(Windows Server) 인프라 연결 완수:** 플랫폼 아르고스(Argus)의 주요 컴포넌트인 Selenium 크롤러 및 헤드리스 브라우저 엔진이 안정적으로 구동될 수 있도록 인프라 트랙에서 윈도우 가상 서버 환경의 네트워크 브릿지 및 API 백엔드 인터록 연결을 최종 완료했습니다.
- **알파 테스트 기반 취약점 테스트베드 확장 (장성욱 담당):** 내부 알파 테스트 과정을 거쳐 보안 진단 범위(공격 표면)를 심화하기 위한 취약점 고도화 패치를 반영했습니다.
  - 내부망 자격 증명 유출을 유도하는 **SSRF(Server-Side Request Forgery)** 및 **로컬 파일 인클루전(File Inclusion)**, 그리고 시스템 중요 설정 파일에 접근 가능한 **중요 정보 파일 다운로드 취약점** 비즈니스 코드를 타깃 서버에 추가 구현 및 격리 안착시켰습니다.
- **OAuth 소셜 로그인 및 데이터 출력부 보정 (이예린 담당):** 실서버 도메인 배포 환경에 맞춰 카카오 소셜 로그인 연동 리다이렉션 주소(`Redirect URI`) 설정을 추가 갱신하고, 차량 출력부 인터페이스와 OAuth 인증 세션 검증 로직의 무결성을 정비했습니다.

# 2. [보안 진단 RFC 01] 로그인 API 토큰 이중 반환 결함 및 가이드라인 미준수성 분석

수동 진단 과정 중 `Burp Suite` 프록시를 통해 캡처한 실제 온데(Onde) 서비스의 로그인 트래픽을 분석한 결과, 세션 관리 및 주요 정보 노출 관점에서 심각한 취약성 체인이 발견되어 멘토링 질의를 위한 검증 리포트를 도출했습니다.

## ① 패킷 분석 (Actual Traffic Dump)

### A. 로그인 요청 패킷 (HTTP Request)

```http
POST /user-api/api/v1/auth/login HTTP/2
Host: onde.click
Sec-Ch-Ua-Platform: "Windows"
Accept-Language: ko-KR,ko;q=0.9
Accept: application/json, text/plain, */*
Content-Type: application/json
Origin: [https://onde.click](https://onde.click)
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
Referer: [https://onde.click](https://onde.click) shadow/login

{
  "email": "yerin@travel.com",
  "password": "12341234a"
}
```

### B. 로그인 응답 패킷 (HTTP Response)

```http
HTTP/2 200 OK
Date: Thu, 11 Jun 2026 06:15:31 GMT
Content-Type: application/json
Server: nginx/1.31.1
Access-Control-Allow-Origin: [https://onde.click](https://onde.click)
Access-Control-Allow-Credentials: true
Set-Cookie: accessToken=eyJhbGciOiJIUzUxMiJ9...; Path=/; Max-Age=1800; Secure; HttpOnly; SameSite=None
Set-Cookie: refreshToken=eyJhbGciOiJIUzUxMiJ9...; Path=/; Max-Age=1209600; Secure; HttpOnly; SameSite=None
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
X-Frame-Options: DENY

{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ5ZXJpbkB0cmF2ZWwuY29tIiwicm9sZSI6IlJPTEVfVVNFUiIsImlhdCI6MTc4MTE1ODUzMSwiZXhwIjoxNzgxMTYwMzMxfQ.vjmHEu8Idi_dnX046aZotP2VdzaPYKR8eIJm2wr55dQclakQjg5KFqxZVEsG8Z3XajbDj9WYuv0QIignqiLQ_g",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ5ZXJpbkB0cmF2ZWwuY29tIiwiaWF0IjoxNzgxMTU4NTMxLCJleHAiOjE3ODIzNjgxMzF9.MwgaUCQeip5ZPqf0IWnVV5Vc45bVFH3eEKxfrzDo4--LMZwqVLT6qHXNLaQTAs8ynHLN3kfEUwbtC4LLLFhXrQ",
    "tokenType": "Bearer",
    "expiresIn": 1800,
    "memberId": 1,
    "role": "USER"
  },
  "message": "로그인에 성공하였습니다.",
  "timestamp": "2026-06-11T06:15:31.445938671Z"
}
```

## ② 개발보안 가이드라인(v3.0.0) 기준 미준수성 분석

응답 분석 결과, 서버 측은 보안 HTTP 헤더(`Set-Cookie`)에 `HttpOnly`, `Secure` 지시자를 정밀하게 할당하여 토큰을 안전하게 전송하는 듯 보이지만, 동일한 토큰 데이터(`accessToken`, `refreshToken`)를 **응답 본문(JSON Body)의 data 객체에 평문으로 중복 반환**하고 있어 다음 세 가지 가이드라인 진단 기준을 미준수(취약)하고 있습니다.

1. **5-2. 요청 및 응답 값 내 주요정보 포함여부 확인 (105페이지):** 서버가 클라이언트에 송신하는 응답 본문 내부에 민감 정보(주요 토큰 식별값)를 노출해서는 안 되며 암호화 처리하거나 격리해야 하나, 인증 토큰 핵심 데이터가 응답 JSON에 직접 평문 기재되어 전송되므로 정면 위배됩니다.
2. **4-1. 쿠키 및 웹 스토리지 조작 가능성 (81페이지) + 1-1. XSS/CSRF 공격 가능성 (12페이지):** 해커가 XSS 취약점을 이용해 브라우저 자바스크립트 영역(`document.cookie`)으로 세션 정보를 탈취하지 못하도록 `HttpOnly` 속성을 강제하는 것이 대원칙입니다. 그러나 서버 단에서 헤더에 속성을 붙이더라도 토큰 원본이 응답 바디로 배출되므로, 프론트엔드 일반 스크립트 메모리나 응답 리스너에 접근 가능한 XSS 공격 구문 주입(V-19) 발생 시 `HttpOnly` 방어벽이 완전히 무력화되는 치명적인 우회 결함이 발생합니다.
3. **4-2. 인증(세션 및 토큰) 값 안전성 설정 여부 (88페이지):** 14일이라는 장기간 만료 주기를 갖는 `Refresh Token`과 실요청 인가 수단인 `Access Token`이 안전하지 못한 평문 구조로 대외 노출되고 있어, 토큰 노출 강도 제어 부실로 취약 판정됩니다.

## ③ 리팩토링 및 개선 코드 구조 (`AuthService.java`)

```java
// AS-IS: 응답 DTO에 토큰을 포함하여 리턴 (XSS 취약점 노출 상태)
return LoginResponse.builder()
        .accessToken(accessToken) //  제거 대상 (Body 노출 차단)
        .refreshToken(refreshTokenString) //  제거 대상 (Body 노출 차단)
        .tokenType("Bearer")
        .expiresIn(1800L)
        .memberId(member.getId())
        .role(member.getRole().name())
        .build();

// TO-BE: 토큰 정보는 오직 HTTP Response Header(Set-Cookie)로만 발행하고 DTO 내역에서는 완벽 제외
return LoginResponse.builder()
        .tokenType("Bearer")
        .expiresIn(1800L)
        .memberId(member.getId())
        .role(member.getRole().name())
        .build();
```

- **멘토링 질의 사항:** 프론트엔드 아키텍처 상 전역 상태 관리(Zustand 등)의 편리성을 위해 Body와 Header 양측으로 토큰을 이중 반환하는 레거시 패턴이 실무에서 자주 발견되는데, 진단원 관점에서 이를 단호하게 취약 판단을 내리고 위 TO-BE 코드처럼 헤더 단일 전송 체계로 강제 구조 변경을 권고하는 것이 모범 답안인지 현업의 인가 통제 표준 거버넌스가 궁금합니다.

# 3. [보안 진단 RFC 02] Nginx 라우팅 리버스 프록시 환경에서의 진단 스코프 설계 질의

실서버 배포 환경의 프록시 및 Nginx 쉘 구조 상 라우팅 경로가 아래와 같이 3가지 도메인 영역으로 엄격하게 분리 선언되어 작동하고 있습니다.

- `/`  일반 정적 HTML 파일 및 클라이언트 리소스 프론트엔드 주소
- `/user-api/`  일반 사용자용 백엔드 비즈니스 로직 API 서비스 엔드포인트
- `/admin-api/`  본사 관리자 백오피스 통제용 API 서비스 엔드포인트

##  탐색 크롤러 오동작 결함 및 바운스 현상 발견

- 자동화 진단 스캐너 및 정보 수집 봇 프로그램의 인입 상태를 테스트하기 위해 표준 크롤링 가이드 파일인 **`/robots.txt`** 경로로 진단 요청을 송신했습니다.
- 그러나 프론트엔드 단의 SPA(Single Page Application) 라우터가 모든 예외 매핑을 가로채도록 설정되어 있어, `/robots.txt` 파일의 평문 텍스트가 아닌 루트 경로(`/`)의 기본 정적 메인 HTML 파일을 브라우저 리스너로 강제 반환하는 결함이 식별되었습니다.
- 반면, 백엔드 컨테이너 도메인 영역인 `/user-api/robots.txt`나 `/admin-api/robots.txt`로 직접 경로를 찔러 호출할 경우 200 OK가 아닌 백엔드 Spring Security 인트라 에러 메시지를 응답 분기하고 있었습니다.

- **멘토링 질의 사항:** 이처럼 하나의 통합 도메인 하에 Nginx 리버스 프록시로 라우팅 경로가 다각화되어 있고 프론트엔드가 예외 주소를 가로채는 환경인 경우, **자동화 진단(OWASP ZAP 등) 및 모의해킹 수행 시 단일 루트 주소 하나만 타깃팅하여 스캔해도 전체 레이어 진단이 커버되는 것인지, 아니면 세션 컨텍스트와 API 접두사별로 스캐너 스코프를 완전히 3개 영역으로 쪼개어 각각 개별 진단을 가동해야 하는지** 실무적인 범위 산정(Scope) 기준이 궁금합니다.

# 4. [보안 진단 RFC 03] 실무 진단 환경에서의 오픈소스 도구(ZAP · Semgrep) 가용성 질의

우리 팀이 빌드 중인 차세대 보안 자동화 플랫폼 '아르고스(Argus)'의 엔진 라인업 설계와 관련하여 실무 가이드라인 질의를 수립했습니다.

- **멘토링 질의 사항:** 현재 아르고스는 DAST 엔진으로 **OWASP ZAP**, SAST 소스코드 스캐너로 **Semgrep** 오케스트레이션 연동 파이프라인 개발을 대기하고 있습니다. 실제 SK쉴더스 현업 보안 진단팀 및 실무 모의해킹 프로젝트 수행 시에도 이러한 오픈소스 진단 도구들을 주력 스캐너로 벤치마킹하여 진단을 가동하시는지, 혹은 상용 상용 도구(Acunetix, Fortify 등)와 비교했을 때 오픈소스 툴 기반 자동화 파이프라인이 갖는 실무적 한계점과 보완 대책은 무엇인지 조언을 구하고자 합니다.

# 5. Next Step: 토요일 2차 대면 멘토링 세션 가동 및 피드백 기반 아르고스 엔진 개발

- **2차 대면 멘토링 수행:** 수립 완료된 5대 설계 산출물 및 Onde 클라우드 실서버 배포 아키텍처를 멘토님께 브리핑 및 피드백 수렴.
- **3대 핵심 RFC 대면 질의 및 솔루션 획득:** 토큰 이중 반환 시큐어 코딩 방향성, Nginx 라우팅 프록시 스캔 스코프 기준, 그리고 OWASP ZAP/Semgrep 실무 가용성에 대한 심층 문답 진행.
- **아르고스(Argus) 자동화 파이프라인 코딩 착수:** 멘토링 피드백을 즉시 반영하여 ZAP API 세션 바인딩 모듈 개발 및 AI 프롬프트 엔지니어링 JSON 스키마 매퍼 사양 구체화 빌드 개시.
