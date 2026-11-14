# product.md (v3) · 템플릿 스키마 v3 · 밥은 먹었니

슬라이드와 영상의 문구는 모두 이 파일에서 나옵니다. 구간 구성은 `../.kiro/skills/pitch-deck/references/film-schema.md` 끝의 8구간 표를 따릅니다.
`demo.steps` 의 id 와 `celebrate.at` 은 `capture.beats` 의 id 와 같아야 합니다. `celebrate` 는 사용자가 핵심 행동을 끝낸 순간에 한 번만 나오는 축하 연출입니다.

**아래는 빈 틀입니다. 값만 바꾸고 키는 지우지 마세요.** 완성된 예시가 둘 있습니다.

- `samples/h-phishing/product.md` — 보이스피싱 스파링 (리허설 2)
- `samples/a-medication/v3/product.md` — 약봉투 비서 (리허설 1)

`demo.steps` 와 `capture.beats` 는 **당일 데모 구간 6~8개**로 늘립니다. 아래에는 모양만 2개 넣어 뒀습니다.
id 는 `.kiro/steering/product.md` 의 데모 구간 id 와 **똑같이** 씁니다. 그 id 가 화면 신호·영상 구간·mock 응답을 묶습니다.

## 제품 요약

- 주제(주최 측 문구 그대로): 내 일상에 바로 적용할 수 있는 서비스 / 나와 주변 사람이 매일 겪는 작은 불편을 해결하는 서비스
- 사용자: 부모님과 떨어져 사는 자녀(자취 직장인·대학생)와 안부를 받는 부모님
- 문제: 부모님은 매일 "밥은 먹었니"를 묻고, 자녀는 같은 답을 엄마·아빠에게 따로 치기 귀찮아 늦게 답하며, 그사이 부모님은 걱정한다
- 해결: 사진 한 장과 기분 버튼 하나를 AI가 받는 사람마다 맞춘 안부로 바꾸고, 부모님은 본문만 보고 버튼 하나로 답한다
- 설계 근거와 앱 UX 패턴: `../docs/ideas/bab-ux-evidence.md`

## 출처

