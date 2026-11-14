# Custom Agents 구성법 (2-5)

> 목표: 당일 **분담 방식이 정해지면 바로 에이전트를 찍어낼 수 있게** 틀을 준비한다.
> custom agent = "이름 + 역할 프롬프트 + 쓸 수 있는 도구 + 참고 리소스"를 묶은 설정.

---

## 1. 위치와 공유
- repo `.kiro/agents/<이름>.json` → **git 공유**.
- kiro-cli에서 `/agents` 로 목록 확인·전환. IDE에서는 에이전트 선택 UI.

> ⚠️ 에이전트 설정 스키마는 버전에 따라 필드가 다를 수 있다. 처음엔 `/agents`(또는 IDE의 agent 생성)로 **한 개를 만들어 생성된 파일 형식을 확인**한 뒤, 이 예시를 그 형식에 맞춰 복제하는 것을 권장.

---

## 2. 우리 팀 에이전트 — `build` 와 `review`

두 개만 쓴다. 왜 두 개인지는 §3.

### `build` — 3명 전원이 평소 쓰는 것

`.kiro/agents/build.json`

```bash
kiro-cli --agent build              # 레포 루트에서
kiro-cli agent set-default build    # 팀 기본으로 지정(선택)
```

- steering 6개와 skill 전부를 `resources` 로 로드한다
- 도구: `read` `write` `shell` `grep` `glob`
- 세션 시작 시 `git status --short` 를 컨텍스트에 넣는다. **자동 커밋은 하지 않는다**([`hooks.md`](hooks.md) §3)

### `review` — 읽기 전용 리뷰어

`.kiro/agents/review.json`

```bash
kiro-cli --agent review "방금 변경사항을 리뷰해줘"
```

- 도구에 `write` 가 **없다.** 그래서 소스를 고칠 수 없다 (실측 확인: 파일 생성 요청에 "쓰기 도구가 없다"고 답하고 파일이 안 생겼다)
- 통합 체크포인트 전과 제출 전에 **별도 세션**으로 돌린다. 구현하던 세션에서 리뷰하면 자기 코드를 변호하고, 긴 컨텍스트를 상위 모델로 또 읽는다
- ⚠️ `shell` 은 있다(`git diff` 때문). 셸로 파일을 쓰는 것까지 막지는 못한다. 실수 방지용 가드레일이고 보안 경계는 아니다

### 설정 예시와 필드

```json
{
  "name": "review",
  "description": "읽기 전용 리뷰어",
  "prompt": "...역할 지침...",
  "tools": ["read", "grep", "glob", "shell"],
  "resources": [
    "file://.kiro/steering/**/*.md",
    "skill://.kiro/skills/pr-review/SKILL.md"
  ],
  "permissions": {
    "rules": [
      { "capability": "fs_read", "match": ["./**"], "effect": "allow" },
      { "capability": "skill", "effect": "allow" }
    ]
  }
}
```

