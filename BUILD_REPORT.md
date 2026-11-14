# BUILD REPORT

<!-- Kiro를 개발 과정의 어느 단계에서, 어떤 기능으로, 무엇을 했는지 기록해 주세요.
     1차 AI 심사는 이 문서와 .kiro/ 폴더를 보고 Kiro 활용을 평가해요. -->

> 서비스: **밥은 먹었니** — 사진 한 번, 기분 버튼 하나로 엄마·아빠에게 각자 맞는 안부가 가고, 부모님은 설치 없이 버튼으로 답한다.
> 기록 기준 시각: 11/14 14:15 (커밋 `cb2a06d`). 이후 단계는 진행하면서 이어서 채운다.

## Kiro 활용 내역

| 단계 | 사용한 Kiro 기능 | 무엇을 했는지 | 결과물 위치 |
|---|---|---|---|
| 사전 준비 | Steering | 팀 규칙을 6개 파일로 나눔. product·tech·structure·team 은 항상 로드(`inclusion: always`), frontend·backend 는 해당 폴더를 건드릴 때만 로드(`fileMatch`)해서 토큰을 아낌 | `.kiro/steering/` |
| 사전 준비 | Custom agents | 3명 공용 개발 에이전트 `build` 와 별도 세션용 리뷰 에이전트 `review`. `build` 는 steering·skill 을 로드하고 공용 파일(lead 영역)을 건드리기 전에 먼저 알리도록 지시 | `.kiro/agents/build.json`, `.kiro/agents/review.json` |
| 사전 준비 | Hooks | 에이전트 시작 시 `git status` 표시(agentSpawn), task 완료 후 steering 위반·데모 깨짐·에러 처리 누락을 3줄로 지적하는 리뷰(PostTaskExec) | `.kiro/agents/build.json`, `.kiro/hooks/review-on-task.json` |
| 사전 준비 | Skills | PR 리뷰, 발표 슬라이드, 데모 영상 생성 절차를 skill 로 묶음 | `.kiro/skills/{pr-review,pitch-deck,demo-film}/` |
| 기획 | Steering (product.md) | 당일 주제 문구, 사용자·문제·해결, 데모 구간 8개, **고정 규칙**(안부 항목 4개 고정, 기분은 버튼 선택, 부모님은 고정 버튼, 프로필에 없는 항목은 코드가 먼저 걸러냄), 범위 밖, 축소안을 기록. `inclusion: always` 라서 팀원 셋의 Kiro 세션에 같은 기준이 자동으로 붙음. 기획 대화와 문서 작성은 Claude Code 로 진행 | `.kiro/steering/product.md` (커밋 `bcd0496`) |
| 설계 | — (계약 선커밋) | Kiro spec 에 들어가기 전에 화면·서버가 공유할 형식을 먼저 고정. 8구간 mock 시나리오와 고정 어휘·받는 사람 프로필. 프런트는 백엔드 로직 없이 화면을 끝까지 만들 수 있음. Claude Code 로 작성 | `backend/features/bab/mock.json`, `backend/features/bab/profiles.json` (커밋 `1cb5e93`) |
| 설계 | **Spec (requirements · design)** | `kiro-cli --agent build` 대화형으로 `.kiro/specs/bab/` 생성. product.md "고정 규칙" 절을 **수락 기준 R1~R8** 로 옮김 (예: R4-2 "아빠에게 넘기는 모델 입력에 `mood` 가 없다"). design 에서 `core/agent_loop.py` 를 읽고 **받는 사람별로 임시 `Session` 을 분리**하기로 결정 — 이력을 공유하면 엄마용 응답이 아빠용 호출 입력에 섞여 코드 필터가 무의미해진다. live 에서만 터질 버그를 구현 전에 잡음 | `.kiro/specs/bab/requirements.md`, `design.md` (커밋 `35da104`) |
| 구현 분배 | **Spec (tasks)** | task 11개에 `L` · `BE` · `FE` 라벨. task 마다 `_요구사항: R3, R4_` 로 수락 기준을 연결해 "끝났다"의 기준을 문서화. 선행 의존은 task 1 하나뿐이고 나머지는 독립이라 3명이 동시에 진행 | `.kiro/specs/bab/tasks.md` (커밋 `35da104`) |
| 구현 | **Spec task 1 + Steering** | 순수 코드 규칙 `rules.py` 를 Kiro 로 구현 (프로필 필터 · 요약 · 말풍선 조립 · 입력 정규화 · mock 폴백). steering `backend.md`·`product.md` 가 항상 붙어 있어 "고정 어휘는 `profiles.json` 에서 읽는다"·"`core/` 는 고치지 않는다" 를 따로 지시하지 않음. 단위 테스트 18개를 함께 생성하다 `build_summary` 가 모델 응답에 없는 `emoji`·`label` 키를 믿고 있던 `KeyError` 를 발견해 수정 | `backend/features/bab/rules.py`, `tests/test_bab_rules.py` (커밋 `cb2a06d`) |
| 구현 | **Spec task 3 (judge) + Agent** | `service.py` 에 `JUDGE_SYSTEM` 과 `judge` 에이전트(`parse=parse_json_block`). 사진→**밥·귀가만** 판정(R2), 첨부 없으면 `samples/` 사진을 붙이고, 모델이 기분을 끼워 넣어도 `rules.normalize_checks` 가 코드로 제거. 모델이 JSON 을 안 주면 `rules.mock_data("judge")` 로 폴백(R8). `service.profiles()` 중복을 `rules.profiles()` 로 합침 | `backend/features/bab/service.py` (커밋 `5cd6b87`) |
| 구현 | **Spec task 4 (compose) + Agent** | `COMPOSE_SYSTEM` + `compose` 에이전트. 받는 사람마다 `rules.filter_facts` 로 **공개 항목만 남겨** 모델에 넘기고(R4), 받는 사람별 **임시 `Session`** 으로 기분 누수 차단(R4-2). 요약은 `rules.build_summary` 가 코드로 조립(R5-4), 본문 text 만 모델이 씀. 흐름 테스트 4개로 "아빠 메시지에 기분 0건·엄마≠아빠" 확인 | `backend/features/bab/service.py`, `tests/test_bab_flow.py` (커밋 `5cd6b87`) |
| 구현 | **Spec task 2 + 세션 간 인터페이스 핸드오프** | service.py 가 `STEPS`·`run_judge`·`run_compose` 를 인터페이스로 노출 → **다른 Kiro 세션이 이를 import 해 `router.py` 단계 배선**(`s.state["step"]`)을 구현. 같은 파일을 동시에 고치지 않아 병렬 작업이 충돌 없이 합쳐짐. live 는 구간별 data 를 만들고 mock 은 기존 재생 경로 유지(R1), data 가 비면 mock 폴백(R8-4) | `backend/features/bab/router.py`·`service.py` (커밋 `7afe587`·`5cd6b87`) |
| 구현 | **Spec tasks 5~9 (FE) + Steering (frontend.md)** | 세민. task 5~9 의 수락 기준을 그대로 화면 테스트로 옮겨 구현 기준으로 삼음 (예: "아빠 카드 본문에 `피곤`·`😪` 0건", "직접 누른 경로가 입력 계약대로 보낸다"). steering `frontend.md` 의 `#play`·`data-beat` 고정 규칙 때문에 녹화·smoke 경로를 건드리지 않고 화면만 갈아엎을 수 있었음. 코드 작성은 Claude Code 로 했고 PostTaskExec 훅은 돌지 않았다. 대신 완료 기준을 tasks.md 체크와 vitest 로 남김 | `frontend/src/features/bab/`, `bab.test.tsx` (커밋 `6f64299`) |
| 구현 | Spec (계약 확장) | 실제 폰 두 대 테스트용 화면. `?view=child`(자녀 단독·공유 시트·답장 폴링), `?view=mom&s=`(부모님 링크). `deliver` 응답에 `session` 필드와 `GET /api/bab/link/{id}` 를 **추가만** 해서 계약 테스트(`test_bab_contract.py`)가 그대로 통과 | `frontend/src/features/bab/remote.tsx`, `router.py` (커밋 `72e0fc6`) |
| 검증 → Spec 갱신 | **Spec requirements 수정 + Custom agent `review`** | live 에서 "밥이 아닌 사진도 '밥 잘 먹었어'" 버그를 발견. 원인 3단계를 고치면서 **수락 기준을 먼저 고침**: R2-3 보강(올린 사진이 있으면 샘플로 바꾸지 않는다), **R4-5 신설**(확인 뒤에도 `unknown` 인 항목은 누구에게도 보내지 않는다). 기준마다 테스트 4개. 수정 후 `kiro-cli chat --no-interactive --agent review` 로 커밋 범위를 리뷰 → `OK` | `.kiro/specs/bab/requirements.md`, `tests/test_bab_photo_reuse.py`, `tests/test_bab_rules.py` (커밋 `72e0fc6`·`677e8a5`) |
| 산출물 | Skills (pitch-deck · demo-film) | `.kiro/skills/` 의 절차서대로 `deliverables/product.md` 영상 대본·capture beats 8개·`celebrate.at=reply` 를 채우고 슬라이드 PDF·데모 영상을 생성. 실행은 Claude Code 가 SKILL.md 를 읽고 수행. 최종 데모 영상은 템플릿 대신 앱 화면을 live(Bedrock)로 그대로 녹화 | `deliverables/product.md`, `deliverables/tools/record-app.cjs` |
| 검증 | — (계약 테스트 + 단위 테스트) | 문서·mock·프로필이 어긋나면 실패하는 계약 테스트 8개 + 수락 기준을 직접 확인하는 단위 테스트 18개. 구간 id 일치, AI 판정은 밥·귀가만, **아빠 입력에 `mood` 키 자체가 없음**, 링크를 안 열어도 말풍선에 요약이 있음, 부모님 반응은 고정 버튼만. `pytest` 53개 통과, `pnpm smoke` 로 bab 8구간 완주(USE_MOCK=1) | `tests/test_bab_contract.py`, `tests/test_bab_rules.py`, `tests/test_bab_flow.py` |
| 검증 | **live 실측 (USE_MOCK=0 · Bedrock)** | `pnpm dev` 를 live 로 띄워 8구간 1회 완주. judge·compose 가 **실제 Bedrock(claude-sonnet-4-5) 호출**(폴백 경고 0건)되고, **아빠 메시지에 기분 표현 0건(R4-2)·엄마≠아빠(R5-3)** 를 live 에서 재확인 — mock 재생이 아니라 실제 모델 경로에서도 코드 필터가 지켜짐을 확인 | `backend/features/bab/{service,router}.py` |
| 기타 | MCP | (사용하면 기록) | `.kiro/settings/mcp.json` |

