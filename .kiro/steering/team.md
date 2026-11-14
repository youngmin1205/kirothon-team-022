---
inclusion: always
---

# 팀 협업 규칙 (KIROTHON 2026)

> 당일 절차 전체는 [`docs/day-of-playbook.md`](../../docs/day-of-playbook.md) 에 있다.
> 여기는 에이전트가 항상 알아야 할 규칙만 둔다.

## 팀과 역할

| 사람 | 역할 | 쓰는 폴더 |
|---|---|---|
| 영신 | **lead** — product.md, spec, 공용 파일, 통합, 제출 | 공용 파일 전부 |
| 채연 | 백엔드·에이전트 | `backend/features/<기능>/` |
| 세민 | 프런트 + 발표 산출물 | `frontend/src/features/<기능>/`, `deliverables/` |

**공용 파일은 lead 만 고친다.** `backend/main.py`, `backend/core/`, `frontend/src/app/`,
`frontend/src/ui/`, `frontend/src/types/api.ts`, `.kiro/steering/product.md`

고쳐야 하면 먼저 알리고 이유를 말한다. 특히 `types/api.ts` 는 프런트와 백엔드가 동시에 멈추는 지점이다.

## Kiro 사용

- 각자 `kiro-cli --agent build` 로 작업한다. 기본 에이전트로 돌리면 steering 이 안 붙는다
- 리뷰는 `kiro-cli --agent review` 로 **별도 세션**에서 한다
- 스크립트로 돌릴 때는 `--trust-tools=read,write,shell,grep,glob` 가 필요하다. 없으면 파일을 못 쓴다
- 꼬이면 새 프롬프트를 쓰지 말고 `/rewind` 로 되돌린다. 세션이 길어지면 `/compact`
- 탐색과 실험은 `USE_MOCK=1` 로 한다. 크레딧과 throttling 을 아낀다
- 대규모 변경·삭제 전에는 무엇을 왜 하는지 한 줄로 요약하고 진행한다

## Git

- `main` 에 바로 push (PR·리뷰 없음, 속도 우선). 옛 `rehearsal/h-phishing` 브랜치는 쓰지 않는다
- push 전 반드시 `git pull --rebase --autostash`
- 작게 자주 커밋. 메시지는 한 줄로 명확하게
- **자동 커밋은 쓰지 않는다.** 통합 체크포인트에서 사람이 커밋한다
- `git push --force` 금지. 깨지면 `git revert` 로 되돌린다
- 커밋 전 `./scripts/scan-secrets.sh` 가 자격증명을 걸러낸다

## 통합 체크포인트 (11:30 / 13:00 / 15:30 / 16:30)

```bash
git pull --rebase --autostash && pnpm smoke
```

웨이브(= 셋이 동시에 작업하는 구간, 1 뼈대 / 2 로직 / 3 품질) 사이마다 둔다.

**모든 체크포인트에서 데모가 처음부터 끝까지 돌아야 한다.** 안 돌면 기능을 더 붙이지 않고
그것부터 고친다. 통과한 상태만 커밋한다.

## 시간 규칙

- **17:00 feature freeze** — 기능 추가 중단, 버그·데모 안정화만
- **17:45 제출** (18:00 마감, 15분 버퍼)
- 점심(13:00~14:00)에는 에이전트를 돌리지 않는다. 오전 결과 리뷰와 범위 조정만
- 막히면 15분 룰: 15분 넘게 막히면 팀에 공유
- **범위를 줄이는 결정은 lead 가 혼자 한다.** 합의하지 않는다

## 기록

`docs/kiro-usage-log.md` 에 **13:00 · 15:30 · 17:00** 세 번, 각자 3줄씩 적는다.
Kiro 사용이 필수 조건이고 피칭 소재로 쓴다. 당일에는 반드시 잊히므로 시점을 박아 둔다.
