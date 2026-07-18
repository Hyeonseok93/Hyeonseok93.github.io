---
title: "[Project] SK 쉴더스 루키즈 5기 미니 프로젝트 2차 - MATE"
date: 2026-04-09
tags:
  - KDT
  - "SK Rookies"
  - "SK shieldus"
  - "국비지원"
  - "루키즈 개발 5기"
  - react
  - vite
  - spring-boot
  - jpa
  - jwt
thumbnail: thumbnail.png
---

---

# 서론

**SK쉴더스 루키즈 5기**에서 스프링부트 교육을 마친 뒤 이어진 **두 번째 미니 프로젝트**입니다.

사이드 프로젝트·스터디 팀원을 찾으려면 여러 커뮤니티에 모집글을 올리고, 지원자 정보와 합류 현황을 따로 관리해야 합니다. **MATE**는 개발자·디자이너·기획자가 **모집 → 지원 → 수락/거절 → 팀 확정 → 팀 전용 게시판**까지 한곳에서 이어 갈 수 있도록 만든 매칭 플랫폼입니다.

React(MUI) 프론트와 Spring Boot REST API가 나뉘어 있고, JWT 인증·JPA 도메인·MariaDB를 중심으로 회원·모집글·지원서·멤버·게시판을 다룹니다.