## 개발 과정에서 바뀐 점

- **아이디어 교체:** 1차 채점에서는 "오늘 뭐 시켜"(95점)가 선정됐지만, 결선 배점(문제 정의 25 + 사용자 가치 25)에서 가장 강한 "밥은 먹었니"로 최종 변경. 약점이던 작동·Kiro 점수는 아래 설계 변경으로 메움 (`docs/idea-selection.md`)
- **부모님 앱 → 설치 없음:** 처음 안은 부모님 화면(❤️·📞)이 있는 앱이었으나, 부모님 설치·로그인에서 사용이 멈춘다고 보고 자녀만 앱을 쓰는 구조로 바꿈. 부모님은 카톡·문자 **본문만 봐도** 안부를 알고, 링크는 답할 때만 연다
- **기분을 AI 판정 → 버튼 선택:** 사진으로 컨디션까지 판정하면 틀릴 위험이 커서, 기분은 자녀가 버튼(😊 좋아 · 🙂 괜찮아 · 😪 피곤해 · 😵 바빠 · 🤒 아파)으로 고르고 직접 입력도 허용. AI 판정은 밥·귀가로 좁힘
- **부모님도 안부를 보냄:** 노인 사용자로 넓히는 안을 검토. 별도 앱·음성 입력은 범위와 위험이 커서 버리고, 링크 페이지의 고정 버튼(🍚 나도 밥 먹었어 · 🏥 병원 다녀왔어 등)으로 양방향만 추가
- **모르는 것은 말하지 않기:** 처음에는 사진으로 모르는 항목도 "귀가 확인 안 됨"으로 보냈다. 정직하지만 부모님을 불안하게 만들어서, 확인 뒤에도 `unknown` 이면 메시지에서 빼기로 바꿈 (R4-5)
- **받는 사람별 개인화:** 엄마(밥·귀가·기분, 다정하게) / 아빠(귀가만, 짧게)처럼 프로필로 공개 항목과 말투를 나눔. 설정 화면은 범위 밖으로 두고 JSON 으로 고정

