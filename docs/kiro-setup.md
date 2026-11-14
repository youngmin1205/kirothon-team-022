# Kiro 세팅 가이드 (2-0)

> 팀원 3명이 **이 문서만 보고 그대로 따라 하면** Kiro 환경이 완성되도록 작성했습니다.
> 소요 시간: 약 10~15분 (kiro-cli 설치/로그인이 이미 됐다는 전제면 5분).

---

## 0. 핵심 개념 — 무엇이 공유되고, 무엇이 내 PC 전용인가

| 위치 | 성격 | 들어가는 것 | git 커밋 |
|---|---|---|---|
| `repo/.kiro/` | **팀 공유** | steering, hooks, custom agents, `settings/mcp.json` | ✅ 커밋 |
| `~/.kiro/` | **내 PC 전용** | 로그인 세션, 전역 설정, 개인 캐시 | ❌ 커밋 안 함 |
| `.env` (로컬) | **내 PC 전용** | AWS 프로필명, 리전, MCP 토큰 | ❌ `.gitignore` |

> 규칙: **설정 파일(= 팀 규칙)은 공유**, **자격증명·세션(= 내 것)은 로컬**. MCP/Power 토큰·AWS 키는 반드시 환경변수/`.env`로만.

---

## 1. kiro-cli 로그인 확인 (공통 준비 ①)

```bash
kiro-cli --version          # 설치 확인
kiro-cli login              # Google / GitHub / AWS Builder ID (카드 불필요)
```

- 로그인 후 간단한 질문 1번 → 답이 오면 OK.
- **플랜/크레딧 확인**: Free = 월 50 크레딧, 모델 제한·rate limit 있음. **테스트로 다 쓰지 않기.**
- ⚠️ **WSL·원격 서버**는 Google/GitHub 로그인이 localhost 콜백 때문에 막힐 수 있음 → 미리 테스트. 막히면 AWS Builder ID 또는 로컬 네이티브 환경 사용.

---

## 2. repo 받기

```bash
# youngmin1205/kirothon-team-022 초대 수락 후
gh auth status              # 로그인 확인
git clone <repo-url>
cd <repo>
```

- repo 안에 `.kiro/` 가 이미 들어 있습니다 (steering·hooks·agents·mcp.json). **git pull 하면 자동 공유됨.**

---

## 3. 내 PC 전용 설정 (각자)

### 3-1. `.env` 만들기
```bash
cp .env.example .env
# .env 열어서 AWS_PROFILE / AWS_REGION / BEDROCK_MODEL_ID 를 내 값으로 수정
```

### 3-2. AWS 프로필 (공통 준비 ④)
```bash
aws configure sso --profile hackathon      # SSO 사용 시
# 또는
aws configure --profile hackathon          # 액세스 키 사용 시
aws sts get-caller-identity --profile hackathon   # 계정 ID 나오면 OK
```

### 3-3. MCP 토큰 (필요한 사람만)
- GitHub 등 토큰이 필요한 MCP는 **`.env` 또는 셸 환경변수**로 넣기. `mcp.json` 에 평문으로 쓰지 않기.

---

## 4. 세팅 검증 (완료 기준)

repo 폴더에서:

```bash
kiro-cli
```

채팅에서 아래를 확인:
- [ ] **steering이 읽히는가** — "지금 적용 중인 steering 규칙 알려줘" 라고 물어보면 tech/structure/team 내용이 반영됨
- [ ] **custom agent가 보이는가** — `/agents` 또는 agent 목록에서 예시 agent 확인
- [ ] **MCP가 호출되는가** — "AWS docs에서 Bedrock Converse 찾아줘" 등으로 MCP 서버 동작 확인

3개 다 OK면 세팅 완료 ✅

### 4-1. 로그인 없이 되는 오프라인 사전 검증 (실측 확인됨)
repo 루트에서:
```bash
kiro-cli agent list                                   # build, review 가 Workspace 로 보이면 OK
kiro-cli agent validate --path .kiro/agents/build.json   # 에러 없으면 유효
kiro-cli mcp list                                     # aws-docs (uvx) 가 보이면 MCP 설정 인식 OK
```
> 위 3개는 **로그인 전에도** 파일 인식/유효성만 확인한다. 실제 호출(steering 반영·MCP 응답·skill 실행)은 로그인 후 `kiro-cli chat`에서 확인.

### 4-2. 로그인 후 라이브 검증 (실측 확인됨)
```bash
kiro-cli login
kiro-cli whoami                                       # 로그인 확인

# steering 반영 확인 (tech/structure/team 내용이 요약에 나오면 OK)
kiro-cli chat --no-interactive --trust-tools= "지금 이 워크스페이스에 적용 중인 steering 규칙을 3줄로 요약해줘"

# skill 확인 — 주의: 이 CLI 버전은 '/pr-review' 슬래시로는 안 되고,
# 설명과 매칭되는 자연어 요청을 하면 자동 활성화된다.
kiro-cli chat --no-interactive --trust-tools=fs_read "PR 제출 전 코드 리뷰를 하려고 해. backend/core/bedrock.py 를 리뷰 체크리스트대로 점검해줘."
```

> ⚠️ **스킬 호출 방식**: kiro-cli 2.2.2에서 `/pr-review` 같은 슬래시는 내장 명령만 인식한다. 스킬은 **설명(description) 매칭으로 자동 활성화**된다 → 그래서 `pr-review`의 description에 "언제 쓰는지"를 명확히 적는 게 중요.

### 4-3. MCP 서버 기동 주의 (첫 실행 느림)
`aws-docs`는 `uvx`가 패키지를 **처음 1회 설치**한다(의존성이 많아 첫 실행이 오래 걸림). 또한 MCP 서버는 **stdin을 기다리는 상주 프로세스**라, 터미널에서 `uvx ...@latest`를 직접 실행하면 **끝나지 않고 떠 있는 게 정상**(= hang 아님). 그러니 서버를 띄우지 말고 **설치만 하고 끝나는** 아래 명령으로 미리 캐시한다:
```bash
uv tool install awslabs.aws-documentation-mcp-server@latest   # 다운로드+설치 후 종료 (당일 빠르게)
```
- 설정 인식 확인(로그인 불필요): `kiro-cli mcp list` → `aws-docs (uvx)` 표시
- 실제 호출 확인(로그인 후): `kiro-cli chat --no-interactive --trust-all-tools "aws-docs로 Bedrock Converse 문서 찾아줘"` → 도구 호출 로그가 뜨면 OK

> ❌ `uvx ...@latest --help` 로 캐시하려 하지 말 것 — 서버가 떠서 안 끝난 것처럼 보인다. `uv tool install` 을 쓴다.

---

## 5. 자주 나는 문제

| 증상 | 원인/해결 |
|---|---|
| 로그인 후 바로 튕김 (WSL) | localhost 콜백 차단 → Builder ID 로그인 또는 네이티브 터미널 |
| `AccessDenied` (Bedrock) | 모델 액세스 미승인 or IAM 권한 부족 (`bedrock:InvokeModel` — Converse 가 요구하는 액션) |
| `ValidationException` | 모델 ID 오타 — `us.`/`global.` inference profile ID 확인 |
| `ExpiredToken` | `aws sso login --profile hackathon` 다시 |
| steering이 안 읽힘 | repo **루트**에서 kiro-cli 실행했는지 확인 (`.kiro/`가 보이는 위치) |
