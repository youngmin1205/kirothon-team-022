# Kiro 환경 실측 (당일 기준 확정용)

> 측정 PC: Linux · `kiro-cli 3.2.1`
> 팀 문서 중 `kiro-cli 2.2.2` 기준으로 쓰인 부분은 이 문서가 우선합니다.

---

## 1. 결론 먼저

| 항목 | 확정 |
|---|---|
| kiro-cli 버전 | **3.x로 통일.** 측정 PC는 3.2.1. 행사 전 전원 `kiro-cli update` |
| 엔진 | **v3가 대화형 기본값.** `--v3`는 명시하지 않아도 됨 (`--v2`로 내려갈 수 있음) |
| 에이전트 설정 포맷 | **universal 포맷.** `kiro-cli agent upgrade <dir>`로 변환 |
| 훅 | **standalone `.kiro/hooks/*.json` 한 세트만 사용** (PascalCase 트리거) |
| 자동 커밋 | **사용하지 않음.** 아래 3-2 참고 |
| 실행 위치 | 레포 루트 (`.kiro/`가 루트에 있음) |

---

## 2. 에이전트 설정 포맷 (팀 문서 수정 필요)

`kiro-cli agent upgrade .kiro/agents`로 기존 2.x 설정을 변환했습니다. 두 개 모두 `agent validate` 통과(exit 0)했습니다.

### 2-1. 도구 이름이 바뀝니다

| 2.x 문서 | 3.x universal |
|---|---|
| `fs_read` | `read` |
| `fs_write` | `write` |
| `execute_bash` | `shell` |
| — | `grep`, `glob` |

