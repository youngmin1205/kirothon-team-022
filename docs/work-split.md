# 작업 분배 · 각자 시작하는 법 (밥은 먹었니)

> 13:50 작성. 아이디어 요약은 [`bab-idea.html`](bab-idea.html), 규칙 원본은 [`.kiro/steering/product.md`](../.kiro/steering/product.md).
> 계약 파일은 이미 main 에 있다: `backend/features/bab/mock.json` · `profiles.json` · `tests/test_bab_contract.py`
>
> **14:00 변경 — task 1 담당이 채연(BE) → 영신(L) 으로 바뀌었다.** 순수 코드 도구(프로필 필터 · 요약 ·
> 말풍선 조립)를 `backend/features/bab/rules.py` 로 분리해 영신이 맡는다. 채연은 에이전트 2개와 단계
> 진행에 집중한다. 파일이 갈려서 같은 파일을 동시에 고치지 않는다.

## 0. 분배는 이렇게 한다

1. **영신이 Kiro 대화형으로 spec 3파일을 만든다** (`.kiro/specs/bab/` — 14:00~14:15, 생길 예정)
2. **Kiro 가 `tasks.md` 에 `L` · `BE` · `FE` 라벨을 붙이고, 영신이 읽고 확정한다** (Kiro 는 사람을 배정하지 않는다)
3. **각자 `kiro-cli --agent build` 를 열고 task 를 하나씩 시킨다**

spec 을 기다리는 15분 동안 세민·채연은 아래 "spec 전에 할 것"을 한다. 놀지 않는다.

### Kiro 에게 말하는 법

"내 할 일 알려줘"만으로는 안 된다. **Kiro 는 누가 말하는지 모르고, `docs/` 는 자동으로 읽지 않는다.**
매번 **누구인지 + 어느 파일 + 한 개만**을 말한다.

```
나는 세민(FE)이야. docs/work-split.md 의 "세민" 절과
.kiro/specs/bab/tasks.md 의 FE task 를 읽고, 다음 미완료 task 하나만 해줘.
끝나면 tasks.md 에 체크하고 pnpm smoke 로 데모가 완주하는지 확인해줘.
```

- task 하나가 끝나면 **사람이 확인 → 커밋**한다 (자동 커밋 없음). 그다음 task
- 꼬이면 새 프롬프트를 쓰지 말고 `/rewind`. 세션이 길어지면 `/compact`
- **15분 넘게 막히면 팀 채널에 공유**
- 리뷰가 필요하면 별도 세션: `kiro-cli --agent review "방금 변경사항 리뷰해줘"`

## 1. 남은 시간표

| 시각 | 영신 (L) | 채연 (BE) | 세민 (FE) |
|---|---|---|---|
| 14:00~14:15 | spec 3파일 (Kiro 대화형) | Bedrock 확인 · 샘플 사진 | mock 으로 화면 틀 시작 |
| 14:15~14:20 | tasks 라벨 확정 → 채널 공지 | 하던 것을 task 번호에 맞춤 | 하던 것을 task 번호에 맞춤 |
| 14:20~15:30 | **task 1** `rules.py` → push · 통합 · Kiro 기록 | **웨이브 2** 로직 (task 2·3·4) | **웨이브 2** 8구간 화면 |
| **15:30** | 🔴 체크포인트 2 — 통합 | live 1회 확인 | **영상 v1 녹화** |
| 15:30~16:30 | BUILD_REPORT · README | 예외 처리 · 품질 | 연출 · 슬라이드 준비 |
| **16:30** | 🔴 체크포인트 3 | | 영상 v2 · 슬라이드 |
| **17:00** | 🛑 **feature freeze** — 이후 버그·안정화만 | | |
| 17:00~17:45 | `docs/submission-kit.md` 따라 제출 | 대기 · 버그 | 대기 · 버그 |

모든 체크포인트에서 각자:

```bash
git add -A && git commit -m "<한 줄>" && git pull --rebase --autostash && git push
pnpm smoke                      # 실패하면 기능 추가 멈추고 그것부터 고친다
```

## 2. 화면 ↔ 서버 입력 계약 (FE·BE 둘 다 지킨다)

`mock.json` 은 **서버 → 화면** 형식이다. 아래는 **화면 → 서버** 형식이다. `send(text, { files, payload })` 로 보낸다.

| 구간 | text (say) | payload | files |
|---|---|---|---|
| `upload` | 사용자 한 줄 | `{ "mood": { "key": "tired", "custom": null }, "note": null }` | 사진 1~3장 |
| `confirm` | "맞아, 이대로 보내" | `{ "checks": [ { "item": "meal", "status": "done", "detail": "점심 김치찌개" }, … ] }` (수정한 값) | — |
| `react` | "(엄마) 나도 밥 먹었어" | `{ "from": "mom", "pressed": ["heart", "ate"] }` | — |
| 그 외 | say 그대로 | 없음 | — |

- key 는 `profiles.json` 의 값만 쓴다 (`mood`: good/ok/tired/busy/sick/custom, 버튼: heart/call/ate/hospital/fine)
- `custom` 은 직접 입력일 때만 문자열, 아니면 `null`
- **`#play` 는 say 만 보내고 payload·사진을 보내지 않는다** (`frontend/src/app/useDemo.ts:307`).
  그래서 서버는 **payload·사진이 없으면 데모 기본값을 쓴다** (기분 = tired, 사진 = `samples/`, 버튼 = heart·ate)

---

## 3. 영신 (L) — spec · 분배 · 통합 · 제출

**시작 명령**

```bash
git pull --rebase --autostash && pnpm smoke
kiro-cli --agent build          # 반드시 대화형. --no-interactive 금지 (리허설에서 227초 날림)
```

**첫 Kiro 프롬프트 (spec)**

```
"밥은 먹었니" 를 spec 으로 만들어줘. 폴더는 .kiro/specs/bab/ 이다.
기획은 .kiro/steering/product.md 에 있다. 데모 구간 8개를 그대로 쓰고 새로 만들지 마.
"고정 규칙" 절의 항목을 requirements 의 수락 기준으로 옮겨줘.
화면·서버 형식은 이미 정해져 있다: backend/features/bab/mock.json(서버→화면),
docs/work-split.md 2장(화면→서버), backend/features/bab/profiles.json. 바꾸지 마.
design 은 backend.md 의 "여러 에이전트·단계가 있을 때" 규칙 3개를 지킨다.
LLM 은 judge(사진→밥·귀가) 와 compose(받는 사람별 말투) 두 곳만 쓰고,
프로필 필터·요약 조립·단계 진행은 순수 코드로 한다.
requirements 부터 보여주고, 내가 확인하면 design, 그다음 tasks 순서로 진행해줘.
```

**라벨 프롬프트 (tasks 가 나온 뒤)**

```
tasks.md 의 각 항목에 담당 라벨을 붙여줘. L · BE · FE 세 개만 쓴다.
L = 공용 파일과 통합, BE = backend/features/bab/ 와 tests/,
FE = frontend/src/features/bab/ 와 deliverables/.
같은 파일을 건드리는 task 는 한 라벨로 몰고, 각 task 는 1명이 20~40분에 끝낼 크기로 해줘.
docs/work-split.md 4장의 예상 task 목록과 비슷하게 맞춰줘.
```

**체크리스트**

