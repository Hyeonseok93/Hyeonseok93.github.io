---
title: "[Project] Code Canary — 취약점 인텔리전스 · 파이프라인 콘솔"
date: 2026-08-06
tags:
  - code-canary
  - react
  - vite
  - spring-boot
  - python
  - postgresql
  - nvd
  - osv
  - aws
thumbnail: thumbnail.png
---

---

# 서론

**NVD**에서 정식으로 부여하는 CVE와, **오픈소스 생태계에서 부여하는 OSV**(GHSA 등)를 **한곳에서 보고, 서로 비교하고, 전체 흐름으로 분석**해 보고 싶어서 시작한 프로젝트입니다. 출처마다 사이트를 오가며 목록만 훑는 방식으로는 같은 취약점이 어떻게 이어지는지, 카탈로그 전체에서 무엇이 늘고 있는지가 잘 보이지 않았습니다.

그래서 **수집 → 정제 → 분석·시각화**까지 한 번에 이어지게 만들었습니다. **Code Canary**는 NVD·OSV 피드를 Medallion(**bronze → silver → gold**)으로 올린 뒤, 공개 Explorer와 운영자용 Roost 콘솔에서 탐색·집계·파이프라인 실행까지 묶은 **취약점 인텔리전스 웹**입니다.

React(Vite) 프론트와 Spring Boot API, Python Worker가 나뉘어 있고, PostgreSQL · Redis · Docker Compose(로컬) · Terraform · AWS ECS(배포)를 중심으로 대시보드 · 탐색 · 인증 · 잡 큐를 다룹니다.

📦 **GitHub:** [WEB_Code-Canary](https://github.com/Hyeonseok93/WEB_Code-Canary)

# 1. 메인 화면

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig1.png" alt="Fig.1 Code Canary 대시보드 — NVD/OSV 동기화 · 메트릭 · 소스 프로필 · KEV" loading="lazy" />
</figure>

대시보드 첫 화면은 NVD·OSV 동기화 시각, 카탈로그 규모·심각도·KEV 같은 요약 카드, 소스별 비중·성장 차트, Known Exploited 목록을 한곳에 둡니다. 상단 검색은 Explorer로 이어지고, 운영자 콘솔(Roost)은 별도 경로로 분리되어 있습니다.

# 2. 왜 만들었나

### 한곳에서 보고 비교하고 싶었다

NVD의 CVE와 OSV의 권고는 **서로 다른 ID·표현**으로 쌓입니다. 한쪽만 보면 “공식 CVE”와 “패키지 쪽 인텔”이 어떻게 맞물리는지 놓치기 쉽습니다. 같은 화면에서 소스를 넘나들며 검색하고, 연관 ID를 따라가며 **비교**할 수 있으면 좋겠다고 생각했습니다.

### 전체 그림을 보고 싶었다

개별 CVE 몇 건이 아니라, 카탈로그 **규모·심각도·소스 비중·성장·KEV**처럼 전체 분석이 보이길 바랐습니다. “모아 둔 목록”이 아니라 **한눈에 흐름을 읽는** 쪽이 목표에 가깝습니다.

### 받아서 끝내지 않고, 보여 주기까지

비교·분석이 되려면 피드를 받기만 해서는 부족합니다. **수집 → 정제 → 집계·화면**까지 한 제품 안에서 이어져야, 위에서 말한 “한곳”과 “전체 그림”이 실제로 성립합니다. 그 구현(층 나누기, 운영 콘솔 등)은 핵심 기능으로 따로 다루는 편이 맞습니다.

---

다음 글에서는 **핵심 기능**부터 정리할 예정입니다. Medallion(**bronze → silver → gold**), NVD·OSV를 묶는 Explorer, 장시간 파이프라인을 돌리는 **Roost** 콘솔이 여기에 해당합니다.
