# Kiro 활용 기록 (발표 자료용)

> 과거 Kiro 해커톤은 Kiro를 어떻게 썼는지 설명하는 자료를 따로 요구했습니다.
> Kiro 기능을 의미 있게 쓸 때마다 한 줄씩 추가하고, 발표 직전에 이 목록에서 "Kiro 활용" 슬라이드를 만듭니다.

형식: `- HH:MM | 기능 | 무엇에 썼는가 | 효과(시간 절약, 오류 방지 등)`

| 기능 | 예시 |
|---|---|
| Spec | requirements → design → tasks로 핵심 흐름을 정의 |
| Steering | product/tech/structure로 세 에이전트의 규칙을 통일 |
| Custom agents | frontend/backend/db 전담 에이전트가 담당 폴더만 수정 |
| Sub-agents | lead 에이전트가 세 영역을 병렬로 분배 |
| Hooks | 에이전트 작업이 끝날 때마다 리뷰 훅이 steering 위반을 지적 |
| Goal | 완료 조건을 정해 두고 반복 구현 |
| MCP / Powers | (당일 쓴 것) |

## 캡처할 장면 5개 (발표의 "Kiro 활용" 장면에 씁니다)
- [ ] spec 3파일(requirements, design, tasks)이 생성된 화면
- [ ] `/agent list`에 역할별 에이전트가 보이는 화면
- [ ] tasks.md 의 L/BE/FE 라벨로 셋이 나눠 작업하는 화면
- [ ] PostTaskExec 리뷰 훅이 task 완료 직후 지적한 화면
- [ ] steering 파일

## 실측 수치 (17:00에 채움 → `deliverables/product.md`의 `kiro.metrics`로 옮김)
- 완료한 task 수: **10** / 전체 **11** (task 11 = 통합·기록·제출)
- 수락 기준을 지키는 테스트 수: 백엔드 **64개** (계약 8 · rules 22 · flow 9 · photo_reuse 2 · core 23), 프런트 **30개**
- 요구사항 수: **R1~R8** (각 3~6개 수락 기준)

## Kiro 활용 설명서 (주최 측이 요구하면 채움)
### 대화 구조 (vibe coding)
### hooks로 자동화한 작업
### spec 구조와 효과
### steering 전략
### MCP·Powers로 가능해진 기능

## 기록

### 13:00 (영신 / lead)

- `13:57 | Spec | kiro-cli --agent build 대화형으로 .kiro/specs/bab/ requirements → design → tasks 를 단계별 확인하며 생성. product.md "고정 규칙" 절을 수락 기준 R1~R8 로 옮김 | 팀원 셋이 "끝났다"를 같은 문장으로 판단한다. task 마다 _요구사항: R3, R4_ 가 달려 구두 합의가 필요 없다`
- `14:05 | Spec (design) | 설계 단계에서 core/agent_loop.py 를 읽고 "받는 사람별로 임시 Session 분리" 를 결정. 이력을 공유하면 엄마용 응답이 아빠용 호출 입력에 섞여 들어가 코드 필터가 무의미해진다 | live 에서만 터질 버그를 구현 전에 잡았다. 임시 세션의 beat_index 를 맞춰 두어 Bedrock 실패 시 해당 구간 mock 으로 떨어지는 폴백도 공짜로 얻었다`
- `14:13 | Spec tasks + Steering | task 1(rules.py) 을 Kiro 로 구현. steering backend.md·product.md 가 항상 붙어 있어 "고정 어휘는 profiles.json 에서 읽는다"·"core/ 는 고치지 않는다" 를 따로 지시하지 않았다. 단위 테스트 18개를 함께 생성 | 테스트를 쓰는 중 build_summary 가 모델 응답에 없는 emoji·label 키를 믿고 있던 KeyError 를 발견해 고쳤다`

> 기획 문서(product.md·idea-cards·idea-selection)와 계약 파일(mock.json·profiles.json·계약 테스트)은
> 13:00~13:50 에 작성했다. spec 3파일과 task 1 부터 Kiro 로 진행했다.

### 15:30 (채연 / BE)

