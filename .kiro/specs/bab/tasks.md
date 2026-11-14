# 작업 — 밥은 먹었니 (`bab`)

> 요구사항: [`requirements.md`](requirements.md) · 설계: [`design.md`](design.md)
> 담당 분배와 시작 명령은 [`docs/work-split.md`](../../../docs/work-split.md).
>
> 라벨: **L** = lead(영신, 공용 파일·통합) · **BE** = 채연(`backend/features/bab/`·`tests/`) ·
> **FE** = 세민(`frontend/src/features/bab/`·`deliverables/`)
>
> task 하나가 끝나면 **사람이 확인하고 커밋한다.** 자동 커밋은 쓰지 않는다.
> 체크포인트(15:30 / 16:30)마다 `pnpm smoke` 가 통과한 상태만 커밋한다.

## 웨이브 2 — 로직과 화면 (14:20~15:30)

- [ ] **1. `rules.py` 순수 코드 도구 + 단위 테스트** — `L`
  - `backend/features/bab/rules.py` 를 새로 만든다. 모델을 호출하지 않는다
  - `normalize_mood` · `normalize_checks` · `normalize_pressed` · `filter_facts` ·
    `build_summary` · `build_bubble` · `build_preview` · `mock_data(beat)`
  - 고정 어휘는 `profiles.json` 에서 읽는다. 코드에 다시 적지 않는다
  - `tests/test_bab_rules.py`: 아빠 입력에 `mood` 없음 / 요약 문자열이 `mock.json` 과 같은 모양 /
    허용 밖 key 는 기본값으로 떨어짐
  - _요구사항: R3, R4, R5-4, R6, R7-1·2·3_
  - **14:20 까지 push.** task 3·4 가 이걸 import 한다

- [ ] **2. 단계 진행을 `s.state["step"]` 으로** — `BE`
  - `router.py` 에 `STEPS` 와 `_advance()` 를 넣고, `start` 는 `home`, `reply` 는 다음 구간을 만든다
  - `home` · `upload` · `confirm` · `deliver` · `react` · `reply` 의 `data` 를 `rules.py` 로 만든다
  - **`beat_index` 로 분기하지 않는다.** mock 모드는 기존 `orchestrator.run()` 재생 경로를 유지한다
  - `start` 는 `payload` 없이 200
  - _요구사항: R1-1·2·3, R8-3_

- [ ] **3. `judge` 에이전트 (사진 → 밥·귀가)** — `BE`
  - `service.py` 에 `JUDGE_SYSTEM` 과 `Agent(name="judge", parse=parse_json_block)`
  - 첨부가 없으면 `samples/lunch.jpg`·`door.jpg` 를 `Attachment` 로 붙인다 (파일이 없으면 사진 없이 진행)
  - 임시 `Session` + `beat_index = STEPS.index("judge")` 로 호출한다 (실패 시 judge 의 mock 값으로 떨어짐)
  - 판정 결과를 `s.state["facts"]["checks"]` 에 넣는다. 기분은 판정하지 않는다
  - `service.py` 의 `profiles()` 는 `rules.profiles()` 와 중복이다. **이 task 에서 `rules` 쪽으로 합치고
    `service.py` 쪽을 지운다** (두 곳에 남으면 고정 어휘가 어긋난다)
  - _요구사항: R2 전체, R8-1·4_

- [ ] **4. `compose` 에이전트 (받는 사람별 말투)** — `BE`
  - `COMPOSE_SYSTEM` + `Agent(name="compose", parse=parse_json_block)`
  - **받는 사람마다** `rules.filter_facts()` 를 먼저 거치고, 받는 사람당 한 번씩 호출한다
  - 받는 사람마다 **임시 `Session` 을 따로** 쓴다 (이력이 섞이면 아빠 호출에 기분이 들어간다)
  - `summary` 는 `rules.build_summary()` 결과를 쓴다. 모델 출력으로 만들지 않는다
  - `tests/test_bab_flow.py`: 아빠용 `text`·`summary` 에 기분 표현 0건, 엄마용과 아빠용이 다름
  - _요구사항: R4, R5, R3-3_

- [ ] **5. 화면 틀 (8구간이 보인다)** — `FE`
  - `frontend/src/features/bab/index.tsx` + `src/features/registry.ts` 한 줄
    (label `밥은 먹었니`, layout `phone`)
  - 자녀 폰 · 부모님 폰 두 대. `useDemo({ feature: 'bab' })` 의 `dataByBeat` 로 구간마다 그린다
  - `id="play"` · `data-beat` · `data-state` 신호는 건드리지 않는다
  - _요구사항: R1-1·5_

- [ ] **6. `upload` — 사진 선택 + 기분 버튼** — `FE`
  - `FilePick` 으로 사진 1~3장, 기분 버튼 6개(😊 🙂 😪 😵 🤒 ✏️), `custom` 선택 시 입력칸
  - `docs/work-split.md` 2장 형식으로 `send(text, { files, payload })`
  - _요구사항: R3-1·2_

- [ ] **7. `judge`·`confirm` — 칩 표시와 수정** — `FE`
  - `Chip` 으로 `checks` 를 그린다. `status` 세 값이 구분된다
  - 눌러서 수정한 값이 `confirm` 의 `payload.checks` 로 간다
  - _요구사항: R2-1·2_

- [ ] **8. `compose`·`deliver` — 두 메시지와 부모님 폰** — `FE`
  - 엄마용·아빠용 카드를 나란히. 항목과 말투가 다른 것이 보인다
  - 부모님 폰에 말풍선 본문 + 링크 미리보기 카드. 큰 글씨(`fontScale`)
  - _요구사항: R5-1·2·3, R6-1·2·3_

- [ ] **9. `react`·`reply` — 부모님 버튼과 축하 연출** — `FE`
  - 부모님 버튼 5개, 누른 값이 `payload.pressed` 로 간다
  - 자녀 폰에 `Toast` "엄마도 밥 드셨대요". `celebrate` 는 `reply` 에서 **한 번만**
  - _요구사항: R7-2·4_

## 웨이브 3 — 품질과 산출물 (15:30~17:00)

- [ ] **10. 발표 산출물** — `FE`
  - `deliverables/product.md` 의 `capture.beats` id 8개를 `product.md` 와 같게, `celebrate.at` = `reply`
  - 15:30 영상 v1(live, 실패하면 mock) → 16:30 영상 v2 + 슬라이드 PDF
  - _요구사항: R1-2_

- [ ] **11. 통합 · Kiro 기록 · 제출** — `L`
  - 체크포인트 15:30 / 16:30: 전원 push → `pnpm smoke` → 데모 1회 재생
  - `docs/kiro-usage-log.md` (13:00 · 15:30 · 17:00) · `BUILD_REPORT.md` 의 "(예정)" 행 교체
  - README 맨 위 실행 한 줄 → 17:00 freeze → 17:45 `docs/submission-kit.md` 따라 제출
  - _요구사항: R1-5, R8-2_

## 끝났다고 보는 기준

```bash
uv run ruff check . && uv run pytest -q     # 계약 테스트 포함 전부 통과
pnpm smoke                                  # USE_MOCK=1 로 8구간 완주
USE_MOCK=0 pnpm dev                         # live 로도 8구간 (15:30 에 1회)
```

축소안이 필요하면 task 9 → task 3 순서로 뺀다 (`product.md` 축소안 1·2단계). 결정은 lead 가 한다.
