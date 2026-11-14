# KIROTHON 2026 — AAcrew

해커톤 당일(11/14) 주제를 받으면 곧바로 개발에 들어가기 위한 사전 세팅 레포입니다.

> 📖 **처음 보시면 [`docs/overview.md`](docs/overview.md) 를 먼저 읽으세요.**
> 이 레포가 무엇이고, 파일 하나하나가 왜 있는지 전부 설명해 둔 문서입니다.
>
> 📌 당일 절차는 [`docs/day-of-playbook.md`](docs/day-of-playbook.md),
> 전날 각자 할 일은 [`docs/handoff-11-13.md`](docs/handoff-11-13.md) 를 보세요.

> 🧭 **작업 루트는 이 레포 루트입니다.** `.kiro/`, `backend/`, `frontend/`, `docs/`, `deliverables/` 가 모두 루트에 있습니다.
> Kiro는 실행한 폴더의 `.kiro`를 읽으므로, 항상 레포 루트에서 실행합니다.
> ```bash
> kiro-cli --agent build
> ```
> IDE로 열 때도 레포 루트를 워크스페이스로 엽니다.

---

## 1. 실행

```bash
pnpm bootstrap                      # 처음 한 번. 라이브러리 설치 (277MB)
cp .env.example .env            # AWS 프로필·리전·모델 ID를 채운다
pnpm mock                       # 데모 실행 → http://localhost:5173
```

> `pnpm` 은 코드가 쓰는 외부 라이브러리를 받아오는 도구입니다. `git pull` 은 우리 코드만 가져오므로 한 번은 설치가 필요합니다. 자세한 설명은 [`docs/overview.md`](docs/overview.md) 5장에 있습니다.

`pnpm mock`은 Bedrock을 호출하지 않고 고정 시나리오를 재생합니다. **자격증명도 네트워크도 없이 데모가 끝까지 돌아갑니다.** 실제 모델을 쓸 때는 `pnpm dev`입니다.

| 명령 | 하는 일 |
|---|---|
| `pnpm bootstrap` | 라이브러리 설치 (행사 전에 한 번. 277MB) |
| `pnpm dev` | 백엔드 `:8000` + 프런트 `:5173` 동시 실행 |
| `pnpm mock` | 같은 구성을 `USE_MOCK=1`로 |
| `pnpm smoke` | 서버를 띄워 데모 경로가 완주하는지 자동 확인 |
| `pnpm smoke:ui` | 실제 브라우저로 `#play`를 눌러 화면까지 확인 |
| `pnpm build` / `pnpm start` | 프런트를 빌드해 FastAPI 하나로 서빙 (배포용 단일 프로세스) |
| `pnpm check` | lint · 타입 · 테스트 전체 |
| `pnpm preflight` | 내 PC 준비 상태 점검 (AWS 호출 없음) |

점검 스크립트는 둘입니다.

```bash
./scripts/preflight.sh          # 런타임·도구·캐시·비밀키. 행사 전 전원 통과 필수
./scripts/aws-check.sh --invoke # 계정·리전·모델 ID 확인 → .env 에 붙일 줄 출력
```

`aws-check.sh`는 자격증명이 바뀔 때마다 돌립니다. 당일 주최 측 계정을 받으면 `.env`의 (B) 블록을 채우고 다시 실행하면 됩니다. `--invoke`를 빼면 모델을 호출하지 않고 읽기 전용으로만 확인합니다.

> 셸 스크립트와 `pnpm mock`은 bash/zsh를 가정합니다. Windows에서는 WSL을 쓰세요.

**통합 체크포인트마다 `pnpm smoke`를 돌립니다.** 통과한 상태만 커밋하면 "어제까지 되던 게 안 된다"가 없어집니다.

---

## 2. 버전표

**원칙: 메이저 버전만 통일, 패치는 자유.**