- `15:10 | Spec tasks(3·4) + Custom agent build | kiro-cli --agent build 로 service.py 의 judge·compose 에이전트를 spec 수락기준(R2·R4·R5)에 맞춰 구현. task 마다 _요구사항: R#_ 로 "끝"의 기준이 박혀 있다 | 스펙→코드가 1:1로 이어져 구두 합의 없이 진행, 리뷰·검증이 빨라짐`
- `15:20 | Spec 경계 설계(세션 분업) | service.py 가 STEPS·run_judge·run_compose 를 인터페이스로 노출 → 다른 Kiro 세션이 import 해 router(task 2)를 구현. 같은 파일을 동시에 안 고침 | 두 세션 병렬 작업이 충돌 없이 합쳐짐. 인터페이스를 먼저 고정해 중복 구현이 생겨도 한쪽만 버리고 나머지는 보존`
- `15:30 | live 검증(USE_MOCK=0 · Bedrock) | 실제 모델로 8구간 1회 완주. judge·compose 가 폴백 없이 돌고, 아빠 메시지에 기분 0건(R4-2)을 live 에서 재확인 | mock 재생과 달리 "실제 모델에서도 수락기준이 지켜진다"를 증거로 확보`

### 15:30 (영신 / lead)

- `15:50 | Spec (requirements 갱신) | live 에서 "밥이 아닌 사진도 '밥 잘 먹었어'" 버그를 발견하고, 코드보다 수락 기준을 먼저 고쳤다. R2-3 보강(올린 사진이 있으면 샘플로 바꾸지 않는다) + R4-5 신설(확인 뒤에도 unknown 인 항목은 누구에게도 보내지 않는다) | 기준마다 테스트 4개가 붙어서, 같은 버그가 다시 들어오면 pytest 가 먼저 막는다`
- `15:54 | Spec → 테스트 | R2-3·R4-5 를 tests/test_bab_photo_reuse.py 와 test_bab_rules.py 로 옮김 | "고쳤다"의 근거가 대화가 아니라 실행 가능한 테스트로 남았다`
- `15:55 | Custom agent (review) | kiro-cli chat --no-interactive --agent review 로 해당 커밋 범위를 읽기 전용 리뷰 → OK | 쓰기 도구가 없는 별도 세션이라 리뷰가 코드를 건드리지 않는다. 구현 세션과 판단이 섞이지 않았다`

### 17:00 (채연 / BE)

- `16:40 | Spec-first 기능 추가(R9) | 범위 밖이던 "받는 사람 말투·호칭·보이스"를 requirements→코드→테스트 순으로 추가. 불변식 테스트로 "말투를 바꿔도 걸러진 기분은 다시 안 들어온다"를 보장. FE(＋시트 말투 칩·호칭 입력)까지 붙어 end-to-end 동작 | 말투는 AI·공개여부는 코드 — 신뢰 포인트를 테스트로 증명`
- `16:55 | Hooks(PostTaskExec 리뷰) + 멀티세션 충돌 병합 | task 완료마다 리뷰 훅이 돎. 팀원의 사실검증 로직과 내 R9 변경이 겹친 rebase 충돌을 양쪽 다 살려 병합 | 여러 세션 동시 작업에서도 데모를 안 깨고 통합`
- `17:00 | 실측 | 완료 task 10/11 · 테스트 64개 통과 · ruff·pytest·pnpm smoke green · live judge·compose 정상`

### 17:00 (영신 / lead)

- `16:25 | Spec (requirements R4-6) + 코드 가드레일 | "아직"을 눌렀는데 메시지가 "확인 못했어요"·"점심 잘 먹었어"로 나오던 문제를 프롬프트가 아니라 코드로 고정: 모델에는 코드가 만든 사실 문장만, 상태가 바뀌면 낡은 설명 삭제, 출력 검증 → 1회 재시도 → 코드 문장 폴백 | 테스트 4개를 더해 백엔드 64개. 프롬프트 설득이 아니라 수락 기준으로 막았다`
- `17:00 | Steering (팀 규칙) | 공용 파일 소유권과 포트·#play·data-beat 고정 규칙이 always 로 붙어 있어, 세 명이 같은 파일을 동시에 고치는 일 없이 체크포인트마다 smoke 가 통과했다 | 통합 비용이 거의 0 이었다. 충돌 정리에 쓴 시간 대신 버그 3건을 더 잡았다`
- `17:20 | 제출 정리 | 테스트 수를 실측(백엔드 64 · 프런트 30 · spec task 11)해 README·BUILD_REPORT 의 수치를 하나로 맞추고, 플레이스홀더·죽은 링크를 제거 | 1차 심사가 레포 내용만 보므로, 문서 간 숫자 모순을 제출 전에 없앴다`
