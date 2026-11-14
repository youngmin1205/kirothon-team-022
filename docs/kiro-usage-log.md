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
- 완료한 task 수: `grep -c "\- \[x\]" .kiro/specs/*/tasks.md`
- 전체 task 수: `grep -cE "\- \[(x| )\]" .kiro/specs/bab/tasks.md`
- 수락 기준을 지키는 테스트 수: `uv run pytest -q 2>&1 | tail -1`

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
> 13:00~13:50 에 Claude Code 로 작성했다. spec 3파일과 task 1 부터 Kiro 로 진행했다.

### 15:30

### 17:00
