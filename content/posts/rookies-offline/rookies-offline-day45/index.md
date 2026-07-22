---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 45 — ARGUS CI/CD 자동화 완성과 실배포·스모크 통과"
date: 2026-07-22
tags:
  - KDT
  - "SK Rookies"
  - "SK shieldus"
  - "국비지원"
  - "루키즈 개발 5기"
  - argus
  - terraform
  - aws
  - cicd
  - github-actions
thumbnail: thumbnail.png
---

---

# 서론

> **"Day 44에서 Storage·Backend·CI 뼈대까지 붙이고 '남은 건 CD & 배포 테스트뿐'이라고 닫았던 구멍을, 오늘은 CD 수신기·SSM 실배포·HTTPS 스모크뿐 아니라 Merge `dev` push → ECR 빌드 → GitHub App → Infra `repository_dispatch` → 자동 배포까지 한 줄로 이었습니다. `workflow_dispatch` 수동 배포와 `repository_dispatch` 자동 배포가 모두 success로 끝났고, `rookies-argus.click` 스모크도 통과했습니다."**
>
> 인프라 3일차처럼 보이지만, 실제로는 **수동 배포 DoD**와 **CI→CD 자동 파이프라인**을 같은 날 닫은 날입니다. Infra main만 보면 앱 커밋이 없어 파이프라인이 비어 있다고 오해하기 쉽지만, Merge는 `dev`에서 CI가 돌고 Org GitHub App이 Infra CD를 호출합니다.

# 1. 오늘 작업의 방향

오늘의 중심은 Day 44가 남긴 **CD & 배포 테스트**를 코드·권한·시크릿·실운영까지 닫는 것이었습니다.