`tools`는 반드시 명시합니다. 생략하면 도구 바인딩을 잃고 없는 도구를 호출하는 환각이 생깁니다(공식 이슈 #7839).

### 2-2. 권한은 `permissions.rules`

2.x의 `toolsSettings`가 아니고, `allowedTools`도 실제 권한 필드가 아닙니다.

```json
"permissions": {
  "rules": [
    { "capability": "fs_read", "match": ["./**"], "effect": "allow" },
    { "capability": "skill", "effect": "allow" }
  ]
}
```

### 2-3. 훅은 배열, 트리거는 camelCase 유지

에이전트 안에 넣는 훅은 universal 포맷에서 배열이 됩니다. 트리거 이름은 `agentSpawn` / `stop`처럼 camelCase 그대로입니다.

```json
"hooks": [
  { "name": "agentSpawn-0", "trigger": "agentSpawn",
    "action": { "type": "command", "command": "git status --short" }, "timeout": 10 }
]
```

### 2-4. `kiroUpgrade` 블록은 건드리지 않습니다

변환 시 `revision`·`fingerprint`·`source` 해시가 붙습니다. 손으로 고치면 "out-of-sync"로 판정되어 이후 `agent upgrade`가 건너뜁니다. 내용을 바꿀 때는 파일을 고치고 다시 `agent upgrade`를 돌리는 쪽이 안전합니다.

### 2-5. 내장 에이전트는 `--agent`로 못 고릅니다

`kiro-cli agent list`에는 `kiro_default`, `kiro_help`, `kiro_planner`가 보이지만, `--agent kiro_default` / `--agent kiro_planner`는 `agent "..." not found (exit 4)`로 실패합니다. **쓸 에이전트는 직접 정의해야 합니다.**

---

## 3. 훅 — 실측 결과

### 3-1. standalone과 내장 훅이 **둘 다** 실행됩니다

부수효과를 남기는 임시 훅을 심어 확인했습니다.

```
SessionStart fired at 2026-11-12T16:49:11+09:00      ← standalone .kiro/hooks/*.json
EMBEDDED agentSpawn fired at 2026-11-12T16:49:11+09:00 ← 에이전트 내장 hooks
UserPromptSubmit fired at 2026-11-12T16:49:11+09:00   ← standalone
EMBEDDED stop fired at 2026-11-12T16:49:14+09:00      ← 에이전트 내장
```

팀 문서(`docs/hooks.md`)의 "standalone은 2.2.2에서 로드 안 됨"은 **3.2.1에서는 맞지 않습니다.** 둘 다 돕니다.

> ⚠️ 그래서 이전 설정(`kirothon-base`)대로 쓰면 자동 커밋이 **이중으로** 걸립니다.
> 내장 `stop` 훅과 standalone `auto-commit.json`(PostTaskExec)이 각각 `git add -A && commit`을 실행합니다.

### 3-2. 적용한 결정

| 대상 | 조치 |
|---|---|
| `.kiro/hooks/auto-commit.json` | **삭제.** 아래 이유 |
| `build`의 내장 `stop` 훅 | **삭제.** 같은 이유 |
| `build`의 내장 `agentSpawn` 훅 | 유지 (`git status --short`) |
| `.kiro/hooks/review-on-task.json` | 유지 |
| `.kiro/hooks/secret-scan-on-save.json` | 삭제 → 스크립트로 이전 (3-3) |

자동 커밋을 쓰지 않는 이유:

- `git add -A`는 3명이 각자 작업하는 상황에서 **남의 미완성 변경까지 함께 커밋**합니다.
- 통합 시점을 11:30 / 13:00 / 15:30 / 16:30으로 고정했으므로, 그 지점에서 사람이 커밋하면 됩니다.
- 매 턴 커밋은 로그만 더럽히고 되돌리기를 어렵게 만듭니다.
- 지금 설정은 두 곳에서 동시에 걸려 있어 커밋이 이중으로 생깁니다.

남기는 것은 세션 시작 시 `git status --short` 하나입니다. 값이 싸고 내 상태를 바로 보여줍니다.

### 3-3. `secret-scan-on-save`는 훅에서 뺐습니다

원래 `.kiro/hooks/secret-scan-on-save.json`은 `PostFileSave` 트리거에 **`agent` 액션**이었습니다. 두 가지 문제가 있습니다.

- 파일을 저장할 때마다 모델을 호출합니다. 3명이 수백 번 파일을 쓰는 해커톤에서는 크레딧과 지연이 모두 문제가 됩니다.
- `PostFileSave`의 stdout은 세션에 전달되지 않습니다(stdout이 전달되는 트리거는 `SessionStart`, `UserPromptSubmit`, `PreTaskExec`, `PreCompact`, `PostCompact`). 즉 경고가 사람에게 보이지 않습니다.

비밀키는 "저장할 때"가 아니라 **"커밋할 때"** 막으면 충분하므로 [`scripts/scan-secrets.sh`](../scripts/scan-secrets.sh)로 옮겼습니다. 실측으로 탐지를 확인했습니다.

```
$ git add _tmp_secret_probe.py && ./scripts/scan-secrets.sh
❌ AWS 액세스 키 ID
   _tmp_secret_probe.py:1:AWS_KEY = "AKIA················"   (키 형태 문자열)
exit=1
```

> 위 출력의 키는 가려 적었습니다. 스캐너가 이 문서 자체를 오탐으로 잡기 때문입니다(실제로 한 번 잡혔습니다).

커밋 전과 `pnpm check`에서 돌립니다.

`review-on-task.json`은 `agent` 액션이지만 `PostTaskExec`에만 걸려 있어 빈도가 낮습니다. 유지합니다.

---

## 4. 알아둘 실행 옵션

| 옵션 | 왜 중요한가 |
|---|---|
| `--trust-workspace` | v3는 첫 실행 때 워크스페이스 신뢰를 묻습니다. **승인 전에는 훅·에이전트·MCP·워크플로가 로드되지 않습니다.** 당일 각자 한 번 승인해야 합니다. `--no-interactive`로 돌릴 때는 이 플래그가 필요합니다 |
| `--effort <low\|medium\|high\|xhigh\|max>` | 크레딧 조절. 단순 작업은 `low` |
| `--no-interactive "<프롬프트>"` | 스크립트에서 한 번만 돌릴 때 |
| `--model <MODEL>` | 모델 전환 |
| `-r` / `--resume-picker` | 세션 이어가기 |
| `--v2` | 2.x 엔진으로 내려가야 할 때의 탈출구 |

---

## 5. Steering — 실측 결과

`inclusion: fileMatch` 가 3.2.1 에서 동작합니다.

프런트 파일(`frontend/src/ui/primitives.tsx`)을 읽게 하고 로드된 steering 을 물어본 결과:

```
tech, team, structure, product, frontend
```

`backend` 는 로드되지 않았습니다. 즉 `fileMatchPattern` 이 걸린 steering 은 **해당 경로의 파일이 컨텍스트에 들어올 때만** 붙습니다. 레이어별 규칙을 영역 steering 으로 나누면 토큰을 아낄 수 있습니다.

| 파일 | inclusion | 언제 로드되나 |
|---|---|---|
| `product.md` `tech.md` `structure.md` `team.md` | `always` | 항상 |
| `frontend.md` | `fileMatch` · `frontend/**` | 프런트 파일을 볼 때만 |
| `backend.md` | `fileMatch` · `backend/**` | 백엔드 파일을 볼 때만 |

> 📌 custom agent 를 쓸 때는 steering 이 자동으로 붙지 않습니다. 에이전트 설정의 `resources` 에 명시해야 합니다.

---

## 6. MCP

`kiro-cli mcp list` 결과, `aws-docs`는 **`kiro_default`에만** 붙어 있고 워크스페이스 에이전트(`build`, `review`)는 모두 `(empty)`입니다. 즉 `--agent build`로 돌리면 **aws-docs를 쓸 수 없습니다.** 필요하면 에이전트 설정에 MCP 서버를 명시해 연결해야 합니다.

당일에 AWS 문서 조회가 꼭 필요한지는 불확실합니다. 쓰지 않으면 컨텍스트 토큰을 아낄 수 있으니, 기본은 연결하지 않는 쪽으로 둡니다.

---

## 7. 로그인

```
Logged in with IAM Identity Center (https://d-9067cd82db.awsapps.com/start)
Profile: QDefaultProfile
```

Free 플랜(월 50 크레딧)이 아니라 IAM Identity Center 계정입니다. `docs/kiro-cli-tips.md`의 "Free = 월 50" 전제는 이 PC에 해당하지 않습니다. **팀원 각자의 로그인 종류가 다를 수 있으니 각자 확인이 필요합니다.**

---

## 8. 아직 확인하지 못한 것

| 항목 | 확인 방법 | 없을 때 대안 |
|---|---|---|
| slash command 전체 목록 (`/spec`, `/plan`, `/spawn`, `/usage` 등) | 대화형으로 띄워 `/` 입력 | spec은 `docs/quick-spec.md` 2절의 자연어 프롬프트로 requirements→design→tasks를 순서대로 만들고 `.kiro/specs/<기능>/`에 저장 |
| 남은 크레딧 | 대화형에서 `/usage` | `--effort low` 기본 사용, 탐색은 `USE_MOCK=1` |
| `aws-docs` MCP 실제 호출 | 에이전트에 연결 후 질의 | 웹 검색으로 대체 |

위 세 가지는 **대화형 세션이 필요**해서 비대화형 측정으로는 확인할 수 없었습니다. 팀 점검 때 각자 한 번 띄워 확인하고 이 문서에 채웁니다.

---

## 9. 팀에 전달할 것 (전날까지)

1. `kiro-cli update` → `kiro-cli --version`이 **3.2.1 이상**인지 확인
2. 레포 루트에서 `kiro-cli` 한 번 띄워 **워크스페이스 신뢰 승인**
3. `kiro-cli agent list`에 `build`, `review`가 Workspace로 보이는지
4. 대화형에서 `/` 를 눌러 slash command 목록을, `/usage`로 크레딧을 확인해 공유
