# Hooks 가이드

> 기준: **kiro-cli 3.2.1** 실측. 측정 근거와 다른 환경 정보는 [`kiro-env.md`](kiro-env.md)에 있습니다.
> 이전 판은 2.2.2 기준으로 "standalone 훅은 로드되지 않는다"고 적었습니다. **3.x에서는 로드됩니다.** 그 서술은 폐기했습니다.

---

## 0. 훅을 둘 수 있는 곳이 두 군데입니다

| 위치 | 트리거 표기 | 액션 | 3.2.1에서 |
|---|---|---|---|
| **standalone** `.kiro/hooks/<id>.json` | PascalCase (`SessionStart`, `PostToolUse`, `PostFileSave`, `PostTaskExec` …) | `command` 또는 `agent` | **실행됨** ✅ |
| **agent 내장** `.kiro/agents/<name>.json`의 `hooks` 배열 | camelCase (`agentSpawn`, `userPromptSubmit`, `preToolUse`, `postToolUse`, `stop`) | `command` | **실행됨** ✅ |

> ⚠️ **둘 다 동시에 돕니다.** 같은 일을 두 곳에 걸면 두 번 실행됩니다. 실측 로그:
> ```
> SessionStart fired            ← standalone
> EMBEDDED agentSpawn fired     ← agent 내장
> UserPromptSubmit fired        ← standalone
> EMBEDDED stop fired           ← agent 내장
> ```

**팀 규칙: 자동화는 standalone 한 곳에만 둡니다.** agent 내장 훅은 "그 에이전트일 때만 필요한 것"에만 쓰고, 지금은 `agentSpawn`의 `git status --short` 하나뿐입니다.

---

## 1. standalone 훅 (기본으로 쓰는 쪽)

`.kiro/hooks/<id>.json`:

```json
{
  "version": "v1",
  "hooks": [
    {
      "name": "Quick review after task",
      "trigger": "PostTaskExec",
      "action": { "type": "agent", "prompt": "…" }
    }
  ]
}
```

- `trigger`: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `PreTaskExec`, `PostTaskExec`, `PreCompact`, `PostCompact`, `PostFileCreate`, `PostFileSave`, `PostFileDelete`
- `matcher`(선택): 정규식. `PreToolUse`/`PostToolUse`는 **도구 이름**에, `PostFile*`는 **파일 경로**에 적용됩니다. 나머지 트리거에서는 무시됩니다
- `action.type`
  - `command` — STDIN으로 이벤트 JSON을 받고 **exit code로 통신**합니다. 0 성공, `PreToolUse`·`UserPromptSubmit`·`PreTaskExec`·`PreCompact`에서 **2는 차단**
  - `agent` — 프롬프트를 컨텍스트에 주입합니다. **모델을 호출하므로 크레딧을 씁니다**
- `enabled: false`로 끌 수 있습니다

### stdout이 세션에 전달되는 트리거만 경고를 띄울 수 있습니다

`SessionStart`, `UserPromptSubmit`, `PreTaskExec`, `PreCompact`, `PostCompact`. 그 외(예: `PostFileSave`)에서 `command` 훅이 뭘 출력해도 **사람에게 보이지 않습니다.** 이걸 몰라서 "저장할 때 비밀키 경고" 훅이 무용지물이었습니다(§3).

---

## 2. agent 내장 훅

`.kiro/agents/build.json`:

```json
"hooks": [
  {
    "name": "agentSpawn-0",
    "trigger": "agentSpawn",
    "action": { "type": "command", "command": "git status --short" },
    "timeout": 10
  }
]
```

- 2.x에서는 객체(`{"agentSpawn": [...]}`) 형태였고, 3.x universal 포맷에서는 **배열**입니다. `kiro-cli agent upgrade .kiro/agents`가 변환해 줍니다
- 그 에이전트가 활성일 때만 동작합니다

---

## 3. 현재 레포의 훅 (3개 → 1개)

| 파일 | 상태 | 이유 |
|---|---|---|
| `review-on-task.json` | **유지** | `PostTaskExec`에만 걸려 빈도가 낮습니다 |
| `auto-commit.json` | **삭제** | `git add -A`가 3인 작업에서 남의 미완성 코드를 삼킵니다. 게다가 agent 내장 `stop` 훅과 중복이라 커밋이 두 번 생겼습니다. 통합 체크포인트(11:30/13:00/15:30/16:30)에서 사람이 커밋합니다 |
| `secret-scan-on-save.json` | **삭제** | `PostFileSave` + `agent` 액션이라 저장마다 모델을 호출했고, 그 트리거는 stdout이 전달되지 않아 경고가 보이지 않았습니다. [`scripts/scan-secrets.sh`](../scripts/scan-secrets.sh)로 옮겼습니다 |

---

## 4. 동작 확인

```bash
# 레포 루트에서. 첫 실행 시 워크스페이스 신뢰를 승인해야 훅이 로드된다
kiro-cli --agent build
```

훅이 실제로 **실행되는지**는 목록을 보는 것으로 알 수 없습니다. 모델이 파일을 읽어 그대로 읊을 수 있기 때문입니다. 부수효과로 확인합니다.

```bash
# 임시 훅을 하나 심고
cat > .kiro/hooks/_probe.json <<'EOF'
{ "version": "v1", "hooks": [
  { "name": "probe", "trigger": "SessionStart",
    "action": { "type": "command", "command": "echo fired >> /tmp/kiro-probe.log" } }
]}
EOF

rm -f /tmp/kiro-probe.log
kiro-cli chat --no-interactive --trust-workspace --effort low "ok" >/dev/null
cat /tmp/kiro-probe.log      # "fired"가 있으면 실행됨

rm .kiro/hooks/_probe.json   # 반드시 정리
```

---

## 5. 당일 주의

- 훅에 `agent` 액션을 새로 붙일 때는 **트리거 빈도를 먼저 보세요.** 파일 저장이나 도구 호출마다 걸면 크레딧이 빠르게 녹습니다
- 훅이 느리면 매 턴이 느려집니다. `timeout`을 짧게 둡니다
- `PreToolUse`에서 exit 2로 차단하는 훅은 작업을 멈추게 할 수 있습니다. 해커톤 중에는 쓰지 않는 쪽이 안전합니다
