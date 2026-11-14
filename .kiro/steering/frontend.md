---
inclusion: fileMatch
fileMatchPattern: 'frontend/**'
---

# 프런트 작업 규칙

> `frontend/` 를 건드릴 때만 로드된다. 백엔드 작업에는 안 붙으므로 토큰을 아낀다.

## 깨뜨리면 안 되는 계약 세 개

자동 검증(`pnpm smoke`)과 영상 녹화가 아래에 의존한다. 바꾸면 둘 다 깨진다.

1. **`id="play"` 버튼** — 누르면 데모가 처음부터 끝까지 자동 진행된다. 재생 중에는 `disabled`,
   끝나면 다시 활성화된다. 이 재활성화가 "재생이 끝났다"는 신호다
2. **구간 신호** — 구간마다 `data-beat="<id>"` 와 `data-state="pending|active|done"` 을 DOM 에 남긴다.
   `app/BeatMarkers.tsx` 가 항상 렌더하므로 화면을 어떻게 짜도 유지된다.
   id 는 `.kiro/steering/product.md` 의 데모 구간 id 와 같아야 한다
3. **`.phone > .screen`** — 데모가 **모바일 형태일 때만** 필요하다. 웹 서비스 형태면 쓰지 않아도 된다
   (영상 설정에서 `device: "browser"` 로 두면 창 전체를 쓴다)

## 만드는 순서

1. `src/features/<기능>/index.tsx` 를 만든다
2. `src/features/registry.ts` 에 한 줄 추가한다 (공용 파일이지만 한 줄이라 충돌이 거의 없다)
3. 서버 호출과 상태는 직접 쓰지 않고 `useDemo({ feature })` 를 쓴다
4. 화면은 `src/ui/` 부품을 조립한다. 새 부품이 필요하면 `src/ui/` 에 추가한다 (기능 폴더에 흩뿌리지 않는다)

## 두 경로를 섞지 않는다

`useDemo` 는 두 벌의 값을 돌려준다. **쓰는 쪽이 다르다.**

| | 돌려주는 값 | 누가 쓰나 |
|---|---|---|
| 사람이 쓰는 경로 | `start()` `send(text, input?)` `sending` | 입력창·폼·파일 선택. **개발 중 기본이다** |
| 대본 재생 경로 | `play()` `running` `states` `beats` | `#play` · `pnpm smoke` · 영상 녹화 |
| 공통 | `lines` `data` `dataByBeat` `serverState` `source` `error` | 화면 그리기 |

```tsx
const { send, sending, play, running, lines } = useDemo({ feature: 'sample' })
```

- **개발 중에는 입력창으로 확인한다.** 자유 입력으로 실제 모델 응답을 보려면 `pnpm dev` 로 띄운다
- **`pnpm mock` 은 고정 경로다.** mock 모드에서 자유 입력을 보내면 서버가 대본을 진행시키지 않고
  안내를 돌려준다(`advisory: true` → 안내 말풍선). 입력이 무시된 것으로 오해하지 않게 하려는 것이다
- **`sending` 과 `running` 을 섞지 않는다.** 전송 중에 `#play` 를 잠그면 녹화·검증이
  "재생이 끝났다"로 잘못 읽는다. 입력창만 잠근다

## 아이디어 유형별로 무엇을 쓰나

| 유형 | 쓰는 것 |
|---|---|
| 대화형 | `Composer` 입력창 + `Bubbles` (기본. `features/sample/` 그대로) |
| 폼 입력 | 입력창 자리에 `input` 여러 개, 제출 한 번 → `send('', { payload: 값 })` |
| 목록·대시보드 | 입력 없이 `Card` · `Kpi` · `Bar` 조립, `start()` 만 호출 (시작값이 있으면 `start(값)`) |
| 파일 업로드 | `FilePick` 로 고르고 `send(text, { files })` 로 보낸다. 상한 3개·5MB, 형식은 서버가 다시 검사 |

어느 유형이든 `#play` 와 구간 신호는 그대로 둔다. 검증·녹화가 그것만 본다.

## 결과를 숫자·표로 보여주는 법

서버는 턴마다 `data` 를 함께 보낸다. `useDemo` 가 세 가지로 꺼내 준다.

| 값 | 무엇인가 |
|---|---|
| `data` | 마지막 턴의 구조화 값 |
| `dataByBeat` | 구간 id → 그 구간의 값. 재생이 끝난 뒤에도 꺼내 쓴다 |
| `serverState` | 서버 봉투의 `state` (기능별 누적 상태). 구간 상태인 `states` 와 다른 것이다 |

```tsx
const { data, dataByBeat } = useDemo({ feature: 'sample' })
const score = Number(data?.score ?? 0)
<Kpi value={score} label="위험 점수" /> <Bar percent={score} />
```

mock 에서는 `backend/features/<기능>/mock.json` 의 `beats[].data` 가 그대로 온다. **그래서 백엔드
로직 없이도 숫자가 바뀌는 화면을 끝까지 만들 수 있다.** 실제 모델 모드에서는 응답 텍스트의
JSON 블록을 서버가 뽑아 같은 자리에 넣는다.

## 쓸 수 있는 부품 (`src/ui/`)

| 부품 | 쓰는 곳 |
|---|---|
| `Card` `Button` `Chip` | 기본 레이아웃, 상태 표시 |
| `Steps` | 데모 구간 진행 표시 (계측 패널용. 검증 신호는 `BeatMarkers` 가 따로 남긴다) |
| `Kpi` `Bar` | 숫자 강조, 점수·진행 게이지 |
| `DataTable` | 표. 서버가 보낸 배열(`data` 안)을 그대로 그린다. 목록·순위 결과에 쓴다 |
| `ArchFlow` | 오케스트레이터 → 서브에이전트 흐름. 심사에서 "에이전트답다"가 보이는 지점 |
| `LogView` `Toast` | 추론 과정, 알림 |
| `PhoneFrame` `CallHeader` `Bubbles` `PhoneFooter` | 통화·대화형 화면 |
| `Composer` `EmptyHint` | 입력창(Enter 전송)과 빈 화면 안내. 대화형의 기본 |
| `FilePick` | 파일 선택(사진·CSV·PDF). 고른 것은 `send(text, { files })` 로 보낸다 |

## 서버 호출

- `src/lib/api.ts` 의 `api.*` 만 쓴다. `fetch` 를 직접 쓰지 않는다
- 호스트를 코드에 적지 않는다. `/api` 는 Vite 가 `:8000` 으로 프록시한다
- 응답 타입은 `src/types/api.ts` 에서 가져온다. **이 파일은 lead 만 고친다**

## 디자인

- 색·간격·그림자는 `src/styles/tokens.css` 의 CSS 변수를 쓴다. 값을 직접 박지 않는다
- 토큰을 고칠 때는 `deliverables/design.md` 와 함께 맞춘다. 영상·슬라이드가 같은 값을 쓴다
- 결과가 **텍스트뿐이면 안 된다.** 표·카드·게이지·하이라이트 중 하나로 보여준다
  (채점에서 "텍스트만 나오는 챗봇"은 참신함 1점이다)

## 하지 말 것

- 포트 변경 (5173 고정)
- `#play` id, `data-beat`, `data-state` 변경
- 차트·UI 라이브러리 추가 (먼저 팀에 공유). 대부분 `src/ui/` 조립으로 된다
- `src/app/` 수정 (lead 영역)
