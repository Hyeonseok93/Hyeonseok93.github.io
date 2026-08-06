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

공개 취약점 피드는 **NVD(CVE)** 와 **OSV**처럼 출처·스키마·갱신 주기가 서로 다릅니다. JSON을 받아 두기만 해서는 Explorer에서 바로 검색·집계하기 어렵고, 전체 카탈로그를 다시 받는 파이프라인은 수십 분 이상 걸리기도 합니다.

**Code Canary**는 그 피드를 **수집 → 적재 → 정제(bronze → silver → gold)** 로 올린 뒤, 공개 Explorer와 운영자용 Roost 콘솔에서 탐색·파이프라인 실행까지 한 제품으로 묶은 **취약점 인텔리전스 웹**입니다.

React(Vite) 프론트와 Spring Boot API, Python Worker가 나뉘어 있고, PostgreSQL · Redis · Docker Compose(로컬) · Terraform · AWS ECS(배포)를 중심으로 대시보드 · 탐색 · 인증 · 잡 큐를 다룹니다.

📦 **GitHub:** [WEB_Code-Canary](https://github.com/Hyeonseok93/WEB_Code-Canary)

# 1. 메인 화면

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig1.png" alt="Fig.1 Code Canary 대시보드 — NVD/OSV 동기화 · 메트릭 · 소스 프로필 · KEV" loading="lazy" />
</figure>

대시보드 첫 화면은 NVD·OSV 동기화 시각, 카탈로그 규모·심각도·KEV 같은 요약 카드, 소스별 비중·성장 차트, Known Exploited 목록을 한곳에 둡니다. 상단 검색은 Explorer로 이어지고, 운영자 콘솔(Roost)은 별도 경로로 분리되어 있습니다.

# 2. 왜 만들었나

### 피드와 포맷이 갈라져 있다

NVD API와 OSV zip은 **응답 형태·식별자·메트릭 키**가 다릅니다. 같은 “취약점”이라도 CVE·GHSA·패키지 영향 범위가 한 테이블에 바로 들어오지 않고, CVSS 옆에 SSVC 같은 **새 블록**이 붙기도 합니다. 출처마다 스크립트를 따로 두면 탐색 UI와 집계가 금방 어긋납니다.

### “받아 두기”와 “찾아 쓰기”를 한 제품으로

원본 JSON을 디스크에만 쌓아 두면 사람이 찾기 어렵고, 정규화만 한 표만 남기면 원본 추적이 끊깁니다. 그래서 **bronze(원본) → silver(정규화) → gold(스냅샷·Explorer MV)** 로 층을 나누고, 공개 화면은 gold를 보게 했습니다. 수집·적재·정제는 Worker가 맡고, API는 인증·analytics·잡 오케스트레이션에 집중합니다.

### 긴 파이프라인을 콘솔에서 돌리기

전체 NVD collect나 OSV load·silver는 **SSH로 한 번 돌리고 끝내기 어렵습니다.** Roost에서 단계(collect / load / silver / gold)를 큐에 넣고, Job Monitor로 진행·성공·실패를 보게 한 이유가 여기에 있습니다. 로컬 Compose와 운영 ECS가 같은 잡 모델·데이터 루트를 공유하도록 맞춰 두었습니다.

---

다음 글에서는 서비스 흐름(수집 → Explorer / Roost)과 도메인·인프라를 이어서 정리할 예정입니다.
