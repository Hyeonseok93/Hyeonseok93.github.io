---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 17 — 온데 실서버 배포와 2차 멘토링용 질문 정리"
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
thumbnail: thumbnail.png
---

---

# 서론

> **"온데(onde)를 AWS에 올리고 Windows Server 연결까지 맞춘 뒤, 2차 대면 멘토링용으로 질문 세 가지를 정리했습니다. 로그인 응답에 토큰이 Body로도 나오는지, Nginx로 나뉜 경로를 어떻게 스캔할지, ZAP·Semgrep을 현업에서 얼마나 쓰는지입니다."**
>
> 실서버 배포를 마친 날이고, 멘토링 전에 물어볼 내용을 패킷·가이드라인 기준으로 적어 둔 기록입니다.

# 1. 온데 실서버 · Windows Server · 알파 피드백

16일차 수동 진단에 이어, 주말 멘토링과 이후 자동화 스캔을 위해 인프라와 타깃 쪽을 조금 더 손봤습니다.

- **Windows Server:** 아르고스 Selenium/헤드리스 캡처가 돌 수 있게 윈도우 가상 서버와 API 쪽 연결을 맞춰 두었습니다.
- **알파 피드백 반영:** 진단 범위를 넓히려고 SSRF, 파일 인클루전, 중요 파일 다운로드 같은 취약 코드를 타깃에 추가해 두었습니다.
- **OAuth·출력부 (백엔드):** 실서버 도메인에 맞춰 카카오 Redirect URI를 갱신하고, 차량 출력·OAuth 세션 검증을 정리했습니다.

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

쿠키에는 `HttpOnly` / `Secure`가 붙어 있지만, Body에 토큰 원문이 또 있으면 XSS 등으로 Body를 읽을 수 있을 때 쿠키 쪽 방어가 의미가 약해집니다. 대략 아래 항목과 겹칩니다.

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

# 5. Next Step

- 토요일 2차 대면 멘토링에서 위 질문들과 온데 배포·설계 산출물을 공유하고 피드백 받기
- 받은 답 기준으로 아르고스 ZAP 연동·스캔 범위 잡기부터 이어가기
