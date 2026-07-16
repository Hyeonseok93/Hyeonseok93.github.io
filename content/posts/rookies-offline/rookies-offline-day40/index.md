---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 40 — 아르고스 AWS 프라이빗 서브넷 배포 아키텍처와 코드 설정"
date: 2026-07-15
tags:
  - KDT
  - "SK Rookies"
  - "SK shieldus"
  - "국비지원"
  - "루키즈 개발 5기"
  - argus
  - aws
  - docker
  - security
thumbnail: thumbnail.png
---

---

# 서론

> **"Day 39에서 섹션별 PDF 결과서·다운로드를 붙인 뒤, 오늘은 실서버 가동을 앞두고 아르고스(Argus)를 AWS 프라이빗 서브넷에 두는 배포 구조를 정리했습니다. 로컬 `docker-compose`와 `config.docker.yaml`에 남아 있던 localhost·사설 IP·`host.docker.internal` 값을 AWS VPC 기준으로 어떻게 바꿔야 하는지, EC2·ALB·보안 그룹은 어떻게 잡을지 코드와 함께 적어 둡니다."**
>
> 기능 통합은 거의 끝났고, 다음 주부터는 이 설계대로 EC2에 올리는 쪽으로 갑니다.

# 1. 오늘 한 일 요약

| 영역 | 한 일 |
|------|--------|
| **배포 토폴로지** | Argus EC2를 Private Subnet에 두고, ALB(퍼블릭) + NAT Gateway(아웃바운드)로 트래픽 분리 |
| **컨테이너 구조** | `argus-frontend` / `argus-backend` / `argus-zap` 3개 서비스 역할·포트 정리 |
| **코드 설정** | `config.docker.yaml`의 타깃 IP, `redirect_sink_base`, `ui_target`, `llm_interpret_enabled` 등 AWS용 치환 항목 목록화 |
| **CORS** | `main.py` `allow_origins`에 실제 ALB 도메인 추가 필요 |
| **인프라 스펙** | EC2 `t3.xlarge`·EBS 50GB, SG 최소 권한, SSM 접속(SSH 22 미개방) |
| **EKS 비교** | ZAP·공유 볼륨·순차 진단 특성상 단일 EC2 + Compose가 더 맞다고 정리 |
| **다음 주** | ECR·IAM·Secrets Manager·ALB Target Group·ACM까지 10단계 Runbook 초안 |

# 2. 컨테이너 구조와 왜 Private Subnet인가

아르고스는 하나의 `docker-compose.yml` 아래 3개 컨테이너가 같이 돕니다.

| 컨테이너 | 이미지 | 포트 (내부 → 호스트) | 역할 |
|----------|--------|----------------------|------|
| **argus-frontend** | `nginx:alpine` | `80` → `5174` | React/Vite 대시보드 UI |
| **argus-backend** | `python:3.12-slim` (커스텀) | `8000` → `8001` | FastAPI 진단 오케스트레이터, PDF 빌더 |
| **argus-zap** | `zaproxy/zap-stable` | `8090` → `8090` | OWASP ZAP 프록시·능동 스캔 |

로컬에서는 편의를 위해 포트를 호스트에 노출해 두었지만, 실서버에서는 **진단 도구와 관제 화면을 인터넷에 직접 열지 않는 편이 낫습니다.** 악성 업로드·인젝션 페이로드를 실제로 쏘는 도구이기도 해서, Argus EC2 전체를 **Private Subnet**에 두고 ALB만 퍼블릭으로 받는 구조로 잡았습니다.

```text
[사용자] → Route53 → ALB (Public Subnet, HTTPS :443)
                          │
         ┌────────────────┴────────────────┐
         │ VPC Private Subnet              │
         │ EC2 (퍼블릭 IP 없음)             │
         │   ├── argus-frontend (:80)      │
         │   ├── argus-backend  (:8000)    │
         │   └── argus-zap      (:8090)    │
         └────────────────┬────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │ 같은 VPC 내부                   │
         │ ONDE API·검증 대상 EC2           │
         └────────────────┬────────────────┘
                          │ 아웃바운드 (패키지·GitHub API 등)
                    NAT Gateway → 인터넷
```

**통신 원칙은 간단합니다.**

