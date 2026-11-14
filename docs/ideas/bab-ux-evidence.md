# 밥은 먹었니: 발표·UI 설계 근거 자료

> 작성일은 2026-11-14입니다. 모든 `[src: URL]`은 이 날 실제로 열어서 내용을 확인한 출처입니다.
> 출처로 확인하지 못한 서술에는 `[ai:assume]`을 붙였습니다.
> "우리 설계에 적용" 열에서 `product.md`에 이미 정해진 내용에는 (확정)을, 새로 제안하는 내용에는 `[ai:idea]`를 붙였습니다.

## 1) 핵심 요약 5줄

1. 습관은 동기보다 쉬움에서 생기므로, 안부 보내기는 사진 한 장과 버튼 한 번, 30초 안에 끝나야 합니다. [src: https://behaviormodel.org/]
2. 자녀가 기분과 공개 범위를 직접 고르게 하면 "감시당한다"가 아니라 "내가 알린다"가 됩니다. AI는 밥·귀가만 판정합니다. [src: https://selfdeterminationtheory.org/theory/]
3. 부모와 성인 자녀 사이에는 애정과 부담이 함께 있으므로, 부모님 답장은 고정 버튼으로 두어 잔소리 경로를 줄이고 반응(turning toward)만 남깁니다. [src: https://news.cornell.edu/node/281230]
4. 한국 노인의 64.9%는 떨어져 사는 자녀와 매주 연락하지만 매주 만나는 비율은 22.7%이고, 1인 가구는 전체의 36.1%입니다. [src: https://www.kihasa.re.kr/api/kihasa/file/download?seq=28264] [src: https://www.newsis.com/view/NISX20251209_0003433761]
5. 짧은 디지털 안부는 대면 만남을 대신하지 못한다는 연구가 있으므로, 우리는 이 앱을 "대체"가 아니라 전화와 만남으로 이어지는 "다리"로 설명합니다. [src: https://www.sciencedaily.com/releases/2015/10/151005080109.htm]

## 2) 설득·행동 심리 근거

| 원리 | 근거와 출처 | 우리 설계에 적용 |
|---|---|---|
| **Fogg Behavior Model (B=MAP)** | BJ Fogg는 "Behavior happens when Motivation, Ability, and a Prompt come together at the same time."라고 정의하고, 행동이 일어나지 않으면 셋 중 하나가 빠진 것이라고 설명합니다. [src: https://behaviormodel.org/] | 자녀의 동기(부모님 걱정 덜기)는 이미 있으므로 능력(쉬움)과 프롬프트(알림)를 설계합니다. `upload` 화면은 사진 첨부와 기분 버튼 두 동작으로 끝나게 합니다. (확정) |
| **Tiny Habits** | Tiny Habit은 하루 한 번 이상 하고, 30초가 안 걸리고, 노력이 거의 들지 않는 행동으로 정의됩니다. 새 행동은 "After I [existing routine], I will [new tiny behavior]." 형식으로 이미 하는 일 뒤에 붙입니다. [src: https://med.stanford.edu/content/dam/sm/ascend/documents/Introduction_%20Tiny%20Habits%20for%20Self%20Compassion,%20Getting%20Started.pdf] | 안부 보내기를 "점심 사진을 찍은 뒤", "현관문을 연 뒤"라는 기존 행동에 붙이는 문구로 안내합니다. 예: "점심 사진 찍었으면 그대로 올려 주세요." `[ai:idea]` |
| **자기결정성 이론 (자율성)** | 자기결정성 이론은 자율성·유능감·관계성을 건강한 발달과 기능의 기본 욕구로 보고, 내면화가 깊을수록 행동이 더 자율적이 된다고 설명합니다. 반대로 보상이나 승인에 맞춘 통제 지향도 구분합니다. [src: https://selfdeterminationtheory.org/theory/] | 기분은 AI가 판정하지 않고 자녀가 고르며, `confirm` 화면에서 AI 칩을 자녀가 고칠 수 있습니다. 받는 사람별 공개 항목도 자녀가 정합니다. (확정) |
| **Cialdini의 상호성·일관성** | 상호성은 사람이 먼저 받은 것을 돌려주려는 경향이며, "be the first to give"와 개인화된 선물을 권합니다. 일관성은 사람이 이전에 한 말과 행동에 맞추려는 경향이며, 작고 자발적인 첫 약속을 권합니다. 식당 연구에서 민트 하나는 팁을 약 3%, 개인적인 말과 함께 건넨 추가 민트는 23% 높였습니다. [src: https://www.influenceatwork.com/7-principles-of-persuasion/] | 자녀가 먼저 안부를 "주고", 부모님은 "🍚 나도 밥 먹었어"로 자기 안부를 돌려줍니다. 첫 보내기 직후 "내일도 점심 사진 보낼까요?"처럼 작은 약속을 한 번만 묻습니다. `[ai:idea]` |
| **Gottman의 bids for connection** | Bid는 상대에게 관심·인정·애정을 구하는 모든 시도이며, 신혼부부 6년 추적에서 결혼을 유지한 부부는 86%, 이혼한 부부는 33%만 상대의 bid에 반응(turning toward)했습니다. 이 연구는 부부 대상이므로 부모·자녀 관계에 옮기는 것은 유추입니다. [src: https://www.gottman.com/blog/turn-toward-instead-of-away/] | 자녀의 안부는 bid이고 부모님의 ❤️ 버튼은 turning toward입니다. `reply` 화면에서 "엄마도 밥 드셨대요"를 축하 연출로 보여 주어 반응이 자녀에게 반드시 돌아가게 합니다. (확정) |
| **Phatic communication** | Miller(2008)는 온라인 미디어 문화가 정보 전달이나 대화가 아니라 순수하게 사회적 연결을 위한 "phatic communications"로 점점 채워지고 있다고 분석했습니다. [src: https://kar.kent.ac.uk/13028/] | "밥 먹었니"는 정보 질문이 아니라 연결 확인이므로, 메시지는 `밥 / 귀가 / 기분 / 한마디` 네 항목의 짧은 요약으로 충분합니다. 긴 대화는 원래대로 카톡·전화로 넘깁니다. (확정) |

## 3) 가족 관계 연구 근거

| 연구 | 핵심 발견과 출처 | 우리 설계에 적용 |
|---|---|---|
| **Fingerman, Kim, Birditt, Zarit (2016), *Journal of Marriage and Family*** | 중년 부모 247명의 7일 일기 연구에서 96%가 그 주에 전화·문자·대면으로 자녀와 연락했고, 절반 넘는 부모가 자녀에 대한 걱정 같은 스트레스성 생각을 겪었습니다. 자녀와의 즐거운 경험과 스트레스 경험은 각각 부모의 그날 긍정·부정 기분과 연결되었고, 같은 날의 즐거운 경험은 스트레스 경험이 부정 기분에 미치는 영향을 완화했습니다. [src: https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1111/jomf.12273&resultType=core&format=json] (DOI 10.1111/jomf.12273, PMID 27022198의 초록을 Europe PMC API로 확인했습니다.) | 부모님의 "밥은 먹었나" 걱정을 같은 날의 작은 즐거운 접촉(사진 한 장, 버튼 답장)으로 완충합니다. 사진은 걱정을 덜어 주는 "즐거운 경험"이 되도록 음식·귀가 장면 위주로 고릅니다. `[ai:idea]` |
| **세대 간 양가감정 (Pillemer)** | 코넬대 노년학자 Karl Pillemer는 양가감정을 "a fundamental characteristic of relationships between parents and adult children"이라고 표현했고, 이 관계에는 따뜻함과 함께 두 세대 모두의 불안·스트레스가 있다고 설명했습니다. [src: https://news.cornell.edu/node/281230] 이 개념은 Lüscher & Pillemer(1998)가 제안한 것으로 알려져 있습니다. `[ai:assume]` | 관심과 간섭의 경계를 제품이 대신 그어 줍니다. 공개 항목은 자녀가 정하고, 부모님 답장은 자유 입력 없이 고정 버튼만 둡니다(범위 밖 항목과 일치). (확정) |
| **Teo et al. (2015), *Journal of the American Geriatrics Society*** | 미국 50세 이상 1만 1천여 명 분석에서 대면 접촉이 적은 사람은 2년 뒤 우울 위험이 거의 두 배였고, 전화·문서·이메일 접촉은 측정 가능한 효과가 없었습니다. 주 3회 이상 만난 사람의 우울 증상 비율은 6.5%, 몇 달에 한 번 이하로 만난 사람은 11.5%였습니다. 70세 이상에서는 자녀·가족과의 대면 접촉이 보호 요인이었습니다. [src: https://www.sciencedaily.com/releases/2015/10/151005080109.htm] | 이 앱은 대면을 대체하지 않는다고 발표에서 먼저 밝힙니다. 부모님 버튼 "📞 전화할게"는 이 앱에서 더 깊은 접촉으로 넘어가는 출구입니다. (확정 버튼, 해석은 `[ai:idea]`) |
| **Holt-Lunstad, Smith, Layton (2010), *PLOS Medicine*** | 148개 연구(308,849명) 메타분석에서 사회적 관계가 강한 사람은 생존 가능성이 50% 높았습니다. [src: https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1000316] | 발표의 문제 정의에서 "작은 안부도 관계 유지의 일부"라는 배경 근거로만 씁니다. 우리 앱이 수명을 늘린다고 주장하지 않습니다. |
| **WHO 사회적 연결 위원회 보고서 (2025-06-30)** | 세계 인구 6명 중 1명이 외로움을 겪고, 외로움은 연간 87만 1천 명 이상의 사망과 연관된 것으로 추정됩니다(시간당 약 100명). [src: https://www.who.int/news/item/30-06-2025-social-connection-linked-to-improved-heath-and-reduced-risk-of-early-death] | 발표 도입부의 "외로움은 개인 문제가 아니라 공중보건 문제"라는 한 줄 근거로 씁니다. |

## 4) 한국 통계

- **1인 가구 비중:** 국가데이터처의 「2025 통계로 보는 1인 가구」에 따르면 2024년 1인 가구는 804만 5천 가구로 전체의 36.1%였습니다. [src: https://www.newsis.com/view/NISX20251209_0003433761]
  - 그래서 우리 발표에서는 "자취하는 자녀"가 소수가 아니라 세 집 중 한 집 이상이라는 점으로 타깃 규모를 설명합니다.
- **1인 가구의 외로움:** 같은 자료에서 1인 가구의 48.9%가 평소 자주 또는 가끔 외롭다고 답해, 전체 평균 38.2%보다 10.7%p 높았습니다. [src: https://www.newsis.com/view/NISX20251209_0003433761]
  - 그래서 안부는 부모님만 받는 것이 아니라, 부모님의 "🍚 나도 밥 먹었어" 답장으로 자취하는 자녀도 돌봄을 받는 양방향 구조로 설명합니다.
- **떨어져 사는 자녀와의 접촉:** 2023년 노인실태조사를 분석한 보건복지포럼(2024년 11월, 이선희) 글에 따르면, 노인이 떨어져 사는 자녀와 주 1회 이상 왕래하는 비율은 22.7%, 연락을 주고받는 비율은 64.9%였고, 연락하지 않는다는 비율은 8.4%였습니다. 글은 대면보다 비대면 연락이 더 빈번한 경향이 이어지고 있다고 정리합니다. 같은 조사에서 노인 독거가구는 32.8%, 부부가구는 55.2%였습니다. [src: https://www.kihasa.re.kr/api/kihasa/file/download?seq=28264]
  - 그래서 우리는 이미 있는 "비대면 연락"의 질을 높이는 데 집중하고, 부모님은 앱 설치 없이 카톡·문자 본문만으로 안부를 알게 합니다.

## 5) 앱 UX 패턴

| 앱 | 패턴 (출처) | 우리 화면 적용 위치 |
|---|---|---|
| **카카오톡** | 카카오 공유 메시지의 제목과 본문은 각각 최대 2줄까지 보이고 넘치는 글자는 말줄임표로 처리됩니다. 텍스트 템플릿은 최대 200자입니다. [src: http://developers.kakao.com/docs/ko/message-template/faq] | `deliver`: 요약 본문의 핵심(🍚·🏠·🙂)을 첫 두 줄 안에 넣어, 링크를 열지 않아도 안부가 읽히게 합니다. (확정) |
| **토스** | 토스는 가입 과정의 모든 화면에서 고객이 할 일을 단 하나로 제약하고, 서비스가 복잡해질수록 첫 화면은 더 단순해야 한다고 결론 내렸습니다. [src: https://toss.im/tossfeed/article/importance-simplicity] | `home`·`upload`: 화면마다 주요 버튼은 하나("오늘 안부 보내기", "다음")만 크게 둡니다. `[ai:idea]` |
| **점진적 공개 (NN/g, Material)** | 점진적 공개는 고급 기능이나 드물게 쓰는 기능을 보조 화면으로 미루어, 초보자의 실수를 줄이고 학습성·효율·오류율을 개선합니다. [src: https://www.nngroup.com/articles/progressive-disclosure/] Material의 FAB은 사용자가 가장 자주 가는 하나의 주요 행동을 강조하는 버튼입니다. [src: https://developer.android.com/develop/ui/compose/components/fab] | `upload`: 기분 5개 버튼만 먼저 보이고 "✏️ 직접 입력"과 사진 추가는 '+' 시트에 넣습니다. 받는 사람 프로필 편집도 시트로 숨깁니다. `[ai:idea]` |
| **인스타그램 (친한 친구)** | 인스타그램은 "sometimes what you want to share isn't for everyone"이라며 직접 고른 작은 그룹에만 스토리를 공유하는 기능을 만들었고, 친한 친구 목록은 본인만 볼 수 있습니다. [src: https://about.instagram.com/blog/announcements/curate-instagram-stories-for-close-friends-only] | `compose`: 엄마용과 아빠용 미리보기를 나란히 보여 주어 "누구에게 무엇이 가는지"를 자녀가 확인합니다. 아빠 카드에는 기분 항목 자체가 없습니다. (확정) |
| **BeReal** | BeReal은 매일 다른 시각에 알림을 한 번 보내고, 사용자는 2분 안에 앞·뒤 카메라로 동시에 찍어 필터 없이 올립니다. [src: https://thestar.com.my/tech/tech-news/2023/02/04/two-minutes-a-day-to-be-authentic-does-bereal-show-real-life] | 알림은 하루 한 번만 보내고, 꾸미지 않은 사진도 괜찮다는 문구("대충 찍어도 돼요")를 `upload`에 둡니다. 시간 제한은 두지 않습니다. `[ai:idea]` |
| **Life360 (Bubbles)** | 10대들이 위치 추적에 반발해 TikTok에서 비판이 퍼지자, Life360은 정확한 위치 대신 1~25마일 반경의 대략적 영역을 1~6시간 공유하는 Bubbles를 만들었습니다. 부모가 버블을 깨면 10대에게 알림이 갑니다. [src: https://techcrunch.com/2020/10/12/family-tracking-app-life360-launches-bubbles-a-location-sharing-feature-inspired-by-teens-on-tiktok] | 우리는 위치를 추적하지 않고 "🏠 9시 귀가"라는 결과만 자녀가 보냅니다. 발표에서 "추적 앱의 반대편"이라는 대비로 씁니다. (확정, 위치 추적은 범위 밖) |
| **Apple 피트니스 (활동 링)** | Apple은 활동 링(움직이기·운동하기·일어서기)을 하루를 활동적으로 보내게 하는 단순한 방법으로 소개하며, 요일별 목표 설정과 쉬는 날의 링 일시 정지를 지원합니다. [src: https://www.apple.com/newsroom/2025/04/get-active-with-apple-watch/] | `reply` 이후 "이번 주 안부 n일"을 링 하나로 보여 주고, 쉬는 날을 허용해 빠진 날이 실패로 보이지 않게 합니다. `[ai:idea]` |
| **Duolingo (연속 기록)** | 7일 연속 기록에 도달한 학습자는 코스 완주 가능성이 3.6배 높았고, 연속 기록 연장 애니메이션은 신규 학습자의 7일 뒤 활동 확률을 1.7% 높였습니다. 하루를 쉬게 해 주는 Streak Freeze도 있습니다. [src: https://blog.duolingo.com/how-duolingo-streak-builds-habit/] | `reply`: "엄마도 밥 드셨대요" 칩에 짧은 축하 연출(celebrate)을 붙입니다. 연속 기록은 보여 주되 끊겨도 벌주지 않는 문구를 씁니다. (celebrate는 확정, 연속 기록은 `[ai:idea]`) |
| **Gmail Smart Reply** | Google의 Smart Reply는 한 번 탭으로 보낼 수 있는 짧은 답장을 제안하며, Inbox by Gmail 모바일 답장의 10%를 담당했습니다. [src: https://arxiv.org/abs/1606.04870] | `react`: 부모님은 자유 입력 대신 고정 버튼 5개(❤️·📞·🍚·🏥·🙂)로 한 번에 답합니다. (확정) |
| **Apple HIG / NN/g (큰 글씨·접근성)** | Apple은 컨트롤을 최소 44×44pt로, 글자는 최소 11pt로 만들라고 권합니다. [src: https://developer.apple.com/design/tips/] NN/g는 작은 버튼과 링크가 고령 사용자에게 누르기 어렵고, 고령 사용자가 더 많은 실수를 한다고 정리합니다. [src: https://www.nngroup.com/articles/usability-for-senior-citizens/] | 부모님 링크 페이지: 버튼은 44pt보다 크게, 한 줄에 하나씩 세로로 쌓고 큰 글씨로 씁니다. 잘못 누르면 바로 취소할 수 있게 합니다. `[ai:idea]` |

## 6) 발표용 인용구 후보

1. **"Behavior happens when Motivation, Ability, and a Prompt come together at the same time."** — BJ Fogg [src: https://behaviormodel.org/]
   - 쓰는 자리: "자녀는 마음이 없어서가 아니라 귀찮아서 답을 늦게 한다"는 문제 정의 슬라이드에 씁니다.
2. **"Sometimes what you want to share isn't for everyone."** — Instagram, 친한 친구 기능 발표문(2018) [src: https://about.instagram.com/blog/announcements/curate-instagram-stories-for-close-friends-only]
   - 쓰는 자리: "사진은 한 번, 엄마용과 아빠용은 다르게" 데모 장면 직전에 씁니다.
3. **Ambivalence is "a fundamental characteristic of relationships between parents and adult children."** — Karl Pillemer, 코넬대 [src: https://news.cornell.edu/node/281230]
   - 쓰는 자리: "감시가 아니라 관심" 슬라이드에서 자녀가 공개 범위를 정하는 이유로 씁니다.

보조 문장(우리가 통계를 풀어 쓴 문장): "부모님 세 분 중 두 분은 떨어져 사는 자녀와 매주 연락하지만, 매주 얼굴을 보는 분은 다섯 분 중 한 분 남짓입니다." (64.9%, 22.7%) [src: https://www.kihasa.re.kr/api/kihasa/file/download?seq=28264]
