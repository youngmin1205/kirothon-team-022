# frontend — React 19 + TypeScript + Vite

화면은 **기능 하나 = 폴더 하나**다. `src/features/sample/` 을 복사해서 시작한다.

> 작업 규칙은 `.kiro/steering/frontend.md` 에 있다 (`frontend/` 파일을 열면 Kiro 가 자동으로 읽는다).
> 레포 전체 설명은 `docs/overview.md` 6장.

## 실행

**레포 루트에서** 돌린다. 여기서 `pnpm dev` 를 직접 쓰면 백엔드가 없어 `/api` 프록시가 비어 있다.

```bash
cd ..
pnpm dev     # API(:8000) + 화면(:5173). 입력창에 치면 실제 모델이 답한다
pnpm mock    # 같은 화면, 고정 시나리오 (Bedrock 호출 없음)
```

- http://localhost:5173 — 제품 화면
- http://localhost:5173/?showcase=1 — 계측 패널(진행 단계·에이전트 흐름·점수) 함께
- http://localhost:5173/?feature=\<이름\> — 다른 기능 화면으로 전환

포트 5173 은 `strictPort` 로 고정이다. 이미 쓰고 있으면 조용히 옮기지 않고 실패한다 — 녹화 설정과 검증 스크립트가 이 값을 쓴다.

## 두 경로를 섞지 않는다

`useDemo({ feature })` 가 두 벌의 값을 돌려준다. 쓰는 쪽이 다르다.

| | 돌려주는 값 | 누가 쓰나 |
|---|---|---|
| 사람이 쓰는 경로 | `start()` `send(text)` `sending` | 입력창. **개발 중 기본** |
| 대본 재생 경로 | `play()` `running` `states` `beats` | `#play` · `pnpm smoke` · 영상 녹화 |

`sending` 과 `running` 을 섞으면 안 된다. `#play` 의 `disabled` 해제가 "재생이 끝났다"는 신호이므로, 사람이 한 줄 보낼 때 `#play` 를 잠그면 녹화·검증이 종료를 잘못 읽는다. 입력창만 잠근다.

`pnpm mock` 에서 입력창에 쳐도 대화가 이어지지 않는 것은 고장이 아니다. 고정 시나리오는 입력을 보지 않으므로 안내 말풍선이 돌아온다. 자유 대화는 `pnpm dev` 로 확인한다.

## 구조

| 경로 | 무엇인지 | 고치나 |
|---|---|---|
| `src/app/useDemo.ts` | 화면 상태 한 덩어리 (입력 경로 + 재생 경로) | ❌ lead |
| `src/app/BeatMarkers.tsx` | 구간 신호(`data-beat`/`data-state`)만 남기는 보이지 않는 표식 | ❌ |
| `src/app/Shell.tsx` | 제품 화면 / 개발 바 / 계측 패널 3층 | ❌ |
| `src/ui/` | 공용 부품. 새 부품은 여기에 추가한다 (기능 폴더에 흩뿌리지 않는다) | ❌ (추가 가능) |
| `src/lib/api.ts` | 서버 호출 래퍼. `fetch` 를 직접 쓰지 않는다 | ❌ |
| `src/types/api.ts` | 화면·서버 공통 형식 | ❌ lead만 |
| `src/features/<이름>/` | 기능 화면 | ✅ 1인 소유 |
| `src/features/registry.ts` | 기능 목록. 새 화면은 한 줄 추가 | ✅ 한 줄 |

## 검증

```bash
pnpm exec tsc -b     # 타입
pnpm test            # vitest 단발 (watch 금지)
pnpm lint            # oxlint
```

레포 루트의 `pnpm check` 가 위 셋을 백엔드와 함께 돌린다.

## 빌드

`pnpm build` 결과는 `backend/static_dist/` 로 나간다. 배포 때는 FastAPI 하나가 화면까지 서빙한다(단일 프로세스, :8000).
