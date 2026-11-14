---
name: demo-film
description: 해커톤 데모 영상(약 60초 MP4)을 만든다. 실행 중인 앱을 Playwright로 자동 조작해 녹화하고(스모크 테스트 겸용), Remotion으로 흐름·앱 화면·단계별 팝업·축하 연출이 들어간 하이라이트 영상을 렌더링한다. "데모 영상", "제출 영상", "백업 영상", "demo film", "녹화"를 요청받았을 때 쓴다.
metadata:
  owner: AAcrew 담당 3
  version: "1.2"
---

# demo-film: 앱 녹화 → 하이라이트 영상

## 목표
`deliverables/video/out/demo.mp4`(1920×1080, 약 60초, 효과음 포함)를 만든다. 템플릿 코드는 고치지 않고 `deliverables/product.md`의 `capture` 블록과 `film.demo` 부분만 쓴다.

## 순서
1. `deliverables/product.md`에 새 주제의 `film` 블록이 있는지 확인한다. 없으면 먼저 `pitch-deck` skill의 2단계를 따라 채운다. 스키마는 `.kiro/skills/pitch-deck/references/film-schema.md`에 있다.
2. 데모 경로를 정하고 `capture` 블록을 쓴다.
   - `url`: 앱 주소. 로컬 서버면 실행 명령과 함께 확인한다 (예: `http://localhost:3000`). 실행할 때 `DEMO_URL` 환경변수가 있으면 그쪽이 우선한다.
   - `beats`: 데모의 각 단계가 "실제로 일어났다"는 것을 증명하는 CSS 선택자. 순서대로 나타나야 하고, 마지막은 `end`이다.
   - `focus`: 영상이 확대해서 보여 줄 요소. `sel`이 작은 요소(목록의 마지막 줄, 작은 칩)면 그것을 담은 카드나 목록 전체를 적는다. 잘 고를수록 영상이 읽기 쉬워진다.
   - `tap`: 사용자가 실제로 누르는 단계(전화 받기, 업로드 버튼 등)에만 `true`를 붙인다. 자동으로 일어나는 단계에 붙이면 사실과 다른 연출이 된다.
   - 페이지가 녹화 창보다 길어도 괜찮다. 녹화 도구가 해당 요소까지 자동으로 스크롤한다. 목업이나 앱의 사본을 만들지 않는다.
   - `device`: 모바일 앱 화면이면 `"phone"`(`.phone .screen` 요소를 잘라 씀), 웹 서비스면 `"browser"`(창 전체)를 고른다. phone인데 앱에 이 구조가 없으면 `class="phone"`과 그 안의 `class="screen"`을 붙여 달라고 frontend 담당에게 `docs/handoff.md`로 요청한다.
   - 녹화는 페이지의 `#play` 버튼을 눌러 데모 흐름을 시작한다. 실제 앱이라면 데모 자동 재생 버튼(`#play`)이 있어야 한다. 없으면 이것도 handoff로 요청한다.
3. 실행한다.
   ```bash
   cd deliverables
   npm run setup          # 처음 한 번만
   npm run capture        # 녹화 + 스모크 테스트 (beat가 안 나타나면 실패)
   npm run video:render   # 약 30초~1분
   ```
4. 검증한다. 아래 명령으로 데모 장면 세 곳의 프레임을 뽑아 확인하고, 팝업이 앱 화면과 맞는지 본다.
   ```bash
   for t in 18 25 31; do ffmpeg -v error -y -ss $t -i video/out/demo.mp4 -frames:v 1 /tmp/frame_$t.png; done
   ```
   확대된 장면에 그 단계의 결과가 보이는지 확인한다. 빈 곳이나 엉뚱한 곳이 확대되면 그 beat의 `focus`를 고친다.
5. 영상 경로, 길이(`ffprobe -v error -show_entries format=duration -of csv=p=0 video/out/demo.mp4`), 확인한 프레임에서 발견한 문제를 보고한다.

## 실패했을 때
- `npm run capture`가 특정 beat에서 멈추면: 그 단계가 앱에서 실제로 동작하지 않는다는 뜻이다. 선택자를 고치기 전에 앱이 그 단계까지 가는지 먼저 확인한다.
- 렌더가 브라우저를 못 찾으면: `REMOTION_BROWSER=<chrome-headless-shell 경로> npm run video:render`로 직접 지정한다.
- 축하 연출이 엉뚱한 때 나오면: `film.demo.celebrate.at`이 `capture.beats`의 id와 같은지 확인한다.

## 지켜야 할 규칙
- 녹화 중에는 요소 스크린샷을 찍지 않는다. 페이지가 스크롤되어 휴대폰 화면 자르기가 어긋난다.
- 녹화본이라는 사실을 `demo.disclosure`에 적는다.
- 영상 길이는 60초 안팎으로 둔다. 설명은 발표자가 하고, 영상은 보여 주기만 한다.
- 색, 글꼴(Apple 시스템 글꼴), 모션(Apple 스타일)은 `deliverables/design.md`와 템플릿 코드가 정한다. skill에서는 바꾸지 않는다.
