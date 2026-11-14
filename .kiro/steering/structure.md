---
inclusion: always
---

# 폴더 구조 & 소유권

> 에이전트가 새 파일을 만들 때 이 구조를 따른다.
> **핵심 규칙: 기능 하나 = 폴더 하나.** 그래서 세 사람이 같은 파일을 동시에 고치지 않는다.

## 구조

```
<repo 루트>                     ← kiro-cli 는 항상 여기서 실행한다
├── .kiro/
│   ├── steering/              product.md(당일) tech.md structure.md team.md
│   │                          frontend.md backend.md (해당 폴더에서만 로드)
│   ├── agents/                build.json  ship.json
│   ├── hooks/                 standalone 훅 (PascalCase 트리거)
│   ├── settings/mcp.json
│   ├── skills/                pr-review  pitch-deck  demo-film
│   └── specs/<기능>/           requirements.md  design.md  tasks.md (당일 생성)
├── backend/
│   ├── main.py                앱. features/ 를 자동 등록. ← 공용
│   ├── core/                  config · bedrock · agent_loop · session · mock  ← 공용
│   └── features/<기능>/        router.py · service.py · mock.json  ← 1인 소유
├── frontend/
│   ├── src/app/               셸 · 화면 상태(입력·재생) · 구간 신호  ← 공용
│   ├── src/ui/                공용 화면 부품  ← 공용
│   ├── src/lib/api.ts         호출 래퍼  ← 공용
│   ├── src/types/api.ts       화면·서버 공통 형식  ← 공용
│   └── src/features/<기능>/    화면  ← 1인 소유
├── scripts/                   preflight · aws-check · smoke · ui-check · scan-secrets · score-ideas
├── tests/                     백엔드 테스트
├── docs/                      가이드 · 채점표 · 플레이북 · 제출 키트
├── deliverables/              발표 슬라이드 · 영상 도구  ← 담당3 소유
├── .env.example  package.json  pyproject.toml  README.md
```

## 소유권 (충돌 방지의 핵심)

| 구역 | 누가 고치나 |
|---|---|
| `backend/features/<기능>/`, `frontend/src/features/<기능>/` | 그 기능 담당 1명 |
| `backend/main.py`, `backend/core/`, `frontend/src/app/`, `src/ui/`, `src/types/api.ts` | **lead 만** |
| `.kiro/steering/product.md` | lead 만 |
| `deliverables/` | 담당3 |

- 공용 파일을 고쳐야 하면 먼저 알린다. 특히 `types/api.ts` 는 양쪽이 동시에 멈추는 지점이다
- **API 형식은 lead 가 먼저 커밋한다** (11:25, mock.json). 그때부터 프런트는 백엔드를 기다리지 않는다

## 새 기능 추가하는 법

1. `backend/features/<이름>/` 에 `router.py` · `service.py` · `mock.json` 을 만든다 → 자동 등록된다
2. `frontend/src/features/<이름>/index.tsx` 를 만들고 `src/features/registry.ts` 에 한 줄 추가한다
3. `mock.json` 의 beat id 를 `.kiro/steering/product.md` 의 데모 구간 id 와 똑같이 맞춘다
4. `pnpm smoke` 로 구간이 순서대로 완료되는지 확인한다

이름은 백엔드와 프런트가 같아야 한다 (`/api/<이름>` 으로 연결된다).

## 네이밍

- Python: `snake_case.py`, 클래스 `PascalCase`
- TS/React: 컴포넌트 `PascalCase.tsx`, 그 외 `camelCase.ts`
- 문서: `kebab-case.md`
- 데모 구간 id: 영문 소문자 (`intro`, `risk-score`, `end`)

## 규칙

- 비밀키는 어떤 폴더에도 평문으로 두지 않는다. `.env`(gitignore) 만 쓴다
- 공통 유틸은 `backend/core/` 또는 `frontend/src/lib/` 아래
- 에이전트 관련 코드는 `backend/core/agent_loop.py` 와 각 기능의 `service.py` 로 모은다
- 데모 실행 진입점은 README 상단에 한 줄로 명시한다 (`pnpm mock`)
