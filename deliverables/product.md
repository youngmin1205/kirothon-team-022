# product.md (v3) · 템플릿 스키마 v3 · (당일 주제)

슬라이드와 영상의 문구는 모두 이 파일에서 나옵니다. 구간 구성은 `../.kiro/skills/pitch-deck/references/film-schema.md` 끝의 8구간 표를 따릅니다.
`demo.steps` 의 id 와 `celebrate.at` 은 `capture.beats` 의 id 와 같아야 합니다. `celebrate` 는 사용자가 핵심 행동을 끝낸 순간에 한 번만 나오는 축하 연출입니다.

**아래는 빈 틀입니다. 값만 바꾸고 키는 지우지 마세요.** 완성된 예시가 둘 있습니다.

- `samples/h-phishing/product.md` — 보이스피싱 스파링 (리허설 2)
- `samples/a-medication/v3/product.md` — 약봉투 비서 (리허설 1)

`demo.steps` 와 `capture.beats` 는 **당일 데모 구간 6~8개**로 늘립니다. 아래에는 모양만 2개 넣어 뒀습니다.
id 는 `.kiro/steering/product.md` 의 데모 구간 id 와 **똑같이** 씁니다. 그 id 가 화면 신호·영상 구간·mock 응답을 묶습니다.

## 제품 요약

- 주제(주최 측 문구 그대로): (당일 기록)
- 사용자: (당일 기록)
- 문제: (당일 기록)
- 해결: (당일 기록)

## 출처

- (숫자를 인용하면 출처를 여기 적습니다) [src: ]

```json film
{
  "service": "",
  "logoIcon": "Sparkles",
  "team": "AAcrew",
  "repo": "github.com/youngmin1205/kirothon-team-022",
  "opening": {
    "image": "",
    "persona": "",
    "title": "",
    "speech": "",
    "hook": "",
    "sfx": ""
  },
  "problem": {
    "title": "",
    "stat": 0,
    "statDecimals": 0,
    "statSuffix": "",
    "statLabel": "",
    "compare": "",
    "bars": [
      ["", 0, ""],
      ["", 0, ""]
    ],
    "barMax": 0,
    "barHighlight": 0,
    "source": "",
    "alternatives": [
      ["", ""],
      ["", ""]
    ]
  },
  "solution": {
    "title": "",
    "tagline": "",
    "before": ["", "", ""],
    "after": ["", ""]
  },
  "demo": {
    "title": "",
    "steps": [
      {
        "id": "step-1",
        "label": "",
        "icon": "Circle",
        "title": "",
        "lines": ["", ""]
      },
      {
        "id": "step-2",
        "label": "",
        "icon": "Circle",
        "title": "",
        "key": true,
        "items": [
          ["", ""]
        ],
        "note": ""
      }
    ],
    "celebrate": {
      "at": "step-2",
      "title": "",
      "sub": "",
      "badge": {
        "icon": "Sparkles",
        "pre": "",
        "from": 0,
        "to": 1,
        "post": ""
      },
      "track": {
        "labels": ["R1", "R2", "R3"],
        "done": 0
      },
      "goal": ""
    },
    "disclosure": ""
  },
  "trust": {
    "title": "",
    "cards": [
      ["ShieldCheck", "", ""],
      ["Lock", "", ""],
      ["Users", "", ""]
    ]
  },
  "arch": {
    "title": "",
    "user": "",
    "core": "",
    "agents": ["", ""],
    "model": "Amazon Bedrock",
    "store": "",
    "out": ""
  },
  "kiro": {
    "title": "",
    "metrics": [
      ["FileText", "3", "spec 파일", "요구사항에서 설계, 작업 목록까지"],
      ["Bot", "2", "역할 에이전트", "build / review"],
      ["GitCommit", "—", "커밋", "당일 git log 로 셉니다"]
    ],
    "note": "숫자는 17:00 에 docs/kiro-usage-log.md 값으로 채웁니다."
  },
  "closing": {
    "title": "",
    "next": "",
    "notifyTime": "",
    "notifyTitle": "",
    "notifyBody": ""
  }
}
```

## 캡처 (데모 경로와 장면 시각)

`npm run capture` 가 이 블록을 읽어서 목업(또는 `DEMO_URL`)을 녹화합니다. 각 `sel` 이 화면에 나타나야 다음으로 넘어가므로, 캡처는 스모크 테스트를 겸합니다.

**실제 앱을 녹화할 때**는 `url` 을 비우고 `DEMO_URL=http://localhost:5173` 을 주고, `sel` 을 `[data-beat="<id>"][data-state="done"]` 형태로 씁니다. 마지막 `end` 의 `#play:not([disabled])` 가 재생 종료 신호입니다.

`device` 는 `phone`(기본, 휴대폰 틀) 또는 `browser`(넓은 웹 화면)입니다. **`browser` 면 `data-beat` 마커가 늘 화면 안에 있어서 카메라가 안 움직입니다.** beat 마다 `focus` 에 그 구간에서 보여줄 카드 선택자(`#result-card` 등)를 적습니다. 비우면 `sel` 을 씁니다.

**목업을 녹화할 때**는 `url` 에 `samples/mockups/<파일>.html` 을 적고 `sel` 을 그 목업의 선택자로 씁니다.

```json capture
{
  "url": "",
  "device": "phone",
  "beats": [
    { "id": "step-1", "sel": "[data-beat=\"step-1\"][data-state=\"done\"]", "focus": "", "caption": "" },
    { "id": "step-2", "sel": "[data-beat=\"step-2\"][data-state=\"done\"]", "focus": "", "caption": "" },
    { "id": "end",    "sel": "#play:not([disabled])",                      "caption": "" }
  ]
}
```