- **인바운드(사용자 → Argus):** EC2에 퍼블릭 IP를 주지 않고, Public Subnet의 ALB가 443에서 HTTPS를 끊은 뒤 프론트(80)·백엔드(8000)로 전달
- **진단 트래픽:** 같은 VPC 안 ONDE 서버 프라이빗 IP(8080, 8081 등)로 직접
- **아웃바운드:** ZAP 이미지 pull, GitHub Advisory API 등은 NAT Gateway 경유

# 3. AWS 배포 시 꼭 바꿔야 하는 코드·설정

로컬 기준으로 박혀 있는 값을 그대로 두면, 스캔·콜백·브라우저 API 호출이 한꺼번에 깨집니다. `config.docker.yaml`과 `main.py`에서 손볼 항목을 정리했습니다.

## ① `redirect_sink_base` (1-5 오픈 리다이렉트 콜백)

| | 값 |
|---|-----|
| **현재 (Docker 로컬)** | `http://host.docker.internal:8001/argus-redirect-sink` |
| **AWS 배포 시** | `http://<ALB 내부 도메인>/argus-redirect-sink` 또는 `http://<EC2 프라이빗 IP>:8001/argus-redirect-sink` |

가이드라인 1-5 진단에서, 취약한 대상 서버가 리다이렉트를 따라 **Argus 백엔드로 콜백**을 보내는 주소입니다. `host.docker.internal`은 Docker Desktop 전용이라 EC2에서는 라우팅되지 않습니다. ALB 뒤에 둘지, 백엔드 포트를 직접 쓸지는 Target Group 구성에 맞춰 정하면 됩니다.

## ② `targets` · `inventory` 스캔 타깃

| | 값 |
|---|-----|
| **현재** | `http://192.168.0.61`, `:8080`, `:8081` 등 사설 대역 |
| **AWS 배포 시** | `http://<ONDE EC2 프라이빗 IP>` (포트·경로는 그대로) |

동일 VPC Private Subnet에 있는 ONDE 실서버 주소로 바꿔야 ZAP·httpx 프록시 스캔이 타깃까지 도달합니다. Route53 Private Hosted Zone을 쓰면 IP 대신 내부 DNS 이름으로 적어도 됩니다.

## ③ `main.py` CORS `allow_origins`

현재는 `localhost:5173/5174`, `127.0.0.1`만 허용되어 있습니다.

```python
allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    ...
]
```

브라우저에서 ALB 도메인(예: `https://argus.example.com`)으로 대시보드를 열면, API 요청 origin이 달라져 **CORS에 막힙니다.** 실제 서비스 URL을 `allow_origins`에 추가해야 합니다.

## ④ `diagnosis_1_3` · `diagnosis_1_6`

| 설정 | 로컬 | AWS |
|------|------|-----|
| **`llm_interpret_enabled`** | `true` | **`false`** — LLM 해석·설명은 ONDE 쪽에서 처리. Argus에서 켜 두면 불필요한 연산·Secrets(OpenAI/Anthropic) 등록만 늘어남 |
| **`ui_target` (1-6)** | `http://host.docker.internal:5174` | 프론트가 실제로 서빙되는 **ALB HTTPS URL** |

1-6은 Playwright로 UI를 두드리는 진단이라, `ui_target`이 실제 접속 가능한 주소와 같아야 합니다.

## ⑤ `docker-compose` 볼륨 (로컬 → EC2)

로컬 compose에는 개발 편의용 마운트가 많습니다.

- `..:/workspace:ro` — 상위 디렉터리 전체 read-only (1-1 라우트 탐색 fallback용)
- `./backend/app`, `diagnosis`, `screenshot`, `report` 등 소스 동기화

EC2 배포본에서는 **소스 live mount를 빼고**, 이미지에 코드를 bake하거나 `/home/ec2-user/argus`처럼 필요한 경로만 최소로 두는 쪽이 안전합니다. `backend/data`는 진단 산출물·PDF·업로드 Swagger가 쌓이므로 EBS 볼륨과 함께 유지합니다.

# 4. EC2·보안 그룹 설계

## EC2 스펙

