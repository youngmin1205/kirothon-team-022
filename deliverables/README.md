# deliverables: 발표 PPT와 데모 영상 자동 생성 (담당 3 · 세민)

문서 두 개를 고치면 **발표 PDF 8장**과 **60초 데모 영상(MP4)** 이 명령 한 줄로 만들어집니다.
당일에는 Kiro에게 `/pitch-deck`, `/demo-film`이라고만 말하면 됩니다.

## 0. 어떤 결과물이 나오나요?
- **발표 PDF 8장** — `ppt/slides.pdf` (생성 후 레포 최상단 `PRESENTATION.pdf` 로 복사해 커밋)
- **데모 영상 MP4** — `video/out/demo.mp4` (레포에 올리지 않고 README 의 Demo 줄에 링크로 적습니다)

둘 다 `product.md` 와 `design.md` 두 문서에서 나옵니다. 문구를 고치면 결과물이 따라 바뀝니다.

## 1. 어떻게 만들어지나요?
```
product.md ─┬─ film 블록 (문구) ─────────────┬─▶ npm run ppt          ─▶ ppt/slides.pdf
            │                                 │
design.md ──┴─ 색·글꼴·모션 ──────────────────┤
                                              │
앱 화면 ─▶ npm run capture (capture 블록대로   ├─▶ npm run video:render ─▶ video/out/demo.mp4
          자동 조작하며 녹화)  ─▶ captures/ ───┘
```
- **PPT**: Marp가 `product.md`의 문구를 8장 슬라이드로 만들고, 발표 대본을 PDF 주석으로 넣습니다.
- **녹화**: Playwright(브라우저 자동 조작 도구)가 앱을 열어 `▶ 데모 재생` 버튼을 누르고, 단계가 하나씩 화면에 나타나는지 확인하면서 녹화합니다. 어떤 단계가 나타나지 않으면 실패하므로 **데모 스모크 테스트를 겸합니다.**
- **영상**: Remotion(React로 영상을 만드는 도구)이 녹화본 앞뒤에 오프닝, 문제, 구조도, Kiro 활용, 마무리 장면을 붙입니다. 데모 구간에는 단계별 설명 팝업, 확대 연출, 축하 연출이 들어갑니다.

## 2. 처음 한 번 설치 (각자 PC, 약 3분)
필요한 것: Node.js 20 이상(25에서 확인), macOS 또는 Linux, ffmpeg(영상 확인용, 선택). Google Chrome이 있으면 녹화 화질이 더 좋습니다.

> ⚠️ **이 폴더의 도구는 현재 macOS 기준입니다 (실측).**
> `tools/puppeteer.json`에 Chrome 경로가 `/Applications/Google Chrome.app/...`으로 하드코딩돼 있어 Linux에서는 `npm run diagram`이 실패합니다. 또 Linux에서는 playwright chromium 실행에 시스템 라이브러리가 더 필요합니다(`libasound.so.2` → `sudo npx playwright install-deps chromium`).
>
> **당일 담당**: 발표 슬라이드·데모 영상·다이어그램 생성은 **담당3(macOS)** 가 맡습니다.
> **알려진 위험**: 그 노트북에 문제가 생기면 다른 사람이 산출물을 만들 수 없습니다. 대비가 필요하면 브라우저 경로를 `CHROME_PATH` 환경변수로 받도록 고치면 됩니다(marp는 `CHROME_PATH`, remotion은 `REMOTION_BROWSER`를 이미 지원).

```bash
cd deliverables
npm run setup
```

## 3. 직접 돌려 보기
`product.md` 에는 **밥은 먹었니** 가 들어 있고, 녹화 대상은 실제 앱 화면입니다.
```bash
pnpm build && pnpm start                        # 레포 루트에서, :8000 단일 프로세스
DEMO_URL=http://127.0.0.1:8000 npm run capture  # 앱을 자동 조작하며 녹화. 단계마다 "ok" 가 찍히면 성공
npm run video:render   # video/out/demo.mp4 (약 1분)
npm run ppt            # ppt/slides.pdf (약 10초)
```