- [ ] 14:00 spec — requirements 확인 (핵심 시나리오 1개, 로그인·설정은 범위 밖인가)
- [ ] design 확인 (지금 뼈대로 되는가, 단계는 `s.state["step"]` 인가)
- [ ] tasks 확인 → 라벨 → 커밋·push → **채널에 "tasks 나왔다, 번호 맞춰라" 공지**
- [ ] **task 1 (L)** — `backend/features/bab/rules.py` + 단위 테스트. 채연이 task 3·4 에서 import 하므로 **14:20 까지 push**
- [ ] spec 3파일·라벨 화면 **캡처** (`docs/kiro-usage-log.md` 의 캡처할 장면 5개)
- [ ] 15:30 체크포인트 2 — 전원 push 확인 → `pnpm smoke` → 데모 1회 재생
- [ ] PostTaskExec 리뷰 훅이 돈 장면 캡처, `docs/kiro-usage-log.md` 에 시각별 한 줄씩
- [ ] `BUILD_REPORT.md` 의 "(예정)" 행을 실제 내용으로 바꿈 (spec·task 수·훅)
- [ ] README 맨 위 실행법 한 줄 (`pnpm bootstrap` → `pnpm mock`)
- [ ] 16:30 체크포인트 3
- [ ] 17:00 freeze 선언. 범위 축소는 영신이 혼자 결정 (`product.md` 축소안 1·2단계)
- [ ] 17:00~17:45 `docs/submission-kit.md` 위에서부터

**건드리지 말 것:** 기능 폴더 안 코드 (담당자 몫). 고쳐야 하면 담당자에게 말한다

---

## 4. 예상 task 목록 (spec 이 나오면 번호로 맞춘다)

| # | 라벨 | task | 끝났다는 기준 |
|---|---|---|---|
| 1 | **L** | 순수 코드 도구 `backend/features/bab/rules.py`: 프로필 필터 · 요약 조립 · 말풍선 조립 + 단위 테스트 | 아빠에게 넘기는 입력에 mood 없음, 요약 문자열이 mock 과 같은 모양 |
| 2 | BE | 단계 진행: 라우터가 `s.state["step"]` 으로 구간을 세고, upload·confirm·deliver·react·reply 는 코드로 data 생성 | live 에서도 8구간이 순서대로 나옴 |
| 3 | BE | judge 에이전트: 사진 → `checks` (meal·home 만), 첨부 없으면 `samples/` 사진 | 응답 data 가 mock 의 judge 와 같은 모양 |
| 4 | BE | compose 에이전트: 필터된 항목만 받아 받는 사람별 말투로 text 작성 | 엄마·아빠 메시지가 다르고, 아빠 text 에 기분 언급 없음 |
| 5 | FE | 화면 틀: `features/bab` + registry, 자녀 폰 · 부모님 폰 두 대 | `pnpm mock` 에서 8구간이 화면에 보임 |
| 6 | FE | upload: 사진 선택 + 기분 버튼 6개 + 직접 입력 | 2장 계약대로 send |
| 7 | FE | judge·confirm: 칩 표시 + 눌러서 수정 | 수정값이 confirm payload 로 감 |
| 8 | FE | compose·deliver: 엄마/아빠 카드 나란히, 부모님 폰 말풍선 + 링크 미리보기 | 본문만으로 요약이 읽힘 |
| 9 | FE | react·reply: 부모님 버튼, 자녀 폰 토스트 + 축하 연출 | `celebrate` 에서 한 번만 연출 |
| 10 | FE | `deliverables/product.md` · 영상 · 슬라이드 | 16:30 에 영상 v2 · 슬라이드 PDF |
| 11 | L | 통합 · Kiro 기록 · README · 제출 | 17:45 제출 |

---

## 5. 채연 (BE) — 판정 · 작성 에이전트, 단계 진행

**시작 명령**

```bash
git pull --rebase --autostash && pnpm smoke
./scripts/aws-check.sh --invoke         # Bedrock 실제 호출 되는지. 결과 두 줄을 채널에 공유
kiro-cli --agent build
```

**spec 전에 할 것 (14:00~14:15)**