| 도구 | 무엇인지 | 버전 | 설치·관리 | 확인 명령 |
|---|---|---|---|---|
| Node.js | JavaScript 실행 환경. 프런트 빌드와 각종 도구가 이 위에서 돕니다 | **26 LTS** (라이브러리 깨지면 24) | nvm / fnm + `.nvmrc` | `node -v` |
| pnpm | Node 라이브러리를 받아오는 패키지 매니저 (npm·yarn 과 같은 역할) | 최신 | `npm i -g pnpm` | `pnpm -v` |
| Python | 백엔드 실행 환경 | **3.14** (하한 3.12) | uv + `.python-version` | `python3 --version` |
| uv | Python 라이브러리와 가상환경을 관리 (pip·venv 를 대체) | 최신 | 공식 설치 스크립트 | `uv --version` |
| AWS CLI | AWS 를 터미널에서 조작. 계정·Bedrock 모델 확인에 씁니다 | **v2 최신** | 공식 설치 파일 | `aws --version` |
| git | 코드 버전 관리 | 최신 | 패키지 매니저 | `git --version` |
| kiro-cli | Kiro 에이전트를 터미널에서 실행 | **3.2.1 이상** | `kiro-cli update` | `kiro-cli --version` |

> ⚠️ kiro-cli는 **3.x로 통일**합니다. 2.x와는 훅 포맷·에이전트 권한 필드·도구 이름이 다릅니다.
> 실측 결과는 [`docs/kiro-env.md`](docs/kiro-env.md)에 있습니다.

---

## 3. 애플리케이션 스택 (확정)

### 프런트엔드

| 도구 | 무엇인지 | 왜 |
|---|---|---|
| **React 19** | 화면을 컴포넌트로 조립하는 라이브러리 | 담당3 목업을 거의 그대로 옮겼습니다 |
| **Vite 8** | 개발 서버 + 빌드 도구. 코드를 고치면 즉시 화면에 반영됩니다 | 빠르고 설정이 적습니다 |
| **TypeScript** | 타입을 붙인 JavaScript. 오류를 실행 전에 잡습니다 | API 형식이 어긋나는 것을 컴파일 때 잡습니다 |
| **vitest** | 테스트 실행기 | 데모 재생 계약을 검증합니다 |
| **oxlint** | 코드 규칙 검사 | 빠릅니다 |

### 백엔드

| 도구 | 무엇인지 | 왜 |
|---|---|---|
| **FastAPI** | Python 웹 API 프레임워크 | 코드가 짧고 타입 검증이 기본입니다 |
| **uvicorn** | FastAPI 앱을 실제로 띄우는 서버 | FastAPI 표준 조합입니다 |
| **boto3** | AWS 를 Python 에서 호출하는 SDK | Bedrock 호출에 씁니다 |
| **Bedrock Converse API** | AWS 의 LLM 호출 방식. 모델을 바꿔도 코드가 같습니다 | `.env` 의 `BEDROCK_MODEL_ID` 만 바꾸면 모델이 교체됩니다 |
| **pytest** · **ruff** | 테스트 실행기 · 코드 규칙 검사 | |

> 에이전트 프레임워크(Strands, LangGraph 등)는 **쓰지 않습니다.** 당일 디버깅할 미지의 레이어를 늘리지 않기 위해 Converse API 를 직접 호출합니다.

### 그 외

| 도구 | 무엇인지 | 어디에 |
|---|---|---|
| **concurrently** | 여러 명령을 한 번에 실행 | `pnpm dev` 가 백엔드와 프런트를 동시에 띄웁니다 |
| **Playwright** | 브라우저를 코드로 조작 | `pnpm smoke:ui` 의 화면 검증, 영상 녹화 |
| **Marp** | 마크다운 → 발표 슬라이드 | 담당3 (macOS) |
| **Mermaid** | 텍스트 → 다이어그램 | 담당3 (macOS) |
| **Remotion** | React 로 영상 생성 | 담당3 (macOS) |

**상태 저장**: 프로세스 메모리만 씁니다. DB 를 붙여서 얻는 게 없고, 재시작하면 날아가는 것이 유일한 단점인데 데모에서는 문제가 아닙니다.

**배포**: 기본은 로컬 실행입니다. URL 이 필요해지면 터널로 2분, EC2 는 그다음입니다.

**개발 원칙**
- 개발 중에 보는 화면은 **실제 사용자가 보는 화면**입니다. `features/sample/` 은 열면 입력창이 먼저 보이고, `pnpm dev` 로 띄우면 직접 대화하며 만들 수 있습니다
- `USE_MOCK=1` 모드로 Bedrock 없이 데모가 끝까지 재생되어야 합니다. 비상용이자 무대 시연용입니다. 최종 녹화는 live 로 합니다
- 데모 자동 재생 버튼(`#play`)으로 언제든 같은 흐름을 재현합니다 (검증·녹화용. 개발용 입력창과 별개입니다)

