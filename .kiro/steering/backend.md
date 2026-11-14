---
inclusion: fileMatch
fileMatchPattern: 'backend/**'
---

# 백엔드 작업 규칙

> `backend/` 를 건드릴 때만 로드된다. 프런트 작업에는 안 붙으므로 토큰을 아낀다.

## 새 기능 만드는 순서

`backend/features/sample/` 을 복사해서 시작한다. 폴더를 만들면 `main.py` 가 자동으로 등록한다.

```
backend/features/<기능>/
├── __init__.py
├── router.py     # HTTP 계약. router = APIRouter() 를 export
├── service.py    # 시스템 프롬프트 · 도구 · 에이전트 구성
└── mock.json     # 데모 구간 고정 시나리오
```

폴더 이름이 그대로 `/api/<기능>` 이 된다. 프런트 폴더 이름과 같아야 한다.

**`main.py` 와 `core/` 는 고치지 않는다 (lead 영역).** 기능 코드는 전부 자기 폴더 안에서 끝낸다.

## mock 을 먼저 쓴다

`mock.json` 의 `beats[].id` 는 `.kiro/steering/product.md` 의 데모 구간 id 와 **똑같아야 한다.**
그 id 가 화면 신호·영상 구간·자동 검증에서 같이 쓰인다.

```json
{
  "beats": [
    { "id": "intro", "text": "첫 응답", "delayMs": 700, "data": { "riskScore": 10 } }
  ]
}
```

`data` 는 화면이 그릴 숫자다. 턴 응답에 그대로 실려 나가므로 **여기에 값을 넣어 두면 백엔드
로직 없이도 숫자가 바뀌는 화면을 만들 수 있다.**

mock fixture 를 먼저 채우면 프런트가 백엔드 로직을 기다리지 않는다. 그리고 `pnpm smoke` 가
바로 통과하므로 "어디까지 됐는지"가 항상 보인다.

고친 뒤 서버 재시작 없이 다시 읽으려면 `POST /api/mock/reload` 를 호출한다.

## 에이전트 작성

`service.py` 에서 고치는 것은 **시스템 프롬프트와 도구 목록뿐이다.** 루프는 `core/agent_loop.py` 가 담당한다.

```python
TOOLS = [Tool(name=..., description=..., schema={...}, fn=파이썬함수)]

def build() -> Orchestrator:
    orch = Orchestrator()
    orch.add(Agent(name="main", system=SYSTEM, tools=TOOLS), default=True)
    orch.add(Agent(name="coach", system=COACH_SYSTEM))
    return orch
```

- 도구 함수는 **모델 없이도 호출 가능**하게 짠다. 디버깅이 쉬워지고 테스트도 된다
- 도구가 예외를 던지면 루프가 잡아서 모델에 오류로 전달한다. 직접 try/except 로 감쌀 필요 없다
- 프롬프트는 짧고 금지사항을 명확하게. 장황하면 토큰만 먹는다

## 여러 에이전트·단계가 있을 때 (design 에서 지킬 것)

리허설에서 design 이 이 셋을 놓쳐 live 에서 깨졌다. spec 의 design 단계부터 지킨다.

- **단계는 라우터가 `s.state["step"]` 으로 직접 센다.** `beat_index` 는 mock 재생기만 올린다.
  그걸로 공격/방어 같은 분기를 하면 mock 에서만 돌고 live 에서는 다음 에이전트가 안 불린다
- **`start` 는 입력 없이도 동작한다.** `#play`·`pnpm smoke` 는 payload 없이 start 한다.
  필요한 입력은 샘플 기본값으로 채운다. 400 을 내면 smoke 부터 실패한다
- **구조화 출력이 필요한 Agent 는 `parse=` 를 명시한다** (기본 `parse_json_block`).
  모델이 JSON 을 안 주면 `data` 는 None 이다. 받는 쪽은 None 일 때 기본값으로 처리한다

## 응답 형식

모든 턴 응답은 같은 모양을 유지한다. 프런트가 분기를 줄일 수 있다.

```
{ sessionId, turn, beatIndex, state, text, source, data?, agent?, reason?, toolCalls?, advisory? }
```

`source` 는 `"bedrock"` 또는 `"mock"` 이다. 프런트가 이걸로 "고정 시나리오" 표시를 띄운다.
형식을 바꿔야 하면 `frontend/src/types/api.ts` 와 함께 고쳐야 하고, **그건 lead 가 한다.**

**`data` 는 화면이 그릴 구조화 값이다.** 점수·구역별 수치·표 행처럼 숫자로 보여줄 것을 여기 담는다.
결과가 텍스트뿐이면 채점에서 깎인다("텍스트만 나오는 챗봇").