- [ ] `aws-check --invoke` 통과 (안 되면 바로 채널에. mock 으로도 데모는 돈다)
- [ ] 데모용 샘플 사진 2장을 `backend/features/bab/samples/` 에 둔다 (생길 예정): `lunch.jpg`(김치찌개 점심), `door.jpg`(현관·집 도착). 직접 찍거나 저작권 없는 사진, 각 1MB 이하
- [ ] `backend/features/bab/mock.json` · `profiles.json` · 이 문서 2장을 읽는다

**첫 Kiro 프롬프트 (spec 나오기 전)**

```
나는 채연(BE)이야. backend/features/bab/ 를 맡는다.
backend/features/bab/mock.json, profiles.json, docs/work-split.md 2장을 읽고
지금 service.py 와 router.py 가 무엇을 하는지, 실제 로직을 넣으려면 무엇이 필요한지 5줄로 요약해줘.
아직 코드는 고치지 마. 곧 .kiro/specs/bab/tasks.md 가 나온다.
```

**tasks 가 나온 뒤**

```
나는 채연(BE)이야. .kiro/specs/bab/tasks.md 의 BE task 중 다음 미완료 하나만 해줘.
docs/work-split.md 2장 입력 계약과 mock.json 의 data 모양을 지킨다.
끝나면 uv run pytest 와 pnpm smoke 를 돌려줘.
```

**체크리스트**

- [ ] task 1 순수 코드 도구는 **영신(L)** 이 `rules.py` 로 만든다. 채연은 그걸 import 해서 쓴다 (14:20 까지 올라온다)
- [ ] task 2 단계 진행 — **`beat_index` 로 분기하지 않는다** (mock 재생기 전용). `s.state["step"]`
- [ ] task 3 judge — 첨부 없으면 `samples/` 사진, 기분은 판정하지 않음
- [ ] task 4 compose — 프로필에 없는 항목은 **모델에 넘기기 전에** 코드로 뺀다
- [ ] `start` 는 payload 없이도 동작 (`#play`·smoke 가 빈 값으로 start 한다)
- [ ] 모델이 JSON 을 안 주면 `data` 가 None → mock 값으로 채워 화면이 안 깨지게
- [ ] 15:30 `USE_MOCK=0 pnpm dev` 로 live 8구간 1회 → 결과를 세민에게 (영상 v1 은 live 로 찍는다)
- [ ] 15:30~16:30 예외: 사진 판정 실패 시 `status: "unknown"`, 직접 입력 기분은 뜻을 바꾸지 않음

> **BE 를 세션 둘로 나눠 할 때 — `service.py`(task 3·4) ↔ `router.py`(task 2) 계약.**
> 같은 파일을 동시에 고치지 않으려고 파일을 가른다. `STEPS` 는 `service.py` 에만 정의한다.
> router 세션은 redefine 하지 말고 아래를 import 해서 단계에 꽂는다:
>
> ```python
> from .service import FEATURE, STEPS, orchestrator, run_judge, run_compose
> # judge 단계:   data = run_judge(session, files)   # session.state["facts"]["checks"] 도 채워짐
> # compose 단계: data = run_compose(session)         # {"messages": [...]}  (받는 사람 수만큼)
> ```
>
> mock 모드(`USE_MOCK=1`)는 기존 `orchestrator.run()` 재생 경로 그대로 — 위 두 함수는 live 에서만 탄다.

**완료 기준:** `uv run pytest` · `pnpm smoke` 통과, live 에서 judge·compose 가 mock 과 같은 모양
**건드리지 말 것:** `backend/main.py`, `backend/core/`, `backend/features/bab/rules.py`(영신 담당), `mock.json` 의 구간 id. 형식을 바꿔야 하면 먼저 세민·영신에게
**넘겨줄 것:** live 응답 예시 1벌 (세민 연출·슬라이드 숫자용)

---

## 6. 세민 (FE) — 8구간 화면 · 영상 · 슬라이드

**시작 명령**

```bash
git pull --rebase --autostash
pnpm mock                       # 서버(8000) + 화면(5173). 화면에서 ?feature=bab
kiro-cli --agent build          # 다른 터미널
```