- [ARGUS_Infra](https://github.com/UR-ARGUS/ARGUS_Infra)에 Deploy 워크플로를 올려 SSM으로 FE/BE를 배포하고 HTTPS 스모크로 검증했습니다.
- OIDC Role에 CD용 Describe 권한을 보강하고 **terraform apply**까지 반영했습니다.
- 1차 `scripts/cd/` 모듈을 팀에 익숙한 **Onde식 YAML 인라인**으로 리팩터하고, `repository_dispatch` 수신 규약을 넣었습니다.
- 배포 식별자를 Variables에서 **Secrets**로 옮겼습니다.
- **수동** `workflow_dispatch`로 실배포·스모크를 통과시켰습니다.
- [ARGUS_Merge](https://github.com/UR-ARGUS/ARGUS_Merge) `dev`의 FE/BE Build & Push CI와 Org GitHub App **`argus-merge-cd-dispatch`** 로 Infra CD를 **자동 호출**하는 연결을 검증했습니다.
- 당일 Actions에서 `repository_dispatch` 기반 FE/BE 배포가 반복적으로 **success**로 끝났습니다.

Day 43 Networking/Frontend → Day 44 Backend/Storage/Plan·ECR 위에, 오늘은 **배포 버튼 + 자동 배포 신호 + 실제 통과 증거**를 올렸습니다.

# 2. Day 43–44와의 이음

파트 기준으로 보면 Networking과 Frontend는 Day 43, Backend·Storage·Secrets·ECR·Terraform Plan은 Day 44에서 닫혔고, 오늘이 마지막 칸인 CD입니다. Backend EC2는 오늘 CD가 SSM으로 컨테이너를 올리고, OIDC·Secrets는 apply와 실값 등록으로 운영에 붙었습니다. Merge `dev`의 빌드·푸시도 CD와 같은 이미지 규칙을 쓰도록 이어졌습니다.

Day 44 초안에 있던 CloudWatch Alarm / Synthetics Canary는 **쓰지 않기로** 했습니다. 검증 Definition of Done은 실제 사용자 경로인 HTTPS 스모크(`/`, `/api/health`)로 고정했습니다. Onde와 같은 계정·리전에서 패턴을 맞추는 쪽이 온보딩·운영 비용이 낮다는 판단이었습니다.

요청이 서비스에 닿는 최종 흐름은 이제 이렇게 닫힙니다.

1. 사용자 → `https://rookies-argus.click` → Route53 → ALB(HTTPS)
2. `/` → Frontend TG → Public FE EC2, `/api/*` → Backend TG → Private BE EC2
3. Merge `dev`에 FE/BE 경로 push → CI가 ECR push → GitHub App이 Infra에 dispatch → SSM이 docker pull/run → smoke

# 3. CD 1차 — Infra에 배포 수신기 올리기 (PR #9)

처음에는 Infra만으로도 배포를 돌릴 수 있게, `workflow_dispatch` 수동 배포와 `scripts/cd/` 헬퍼를 올렸습니다.

`deploy.yml` 1차는 Secret/설정값 검증 → OIDC로 `AWS_GITHUB_ACTIONS_ROLE_ARN` assume → Backend 배포 → Frontend 배포 → `SERVICE_URL` HTTPS smoke → (선택) ZAP 헬스 순이었습니다. 이미지 이름은 `${ECR_REGISTRY}/argus-${ENVIRONMENT}-frontend|backend:${IMAGE_TAG}` 규칙을 따릅니다.

스크립트 레이어는 이후 리팩터로 지우지만, 1차 DoD의 본체였습니다. `ssm-run.sh`가 SendCommand 후 Success까지 폴링하고, SSM Online·ALB TG healthy 대기가 붙었습니다. Backend는 `inject-secrets.sh` 후 compose로 zap+backend를 올리고, Frontend는 `:80` 컨테이너를 재기동합니다. smoke는 `/`와 `/api/health`를 재시도하고, ZAP API 헬스는 옵션이었습니다. worker/selenium은 Merge prod compose가 정리되기 전까지 템플릿에서 뺐습니다.

Backend 쪽은 `/opt/argus/.env`, `CONFIG_PATH=/app/config.docker.yaml`, `ZAP_PROXY=http://zap:8090`, 데이터 볼륨 `/opt/argus/data`를 쓰도록 맞췄습니다. Day 44 user_data가 심어 둔 `/opt/argus/scripts/inject-secrets.sh`를 CD가 그대로 호출하는 구조입니다.

OIDC 쪽에서는 CD가 인스턴스·TG 상태를 볼 수 있게 `DescribeInstanceInformation`, `DescribeInstances`, `DescribeTargetHealth`, `DescribeTargetGroups`를 보강했습니다. 주석도 CloudWatch 검증에서 **HTTP/ALB 헬스 검증**으로 바꿨고, **terraform apply로 Role에 실제 반영**한 뒤에야 Actions가 새 권한으로 돌았습니다. README에는 Synthetics 미사용과 Secret 세팅·apply 소유권을 명시했습니다.

# 4. Onde 스타일 리팩터 — YAML 인라인 + dispatch 수신 (PR #10)

1차 스크립트 모듈화는 기술적으로 깔끔했지만, 팀이 이미 읽는 언어는 Onde_Infra의 **배포 명령을 워크플로 YAML 안에 직접 쓰는 패턴**이었습니다. 그래서 `scripts/cd/`를 걷어내고 `.github/workflows/deploy.yml` 하나로 모았습니다. 표시명은 `Application Deployment`입니다.

트리거는 두 갈래입니다. `workflow_dispatch`는 수동으로 `image_tag`와 target(all/frontend/backend)을 넣고, `repository_dispatch`는 앱 CI가 `deploy-frontend` / `deploy-backend` / `deploy-all`과 `client_payload.image_tag`로 Infra를 부릅니다. `resolve` job이 이벤트 종류에 따라 FE/BE/smoke 플래그를 계산해, 수동과 자동이 **같은 배포 job**을 타게 했습니다.

최종 job 흐름은 이렇습니다. `resolve` 다음에 Frontend는 SSM으로 ECR login → pull → 기존 `argus-frontend` 제거 → `docker run -p 80:80`입니다. Backend는 `inject-secrets.sh` → ECR login → network `argus` → ZAP daemon(`8090`) → backend(`8001:8000`, env-file, `ZAP_PROXY`, data 마운트)입니다. 마지막 `smoke`는 `rookies-argus.click` 기준으로 `/`(200·301·302)와 `/api/health`(200)를 최대 30회·10초 간격으로 재시도합니다.

YAML 안 shell escape가 길어지는 트레이드오프는 있지만, Actions 화면만 보면 배포가 어떻게 도는지 한눈에 들어옵니다.

# 5. Secrets 이전 — 배포 식별자 경계 정리

배포에 쓰는 값을 Variables가 아니라 Secrets로 읽도록 통일했습니다. Role ARN, FE/BE instance ID, ECR registry, `SERVICE_URL`은 Secret으로 모았고, `ENVIRONMENT`만 Variable(기본 `dev`)로 남겼습니다. 인스턴스 ID·레지스트리·서비스 URL도 운영 식별자라 Role과 같은 축에 두는 편이 설정 화면이 덜 헷갈립니다. README도 그에 맞게 고쳤습니다.

# 6. Merge 쪽 CI — `dev`에서 빌드·푸시가 도는 축

Infra main만 보면 앱 CI가 안 보이지만, **ARGUS_Merge의 작업 브랜치는 `dev`** 입니다. 오늘 CI 런도 `dev` push 기준입니다.

PR이 `dev`로 들어오면 `app-ci-pr.yml`이 돕니다. Frontend는 Node 22에서 `npm ci`와 lint(아직 test 스크립트 전이라 lint만), Backend는 Python 3.12에서 requirements 설치 후 `pytest`입니다.

이미지 빌드는 경로별로 나뉩니다. `frontend/**` push면 `Frontend Build & Push to ECR`이 `argus-dev-frontend`에 commit sha와 `latest`를 푸시하고, `backend/**` push면 Backend 워크플로가 `argus-dev-backend`에 동일하게 푸시합니다. 둘 다 OIDC assume → ECR login → `docker build` / `push`이고, `IMAGE_TAG`는 `${{ github.sha }}`입니다. Day 44에서 만든 ECR 리포·pull 권한, 오늘 CD가 쓰는 이미지 이름과 여기서 맞춰집니다.

# 7. CI → CD 자동 연동 — GitHub App으로 dispatch

여기가 오늘 파이프라인의 핵심입니다. Merge CI가 Infra CD를 직접 `GITHUB_TOKEN`으로 치면 교차 레포 권한이 지저분해지므로, Org에 설치한 GitHub App으로 토큰을 받아 Infra에 `repository_dispatch`를 보냅니다.

App slug는 **`argus-merge-cd-dispatch`** 이고, `UR-ARGUS` Org 전체에 설치되어 Actions·Contents write 권한을 갖습니다. Merge Secrets에는 `ARGUS_DISPATCH_APP_ID`와 `ARGUS_DISPATCH_APP_PRIVATE_KEY`를 둡니다.

FE/BE 빌드가 성공하면 `trigger-cd` job이 `actions/create-github-app-token@v2`로 installation token을 발급하고(`owner: UR-ARGUS`, `repositories: ARGUS_Infra`), `gh api`로 Infra에 dispatch합니다. Frontend는 `deploy-frontend`, Backend는 `deploy-backend`이며 payload의 `image_tag`는 방금 푸시한 commit sha입니다. Infra `deploy.yml`의 event type 이름과 **정확히 맞물립니다.**

오늘 증거도 있습니다. Infra에서 `workflow_dispatch` 수동 배포가 success였고, Merge `dev`의 FE/BE Build & Push가 success인 뒤 Infra `Application Deployment`가 `repository_dispatch`로 `deploy-frontend` / `deploy-backend`를 여러 번 success로 마쳤습니다. “수신 규약만 준비”가 아니라, **push 한 번으로 빌드·푸시·배포·스모크까지 이어지는 자동화가 동작으로 확인**된 상태입니다.

```text
Merge dev push (frontend/** or backend/**)
  → Build & Push to ECR (tag = commit sha)
  → GitHub App token (argus-merge-cd-dispatch)
  → repository_dispatch → ARGUS_Infra
  → resolve → deploy-frontend / deploy-backend (SSM)
  → HTTPS smoke (/ , /api/health) on rookies-argus.click
```

# 8. 운영 마감 — apply · Secrets · 실배포 · 스모크

코드 PR만으로 끝내지 않고 운영까지 닫았습니다. OIDC/CD IAM **terraform apply**, Infra/Merge Secrets 실값 등록, 수동 `workflow_dispatch` 실배포, 자동 `repository_dispatch` FE/BE 배포, `https://rookies-argus.click` HTTPS 스모크(`/` · `/api/health`)까지 통과했습니다.

장기 Access Key 없이 OIDC로 Role을 맡고, Private Backend는 SSH 대신 SSM으로만 배포합니다. Day 44의 `inject-secrets.sh`·ECR pull·ALB 경로가 오늘 CD에서 그대로 재사용됐습니다.

# 9. 설계에서 특히 챙긴 점

CD 수신기와 Terraform·인스턴스·도메인의 진실 공급원은 Infra에 두고, 앱 변경 감지·이미지 빌드는 Merge `dev`에 두었습니다. 교차 레포 호출은 PAT 대신 Org GitHub App installation token으로 `repository_dispatch`를 보냅니다. 검증은 CloudWatch Canary가 아니라 실제 URL 스모크입니다. 스크립트 우아함보다 Onde와 같은 YAML 인라인 패턴을 택했고, Actions↔AWS는 OIDC로 키 없이 붙였습니다. 자동 배포 payload의 이미지 태그는 commit sha로 맞춰 추적·롤백이 가능하게 했습니다.

# 10. 오늘 정리하면서 느낀 점

첫째, Day 44의 "CD만 남았다"는 할 일이 적다는 뜻이 아니었습니다. 워크플로·IAM·Secrets·apply·수동 배포·App 연동·자동 dispatch·스모크까지가 한 묶음이었고, 그중 하나라도 빠지면 "자동화했다"고 말하기 어렵습니다.

둘째, Infra main만 보면 Merge CI가 안 보여 파이프라인이 비어 있다고 오해하기 쉽습니다. 작업 브랜치가 `dev`이고, 자동화의 마지막 칸이 GitHub App이라는 점을 Devlog에 남겨야 이후 인수인계가 됩니다.

셋째, 1차 `scripts/cd/` 분리는 디버깅에 도움이 됐지만, 팀 공통 언어는 Onde YAML이었습니다. **기능 PR과 패턴 정렬 PR을 같은 날 끝낸 것**이 오늘 CD를 빠르게 안정시킨 이유입니다.

# 11. 다음 작업

내일이 **최종 산출물 제출일**입니다. CI/CD 자동화와 실배포 DoD는 오늘 닫았으므로, 다음은 **마무리 점검과 제출**입니다.

- 최종 산출물 패키지·문서·시연 자료 점검
- ARGUS / Onde 제출물 누락·버전·링크·데모 계정 최종 확인
- `rookies-argus.click` 배포 상태·스모크 한 번 더 확인
- 제출 체크리스트에 맞춘 README·접속 정보 정리

즉 **7월 22일은 Day 44가 남긴 CD를 Infra 수신기·SSM·스모크로 닫고, Merge `dev` CI와 GitHub App으로 자동 배포까지 증명한 날**입니다. Day 45는 ARGUS가 "빌드할 수 있는 상태"를 지나 **"push하면 올라가고, URL로 살아 있음을 확인하는 상태"** 까지 온 기록이고, 내일은 그 위에 **최종 산출물 제출**로 루키즈 일정을 마무리하는 날입니다.
