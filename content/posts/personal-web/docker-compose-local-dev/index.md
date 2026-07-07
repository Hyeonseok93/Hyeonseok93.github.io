---
title: Docker Compose로 로컬 개발 환경 구성하기
date: 2026-06-20
tags:
  - Docker
  - DevOps
excerpt: docker-compose.yml로 DB·백엔드·프론트를 한 번에 띄우는 로컬 개발 환경 구성법을 정리했습니다.
---

로컬에서 서비스를 개발할 때 DB, API, 프론트를 각각 띄우는 과정이 번거로울 수 있습니다. **Docker Compose**를 쓰면 하나의 명령으로 전체 스택을 올릴 수 있습니다.

## 왜 Compose를 쓰는가

- 환경 차이를 줄일 수 있습니다.
- 신규 팀원 온보딩이 빨라집니다.
- CI와 비슷한 구조를 로컬에서 재현하기 쉽습니다.

## 기본 예시

```yaml
services:
  db:
    image: postgres:16
    ports:
      - "5432:5432"
  api:
    build: ./api
    depends_on:
      - db
```

## 실전 팁

볼륨 마운트로 소스 변경을 즉시 반영하고, `.env`로 비밀값을 분리해 두면 운영에 가까운 로컬 환경을 유지하기 좋습니다.
