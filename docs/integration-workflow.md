# 연동 워크플로우 — 세팅(담당2) × 산출물(담당3)

> 담당 2(Kiro 세팅)와 담당 3(발표/영상 산출물)이 **하나의 Kiro 환경에서 이어지도록** 정리.
> ⚠️ **모든 Kiro 명령은 레포 루트에서 실행**한다. (kiro-cli는 현재 폴더의 `.kiro`를 읽는다 — 실측 확인)

---

## 0. 작업 디렉터리 규칙 (중요)
```bash
kiro-cli               # 레포 루트에서 실행해야 steering/agents/skills 가 로드됨
```
- `.kiro/` 안에 steering·agents·skills·hooks 가 모두 있음.
- IDE로 열 때도 **레포 루트를 워크스페이스로** 연다.

---

## 1. 현재 `.kiro` 자산 (팀 공용)

| 종류 | 이름 | 담당 | 용도 |
|---|---|---|---|
| agent | `build` | 1·2 | 팀 기본 개발 에이전트 (steering·skill 로드, 3명 전원 사용) |
| agent | `review` | 1·2 | 읽기 전용 리뷰어 (쓰기 도구 없음) |
| skill | `pr-review` | 2 | 제출 전 변경사항 점검 |
| skill | `pitch-deck` (`/pitch-deck`) | 3 | product.md/docs → 발표 슬라이드 |
| skill | `demo-film` (`/demo-film`) | 3 | 데모 → 60초 영상 |
| steering | tech/structure/team | 2 | 공통 규칙 |

> 스킬은 **이름/설명 매칭으로 자동 활성화**되거나, `build`의 `resources`에 `skill://.kiro/skills/*/SKILL.md` 로 연결돼 로드된다.

---

## 2. 당일 엔드투엔드 흐름

```
① 아이디어 → ② build로 개발 → ③ review/pr-review로 점검
→ ④ docs 작성(kiro-usage-log.md 기록) → ⑤ pitch-deck으로 슬라이드 → ⑥ demo-film으로 영상
```

### ② 개발 (전원)
```bash
kiro-cli --agent build        # 레포 루트에서. steering 적용
```

### ③ 제출 전 점검
```bash
# pr-review 스킬 자동 활성화 (자연어로 요청)
kiro-cli --agent review "제출 전 backend/ 변경을 리뷰 체크리스트대로 점검해줘"
```

### ⑤ 슬라이드 / ⑥ 영상 (담당3 스킬)
```bash
# product.md(당일 작성) + docs 를 근거로
kiro-cli "/pitch-deck 로 발표 슬라이드 만들어줘"
kiro-cli "/demo-film 으로 60초 데모 영상 스크립트/녹화 구성해줘"
```
- 발표 소재는 `docs/kiro-usage-log.md`(담당3 양식)에 **그때그때 기록** → 피칭의 "Kiro 활용" 파트로 바로 사용.
- 산출물은 `deliverables/`(Marp 슬라이드·Playwright 녹화·Remotion 영상)로 모임.

---

## 3. 역할 경계 (충돌 방지)
- 담당2: `.kiro/`(steering·agent·hooks·mcp), `backend/`, 세팅 docs
- 담당3: `deliverables/`, 발표 스킬(`pitch-deck`·`demo-film`), `docs/kiro-usage-log.md`
- 공통 수정(같은 파일)은 team.md 규칙대로 **먼저 공유 후** 작업, `git pull --rebase` 후 push.

---

## 4. 빠른 점검 체크리스트
- [ ] 레포 루트에서 `kiro-cli agent list` → `build`, `review` 보임
- [ ] `kiro-cli --agent build` 로 "로드된 steering 파일 이름만 나열해라" → steering 6개 보임
- [ ] `kiro-cli --agent review` 로 파일 생성 요청 → 못 쓴다고 답하고 파일이 안 생김
- [ ] 자연어 리뷰 요청 시 `pr-review` 자동 활성화
- [ ] `/pitch-deck`, `/demo-film` 스킬 인식 (담당3)
- [ ] `kiro-cli mcp list` → aws-docs 보임