| 항목 | 권장 | 이유 |
|------|------|------|
| **인스턴스** | `t3.xlarge` 이상 (4 vCPU, 16GB RAM) | ZAP(JVM) + FastAPI + 1-6 Playwright Chromium 다중 프로세스. 16GB 미만이면 스캔 중 OOM으로 컨테이너가 죽을 수 있음 |
| **EBS** | gp3 **50GB+** | `backend/data/`에 증적 PNG, PDF, Swagger 업로드가 계속 쌓임 |
| **퍼블릭 IP** | **없음** | ALB·NAT만 퍼블릭 |
| **접속** | **SSM Session Manager** | SSH 22 미개방 |

## Security Group (요지)

| 방향 | 프로토콜·포트 | 소스 / 목적지 | 목적 |
|------|---------------|---------------|------|
| Inbound | TCP 80 | ALB SG | 프론트 Nginx |
| Inbound | TCP 8000 | ALB SG | FastAPI |
| Inbound | TCP 22 | — | **열지 않음** (SSM 사용) |
| Outbound | TCP 80, 443 | `0.0.0.0/0` (NAT) | 이미지 pull, GitHub API |
| Outbound | TCP 8080, 8081 | ONDE VPC CIDR | 진단 트래픽 |
| Internal | TCP 8090 | `127.0.0.1` / compose 내부 | 백엔드 ↔ ZAP (대외 미노출) |

ZAP 포트 8090은 compose 네트워크 안에서 `ZAP_PROXY=http://zap:8090`으로만 쓰고, SG로 ALB에서 열 필요는 없습니다.

# 5. EKS 대신 EC2 + Docker Compose를 쓰는 이유

Kubernetes(EKS)도 검토했지만, 아르고스 특성상 **단일 EC2**가 비용·운영 모두 단순합니다.

1. **ZAP과 호스트 네트워크** — compose에서 `host.docker.internal:host-gateway`를 씁니다. EKS Pod에서는 `hostNetwork: true` 등 추가 설정이 필요하고, 격리 이점이 줄어듭니다.
2. **로컬 파일 공유** — 백엔드와 ZAP이 `./backend/data`를 같이 씁니다. EKS로 가면 EFS 등 공유 스토리지로 바꿔야 하고, I/O 지연·비용이 늘어납니다.
3. **수평 확장 필요 없음** — 한 번에 한 타깃을 순차 진단하는 내부 보안 도구입니다. Pod를 늘려도 ZAP 세션·프록시 쪽에서 병목이 생기고, EKS 고정 비용(컨트롤 플레인·노드)만 추가됩니다.

내부 진단 장비 한 대를 올리는 수준이면 Compose on EC2가 맞다고 정리했습니다.

# 6. 다음 주 AWS 배포 Runbook (10단계)

월요일부터 아래 순서로 진행할 예정입니다.

1. **ECR** — `argus/backend`, `argus/frontend` 리포지토리 생성 (ZAP은 Docker Hub 공식 이미지)
2. **IAM Role** — EC2에 SSM, ECR pull, Secrets Manager `argus/github-token` 읽기
3. **Secrets Manager** — 7-4 CVE 진단용 `GITHUB_TOKEN` 등록
4. **Security Group** — SSH 차단, ALB SG → 80·8000만 허용
5. **Private EC2** — `t3.xlarge`, gp3 50GB, 퍼블릭 IP 없이 기동
6. **SSM 접속** — Docker·Docker Compose 설치
7. **`config.docker.yaml`** — ONDE 프라이빗 IP, `redirect_sink_base`, `ui_target`, `llm_interpret_enabled: false` 반영
8. **`docker compose up -d`** — 3 컨테이너 기동·헬스체크
9. **ALB Target Group** — EC2 프라이빗 IP:80(프론트), :8000(백엔드) 등록
10. **ACM + Route53** — HTTPS 인증서 연결, 대시보드 접속·API CORS 최종 확인

실제 배포·HTTPS 검증까지는 다음 글에서 이어갑니다.

# 7. 마무리

오늘은 PDF·다운로드 기능을 넘어, **Argus를 AWS Private Subnet에 올리기 위한 설계**를 코드 설정과 함께 문서로 남긴 날입니다. localhost·사설 IP·Docker Desktop 전용 호스트명을 AWS 주소체계로 바꾸는 것, ALB/NAT/SG로 트래픽을 나누는 것, EKS보다 EC2 Compose가 낫다는 판단까지 정리해 두었습니다. 다음 주 Runbook대로 EC2에 올리면서 설정값을 실제로 맞춰 갈 예정입니다.