**spec 전에 할 것 (14:00~14:15) — 바로 시작한다. 백엔드를 기다리지 않는다**

```
나는 세민(FE)이야. frontend/src/features/bab/ 를 맡는다.
frontend/src/features/sample/index.tsx 를 참고해서 frontend/src/features/bab/index.tsx 를 만들고
src/features/registry.ts 에 bab 한 줄을 추가해줘 (label "밥은 먹었니", layout "phone").
서버 응답 모양은 backend/features/bab/mock.json 의 beats[].data 다.
useDemo({ feature: 'bab' }) 의 dataByBeat 로 구간마다 그리고, 화면 부품은 src/ui/ 것을 쓴다.
우선 8구간이 각각 한 덩어리로라도 보이게만 해줘. #play · data-beat 신호는 건드리지 마.
끝나면 pnpm smoke 를 돌려줘.
```

**tasks 가 나온 뒤**

```
나는 세민(FE)이야. .kiro/specs/bab/tasks.md 의 FE task 중 다음 미완료 하나만 해줘.
docs/work-split.md 2장 입력 계약과 docs/bab-idea.html 3장 화면 예시를 따른다.
끝나면 pnpm smoke 를 돌려줘.
```

**체크리스트**

- [ ] task 5 틀 — `pnpm mock` → `#play` 로 8구간 끝까지
- [ ] task 6 upload — `FilePick` + 기분 버튼 6개(😊 좋아 · 🙂 괜찮아 · 😪 피곤해 · 😵 바빠 · 🤒 아파 · ✏️ 직접 입력)
- [ ] task 7 judge·confirm 칩 (`Chip`), 눌러서 수정
- [ ] task 8 엄마/아빠 카드 나란히 + 부모님 폰 말풍선 · 링크 미리보기 (큰 글씨)
- [ ] task 9 부모님 버튼 5개, 자녀 폰 "엄마도 밥 드셨대요" (`Toast`) + 축하 연출은 `reply` 에서 한 번만
- [ ] `pnpm smoke:ui` 통과 (브라우저까지)
- [ ] 15:30 **영상 v1** — `pnpm build` 후 live(`USE_MOCK=0`), 실패하면 mock. `docs/day-of-playbook.md` 체크포인트 표 참고
- [ ] 16:30 `deliverables/product.md` 를 새 주제로 채움 (`capture.beats` id 8개 = product.md 와 같게, `celebrate.at` = `reply`)
- [ ] 16:30 영상 v2 · `npm --prefix deliverables run ppt` 로 슬라이드 PDF

**완료 기준:** `pnpm smoke:ui` 통과, 영상 mp4 · 슬라이드 PDF 가 나옴
**건드리지 말 것:** `id="play"`, `data-beat`/`data-state`, `.phone > .screen`, `src/app/`, `src/types/api.ts`.
새 화면 부품이 필요하면 `src/ui/` 에 추가한다고 영신에게 먼저 말한다
**넘겨줄 것:** 15:30 영상 v1 링크, 16:30 슬라이드 PDF

---

## 7. 알려진 함정

| 함정 | 결과 | 대응 |
|---|---|---|
| `#play` 는 사진·payload 를 안 보낸다 | live 녹화에서 judge 가 사진 없이 돈다 | 서버가 `samples/` 사진과 기본값을 붙인다 (채연) |
| 단계를 `beat_index` 로 센다 | mock 에서만 돌고 live 에서 다음 단계가 안 불린다 | `s.state["step"]` (채연) |
| 계약을 말없이 바꾼다 | 상대 화면·서버가 멈춘다, `test_bab_contract.py` 실패 | 바꾸기 전에 채널에 공유 |
| `deliverables/product.md` 를 안 채우고 `ppt` | 리허설 주제 슬라이드가 나온다 | 16:30 에 먼저 채움 (세민) |
| 17:00 이후 기능 추가 | 제출 직전 데모가 깨진다 | freeze. 버그만 |
