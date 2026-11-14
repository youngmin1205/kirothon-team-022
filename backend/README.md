# backend — FastAPI + Bedrock Converse

주제와 무관한 **코어**와, 기능마다 하나씩 늘어나는 **플러그인 폴더**로 나뉜다.
`features/<이름>/` 폴더를 만들면 `main.py` 가 자동으로 등록한다. 그래서 세 사람이
같은 파일을 동시에 고치지 않는다.

> 작업 규칙은 `.kiro/steering/backend.md` 에 있다 (`backend/` 파일을 열면 Kiro 가 자동으로 읽는다).

## 구성

| 파일 | 무엇인지 | 고치나 |
|---|---|---|
| `main.py` | 앱. `features/` 자동 등록, `/api/health`, 정적 파일 서빙 | ❌ lead |
| `core/config.py` | `.env` 로딩과 설정 한 곳. `mock_only` 가 "모델을 호출하지 않는 상태" 판단 | ❌ lead |
| `core/bedrock.py` | **Bedrock Converse 래퍼.** tool use 루프 + 실패 시 mock 폴백 | ❌ lead |
| `core/agent_loop.py` | `Agent`(역할 하나) + `Orchestrator`(라우팅) | ❌ lead |
| `core/session.py` | 대화 이력·상태·구간 위치를 메모리에 보관 | ❌ lead |
| `core/mock.py` | `mock.json` 의 구간(beat)을 순서대로 재생 | ❌ lead |
| `features/sample/` | **복사해서 쓰는 틀.** `router.py` · `service.py` · `mock.json` | ✅ 복사 후 수정 |

기능 코드에서 고치는 것은 `service.py` 의 시스템 프롬프트와 도구 목록, 그리고
`mock.json` 의 구간 문구뿐이다. 루프와 세션 처리는 `core/` 가 맡는다.

## 실행

**레포 루트에서** 돌린다 (`backend` 를 패키지로 import 하므로 `cd backend` 하지 않는다).

```bash
pnpm dev          # API(:8000) + 화면(:5173) 동시 — 평소 이것만 쓴다
pnpm mock         # 같은 구성, USE_MOCK=1 (Bedrock 호출 없음)

# 백엔드만 직접 띄울 때
uv run uvicorn backend.main:app --reload --port 8000
```

API 문서는 http://localhost:8000/api/docs 에서 볼 수 있다.

## 엔드포인트

| 엔드포인트 | 하는 일 |
|---|---|
| `GET /api/health` | 지금 어떤 모드인지(mock/bedrock), 등록된 기능과 구간 id. `preflight` · `smoke` 가 쓴다 |
| `POST /api/sample/start` | 세션 시작 → 첫 응답 |
| `POST /api/sample/reply` | 사용자 발화 → 다음 응답. `scripted: true` 면 대본 재생 |
| `POST /api/sample/reset` | 같은 세션을 처음 상태로 |
| `GET /api/sample/beats` | 데모 구간 id 목록 (화면·녹화 설정과 맞추는 용도) |
| `POST /api/mock/reload` | `mock.json` 을 고친 뒤 서버 재시작 없이 다시 읽는다 |

`reply` 의 `scripted` 가 두 경로를 가른다. `#play`·`smoke`·녹화는 `true` 로 보내 대본을
진행시키고, 사람이 입력창에 직접 친 발화는 `false`(기본)다. **mock 모드에서 `false` 면 대본을
진행시키지 않고 안내를 돌려준다** — mock 재생기는 입력을 보지 않으므로, 안내가 없으면 "안녕"에
대본 다음 줄이 나오는 것을 모델 오류로 오해한다. 자유 대화는 `pnpm dev` 로 확인한다.

## 환경변수

`.env` 는 **레포 루트**에 둔다 (`cp .env.example .env`). `python-dotenv` 없이 `core/config.py` 가 직접 읽는다.

| 변수 | 설명 |
|---|---|
| `AWS_PROFILE` | 로컬 AWS 프로필. 비우면 boto3 기본 체인(환경변수 키 → 인스턴스 역할) |
| `AWS_REGION` | Bedrock 리전 (기본 `us-west-2`) |
| `BEDROCK_MODEL_ID` | inference profile ID. **비어 있으면 자동 mock** |
| `USE_MOCK=1` | Bedrock 호출 없이 강제 mock (크레딧 절약·오프라인 개발) |
| `MAX_TOKENS` `TEMPERATURE` | 호출 파라미터 (기본 1024 / 0.5) |

쓸 수 있는 모델 ID 를 찾으려면 `./scripts/aws-check.sh` 를 쓴다.

## 검증

```bash
pnpm check:py     # ruff + pytest
pnpm smoke        # 서버를 띄워 기능마다 데모 완주 확인 (USE_MOCK=1, AWS 호출 없음)
```

## mock 폴백 사유별 대응

실패하면 예외를 던지지 않고 `source: "mock"` + `reason` 으로 떨어진다. 데모 중 500 이 뜨는 것이
가장 나쁜 결과이기 때문이다. `reason` 을 보고 대응한다.

| `reason` | 대응 |
|---|---|
| `USE_MOCK=1` | 의도된 상태. 실제 호출을 보려면 `.env` 에서 `USE_MOCK=0` |
| `BEDROCK_MODEL_ID 미설정` | `.env` 에 모델 ID 추가 (`./scripts/aws-check.sh`) |
| `free-input-ignored` | mock 모드에서 자유 입력을 보냈다. 고장이 아니다 — `pnpm dev` 로 띄운다 |
| `클라이언트 없음 (...)` | boto3 세션 생성 실패. 프로필 이름·리전을 확인한다 |
| `ClientError: ... (AccessDeniedException)` | 모델 액세스 승인 + IAM `bedrock:InvokeModel` 권한 (Converse 가 요구하는 액션) |
| `ClientError: ... (ValidationException)` | 모델 ID 오타 — `us.`/`global.` inference profile 접두어 확인 |
| `ClientError: ... (ExpiredTokenException)` | `aws sso login --profile <프로필>` 또는 임시 키 재발급 |
| `ClientError: ... (ThrottlingException)` | 탐색은 `USE_MOCK=1` 로 돌리고 실제 호출은 체크포인트에서만 |
| `도구 루프 N회 초과` | 모델이 도구만 반복 호출했다. 프롬프트에서 도구 사용 조건을 좁힌다 |

boto3 예외는 전부 `ClientError` 로 잡히고, 실제 오류 코드는 메시지 안에 들어 있다
(`reason` 이 `f"{type(e).__name__}: {e}"` 이므로). 응답의 `reason` 을 그대로 읽으면 된다.

## `static/` 과 `static_dist/`

| 경로 | 언제 서빙되나 |
|---|---|
| `static_dist/` | `pnpm build` 결과. 있으면 이 앱 하나가 화면까지 서빙한다 (배포 모드, 단일 프로세스) |
| `static/index.html` | `static_dist/` 가 없을 때 `/` 에 나오는 **안내 페이지** |

안내 페이지에는 기능이 없다. "화면은 여기가 아니다"를 알려주고, `pnpm dev` → :5173 로 보내고,
`/api/health` 를 읽어 지금 mock 인지 Bedrock 인지 한 줄로 보여주는 것이 전부다. 실제 화면은
React 쪽이므로 여기에 입력창을 두지 않는다 — 두 벌이 되면 어느 쪽이 진짜인지 헷갈리고, 부품도
디자인 토큰도 공유하지 못해 따로 썩는다.
