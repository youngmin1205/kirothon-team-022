# 제출 키트

> **17:00에 이 파일을 열고 위에서 아래로 내려갑니다.** 빈칸은 당일 채웁니다.
> 제출 폼이 요구하는 문구는 대부분 `.kiro/steering/product.md` 에서 그대로 복사됩니다.
> 17:50에 소개 문구를 처음 쓰기 시작하면 마감에 쫓깁니다. 그래서 양식을 미리 만들어 뒀습니다.

---

## 1. 요건 확인 (17:00, 2분)

제출 안내를 읽고 해당하는 것에 체크합니다.

- [ ] 레포 링크
- [ ] 데모 영상 (길이 제한: ______)
- [ ] 발표 슬라이드 (장수 제한: ______)
- [ ] 배포된 URL
- [ ] 제출 폼 작성 (주소: ______)
- [ ] 그 외: ______

**제출 마감 시각:** ______   **제출 방법:** ______

---

## 2. 공통 확인 (17:05, 5분)

- [ ] `git pull --rebase --autostash && pnpm smoke` → 통과
- [ ] `pnpm check` → 통과 (시간 없으면 생략 가능)
- [ ] `./scripts/scan-secrets.sh --all` → 깨끗함
- [ ] README 상단의 실행법이 실제로 동작 (`pnpm bootstrap` → `pnpm mock`)
- [ ] `.env` 가 커밋되지 않았는지 (`git log -p | grep -i secret` 또는 scan-secrets)
- [ ] 레포 공개 전환이 필요한지 확인 → 필요하면 전환

---

## 3. 분기 실행 (17:15, 필요한 것만)

### 영상 (담당3, macOS)

```bash
pnpm build
pnpm start &                                    # 다른 터미널에서
DEMO_URL=http://127.0.0.1:8000 npm --prefix deliverables run capture
```

- [ ] 8구간이 누락 없이 들어갔는지 확인
- [ ] live(`USE_MOCK=0`)로 녹화했는지, 개발 바 칩이 `Bedrock` 이었는지 확인. live 가 실패하면 `USE_MOCK=1` 로 대체 녹화

### 슬라이드 (담당3, macOS)

```bash
npm --prefix deliverables run ppt
```

- [ ] `deliverables/product.md` 의 `film` 블록이 채워져 있어야 생성됨
- [ ] `film` 의 숫자는 카드 값이 아니라 **live 녹화에서 실제로 나온 값**인지 (영상과 슬라이드가 같은 숫자)
- [ ] 금지어 검사: `npm --prefix deliverables run check`

### 배포 URL (필요할 때만, 2분)

```bash
pnpm build && pnpm start          # 단일 프로세스, :8000
# 다른 터미널에서 터널 실행 → 공개 HTTPS 주소 획득
```

- [ ] 받은 주소로 다른 기기에서 열어 `#play` 동작 확인

---

## 4. 제출 폼용 문구 (17:35, 5분)

아래를 그대로 복사해 씁니다. 괄호 안은 출처입니다.

**팀명**

```
AAcrew
```

**프로젝트 이름** (`product.md` 한 줄 소개)

```

```

**한 줄 소개 (50자 이내)** (`product.md` 한 줄 소개)

```

```

**설명 (3~5줄)** — 아래 틀에 `product.md` 의 사용자·문제·해결을 넣습니다

```
누가: (product.md 사용자)
문제: (product.md 문제)
해결: (product.md 해결)
데모: (product.md 데모 구간 중 핵심 3개를 한 문장으로)
```

**기술 스택**

```
React 19 + Vite + TypeScript / Python + FastAPI /
Amazon Bedrock (Claude, Converse API) / Kiro CLI
```

**Kiro 활용** (`docs/kiro-usage-log.md` 에서 요약)

```
- spec 기반 개발: 아이디어 선정 → requirements/design/tasks 를 Kiro 로 생성하고 그대로 구현
- steering 으로 팀 규칙 공유: 스택·폴더 구조·데모 계약을 3명이 같은 규칙으로 작업
- 역할 에이전트: build(개발) / review(읽기 전용 리뷰) 분리
- (당일 기록에서 숫자 하나 추가: 몇 분 / 몇 개 task)
```

**레포 주소**

```
https://github.com/youngmin1205/kirothon-team-022
```

**실행 방법**

```
pnpm bootstrap && pnpm mock   →  http://localhost:5173 에서 "데모 재생" 클릭
(AWS 자격증명 없이도 전체 데모가 재생됩니다)
```

**팀원**

```
영신 · 채연 · 세민
```

---

## 5. 제출 (17:45)

- [ ] 폼 제출 완료
- [ ] 제출 확인 화면·메일 캡처해서 팀 채널에 공유
- [ ] 레포 최종 커밋 push 확인 (`git status` 가 깨끗한지)

---

## 6. 피칭 준비 (18:00~19:00)

3분 기준. 두 번 소리 내어 연습합니다.

| 구간 | 시간 | 내용 |
|---|---|---|
| 문제 | 30초 | 누가, 무엇이 불편한지. 숫자 하나 |
| 데모 | 90초 | `#play` 한 번. 설명하지 말고 화면을 보여준다 |
| 어떻게 | 40초 | 에이전트 구조 1장 (`ArchFlow` 화면 또는 다이어그램) |
| Kiro 활용 | 20초 | spec 기반으로 3명이 어떻게 병렬 작업했는지 |

- 발표자: ______
- 노트북은 발표자 것으로 미리 연결 확인
- **무대 시연은 `USE_MOCK=1` 로 돌립니다.** 무대에서 네트워크를 믿지 않습니다 (제출 영상은 live 로 찍은 것)
- 질문 대비: "왜 에이전트가 필요한가", "실제로 쓸 수 있는가", "다음 단계는"
