---
name: pitch-deck
description: 해커톤 발표 PPT(PDF)를 만든다. 저장소의 docs/, .kiro/specs/, .kiro/steering/product.md를 읽고 deliverables/product.md의 film 블록을 채운 뒤 Marp로 8장짜리 PDF를 뽑는다. "발표 자료", "PPT", "슬라이드", "pitch deck", "발표 준비"를 요청받았을 때 쓴다.
metadata:
  owner: AAcrew 담당 3
  version: "1.0"
---

# pitch-deck: 문서 → product.md → 슬라이드 PDF

## 목표
`deliverables/ppt/slides.pdf`(8장, 대본은 PDF 주석)를 만든다. 템플릿 코드(`deliverables/tools/`, `deliverables/video/src/`)는 고치지 않고 `deliverables/product.md`만 쓴다.

## 순서
1. 아래 파일을 읽는다. 없는 파일은 건너뛴다.
   - `.kiro/steering/product.md` (주제, 사용자, 문제)
   - `.kiro/specs/*/requirements.md`, `design.md` (핵심 흐름, 구조)
   - `docs/api-contract.md`, `docs/kiro-usage-log.md` (구조도, Kiro 실측 수치)
2. `references/film-schema.md`를 읽고, `deliverables/product.md`의 ```` ```json film ```` 블록을 새 주제로 다시 쓴다.
   - 필드 이름과 구조는 `references/film-schema.md` 의 스키마를 그대로 따른다.
   - `capture` 블록은 `url`과 `device`만 고친다. `beats`는 `demo-film` skill이 맡는다. 단, `demo.steps`의 `id`는 `capture.beats`의 `id`와 같아야 한다.
3. 오프닝 그림이 없으면 `deliverables/brand/<주제>.svg`를 만든다. 720×720, 배경 없음, `design.md`의 색만 쓴다. 이모지와 그라데이션은 쓰지 않는다. 그다음 `opening.image`에 파일 이름을 적는다.
4. 슬라이드 4장에 넣을 앱 대표 화면을 찍는다. `capture` 블록의 `url`과 `device`(모바일 화면이면 `"phone"`, 웹 화면이면 `"browser"`)만 새 주제에 맞게 고치고, `beats`는 `demo-film` skill에 맡긴다. 직접 스크린샷을 찍지 말고 아래 `npm run shot`을 쓴다.
5. 실행한다.
   ```bash
   cd deliverables
   npm run setup   # 처음 한 번만
   npm run shot    # captures/home.png (녹화 없이 대표 화면만)
   npm run ppt
   npm run check   # 금칙어 검사 (목록이 없으면 건너뜀)
   ```
6. `ppt/slides.pdf`가 8장인지 확인하고, 경로와 함께 "확인이 필요한 문구" 목록을 보고한다.

## 지켜야 할 규칙
- 슬라이드 제목은 주장 한 문장으로 쓴다 (예: "약 봉투를 한 번 찍으면, 나머지는 자동으로 이어집니다").
- 숫자에는 반드시 출처(`problem.source`)를 붙인다. 출처를 찾지 못한 숫자는 쓰지 않고, 보고에 "출처 필요"로 남긴다. 숫자를 지어내지 않는다.
- 사내 수치와 고객사 이름은 넣지 않는다.
- `kiro.metrics`의 숫자는 `docs/kiro-usage-log.md`의 실측값만 쓴다. 아직 없으면 `"—"`로 둔다.
- 발표 시간 배분과 장면 구성의 근거는 `references/film-schema.md` 끝의 "8구간" 표를 따른다.
- 영상은 서비스 이름으로 시작한다. `opening.hook`에 "무엇을 해 주는지"를 사용자 말투로 한 줄 쓴다.
- AI가 쓴 티가 나지 않게 쓴다. 규칙은 `deliverables/design.md`의 "문구" 절에 있다. 다 쓴 뒤 모든 문구를 소리 내어 읽는다고 생각하고, 발표자가 말하기 어색한 문장은 고친다.

- 색, 글꼴(Apple 시스템 글꼴), 모션(Apple 스타일)은 `deliverables/design.md`와 템플릿 코드가 정한다. skill에서는 바꾸지 않는다.
