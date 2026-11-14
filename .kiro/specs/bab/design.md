# 설계 — 밥은 먹었니 (`bab`)

> 요구사항: [`requirements.md`](requirements.md). 뼈대 규칙: `.kiro/steering/backend.md`.
> **`backend/main.py` 와 `backend/core/` 는 고치지 않는다.** 전부 `backend/features/bab/` 안에서 끝낸다.

## 전체 흐름

```
화면 (frontend/src/features/bab)
  │  send(text, { files, payload })
  ▼
router.py        단계 판정 → 구간별 분기 → 응답 조립
  ├─ rules.py    순수 코드: 기본값 · 검증 · 프로필 필터 · 요약 · 말풍선   ← 모델 없음 (L)
  └─ service.py  judge · compose 두 Agent 의 프롬프트           ← 모델 호출 (BE)
                   │
                   ▼  core/agent_loop.py → core/bedrock.py → Bedrock Converse
```

LLM 은 **두 곳만** 쓴다. 나머지 6구간의 `data` 는 순수 코드가 만든다.

| 구간 | 누가 만드나 | 비고 |
|---|---|---|
| `home` | 코드 (`profiles.json`) | 받는 사람 목록 |
| `upload` | 코드 (`rules.normalize_*`) | 사진 요약 + 기분 정규화 |
| `judge` | **LLM** (`judge` Agent) | 사진 → `checks` (meal·home 만) |
| `confirm` | 코드 | 자녀 수정값을 judge 결과 위에 덮는다 |
| `compose` | 코드 필터 → **LLM** (`compose` Agent, 받는 사람당 1회) → 코드 조립 | |
| `deliver` | 코드 (`rules.build_bubble`) | 본문·링크 미리보기 |
| `react` | 코드 (`rules.normalize_pressed`) | 버튼 검증 |
| `reply` | 코드 | 칩 · 토스트 · `celebrate` |

## 단계 진행 — `s.state["step"]` (R1)

`beat_index` 는 mock 재생기만 올린다. 그걸로 분기하면 live 에서 다음 단계가 불리지 않는다
(리허설에서 깨진 지점). 그래서 라우터가 직접 센다.

```python
STEPS = ["home", "upload", "judge", "confirm", "compose", "deliver", "react", "reply"]

def _advance(s: Session) -> str:
    """현재 구간 id 를 돌려주고 다음으로 한 칸 올린다. 끝이면 마지막을 반복한다."""
    i = min(int(s.state.get("step", 0)), len(STEPS) - 1)
    s.state["step"] = i + 1
    return STEPS[i]
```

- `start` → `step = 0` 에서 `home` 을 만들고 `step = 1` 로 둔다. **payload 없이도 200** (R1-3)
- `reply`(`scripted: true`) × 7 → `upload` … `reply`
- `reset` 은 `core/session.reset` 이 `state` 를 비우므로 `step` 도 0 으로 돌아간다. 추가 코드 없음

### mock 모드는 기존 재생기를 그대로 쓴다

`settings.mock_only` 면 지금 `router.py` 가 하는 대로 `orchestrator.run()` 에 넘겨
`mock.json` 을 순서대로 재생한다. `pnpm smoke` 가 계속 통과하는 경로를 건드리지 않는다.
`step` 도 같이 올려서 두 모드의 세션 상태를 같게 유지한다.

## 사실(facts) 한 덩어리

구간마다 필요한 값을 세션에 모아 둔다. 다음 구간은 이것만 보고 만든다.

```python
s.state["facts"] = {
    "child":  "민지",
    "photos": [{"name": "lunch.jpg", "label": "점심"}, ...],
    "checks": [{"item": "meal", "status": "done", "detail": "점심 김치찌개"}, ...],
    "mood":   {"key": "tired", "emoji": "😪", "label": "피곤해", "custom": None},
    "note":   None,
}
```

`item` 은 `meal home mood note`, `status` 는 `done not_yet unknown` 만 쓴다 (`profiles.json`).

## `rules.py` — 순수 코드 (task 1, L 담당)

모델 없이 호출된다. 전부 단위 테스트가 붙는다. **R3·R4·R5·R6·R7 의 수락 기준이 여기서 지켜진다.**

| 함수 | 하는 일 | 지키는 요구사항 |
|---|---|---|
| `normalize_mood(payload)` | 기분 key 를 `moodOptions` 안으로 제한. 없으면 데모 기본값 `tired`. `custom` 은 `key == "custom"` 일 때만 문자열 | R3-1·2·4 |
| `normalize_checks(payload, base)` | `confirm` 의 자녀 수정값을 judge 결과 위에 덮는다. `meal`·`home` 만, `status` enum 검증 | R2-1·2 |
| `normalize_pressed(payload)` | 부모님 버튼을 `parentButtons` 안으로 제한. 없으면 `["heart","ate"]` | R7-1·2·3 |
| `filter_facts(recipient, facts)` | **`recipient["items"]` 에 없는 항목을 지운다.** 모델에 넘길 입력을 만드는 유일한 경로 | **R4-1·2** |
| `build_summary(recipient, facts)` | `🍚 점심 김치찌개 먹음 · 🏠 9시 귀가 · 😪 조금 피곤` 를 조립. 모델 출력에 의존하지 않는다 | R5-4 |
| `build_bubble(child, summary, link)` | 자녀 이름 + 요약 + `❤️ 답하기 ▶ 링크` | R6-1 |
| `build_preview(child, facts, photo)` | OG `title` · `description` · `image` | R6-2 |

