---
title: "[Devlog] SK 쉴더스 루키즈 5기 오프라인 세션 Day 45 — ARGUS CI/CD 자동화와 실배포 스모크"
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

> **"Day 44에서 Storage·Backend·CI까지 붙인 뒤 남은 CD를 오늘은 마무리했습니다. Infra에 SSM 배포 워크플로를 올리고, Merge `dev` push → ECR 빌드 → GitHub App → Infra `repository_dispatch` → 자동 배포까지 연결했습니다. 수동 배포와 자동 배포 모두 success였고, `rookies-argus.click` HTTPS 스모크도 통과했습니다."**
>
> Infra `main`만 보면 앱 커밋이 없어서 파이프라인이 안 돌아가는 것처럼 보일 수 있습니다. 실제로는 Merge `dev`에서 CI가 돌고, Org GitHub App이 Infra CD를 호출합니다.

# 1. 오늘 작업의 방향

오늘은 Day 44에 남겨 둔 **CD & 배포 테스트**를 코드와 실제 배포까지 끝내는 날이었습니다.

- [ARGUS_Infra](https://github.com/UR-ARGUS/ARGUS_Infra)에 Deploy 워크플로를 추가해 SSM으로 FE/BE를 배포하고 HTTPS 스모크로 확인했습니다.
- OIDC Role에 CD용 Describe 권한을 넣고 **terraform apply**까지 반영했습니다.
- 처음엔 `scripts/cd/`로 나눴다가, 팀에 익숙한 **Onde식 YAML 인라인**으로 다시 모았습니다. `repository_dispatch`도 여기서 받습니다.
- 배포에 쓰는 값을 Variables에서 **Secrets**로 옮겼습니다.
- **수동** `workflow_dispatch`로 실배포와 스모크를 통과했습니다.
- [ARGUS_Merge](https://github.com/UR-ARGUS/ARGUS_Merge) `dev`의 FE/BE Build & Push CI와 GitHub App **`argus-merge-cd-dispatch`** 로 Infra CD 자동 호출을 확인했습니다.
- 당일 Actions에서 `repository_dispatch` 배포가 여러 번 **success**로 끝났습니다.

Day 43에서 Networking/Frontend, Day 44에서 Backend/Storage/Plan·ECR을 올렸고, 오늘은 그 위에 배포 자동화와 실배포 확인을 붙였습니다.

# 2. Day 43–44와의 이음

Networking·Frontend는 Day 43, Backend·Storage·Secrets·ECR·Terraform Plan은 Day 44에서 끝났고, 오늘은 CD입니다. Backend EC2에는 SSM으로 컨테이너를 올리고, OIDC·Secrets는 apply와 실값 등록으로 맞춰 두었습니다. Merge `dev`의 빌드·푸시도 CD와 같은 이미지 이름을 씁니다.

Day 44 초안에 있던 CloudWatch Alarm / Synthetics는 **쓰지 않기로** 했습니다. 배포 성공 기준은 HTTPS 스모크(`/`, `/api/health`)로 잡았습니다. Onde와 같은 계정·리전에서 패턴을 맞추는 편이 운영하기 쉽다고 봤습니다.

요청이 서비스에 닿는 흐름은 이렇게입니다.

1. 사용자 → `https://rookies-argus.click` → Route53 → ALB(HTTPS)
2. `/` → Frontend TG → Public FE EC2, `/api/*` → Backend TG → Private BE EC2
3. Merge `dev`에 FE/BE 경로 push → CI가 ECR push → GitHub App이 Infra에 dispatch → SSM이 docker pull/run → smoke

# 3. CD 1차 — Infra에 배포 워크플로 올리기 (PR #9)

처음에는 Infra만으로도 배포할 수 있게, `workflow_dispatch` 수동 배포와 `scripts/cd/` 헬퍼를 올렸습니다.

`deploy.yml` 1차는 Secret/설정값 검증 → OIDC로 `AWS_GITHUB_ACTIONS_ROLE_ARN` assume → Backend 배포 → Frontend 배포 → `SERVICE_URL` HTTPS smoke → (선택) ZAP 헬스 순서입니다. 이미지 이름은 `${ECR_REGISTRY}/argus-${ENVIRONMENT}-frontend|backend:${IMAGE_TAG}` 입니다.

스크립트는 나중에 지우지만, 1차에서는 이게 배포의 본체였습니다. `ssm-run.sh`가 SendCommand 후 Success까지 기다리고, SSM Online·ALB TG healthy 대기도 있었습니다. Backend는 `inject-secrets.sh` 후 compose로 zap+backend를 올리고, Frontend는 `:80` 컨테이너를 다시 띄웁니다. smoke는 `/`와 `/api/health`를 재시도하고, ZAP API 헬스는 옵션이었습니다. worker/selenium은 아직 템플릿에서 빼 두었습니다.

Backend는 `/opt/argus/.env`, `CONFIG_PATH=/app/config.docker.yaml`, `ZAP_PROXY=http://zap:8090`, 데이터 볼륨 `/opt/argus/data`를 씁니다. Day 44 user_data에 넣어 둔 `/opt/argus/scripts/inject-secrets.sh`를 CD가 그대로 호출합니다.

OIDC에는 CD가 인스턴스·TG를 볼 수 있게 `DescribeInstanceInformation`, `DescribeInstances`, `DescribeTargetHealth`, `DescribeTargetGroups`를 추가했습니다. 주석도 CloudWatch 검증에서 **HTTP/ALB 헬스 확인**으로 바꿨고, **terraform apply로 Role에 반영한 뒤** Actions가 새 권한으로 동작했습니다. README에는 Synthetics를 안 쓰는 점과 Secret 세팅·apply 담당을 적어 두었습니다.

# 4. Onde 스타일 리팩터 — YAML 인라인 + dispatch (PR #10)

1차처럼 스크립트로 나누는 것도 괜찮았지만, 팀은 Onde_Infra처럼 **배포 명령을 워크플로 YAML에 직접 쓰는 방식**에 더 익숙했습니다. 그래서 `scripts/cd/`를 없애고 `.github/workflows/deploy.yml` 하나로 모았습니다. 워크플로 이름은 `Application Deployment`입니다.

트리거는 두 가지입니다. `workflow_dispatch`는 수동으로 `image_tag`와 target(all/frontend/backend)을 넣고, `repository_dispatch`는 앱 CI가 `deploy-frontend` / `deploy-backend` / `deploy-all`과 `client_payload.image_tag`로 Infra를 부릅니다. `resolve` job이 이벤트에 따라 FE/BE/smoke 여부를 정해서, 수동·자동이 같은 배포 job을 쓰게 했습니다.

job 순서는 이렇습니다. `resolve` 다음 Frontend는 SSM으로 ECR login → pull → 기존 `argus-frontend` 제거 → `docker run -p 80:80`입니다. Backend는 `inject-secrets.sh` → ECR login → network `argus` → ZAP daemon(`8090`) → backend(`8001:8000`, env-file, `ZAP_PROXY`, data 마운트)입니다. 마지막 `smoke`는 `rookies-argus.click`의 `/`(200·301·302)와 `/api/health`(200)를 최대 30회·10초 간격으로 재시도합니다.

YAML 안 shell 문자열이 길어지긴 하지만, Actions 화면만 봐도 배포 절차를 따라가기 쉽습니다.

# 5. Secrets 이전

배포에 쓰는 값을 Variables가 아니라 Secrets로 읽도록 바꿨습니다. Role ARN, FE/BE instance ID, ECR registry, `SERVICE_URL`은 Secret으로 모았고, `ENVIRONMENT`만 Variable(기본 `dev`)로 남겼습니다. 인스턴스 ID·레지스트리·서비스 URL도 Role ARN과 같이 Secrets에 두는 편이 설정할 때 덜 헷갈립니다. README도 맞춰 수정했습니다.

# 6. Merge 쪽 CI — `dev`에서 빌드·푸시

Infra `main`만 보면 앱 CI가 안 보이지만, **ARGUS_Merge 작업 브랜치는 `dev`** 입니다. 오늘 CI도 `dev` push 기준입니다.

PR이 `dev`로 오면 `app-ci-pr.yml`이 돕니다. Frontend는 Node 22에서 `npm ci`와 lint(아직 test 스크립트는 없어서 lint만), Backend는 Python 3.12에서 requirements 설치 후 `pytest`입니다.

이미지 빌드는 경로별로 나뉩니다. `frontend/**` push면 Frontend 워크플로가 `argus-dev-frontend`에 commit sha와 `latest`를 푸시하고, `backend/**` push면 Backend 워크플로가 `argus-dev-backend`에 똑같이 푸시합니다. 둘 다 OIDC assume → ECR login → `docker build` / `push`이고, `IMAGE_TAG`는 `${{ github.sha }}`입니다. Day 44에서 만든 ECR·pull 권한, 오늘 CD가 쓰는 이미지 이름과 맞습니다.

# 7. CI → CD 자동 연동 — GitHub App

Merge CI가 Infra CD를 직접 `GITHUB_TOKEN`으로 부르면 레포 간 권한이 지저분해집니다. 그래서 Org GitHub App으로 토큰을 받아 Infra에 `repository_dispatch`를 보냅니다.

App 이름은 **`argus-merge-cd-dispatch`** 이고, `UR-ARGUS` Org에 설치되어 Actions·Contents write 권한이 있습니다. Merge Secrets에는 `ARGUS_DISPATCH_APP_ID`, `ARGUS_DISPATCH_APP_PRIVATE_KEY`를 둡니다.

FE/BE 빌드가 끝나면 `trigger-cd` job이 `actions/create-github-app-token@v2`로 토큰을 만들고(`owner: UR-ARGUS`, `repositories: ARGUS_Infra`), `gh api`로 Infra에 dispatch합니다. Frontend는 `deploy-frontend`, Backend는 `deploy-backend`이고, `image_tag`는 방금 푸시한 commit sha입니다. Infra `deploy.yml`의 event type과 이름이 같습니다.

오늘 확인한 결과도 있습니다. Infra 수동 `workflow_dispatch` 배포가 success였고, Merge `dev` FE/BE Build & Push success 뒤에 Infra가 `repository_dispatch`로 `deploy-frontend` / `deploy-backend`를 여러 번 success로 마쳤습니다. push하면 빌드·푸시·배포·스모크까지 이어지는 자동화가 실제로 동작했습니다.

```text
Merge dev push (frontend/** or backend/**)
  → Build & Push to ECR (tag = commit sha)
  → GitHub App token (argus-merge-cd-dispatch)
  → repository_dispatch → ARGUS_Infra
  → resolve → deploy-frontend / deploy-backend (SSM)
  → HTTPS smoke (/ , /api/health) on rookies-argus.click
```

# 8. 운영에서 끝낸 것

코드만 올린 게 아니라 운영까지 맞춰 두었습니다. OIDC/CD IAM **terraform apply**, Infra/Merge Secrets 등록, 수동 `workflow_dispatch` 실배포, 자동 `repository_dispatch` FE/BE 배포, `https://rookies-argus.click` HTTPS 스모크(`/` · `/api/health`)까지 통과했습니다.

AWS Access Key는 쓰지 않고 OIDC로 Role을 맡습니다. Private Backend는 SSH 대신 SSM으로만 배포합니다. Day 44의 `inject-secrets.sh`·ECR pull·ALB 경로를 오늘 CD에서 그대로 씁니다.

# 9. 설계에서 챙긴 점

배포 워크플로와 Terraform·인스턴스·도메인 정보는 Infra에 두고, 앱 변경 감지·이미지 빌드는 Merge `dev`에 두었습니다. 레포 간 호출은 PAT 대신 Org GitHub App 토큰으로 `repository_dispatch`를 씁니다. 배포 확인은 CloudWatch Canary가 아니라 실제 URL 스모크입니다. Onde와 같은 YAML 인라인 패턴을 택했고, Actions↔AWS는 OIDC로 붙였습니다. 자동 배포의 이미지 태그는 commit sha로 맞춰 추적하기 쉽게 했습니다.

# 10. 오늘 정리하면서 느낀 점

첫째, Day 44에 "CD만 남았다"고 해서 일이 적었던 건 아니었습니다. 워크플로·IAM·Secrets·apply·수동 배포·App 연동·자동 dispatch·스모크가 같이 맞아야 "자동화됐다"고 말할 수 있었습니다.

둘째, Infra `main`만 보면 Merge CI가 안 보여서 파이프라인이 비어 있다고 오해하기 쉽습니다. 작업 브랜치가 `dev`이고, CI가 CD를 부르는 통로가 GitHub App이라는 점을 적어 두는 게 이후에도 도움이 됩니다.

셋째, 1차 `scripts/cd/` 분리는 디버깅엔 편했지만, 팀이 이미 쓰는 건 Onde YAML이었습니다. 기능 PR과 패턴을 맞추는 PR을 같이 끝낸 덕분에 CD를 빨리 안정시킬 수 있었습니다.

# 11. 다음 작업

내일이 **최종 산출물 제출일**입니다. CI/CD와 실배포 확인은 오늘 끝났으니, 다음은 **마무리 점검과 제출**입니다.

- 최종 산출물 패키지·문서·시연 자료 점검
- ARGUS / Onde 제출물 누락·버전·링크·데모 계정 최종 확인
- `rookies-argus.click` 배포 상태·스모크 한 번 더 확인
- 제출 체크리스트에 맞춘 README·접속 정보 정리

정리하면, **7월 22일은 Day 44에 남겨 둔 CD를 Infra·SSM·스모크로 마무리하고, Merge `dev` CI와 GitHub App으로 자동 배포까지 확인한 날**입니다. 내일은 **최종 산출물 제출**로 루키즈 일정을 마무리합니다.