- mock 모드: `mock.json` 의 `beats[].data` 가 그대로 실린다. 아무것도 안 해도 된다
- 실제 모델: 응답 텍스트의 JSON 블록을 `core/bedrock.py` 의 `parse_json_block` 이 뽑아 넣는다.
  그러니 프롬프트에 **"수치는 JSON 으로 같이 달라"** 고 적는다. 못 뽑으면 `data` 없이 텍스트만 간다
  (예외를 던지지 않는다)

## 입력 세 가지

`sample/router.py` 의 `ReplyIn` 이 셋을 받는다. 전부 선택이므로 안 쓰는 기능은 신경 쓰지 않아도 된다.

| 필드 | 무엇인가 | 어디서 쓰나 |
|---|---|---|
| `text` | 사용자가 입력한 한 줄 | 대화형 |
| `payload` | 폼 값·선택지·좌표 등 임의 구조 | 폼·대시보드형. 원본은 `session.state["input"]` 에 남는다 |
| `files` | 사진·CSV·PDF 첨부 (base64) | 업로드형 |

첨부 검증은 `core/attachments.py` 가 한다 — 개수 3개, 크기 `ATTACHMENT_MAX_MB`(기본 5MB), 형식
화이트리스트. 위반은 422 다. **직접 디코딩하거나 상한을 다시 쓰지 않는다.**

실제 모델 모드에서는 `Agent.run(session, text, files)` 가 이미지·문서·텍스트 블록으로 바꿔
Converse 메시지에 함께 넣는다. 기능 코드에서 할 일은 없다.

mock 모드에서 첨부·`payload` 가 오면 대본을 진행시키지 않고 **무엇을 받았는지 요약해 안내로**
돌려준다(`advisory: true`). 업로드가 서버에 닿았는지 화면에서 확인하려는 것이다.

## `reply` 의 `scripted` 플래그 (복사할 때 같이 가져간다)

`reply` 는 두 종류의 호출을 받는다. `sample/router.py` 를 복사하면 이 분기도 같이 온다.

| `scripted` | 누가 보내나 | mock 모드에서 |
|---|---|---|
| `true` | `#play` · `pnpm smoke` · 영상 녹화 | `mock.json` 의 다음 구간을 꺼낸다 (live 에서는 구간의 `say` 가 모델에 간다) |
| `false` (기본) | 사람이 입력창에 직접 입력 | **대본을 진행시키지 않고 안내만 돌려준다** (`advisory: true`) |

```python
if settings.mock_only and not body.scripted:
    return _envelope(s, {"text": MOCK_FREE_INPUT_NOTICE, "source": "mock",
                         "reason": "free-input-ignored", "advisory": True})
```

왜 이렇게 하나: mock 재생기는 `user_text` 를 보지 않는다. 안내가 없으면 "안녕"이라고 쳤는데
대본 다음 줄이 나오고, 그걸 모델 오류로 오해해 디버깅에 시간을 쓴다. `beat_index` 를 건드리지
않으므로 그 뒤에 `#play` 를 눌러도 처음부터 완주한다.

실제 모델 모드(`pnpm dev`)에서는 이 분기가 걸리지 않는다. 자유 입력이 그대로 모델로 간다.

## Bedrock 호출

- `core/bedrock.py` 의 `converse()` / `ask()` 만 쓴다. boto3 클라이언트를 직접 만들지 않는다
- 자격증명은 프로필 → 환경변수 키 → 인스턴스 역할 순으로 boto3 기본 체인이 찾는다. 코드에서 분기하지 않는다
- **실패하면 예외를 던지지 않고 mock 으로 떨어진다.** 이 동작을 바꾸지 않는다.
  데모 중 500 이 뜨는 것이 가장 나쁜 결과다
- throttling 이 보이면 탐색은 `USE_MOCK=1` 로 돌리고 실제 호출은 통합 체크포인트에서만 한다

## 테스트

`tests/` 에 단발 테스트를 둔다. 새 기능에는 이거 둘이면 충분하다.

- mock 모드에서 `start` → `reply`(`scripted: true`) × N 이 돌고, 마지막 구간까지 나오는가
- mock 모드에서 `scripted` 없이 보내면 안내가 오고 `beatIndex` 가 그대로인가

`pnpm check` 로 `ruff` + `pytest` 를 돌린다. 통합 체크포인트에서는 `pnpm smoke` 를 쓴다.

## 하지 말 것

- 포트 변경 (8000 고정)
- DB·캐시·큐 추가 (세션은 메모리로 충분하다)
- `main.py` · `core/` 수정 (lead 영역)
- 에이전트 프레임워크 도입 (Converse 직접 호출로 간다)
- 응답 형식 임의 변경