- 노인이 떨어져 사는 자녀와 주 1회 이상 연락 64.9%, 만남 22.7% (2023 노인실태조사, 보건복지포럼 2024.11) [src: https://www.kihasa.re.kr/api/kihasa/file/download?seq=28264]
- 1인 가구 36.1%(2024), 1인 가구 48.9%가 외롭다고 답함 (국가데이터처 「2025 통계로 보는 1인 가구」) [src: https://www.newsis.com/view/NISX20251209_0003433761]

```json film
{
  "service": "밥은 먹었니",
  "logoIcon": "Soup",
  "team": "AAcrew",
  "repo": "github.com/youngmin1205/kirothon-team-022",
  "opening": {
    "image": "bap.svg",
    "hook": "사진 한 장이면\n엄마·아빠께 안부 끝",
    "sfx": "",
    "persona": "민지 님, 27세. 혼자 산 지 3년, 오늘도 엄마의 \"밥은 먹었니\"에 밤 9시에야 답했어요.",
    "title": "오늘도 \"밥은 먹었니?\"\n받으셨나요?",
    "speech": "밥은 먹었니입니다. 직장인 민지 씨는 오늘도 엄마의 밥은 먹었니에 밤 9시에야 답했습니다. 같은 답을 엄마에게, 또 아빠에게 매일 치기가 귀찮았거든요. 그사이 엄마는 하루 종일 걱정했습니다. 여러분도 오늘 이 질문 받으셨나요?"
  },
  "problem": {
    "title": "연락은 매주 하지만, 얼굴은 드물게 봅니다",
    "stat": 64.9,
    "statDecimals": 1,
    "statSuffix": "%",
    "statLabel": "자녀와 매주 연락하는 노인 (2023)",
    "compare": "만남보다 연락이 훨씬 잦습니다. 매일의 짧은 안부가 곧 안심입니다",
    "bars": [
      [
        "매주 연락",
        64.9,
        "64.9%"
      ],
      [
        "매주 만남",
        22.7,
        "22.7%"
      ]
    ],
    "barMax": 80,
    "barHighlight": 0,
    "source": "한국보건사회연구원 보건복지포럼 (2024.11, 2023 노인실태조사 분석)",
    "alternatives": [
      [
        "카톡으로 직접 답하기",
        "엄마·아빠에게 같은 답을 따로 쳐야 해요."
      ],
      [
        "위치 공유 앱",
        "감시받는 느낌이라 오래 못 써요."
      ]
    ]
  },
  "solution": {
    "title": "사진 한 장이 받는 분마다 맞춘 안부가 됩니다",
    "tagline": "자녀는 10초,\n부모님은 본문만 봐도 안심",
    "before": [
      "부모님이 매일 같은 걸 묻는다",
      "같은 답을 엄마·아빠에게 따로 친다",
      "답이 늦는 동안 걱정이 커진다"
    ],
    "after": [
      "사진과 기분만 고르면 정리부터 전송까지 끝",
      "엄마는 다정하게, 아빠는 짧게 받고 버튼으로 답한다"
    ]
  },
  "demo": {
    "title": "사진 한 장이 엄마의 답장으로 돌아오기까지",
    "steps": [
      {
        "id": "upload",
        "label": "사진·기분",
        "icon": "Camera",
        "title": "사진 2장, 기분 하나",
        "lines": [
          "점심 · 현관 사진",
          "😪 피곤해"
        ]
      },
      {
        "id": "compose",
        "label": "받는 분별",
        "icon": "MessagesSquare",
        "title": "같은 하루, 다른 메시지",
        "key": true,
        "items": [
          [
            "엄마",
            "밥·귀가·기분"
          ],
          [
            "아빠",
            "귀가만"
          ]
        ],
        "note": "아빠께 기분은 보내지 않아요"
      },
      {
        "id": "deliver",
        "label": "카톡 알림",
        "icon": "MessageCircle",
        "title": "본문만 봐도 알아요",
        "lines": [
          "🍚 점심 김치찌개 · 🏠 9시 귀가"
        ]
      },
      {
        "id": "reply",
        "label": "엄마 답장",
        "icon": "Heart",
        "title": "엄마도 밥 드셨대요",
        "lines": [
          "❤️ 잘 받았어 · 🍚 나도 밥 먹었어"
        ]
      }
    ],
    "celebrate": {
      "at": "reply",
      "title": "오늘 안부 끝!",
      "sub": "21:05 · 엄마가 ❤️와 🍚로 답했어요",
      "badge": {
        "icon": "Heart",
        "pre": "엄마의 답장",
        "from": 0,
        "to": 2,
        "post": "개"
      },
      "track": {
        "labels": [
          "사진",
          "보냄",
          "답장"
        ],
        "done": 2
      },
      "goal": "내일도 사진 한 장이면 끝"
    },
    "disclosure": "고정 시나리오로 녹화한 화면입니다."
  },
  "trust": {
    "title": "기분은 자녀가, 거르기는 코드가 정합니다",
    "cards": [
      [
        "ScanEye",
        "AI는 밥·귀가만",
        "기분은 추측하지 않아요."
      ],
      [
        "Scissors",
        "거르는 건 코드",
        "프로필에 없는 항목은 AI 전에 뺍니다."
      ],
      [
        "BadgeCheck",
        "확인한 것만 전송",
        "자녀가 확인해야 보내요."
      ]
    ]
  },
  "arch": {
    "title": "판정과 말투는 AI, 거르기는 코드",
    "user": "자녀 앱 · 부모님 링크",
    "core": "안부 라우터 (코드)",
    "agents": [
      "사진 판정",
      "엄마 말투",
      "아빠 말투"
    ],
    "model": "Bedrock",
    "store": "오늘 안부",
    "out": "받는 분별 메시지"
  },
  "kiro": {
    "title": "기획이 spec이 되고, 수락 기준이 테스트가 됐습니다",
    "metrics": [
      [
        "FileText",
        "3",
        "spec 파일",
        "requirements · design · tasks"
      ],
      [
        "ListChecks",
        "8",
        "요구사항",
        "고정 규칙을 수락 기준으로 옮김"
      ],
      [
        "CheckSquare",
        "5 / 11",
        "완료한 task",
        "14:20 기준, 17:00에 갱신"
      ]
    ],
    "note": "steering으로 세 사람의 Kiro가 같은 규칙을 따랐습니다."
  },
  "closing": {
    "title": "이제 \"밥은 먹었니\"에\n사진 한 장으로 답해요",
    "next": "다음 · 부모님 음성 답장",
    "notifyTime": "21:05",
    "notifyTitle": "민지 오늘 안부",
    "notifyBody": "🍚 점심 김치찌개 · 🏠 9시 귀가 · 😪 조금 피곤"
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
  "device": "browser",
  "screen": "main",
  "beats": [
    {
      "id": "upload",
      "sel": "[data-beat=\"upload\"]:is([data-state=\"active\"],[data-state=\"done\"])",
      "focus": "#bab-upload",
      "caption": "사진 2장, 기분 하나",
      "tap": true
    },
    {
      "id": "compose",
      "sel": "[data-beat=\"compose\"]:is([data-state=\"active\"],[data-state=\"done\"])",
      "focus": "#bab-messages",
      "caption": "같은 하루, 다른 메시지"
    },
    {
      "id": "deliver",
      "sel": "[data-beat=\"deliver\"]:is([data-state=\"active\"],[data-state=\"done\"])",
      "focus": "#bab-notify",
      "caption": "본문만 봐도 알아요"
    },
    {
      "id": "reply",
      "sel": "[data-beat=\"reply\"]:is([data-state=\"active\"],[data-state=\"done\"])",
      "focus": "#bab-reply",
      "caption": "엄마도 밥 드셨대요"
    },
    {
      "id": "end",
      "sel": "#play:not([disabled])",
      "caption": ""
    }
  ]
}
```