## 어려웠던 점과 해결 방법

- **사진 판정이 틀리면 데모가 무너짐:** 판정 범위를 밥·귀가로 줄이고, 자녀가 칩을 확인·수정하는 `confirm` 구간을 넣음. 그래도 불안하면 `judge` 만 mock 으로 고정하는 축소안을 product.md 에 미리 적어 둠
- **핵심이 프롬프트라 spec·테스트로 보여줄 게 적음:** 안부 항목·기분·부모님 버튼을 고정 어휘(enum)로 만들어 수락 기준과 순수 코드 테스트가 생기게 함
- **비공개 항목이 메시지에 새어 나갈 위험:** "말하지 마"를 프롬프트로 막지 않고, 프로필에 없는 항목은 코드가 먼저 걸러낸 뒤 모델에 넘기기로 함. 계약 테스트에서 "아빠 메시지에 '피곤' 없음"으로 확인
- **코드로 걸러도 대화 이력으로 새어 나갈 수 있음:** `Agent.run()` 이 세션 이력을 누적하고 Converse 가 전체 이력을 보내므로, 엄마용 메시지를 먼저 만들면 그 응답("…오늘은 좀 피곤해서…")이 **아빠용 호출의 입력**에 들어간다. 받는 사람별로 등록하지 않은 임시 `Session` 을 쓰도록 design 단계에서 고침. 임시 세션의 `beat_index` 를 해당 구간으로 맞춰 두어 Bedrock 실패 시 그 구간 mock 값으로 떨어지는 폴백도 같이 얻음
- **BE 를 두 Kiro 세션으로 나누다 같은 파일(router)을 중복 구현:** 먼저 `service.py` 가 인터페이스(`STEPS`·`run_judge`·`run_compose`)를 노출하고 다른 세션이 그걸 import 하도록 **경계를 파일 단위로 갈라** 둔 덕에, router 가 양쪽에서 만들어졌을 때도 이미 통합된(그 위에 FE 가 쌓인) 구현을 기준으로 삼고 중복본만 폐기해 충돌 없이 정리했다. 인터페이스를 먼저 고정한 설계가 어느 구현을 버려도 service 쪽 작업을 보존했다
- **live 로만 터지는 버그를 mock 뒤에 숨기지 않기:** smoke(USE_MOCK=1)는 늘 통과하지만 실제 모델 경로는 다르다. 제출 전 `USE_MOCK=0` 으로 8구간을 한 번 돌려 judge·compose 가 실제 Bedrock 을 타고 폴백 없이 수락 기준(아빠 기분 0건 등)을 지키는지 눈으로 확인했다
- **"밥이 아닌 사진도 밥 먹었어요" (live 에서만 보이는 버그, 원인 3겹):** ① 화면이 사진을 `upload` 요청에만 싣고 `judge` 요청에는 싣지 않았다. ② 서버는 첨부가 없으면 `#play` 용 샘플 밥 사진으로 판정했다(R2-3). ③ 그걸 고쳐도 compose 프롬프트의 `items` 가 *프로필의 공개 항목 목록*이라, 판정에서 빠진 밥·귀가를 모델이 "잘 먹었어"로 지어냈다. 모델 자체는 슬라이드 캡처를 넣으면 처음부터 "음식 사진 없음"이라고 답했다. 즉 프롬프트·Guardrails 의 문제가 아니라 **입력 배선**의 문제였다. 화면은 judge 에도 사진을 싣고, 서버는 업로드 사진을 세션에 보관하고, 모델에는 *값이 있는 항목만* 넘기도록 고쳤다. 보낼 사실이 없으면 모델을 부르지 않는다
