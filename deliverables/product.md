# product.md (v3) · 템플릿 스키마 v3 · 밥은 먹었니

슬라이드와 영상의 문구는 모두 이 파일에서 나옵니다. 구간 구성은 `../.kiro/skills/pitch-deck/references/film-schema.md` 끝의 8구간 표를 따릅니다.
`demo.steps` 의 id 와 `celebrate.at` 은 `capture.beats` 의 id 와 같아야 합니다. `celebrate` 는 사용자가 핵심 행동을 끝낸 순간에 한 번만 나오는 축하 연출입니다.

**아래는 빈 틀입니다. 값만 바꾸고 키는 지우지 마세요.**

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
    "persona": "민지 씨는 자취 3년 차, 스물일곱 살 직장인이에요. 오늘도 엄마의 \"밥은 먹었니?\"에\n아홉 시간이 지나서야 답했어요.",
    "title": "오늘도 \"밥은 먹었니?\"\n받으셨나요?",
    "speech": "밥은 먹었니입니다. 직장인 민지 씨는 오늘도 엄마의 밥은 먹었니에 밤 9시에야 답했습니다. 같은 답을 엄마에게, 또 아빠에게 매일 치기가 귀찮았거든요. 그사이 엄마는 하루 종일 걱정했습니다. 여러분도 오늘 이 질문 받으셨나요?"
  },
  "problem": {
    "title": "얼굴은 자주 못 봐도, 안부는 매일 전할 수 있어요",
    "stat": 64.9,
    "statDecimals": 1,
    "statSuffix": "%",
    "statLabel": "떨어져 사는 자녀와 매주 연락하는 어르신 (2023)",
    "compare": "자주 못 보니까, 짧은 안부 한 줄이 부모님께는 큰 안심이에요",
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
        "엄마한테 한 번, 아빠한테 또 한 번 똑같이 쳐야 해요."
      ],
      [
        "위치 공유 앱",
        "편하긴 한데 감시받는 기분이라 오래 못 써요."
      ]
    ]
  },
  "solution": {
    "title": "궁금한 건 결국 밥, 귀가, 기분. 사진 한 장이면 다 전해져요",
    "tagline": "나는 세 번만 누르고,\n부모님은 메시지만 봐도 안심해요",
    "before": [
      "매일 같은 질문이 와요",
      "같은 답을 엄마, 아빠한테 따로 쳐요",
      "궁금한 게 사람마다 달라요"
    ],
    "after": [
      "사진이랑 기분만 고르면 AI가 정리해 줘요",
      "마미한테는 다정하게, 아빵아한테는 짧게 가요"
    ]
  },
  "demo": {
    "title": "사진 한 장이 엄마 답장으로 돌아오기까지",
    "steps": [
      {
        "id": "upload",
        "label": "사진·기분",
        "icon": "Camera",
        "title": "사진 두 장이랑 기분 하나",
        "lines": [
          "도시락 · 행사 배너 사진",
          "😪 피곤해 · \"보고시퍼\""
        ]
      },
      {
        "id": "compose",
        "label": "받는 분별",
        "icon": "MessagesSquare",
        "title": "부르는 말도 말투도 평소 나처럼",
        "key": true,
        "items": [
          [
            "마미",
            "밥, 귀가, 기분까지 다정하게"
          ],
          [
            "아빵아",
            "귀가만 짧게, 존댓말로"
          ]
        ],
        "note": "평소 말투 예시: \"오늘도 화이팅 ㅎㅎ\""
      },
      {
        "id": "deliver",
        "label": "카톡 알림",
        "icon": "MessageCircle",
        "title": "링크 안 열어도 다 보여요",
        "lines": [
          "🍚 아직 밥 전 · 🏠 아직 귀가 전 · 😪 피곤해"
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
      "sub": "엄마가 ❤️와 🍚로 답했어요",
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
      "goal": "내일도 사진 한 장이면 돼요"
    },
    "disclosure": "실제 서비스 주소에서 Claude Sonnet 5.5(Amazon Bedrock)로 그대로 녹화했어요. 기다리는 시간만 빠르게 넘겼어요."
  },
  "trust": {
    "title": "AI는 정리만 하고, 보낼지는 내가 정해요",
    "cards": [
      [
        "ScanEye",
        "사진으로는 밥과 귀가만",
        "확실하지 않으면 \"모르겠어요\"라고 적어요."
      ],
      [
        "Scissors",
        "보낼 내용은 코드가 걸러요",
        "안 보내기로 한 건 AI에 넘기기 전에 빼요."
      ],
      [
        "BadgeCheck",
        "내가 확인해야 보내져요",
        "틀린 건 고치고, 확인을 눌러야 가요."
      ]
    ]
  },
  "arch": {
    "title": "판단은 AI 둘, 안전은 코드 하나",
    "user": "자녀 앱 · 부모님 링크",
    "core": "안부 라우터 (EC2)",
    "agents": [
      "사진 판정",
      "엄마 말투",
      "아빠 말투"
    ],
    "model": "Bedrock · Sonnet 5.5",
    "store": "오늘 안부",
    "out": "받는 분별 메시지"
  },
  "kiro": {
    "title": "스펙이 먼저, 코드는 그다음",
    "metrics": [
      [
        "FileText",
        "6",
        "Steering",
        "공통 규칙 4개는 늘, 화면·서버 규칙은 필요할 때만"
      ],
      [
        "ListChecks",
        "R1~R9",
        "Spec 요구사항",
        "돌려 보다 찾은 버그로 R4-5, 말투·호칭으로 R9를 더했어요"
      ],
      [
        "CheckSquare",
        "97",
        "테스트",
        "요구사항을 그대로 옮긴 서버·화면 테스트"
      ]
    ],
    "note": "문제가 생기면 코드보다 요구사항을 먼저 고치고, 테스트로 다시 확인했어요."
  },
  "closing": {
    "title": "\"밥은 먹었니?\"에\n사진 한 장으로",
    "next": "다음엔 카톡 카드 공유, 내 말투를 배우는 AI까지",
    "notifyTime": "21:05",
    "notifyTitle": "민지 오늘 안부",
    "notifyBody": "마미~ 아직 밥 전 · 아직 귀가 전 · 😪 피곤해"
  }
}
```

## 캡처 (데모 경로와 장면 시각)

`npm run capture` 가 이 블록을 읽어서 목업(또는 `DEMO_URL`)을 녹화합니다. 각 `sel` 이 화면에 나타나야 다음으로 넘어가므로, 캡처는 스모크 테스트를 겸합니다.

**실제 앱을 녹화할 때**는 `url` 을 비우고 `DEMO_URL=http://localhost:5173` 을 주고, `sel` 을 `[data-beat="<id>"][data-state="done"]` 형태로 씁니다. 마지막 `end` 의 `#play:not([disabled])` 가 재생 종료 신호입니다.

`device` 는 `phone`(기본, 휴대폰 틀) 또는 `browser`(넓은 웹 화면)입니다. **`browser` 면 `data-beat` 마커가 늘 화면 안에 있어서 카메라가 안 움직입니다.** beat 마다 `focus` 에 그 구간에서 보여줄 카드 선택자(`#result-card` 등)를 적습니다. 비우면 `sel` 을 씁니다.

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