📦 **GitHub:** [SK-Rookies5-MINI2_MATE](https://github.com/Hyeonseok93/SK-Rookies5-MINI2_MATE)

# 1. 메인 화면

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig1.png" alt="Fig.1 MATE 메인 화면" loading="lazy" />
</figure>

# 2. 왜 만들었나

### 흩어진 모집 채널

프로젝트·스터디 팀원은 주로 **오픈 카카오톡 채팅방·에브리타임** 같은 커뮤니티 게시판에서 모집됩니다. 이런 방식은 지원자가 채팅·댓글에 흩어져 **지원자를 관리하기 어렵고**, 각 지원자의 **기술 스택이나 포지션을 한눈에 파악하기 힘듭니다**. 수락/거절도 방장이 메모로 관리하고, 합류한 뒤에는 또 다른 방으로 옮기게 됩니다.

### 포지션과 이력 관리

기존 팀 빌딩 방식은 **포지션 관리에 한계**가 있습니다. MATE는 이를 극복하기 위해 **프로젝트별로 독립적인 역할(포지션) 수행**과 **지원·매칭 이력 관리**를 한 서비스로 묶는 데서 출발했습니다. 모집글 · 지원서 · 멤버 · 팀 공간이 끊기지 않게 이어지도록 하는 것이 목표였습니다.

### 백엔드 중심 미니의 목표

1차(CVS)가 데이터 수집·대시보드였다면, 2차는 **REST API · JPA 관계 · JWT 인증 · 권한**을 한 제품 흐름으로 묶는 쪽이었습니다. 화면만 늘리는 것보다 **User–Project–Application–ProjectMember** 관계와 Soft Delete·토큰 갱신 같은 운영 규칙을 코드로 고정하는 데 집중했습니다.

# 3. 전체 아키텍처

흐름은 짧게 **React SPA → Spring Boot REST → MariaDB**이고, 프로필 이미지는 **Cloudinary**, 관리자 화면은 **Thymeleaf**로 서버 렌더링합니다.

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig2.png" alt="Fig.2 MATE 시스템 아키텍처" loading="lazy" />
</figure>

| 구분 | 기술 | 역할 |
|------|------|------|
| Frontend | React 19, Vite, MUI, Zustand, Axios | SPA · 라우팅 · 전역 상태 · JWT 인터셉터 |
| Backend | Java 17, Spring Boot 3.5, Spring Security | REST API · 서비스 · 예외 · 권한 |
| Persistence | Spring Data JPA, Hibernate, MariaDB | 엔티티 · Soft Delete · 도메인 관계 |
| Auth | JWT (Access/Refresh), BCrypt | 로그인 세션 · 토큰 재발급 |
| Media | Cloudinary | 프로필 이미지 CDN |
| Admin | Thymeleaf + Form Login | 회원·프로젝트 대시보드 · 복구 |

프론트는 초기에 **MSW**로 API를 모킹해 백엔드와 병렬로 화면을 붙였고, 연결 후에는 Axios Interceptor가 `401` 시 Refresh로 Access를 갱신한 뒤 원 요청을 재시도합니다.

# 4. 도메인 · ERD

핵심은 **모집글에 지원하고, 수락된 사람만 팀 멤버가 되는** 흐름입니다. README에는 요약만 두고, 관계·상태·설계 이유는 아래에 정리합니다.

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig3.png" alt="Fig.3 MATE ERD" loading="lazy" />
</figure>

### 핵심 엔티티

| 엔티티 | 테이블 | 역할 |
|--------|--------|------|
| **User** | `users` | 회원. 이메일·닉네임·전화번호 unique, 포지션·기술스택·역할(`ROLE_USER`) |
| **Project** | `projects` | 모집글. `owner` → User, 카테고리·모집인원·온/오프라인·상태·마감일 |
| **Application** | `applications` | 지원서. Project + applicant(User), 동기·포지션·상태(`PENDING/ACCEPTED/REJECTED`) |
| **ProjectMember** | `project_members` | 확정 멤버. Project–User N:M 해소, `project_id+user_id` 유니크, `OWNER/MEMBER` |
| **BoardPost** | `board_posts` | 팀 전용 게시글. Project + author |
| **Comment** | `comments` | 게시글 댓글. BoardPost + author |
| **RefreshToken** | `refresh_tokens` | 유저당 1토큰(`user_id` unique) |
| **AdminLog** | `admin_logs` | 관리자 삭제·복구 등 감사 로그 |

기술 스택은 User·Project 모두 `@ElementCollection`으로 `user_tech_stacks` / `project_tech_stacks`에 문자열 집합으로 둡니다. Soft Delete가 필요한 도메인은 `BaseEntity`의 `deleted_at` + `@Where(clause = "deleted_at IS NULL")`를 공통 적용합니다.

### 관계와 상태 전이

```text
User 1 ──owns──▶ N Project
User 1 ──applies──▶ N Application ──▶ 1 Project
Application ACCEPTED ──creates──▶ ProjectMember
Project 1 ──has──▶ N ProjectMember ──▶ 1 User
Project 1 ──has──▶ N BoardPost ──has──▶ N Comment
```

1. 회원이 모집글(`Project`)을 올리면 `owner`가 되고, 생성 시점에 방장용 `ProjectMember(OWNER)`가 붙는 흐름입니다.
2. 다른 회원은 `Application`을 남깁니다. 초기 상태는 **`PENDING`**.
3. 방장이 `accept`하면 `ACCEPTED` + **`ProjectMember(MEMBER)`** 생성 + `Project.currentCount++`. 정원에 도달하면 상태를 **`CLOSED`**로 자동 마감합니다. `reject`면 `REJECTED`만 기록합니다.
4. **팀 게시판·댓글**은 멤버만 접근합니다. 지원만 하고 수락되지 않은 유저는 BoardPost API에서 걸러집니다.

Application과 ProjectMember를 **일부러 나눈** 이유입니다. 지원 이력(동기·거절)과 확정 멤버십(권한·게시판 접근)을 같은 테이블에 섞으면, 거절된 지원을 “멤버가 아니었다”와 “지원한 적도 없다”로 구분하기 어렵습니다. **지원서 = 이력**, **멤버 = 권한**으로 역할을 갈랐습니다.

### Soft Delete · 관리자 복구

일반 삭제 API는 `deleted_at`만 채웁니다. `@Where` 때문에 일반 조회에서는 빠지고, 관리자 Thymeleaf 화면은 `findAllIncludingDeleted`로 Soft Delete 행까지 본 뒤 **복구(`deleted_at = null`)** 할 수 있습니다. 회원 삭제 시 소유 프로젝트도 함께 Soft Delete하고, 동작은 `AdminLog`에 남깁니다.

# 5. 주요 API

프론트가 쓰는 REST는 `/api` 아래에 모으고, 관리자는 `/admin` Thymeleaf로 분리했습니다. 아래는 **실제 컨트롤러 매핑** 기준 요약입니다.

### Auth · User

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/signup` | 회원가입 |
| GET | `/api/auth/check-email` | 이메일 중복 확인 |
| GET | `/api/auth/check-nickname` | 닉네임 중복 확인 |
| GET | `/api/auth/check-phone` | 전화번호 중복 확인 |
| POST | `/api/auth/find-email` | 전화번호로 이메일 찾기 |
| POST | `/api/auth/reset-password` | 임시 비밀번호 발급 |
| POST | `/api/auth/login` | 로그인 · Access/Refresh 발급 |
| POST | `/api/auth/logout` | 로그아웃 · Refresh 제거 |
| POST | `/api/auth/refresh` | Access 재발급 |
| GET | `/api/users/me` | 내 프로필 |
| PATCH | `/api/users/me` | 프로필 부분 수정 |
| PATCH | `/api/users/profile-image` | 프로필 이미지 업로드(Cloudinary) |
| DELETE | `/api/users/profile-image` | 기본 이미지로 복구 |
| GET | `/api/users/me/posts/owned` | 내가 만든 모집글 |
| GET | `/api/users/me/posts/joined` | 참여 중 프로젝트 |
| GET | `/api/users/me/applications` | 내 신청 현황(대기·거절) |
| DELETE | `/api/users/me` | 회원 탈퇴(Soft Delete) |

### Project · Application · Member

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/projects` | 모집글 생성 |
| GET | `/api/projects` | 목록(카테고리·키워드·페이징) |
| GET | `/api/projects/{id}` | 상세 |
| PATCH | `/api/projects/{id}` | 부분 수정(OWNER) |
| DELETE | `/api/projects/{id}` | Soft Delete(OWNER) |
| PATCH | `/api/projects/{id}/close` | 수동 마감 |
| PATCH | `/api/projects/{id}/reopen` | 재모집(인원·마감일 검증) |
| POST | `/api/applications/{projectId}` | 지원하기 |
| GET | `/api/applications/projects/{projectId}` | 지원자 목록(방장) |
| PATCH | `/api/applications/{id}/status` | `accept` / `reject` |
| DELETE | `/api/applications/{id}` | 지원 취소(PENDING) |
| GET | `/api/posts/{projectId}/members` | 멤버 목록 |
| DELETE | `/api/posts/members/{memberId}` | 멤버 강제 퇴출(OWNER) |

### Board · Comment · Admin

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/posts/{projectId}/board` | 팀 게시글 작성 |
| GET | `/api/posts/{projectId}/board` | 게시글 목록(페이징·멤버만) |
| GET | `/api/posts/{projectId}/board/{postId}` | 상세(+조회수) |
| PATCH | `/api/posts/{projectId}/board/{postId}` | 수정 |
| DELETE | `/api/posts/{projectId}/board/{postId}` | 삭제 |
| POST | `/api/posts/{projectId}/board/{postId}/comments` | 댓글 작성 |
| GET | `/api/posts/{projectId}/board/{postId}/comments` | 댓글 목록 |
| PUT | `/api/posts/comments/{commentId}` | 댓글 수정 |
| DELETE | `/api/posts/comments/{commentId}` | 댓글 삭제 |
| GET | `/admin/dashboard` | 관리자 대시보드(Thymeleaf) |
| POST | `/admin/users/restore/{id}` | 삭제 회원 복구 |
| POST | `/admin/projects/restore/{id}` | 삭제 프로젝트 복구 |

응답은 공통 `SuccessResponse`로 감싸고, 목록은 프론트 `postStore`가 기대하는 `PageResponseDto`(`data.page`) 형태로 맞췄습니다. 인증이 필요한 API는 `@AuthenticationPrincipal CustomUserDetails`로 유저 ID를 받아 서비스에 넘깁니다.

# 6. 핵심 구현

README Key Implementation과 같은 축을, 블로그에서는 **왜 그렇게 했는지**까지 붙입니다.

### MSW로 프론트·백엔드 병렬 개발

API 연동 전에 화면이 멈추지 않도록, 기획 명세 기준으로 **MSW** 핸들러를 먼저 붙였습니다. 로그인·CRUD 플로우를 백엔드 완성 전에 검증할 수 있었고, 실제 API 연결 시 UI 흐름을 크게 바꾸지 않도록 응답 형태를 미리 맞춰 두었습니다. 현재 런타임에서는 모킹을 끄고 실서버를 봅니다.

### Axios Interceptor · Silent JWT 갱신

Access가 만료될 때마다 강제 로그아웃하지 않도록, 응답 Interceptor가 `401`을 가로챕니다. Refresh Token으로 Access를 갱신한 뒤 **실패했던 원 요청을 자동 재시도**합니다. 백엔드 `RefreshToken`은 `user_id` unique라 **1인 1토큰**을 가정하고, 로그아웃·재발급 시 토큰 값을 교체합니다.

### Mapper로 Entity ↔ DTO 분리

서비스에 변환 코드가 섞이지 않도록 Mapper 클래스로 모았습니다. Lombok `@Builder`로 명시적 변환을 유지해, Entity 필드 변경과 API 응답 스펙 변경 지점을 갈랐습니다.

### Zustand 정규화 브릿지

백엔드 필드명·페이징 포맷이 엔드포인트마다 달랐던 구간을 `authStore` / `postStore`에서 한 번 맞춥니다. `id`↔`userId`, `profileImg`↔`profileImageUrl` 등을 **프론트 내부 표준**으로 정규화해, 화면 컴포넌트는 스토어만 보게 했습니다.

### Cloudinary 프로필 이미지

서버 로컬 디스크에 이미지를 쌓지 않고 Cloudinary로 업로드·CDN URL만 저장합니다. 삭제 시에는 기본 이미지 URL로 되돌립니다.

# 7. 화면으로 보는 기능

모집 → 지원 → 매칭 → 팀 게시판이 화면으로 이어집니다.

### 홈 · 모집글 탐색

카테고리(프로젝트/스터디)·기술 스택·키워드로 모집글을 필터하고 카드 목록으로 탐색합니다.

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig4.png" alt="Fig.4 홈 · 모집글 목록" loading="lazy" />
</figure>

### 모집글 상세 · 지원

진행 기간·온/오프라인·모집 인원·스택·본문을 확인하고, 지원 동기·포지션·연락처/포트폴리오를 제출합니다.

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig5.png" alt="Fig.5 모집글 상세 · 지원" loading="lazy" />
</figure>

### 마이페이지 · 모집 관리

내가 올린 모집글의 지원자 목록을 보고 **수락/거절**합니다. 수락 시 ProjectMember가 생기고 정원이 차면 모집이 자동 마감됩니다.

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig6.png" alt="Fig.6 내 모집글 · 지원자 관리" loading="lazy" />
</figure>

### 내 신청 현황

내가 지원한 글의 `PENDING` / `ACCEPTED` / `REJECTED` 상태를 확인합니다.

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig7.png" alt="Fig.7 내 신청 현황" loading="lazy" />
</figure>

### 팀 전용 게시판

매칭된 멤버만 접근하는 협업 게시글·댓글입니다. 외부 유저의 목록·상세 조회를 막아 팀 공지·링크 공유용 공간으로 씁니다.

<figure class="article-figure-center article-figure-center--wide">
  <img src="./fig8.png" alt="Fig.8 팀 전용 게시판" loading="lazy" />
</figure>

# 8. 마무리 소감

2차 미니는 **화면보다 도메인**이 먼저였습니다. 지원서와 멤버를 나누고, Soft Delete와 관리자 복구를 붙이고, JWT 갱신으로 세션을 끊기지 않게 만드는 과정이 1차의 “모아 보여 주기”와는 다른 종류의 설계 연습이었습니다.

프론트는 MSW로 먼저 흐름을 고정하고, 백엔드는 Entity·상태 전이·권한을 코드로 고정했습니다. README에는 요약과 이 글로의 링크만 남겨 두었습니다.

함께 백엔드·프론트를 맞춰 준 팀원들 덕분에 모집에서 팀 게시판까지 한 줄로 이을 수 있었습니다.
