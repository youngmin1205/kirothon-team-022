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
| Hooks | 에이전트 작업이 끝날 때마다 자동 커밋 |
| Goal | 완료 조건을 정해 두고 반복 구현 |
| MCP / Powers | (당일 쓴 것) |

## 캡처할 장면 5개 (발표의 "Kiro 활용" 장면에 씁니다)
- [ ] spec 3파일(requirements, design, tasks)이 생성된 화면
- [ ] `/agent list`에 역할별 에이전트가 보이는 화면
- [ ] lead 에이전트가 하위 작업을 나눠 주는 화면
- [ ] 훅이 자동 커밋한 로그 (`git log --oneline --grep "auto: agent turn"`)
- [ ] steering 파일

## 실측 수치 (17:00에 채움 → `deliverables/product.md`의 `kiro.metrics`로 옮김)
- 자동 커밋 수: `git log --oneline --grep "auto: agent turn" | wc -l`
- 완료한 task 수: `grep -c "\- \[x\]" .kiro/specs/*/tasks.md`

## Kiro 활용 설명서 (주최 측이 요구하면 채움)
### 대화 구조 (vibe coding)
### hooks로 자동화한 작업
### spec 구조와 효과
### steering 전략
### MCP·Powers로 가능해진 기능

## 기록