## 4. 당일에 쓰는 법 (Kiro skill)
kiro-cli나 Kiro IDE 채팅에서 아래처럼 말합니다. skill 위치는 `.kiro/skills/`입니다.

**① PPT** (주제와 핵심 흐름이 정해진 뒤)
```
/pitch-deck 오늘 만든 서비스는 '○○○'이고 화면은 http://localhost:5173 이야.
docs와 spec을 읽고 PPT를 만들어 줘. 출처를 확인할 수 없는 숫자는 쓰지 마.
```
Kiro가 `product.md`의 문구를 새 주제로 다시 쓰고, `ppt/slides.pdf`를 만든 뒤 "확인이 필요한 문구" 목록을 보고합니다.

**② 영상** (앱의 데모 흐름이 끝까지 동작한 뒤)
```
/demo-film 앱은 http://localhost:5173 이고 웹 화면이야. 데모 영상 만들어 줘.
```
Kiro가 `product.md`의 `capture` 블록을 쓰고, 녹화와 렌더링을 마친 뒤 프레임 세 장으로 결과를 확인합니다.

**③ 사람이 확인할 것**
- 숫자마다 출처가 붙어 있는지 확인합니다. 출처가 없는 숫자는 지웁니다.
- 회사 수치나 고객사 이름이 들어가지 않았는지 확인합니다.
- `npm run check`로 금칙어를 검사합니다. 목록은 각자 `~/.kirothon-banned.txt`에 두고 **커밋하지 않습니다.**
- 영상을 끝까지 한 번 보고, 팝업 설명이 화면 내용과 맞는지 확인합니다.

## 5. 앱 담당(frontend)에게 필요한 것 3가지
녹화는 앱을 **사람 대신 자동으로** 돌리기 때문에, 앱에 아래 세 가지가 있어야 합니다.

1. **데모 자동 재생 버튼** `id="play"`: 누르면 데모 흐름이 처음부터 끝까지 저절로 진행됩니다. 실제 API 대신 미리 준비한 응답을 써도 됩니다.
2. **단계가 끝났다는 표시**: 결과 카드에 `.show` 클래스를 붙이거나 목록에 항목이 추가되는 식이면 충분합니다. 이 선택자가 화면에 나타나야 녹화가 다음 단계로 넘어갑니다.
3. **화면 종류**: 웹 서비스면 따로 할 일이 없습니다(`"device": "browser"`). 휴대폰 앱 모양이면 `class="phone"` 요소 안에 `class="screen"` 요소를 두어야 휴대폰 화면만 잘라 낼 수 있습니다.

```html
<button id="play">▶ 데모 재생</button>
<section id="result" class="card">…</section>   <!-- 끝나면 class="card show" -->
```
이 앱에서는 `frontend/src/app/` 의 `#play` 버튼과 `data-beat`·`data-state` 신호가 그 역할을 합니다.

## 6. product.md 구조
파일 안에 JSON 블록이 두 개 있습니다. 필드 설명은 전부 `../.kiro/skills/pitch-deck/references/film-schema.md`에 있습니다.

**`film` 블록**: 슬라이드와 영상에 들어가는 모든 문구입니다. 서비스 이름, 오프닝 한 줄, 문제 통계와 출처, 데모 단계별 팝업, 축하 문구, 구조도, Kiro 활용 수치가 들어갑니다.

**`capture` 블록**: 녹화 경로입니다.
```json
{
  "url": "http://localhost:5173",
  "device": "browser",
  "beats": [
    { "id": "upload", "sel": "#fields .field:nth-child(6)", "caption": "서류에서 숫자를 읽습니다", "tap": true },
    { "id": "risk",   "sel": "#risks .risk:nth-child(3)",   "caption": "위험 신호를 나눕니다",     "focus": "#risks" },
    { "id": "end",    "sel": "#done.show",                  "caption": "" }
  ]
}
```
| 필드 | 뜻 |
|---|---|
| `sel` | 이 단계가 실제로 일어났다는 증거가 되는 CSS 선택자. 나타날 때까지 기다립니다 |
| `focus` (선택) | 영상에서 확대해서 보여 줄 요소. `sel`이 목록의 마지막 줄처럼 작으면 목록 전체를 적습니다 |
| `tap` (선택) | 사용자가 직접 누르는 단계에만 `true`. 그 순간 커서나 터치 표시가 나타납니다 |
| `id` | `film.demo.steps[].id`와 같아야 팝업이 맞는 순간에 뜹니다. 마지막은 `end` |