필드 의미:
- `name` / `description`: 목록에 표시. **파일 이름이 아니라 `name` 이 에이전트 이름이다**
- `prompt`: 이 에이전트의 역할·행동 규칙 (가장 중요)
- `tools`: 사용 가능한 도구 목록 ⚠️ **반드시 넣을 것** — 생략 시 도구 바인딩을 잃고 가짜 도구 호출을 환각할 수 있음(공식 이슈 #7839). **제한은 이 목록으로 거는 게 확실하다**
- `resources`: 항상 컨텍스트에 넣을 파일. `file://`(파일) 와 `skill://`(스킬) URI 지원. 글롭 가능
- `permissions.rules`: `capability` + `match`(글롭) + `effect`(`allow`/`deny`)

> 📌 **3.2.1 실측 기준 (이전 판 수정)**
> - **도구 이름이 바뀌었습니다.** `fs_read`→`read`, `fs_write`→`write`, `execute_bash`→`shell`. 그 외 `grep`, `glob`
> - **권한 필드는 `permissions`입니다.** 2.x의 `toolsSettings`가 아니고, `allowedTools`는 validate는 통과하지만 실제 권한 필드가 아닙니다
> - `permissions.rules` 에서 확인된 `capability` 는 `fs_read` 와 `skill` 뿐입니다. 쓰기·셸을 경로 단위로 막는 이름은 확인하지 못했습니다. **그래서 제한은 `tools` 목록으로 겁니다** (추측한 권한 이름은 validate 를 통과해도 실제로 안 걸릴 수 있습니다 — `allowedTools` 가 그 경우였습니다)
> - **custom agent 는 steering 을 자동 로드하지 않습니다.** `resources` 에 넣어야 합니다. `file://.kiro/steering/**/*.md` 로 넣으면 `fileMatch` 로 나눈 것까지 전부 항상 로드됩니다(실측). 토큰을 아끼려면 필요한 파일만 나열하면 되지만, 규칙이 안 붙는 쪽이 더 위험해서 전부 넣었습니다
> - 기존 2.x 설정은 `kiro-cli agent upgrade .kiro/agents`로 변환합니다(`--dry-run`으로 먼저 확인). 변환 시 `kiroUpgrade` 해시 블록이 붙는데, 손으로 고치면 이후 upgrade가 그 파일을 건너뜁니다
> - **내장 에이전트(`kiro_default`, `kiro_planner`, `kiro_help`)는 `--agent`로 선택할 수 없습니다.** `agent list`에는 보이지만 `not found (exit 4)`가 납니다. 쓸 에이전트는 직접 정의해야 합니다
> - 자세한 내용은 [`kiro-env.md`](kiro-env.md)

---

## 3. 왜 사람 수만큼 만들지 않는가

처음에는 `lead` · `frontend` · `backend` · `reviewer` 4개를 생각했지만 2개로 줄였다. 근거는 이렇다.

| 에이전트가 주는 것 | 사람별로 쪼갤 이유가 되나 |
|---|---|
| steering 자동 로드 | 아니다. 제대로 설정된 **하나**면 된다 |
| 모델 지정 (크레딧) | 작업 성격별로는 의미 있다 → `review` 를 가벼운 모델로. 사람별은 아니다 |
| 역할 프롬프트 | 거의 없다. `frontend.md` · `backend.md` **fileMatch steering 이 같은 일을 한다** (건드리는 파일에 따라 자동으로 붙는다) |
| 경로 권한 | 애매하다. 3명이 **각자 clone** 으로 일하므로 충돌은 `git pull --rebase` 에서 난다. 내 에이전트가 `frontend/` 를 못 쓰게 막는 건, 내가 프런트 담당일 때 아무것도 막지 못한다 |

숨은 비용도 있다. 팀 안에 CLI 버전이 갈려 있었고, 에이전트 json 은 버전마다 권한 필드명이 다르다. **에이전트가 4개면 당일 아침에 깨질 표면이 4개다.**

소유권은 없애지 않고 위치만 옮겼다. 에이전트 권한이 아니라 [`structure.md`](../.kiro/steering/structure.md) 의 소유권 표와 플레이북에 적는다.

---

## 4. 당일 필요하면 추가할 것 — `spec`

실패 양상이 하나 있다. **spec 을 만들라고 했는데 에이전트가 코드를 쓰기 시작하는 것.** 11:10~11:40 은 레버리지가 가장 큰 30분이라 여기서 코드로 새면 타격이 크다.

그 경우 쓰기 도구를 `write` 만 주고 프롬프트로 `.kiro/specs/` 와 `product.md` 외에는 만들지 말라고 묶은 `spec` 에이전트를 추가한다. 리허설에서 `build` 로 spec 을 만들어 보고 실제로 코드로 새는지 확인한 뒤 결정한다.

---

## 5. 서브에이전트 (쓰지 않는 쪽으로 둠)

오케스트레이터 에이전트의 `tools` 에 `subagent` 를 넣으면 다른 에이전트를 부를 수 있고 병렬로 돈다. 다만 크레딧이 빠르게 닳고, 사람이 보지 않는 동안 코드가 쌓인다. 6시간짜리 해커톤에서는 **사람 1명 = 터미널 1개 = `build` 세션 1개**가 더 예측 가능하다. 필요해지면 그때 켠다.

---

## 5-1. 분담 방식별 에이전트 템플릿 (참고)

> 담당 1(1-6)에서 **기능별 / 레이어별 / 세션별** 중 분담이 정해지면 아래처럼 찍어낸다.

### (A) 기능별 분담
- `agent-featureA`, `agent-featureB` ... 각 에이전트 prompt에 "담당 기능 범위 + 건드리면 안 되는 폴더" 명시.

### (B) 레이어별 분담
- `agent-frontend`: React/Vite만. `resources`에 `structure.md`.
- `agent-backend`: FastAPI/Bedrock만. `resources`에 `tech.md` + `backend/core/bedrock.py`.

### (C) 역할별(워크플로우) 분담
- `agent-spec`: requirements→design→tasks 작성 전담.
- `agent-impl`: tasks 구현 전담.
- `agent-reviewer`: 위 `review`.

> 지금은 (B)·(C) 를 에이전트로 쪼개지 않는다. 레이어별 규칙은 `frontend.md`·`backend.md`
> fileMatch steering 이 담당하고, 리뷰만 `review` 로 분리했다. 이유는 §3.

---

## 6. 동작 확인 (완료 기준)

```bash
kiro-cli agent validate --path .kiro/agents/build.json     # 에러 없으면 유효
kiro-cli agent validate --path .kiro/agents/review.json
kiro-cli agent list                                        # build, review 가 Workspace 로 보임
```

실측으로 확인할 것 두 가지. 목록에 보이는 것만으로는 부족하다.

1. **steering 이 붙는가** — `kiro-cli --agent build` 로 "로드된 steering 파일 이름만 나열해라" 를 물어본다.
   `tech.md, team.md, structure.md, product.md, frontend.md, backend.md` 가 나오면 OK
2. **`review` 가 못 쓰는가** — `kiro-cli --agent review` 로 파일 생성을 요청한다.
   "쓰기 도구가 없다" 고 답하고 파일이 안 생기면 OK

## 7. 팁

- prompt 는 **짧고 금지사항을 명확히**. 장황하면 토큰만 먹는다
- 제한은 `permissions` 보다 **`tools` 목록**으로 거는 게 확실하다 (§2 실측 메모)
- 모델을 다르게 지정할 수 있다 (리뷰=가벼운 모델, 구현=상위 모델) → 크레딧 절약
- 코드 레벨 오케스트레이션(제품 안의 에이전트)은 `backend/core/agent_loop.py` 다. 여기서 말하는 custom agent 와는 다른 것이다