---

## 4. 폴더 구조

```
.
├── .kiro/
│   ├── steering/             # 팀 공통 규칙 (tech/structure/team, 당일 product 추가)
│   ├── agents/               # custom agents
│   ├── hooks/                # 자동화 훅 (standalone, PascalCase 트리거)
│   ├── settings/mcp.json     # MCP 서버
│   ├── skills/               # pr-review, pitch-deck, demo-film
│   └── specs/                # 당일 생성 (requirements/design/tasks)
├── backend/
│   ├── main.py               # 앱. features/ 를 자동 등록. 당일 거의 안 고친다
│   ├── core/                 # config · bedrock(Converse+tool use) · agent_loop · session · mock
│   └── features/<이름>/       # router.py · service.py · mock.json  ← 기능 하나 = 폴더 하나
├── frontend/
│   ├── src/app/              # 셸 · 화면 상태(입력·재생). 당일 거의 안 고친다
│   ├── src/ui/               # 공용 화면 부품
│   ├── src/types/api.ts      # 화면·서버 공통 형식 (lead 만 수정)
│   └── src/features/<이름>/   # 화면 하나 = 폴더 하나
├── scripts/                  # preflight · aws-check · smoke · scan-secrets
├── tests/                    # 백엔드 테스트
├── docs/                     # 세팅 가이드 · 당일 플레이북
├── deliverables/             # 발표 슬라이드 · 데모 영상 도구 (담당3)
├── .env.example
└── README.md
```

**기능은 폴더 하나로 끝납니다.** `backend/features/<이름>/`과 `frontend/src/features/<이름>/`을 만들면 자동으로 등록됩니다. 그래서 세 사람이 같은 파일을 동시에 고칠 일이 없습니다. 공용 파일(`backend/main.py`, `frontend/src/app/`, `types/api.ts`)은 lead만 수정합니다.

---

## 5. Kiro 세팅

상세 단계는 [`docs/kiro-setup.md`](docs/kiro-setup.md)를 봅니다.

- `.kiro/` = **팀 공유(git 커밋)** — steering · hooks · agents · MCP 설정
- `~/.kiro/` = **내 PC 전용(커밋 안 함)** — 로그인 세션, 개인 토큰
- 토큰·AWS 키는 환경변수로만. 레포와 채팅에 올리지 않습니다.
- v3는 첫 실행 시 워크스페이스 신뢰를 한 번 묻습니다. 승인해야 훅·에이전트·MCP가 로드됩니다.

---

## 6. 문서

| 문서 | 내용 |
|---|---|
| [`docs/overview.md`](docs/overview.md) | **전체 안내.** 이 레포가 무엇이고 파일마다 왜 있는지 |
| [`docs/day-of-playbook.md`](docs/day-of-playbook.md) | **당일 절차.** 시간표, 역할, 명령어, 막혔을 때 대응 |
| [`docs/handoff-11-13.md`](docs/handoff-11-13.md) | 전날 각자 할 일 |
| [`docs/idea-scoring.md`](docs/idea-scoring.md) | 아이디어 채점표 (AI 채점) |
| [`docs/submission-kit.md`](docs/submission-kit.md) | 제출 체크리스트와 폼용 문구 |
| [`docs/kiro-env.md`](docs/kiro-env.md) | kiro-cli 3.2.1 실측 기록 |
| [`docs/kiro-setup.md`](docs/kiro-setup.md) | Kiro 세팅 상세 |
| [`docs/custom-agents.md`](docs/custom-agents.md) · [`docs/hooks.md`](docs/hooks.md) | 에이전트 · 훅 구성법 |
| [`.kiro/specs/bab/`](.kiro/specs/bab/) | 이 기능의 spec 3파일 (요구사항·설계·task) |

---

## 7. 협업 규칙

- `main`에 바로 push (PR·리뷰 없음). 옛 `rehearsal/h-phishing` 브랜치는 더 쓰지 않습니다
- push 전 `git pull --rebase --autostash`
- 작게 자주 커밋. 남의 담당 폴더를 고칠 때는 먼저 공유
- `git push --force` 금지
- **통합 체크포인트(11:30 / 13:00 / 15:30 / 16:30)마다 `pnpm smoke`**
- 17:00 feature freeze, 17:45 제출

자세한 내용은 [`.kiro/steering/team.md`](.kiro/steering/team.md)에 있습니다.