`DEMO_URL=http://localhost:3000 npm run capture`처럼 실행하면 `url`보다 환경변수가 우선합니다.

## 7. 영상 연출 규칙 (알아 두면 수정 요청하기 쉬운 것)
- 영상은 서비스 이름으로 시작합니다(오프닝 hook). 설명은 발표자가 하고, 영상은 보여 주기만 합니다.
- 데모 구간은 1.5배속으로 재생하다가 축하 장면에서 3초 멈추고, 그 뒤로는 1.25배속으로 재생합니다. 이 사실은 화면 하단에 표시됩니다.
- 확대 연출은 웹 화면에서만 최대 1.45배로 들어갑니다. 대상이 이미 보이면 카메라를 움직이지 않고, 한 번 움직이면 2.5초는 그대로 둡니다.
- 페이지가 녹화 창(1600×1000)보다 길면 녹화 도구가 자동으로 스크롤합니다. 목업이나 앱의 사본을 만들 필요가 없습니다.
- 색, 글꼴(Apple 시스템 글꼴), 모션은 `design.md`가 정합니다.

## 8. 폴더와 고치는 사람
| 경로 | 고치는 사람 | 내용 |
|---|---|---|
| `product.md` | 담당 3 또는 `/pitch-deck`, `/demo-film` | 문구와 녹화 경로 |
| `design.md` | 담당 3 | 색, 글꼴, 레이아웃, 모션 규칙 |
| `brand/<주제>.svg` | 담당 3 또는 `/pitch-deck` | 오프닝 그림 (720×720, 배경 없음) |
| `brand/*.wav` | 고치지 않음 | 효과음. `npm run sfx`가 코드로 합성하므로 라이선스 문제가 없습니다 |
| `samples/` | 고치지 않음 | 완성된 예시(product.md, 영상, PDF)와 목업 |
| `tools/`, `video/src/` | 고치지 않음 | 템플릿 코드. 바꿀 일이 있으면 담당 3에게 말해 주세요 |
| `ppt/`, `captures/`, `video/out/` | 자동 생성 | 커밋하지 않습니다(`.gitignore`) |

## 9. 막혔을 때
| 증상 | 해결 |
|---|---|
| `npm run capture`가 특정 단계에서 멈춤 | 그 단계가 앱에서 실제로 동작하지 않는다는 뜻입니다. 선택자를 고치기 전에 브라우저에서 `▶ 데모 재생`을 직접 눌러 보세요 |
| 첫 렌더가 실패함 | Remotion이 처음에 브라우저를 내려받다 실패한 경우입니다. 한 번 더 실행하면 됩니다. 계속 실패하면 `REMOTION_BROWSER=<chrome-headless-shell 경로>`를 지정합니다 |
| PDF가 안 나옴 | `CHROME_PATH`에 Chrome 경로를 지정합니다 |
| 축하 연출이 엉뚱한 때 나옴 | `film.demo.celebrate.at`이 `capture.beats`의 id와 같은지 확인합니다 |
| 영상에서 엉뚱한 곳이 확대됨 | 그 단계에 `focus`를 적어 확대할 요소를 지정합니다 |
| 미리 보며 고치고 싶음 | `npm run video:preview`로 브라우저에서 프레임 단위로 볼 수 있습니다 |

## 10. 라이선스
- Remotion은 개인과 3명 이하 팀에게 무료입니다.
- Pretendard 글꼴은 OFL입니다. Apple 시스템 글꼴은 파일을 넣지 않고 맥에 설치된 것을 씁니다.
- 효과음은 코드로 합성했고, 목업과 샘플의 인물, 번호, 금액은 모두 가짜입니다.