`filter_facts` 가 **프롬프트보다 앞에 있는 것이 이 설계의 핵심이다.** 아빠용 프롬프트에는 기분이
문자열로도 존재하지 않는다. "말하지 마"라고 적어서 막는 것이 아니다.

## `service.py` — Agent 두 개 (task 3·4, BE 담당)

`core/agent_loop.py` 는 고치지 않는다. 바꾸는 것은 시스템 프롬프트와 Agent 등록뿐이다.

```python
orch.add(Agent(name="judge",   system=JUDGE_SYSTEM,   parse=parse_json_block), default=True)
orch.add(Agent(name="compose", system=COMPOSE_SYSTEM, parse=parse_json_block))
```

라우터는 `s.state["agent"]` 를 세팅해 기존 `Orchestrator.route()` 로 고른다. 라우팅 코드를
새로 만들지 않는다.

- `judge`: 사진 블록 + "밥·귀가만 판단하고 기분은 판단하지 마" + `checks` JSON 요구.
  구조화 출력이 필요하므로 `parse=` 를 명시한다 (backend.md 규칙 3)
- `compose`: **이미 걸러진** 항목과 `tone` 만 받아 받는 사람별 `text` 를 쓴다.
  직접 입력한 기분은 뜻을 바꾸지 말고 말투만 다듬으라고 적는다 (R3-3)

### 받는 사람별로 세션을 분리한다 (중요)

`Agent.run()` 은 `session.messages` 에 이력을 누적하고 `converse()` 가 전체 이력을 보낸다.
엄마용을 먼저 호출하면 그 응답("…오늘은 좀 피곤해서…")이 이력에 남아, **아빠용 호출의 입력에
기분이 섞여 들어간다.** 그러면 코드로 걸러낸 의미가 없어진다 (R4-2 위반).

그래서 `judge`·`compose` 호출은 **등록하지 않은 임시 `Session`** 으로 한다.

```python
scratch = Session(id=f"{s.id}:{beat}", feature=FEATURE)
scratch.beat_index = STEPS.index(beat)   # bedrock 실패 시 이 구간의 mock 값으로 떨어진다
result = orchestrator.run(scratch, prompt)
```

`beat_index` 를 미리 맞춰 두면 Bedrock 이 실패했을 때 `Agent._mock_turn` 이 `home` 이 아니라
**그 구간의 mock 데이터**를 돌려준다. 폴백 코드를 따로 쓰지 않아도 화면이 맞는 값을 받는다 (R8-1).

단계 사이의 맥락은 이력이 아니라 `s.state["facts"]` 가 들고 있으므로 잃는 것이 없다.

## 사진 (R2-3)

`#play` 는 `say` 만 보내고 사진을 보내지 않는다 (`frontend/src/app/useDemo.ts:307`).
그래서 `judge` 에서 `files` 가 비어 있으면 서버가 `backend/features/bab/samples/` 의
`lunch.jpg`·`door.jpg` 를 읽어 `Attachment` 로 만들어 붙인다.

- `Attachment(name=..., mimeType="image/jpeg", dataBase64=...)` 로 만든다. 검증·디코딩은
  `core/attachments.py` 가 한다. 직접 디코딩하거나 상한을 다시 쓰지 않는다
- 파일이 없으면 사진 없이 진행하고, `checks` 는 mock 값으로 채운다. **예외를 던지지 않는다**

## `data` 가 비면 mock 으로 채운다 (R8-4)

모델이 JSON 을 주지 않으면 `result.data` 는 `None` 이다. 라우터가 마지막에 한 번 메운다.

```python
if data is None:
    data = mock.beat_data(FEATURE, beat)   # features/bab/mock.json 의 같은 구간 data
```

`core/mock.py` 에 이 헬퍼가 없으므로 **`rules.py` 안에 같은 일을 하는 함수를 둔다**
(`core/` 를 고치지 않기 위해서다. `mock.beats("bab")` 를 읽어 id 로 찾는다).

## 응답 형식

`router.py` 의 `_envelope()` 를 그대로 쓴다. 턴마다 `beat` 와 `data` 를 추가한다.

```
{ sessionId, turn, beatIndex, state, text, source, data, agent?, reason?, advisory? }
```

`data` 의 키 구조는 구간마다 `mock.json` 과 같다. 프런트는 mock/live 를 구분하지 않는다 (R1-4).

## 파일 변경 범위

| 파일 | 상태 | 담당 |
|---|---|---|
| `backend/features/bab/rules.py` | **새로 만듦** | L |
| `backend/features/bab/service.py` | 프롬프트 2개 · Agent 2개로 교체 | BE |
| `backend/features/bab/router.py` | 단계 분기 추가 (`start`·`reply` 내부) | BE |
| `backend/features/bab/samples/*.jpg` | **새로 만듦** (사진 2장) | BE |
| `backend/features/bab/mock.json` · `profiles.json` | **고치지 않음** (계약) | — |
| `tests/test_bab_rules.py` | 새로 만듦 (단위) | L |
| `tests/test_bab_flow.py` | 새로 만듦 (8구간 완주 · 자유 입력 안내) | BE |
| `frontend/src/features/bab/` · `registry.ts` | 새로 만듦 | FE |

## 하지 않는 것

새 의존성 · DB·캐시 · 에이전트 프레임워크 · `core/` 수정 · 응답 형식 변경 · 포트 변경 ·
받는 사람을 2명보다 늘리는 일반화 (프로필 JSON 이 2명이면 코드는 N명을 돌 수 있게만 쓴다)
