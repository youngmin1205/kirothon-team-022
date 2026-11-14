# BUILD REPORT

<!-- Kiro를 개발 과정의 어느 단계에서, 어떤 기능으로, 무엇을 했는지 기록해 주세요.
     1차 AI 심사는 이 문서와 .kiro/ 폴더를 보고 Kiro 활용을 평가해요. -->

> 서비스: **밥은 먹었니** — 사진 한 번, 기분 버튼 하나로 엄마·아빠에게 각자 맞는 안부가 가고, 부모님은 설치 없이 버튼으로 답한다.
> 기록 기준 시각: 11/14 13:40 (커밋 `1cb5e93`). 이후 단계는 진행하면서 이어서 채운다.

## Kiro 활용 내역

| 단계 | 사용한 Kiro 기능 | 무엇을 했는지 | 결과물 위치 |
|---|---|---|---|
| 사전 준비 | Steering | 팀 규칙을 6개 파일로 나눔. product·tech·structure·team 은 항상 로드(`inclusion: always`), frontend·backend 는 해당 폴더를 건드릴 때만 로드(`fileMatch`)해서 토큰을 아낌 | `.kiro/steering/` |
| 사전 준비 | Custom agents | 3명 공용 개발 에이전트 `build` 와 별도 세션용 리뷰 에이전트 `review`. `build` 는 steering·skill 을 로드하고 공용 파일(lead 영역)을 건드리기 전에 먼저 알리도록 지시 | `.kiro/agents/build.json`, `.kiro/agents/review.json` |
| 사전 준비 | Hooks | 에이전트 시작 시 `git status` 표시(agentSpawn), task 완료 후 steering 위반·데모 깨짐·에러 처리 누락을 3줄로 지적하는 리뷰(PostTaskExec) | `.kiro/agents/build.json`, `.kiro/hooks/review-on-task.json` |
| 사전 준비 | Skills | PR 리뷰, 발표 슬라이드, 데모 영상 생성 절차를 skill 로 묶음 | `.kiro/skills/{pr-review,pitch-deck,demo-film}/` |
| 기획 | Steering (product.md) | 당일 주제 문구, 사용자·문제·해결, 데모 구간 8개, **고정 규칙**(안부 항목 4개 고정, 기분은 버튼 선택, 부모님은 고정 버튼, 프로필에 없는 항목은 코드가 먼저 걸러냄), 범위 밖, 축소안을 기록. `inclusion: always` 라서 팀원 셋의 Kiro 세션에 같은 기준이 자동으로 붙음. 기획 대화와 문서 작성은 Claude Code 로 진행 | `.kiro/steering/product.md` (커밋 `bcd0496`) |
| 설계 | — (계약 선커밋) | Kiro spec 에 들어가기 전에 화면·서버가 공유할 형식을 먼저 고정. 8구간 mock 시나리오와 고정 어휘·받는 사람 프로필. 프런트는 백엔드 로직 없이 화면을 끝까지 만들 수 있음. Claude Code 로 작성 | `backend/features/bab/mock.json`, `backend/features/bab/profiles.json` (커밋 `1cb5e93`) |
| 설계 | Spec (예정) | product.md 고정 규칙을 수락 기준으로 requirements → design → tasks 작성. 판정 에이전트(사진 → 밥·귀가), 작성 에이전트(받는 사람별 말투), 순수 코드 도구(프로필 필터·요약 조립) | `.kiro/specs/bab/` (진행 예정) |
| 구현 | Spec tasks + Hooks (예정) | tasks 를 `kiro-cli --agent build` 로 실행. task 마다 PostTaskExec 리뷰 훅이 돎 | `backend/features/bab/`, `frontend/src/features/bab/` (진행 예정) |
| 검증 | — (계약 테스트) | 문서·mock·프로필이 어긋나면 실패하는 계약 테스트 8개. 구간 id 일치, AI 판정은 밥·귀가만, 아빠 메시지에 기분 언급 없음, 링크를 안 열어도 말풍선에 요약이 있음, 부모님 반응은 고정 버튼만. `pnpm smoke` 로 bab 8구간 완주 확인 | `tests/test_bab_contract.py` |
| 기타 | MCP | (사용하면 기록) | `.kiro/settings/mcp.json` |

## 개발 과정에서 바뀐 점

- **아이디어 교체:** 1차 채점에서는 "오늘 뭐 시켜"(95점)가 선정됐지만, 결선 배점(문제 정의 25 + 사용자 가치 25)에서 가장 강한 "밥은 먹었니"로 최종 변경. 약점이던 작동·Kiro 점수는 아래 설계 변경으로 메움 (`docs/idea-selection.md`)
- **부모님 앱 → 설치 없음:** 처음 안은 부모님 화면(❤️·📞)이 있는 앱이었으나, 부모님 설치·로그인에서 사용이 멈춘다고 보고 자녀만 앱을 쓰는 구조로 바꿈. 부모님은 카톡·문자 **본문만 봐도** 안부를 알고, 링크는 답할 때만 연다
- **기분을 AI 판정 → 버튼 선택:** 사진으로 컨디션까지 판정하면 틀릴 위험이 커서, 기분은 자녀가 버튼(😊 좋아 · 🙂 괜찮아 · 😪 피곤해 · 😵 바빠 · 🤒 아파)으로 고르고 직접 입력도 허용. AI 판정은 밥·귀가로 좁힘
- **부모님도 안부를 보냄:** 노인 사용자로 넓히는 안을 검토. 별도 앱·음성 입력은 범위와 위험이 커서 버리고, 링크 페이지의 고정 버튼(🍚 나도 밥 먹었어 · 🏥 병원 다녀왔어 등)으로 양방향만 추가
- **받는 사람별 개인화:** 엄마(밥·귀가·기분, 다정하게) / 아빠(귀가만, 짧게)처럼 프로필로 공개 항목과 말투를 나눔. 설정 화면은 범위 밖으로 두고 JSON 으로 고정

## 어려웠던 점과 해결 방법

- **사진 판정이 틀리면 데모가 무너짐:** 판정 범위를 밥·귀가로 줄이고, 자녀가 칩을 확인·수정하는 `confirm` 구간을 넣음. 그래도 불안하면 `judge` 만 mock 으로 고정하는 축소안을 product.md 에 미리 적어 둠
- **핵심이 프롬프트라 spec·테스트로 보여줄 게 적음:** 안부 항목·기분·부모님 버튼을 고정 어휘(enum)로 만들어 수락 기준과 순수 코드 테스트가 생기게 함
- **비공개 항목이 메시지에 새어 나갈 위험:** "말하지 마"를 프롬프트로 막지 않고, 프로필에 없는 항목은 코드가 먼저 걸러낸 뒤 모델에 넘기기로 함. 계약 테스트에서 "아빠 메시지에 '피곤' 없음"으로 확인
