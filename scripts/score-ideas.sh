#!/usr/bin/env bash
# 아이디어 카드를 AI 로 채점해 1개를 고른다.
#
# 왜 스크립트인가
#   10분 타임박스에서 프롬프트를 조립해 붙여넣는 시간이 아깝다.
#   채점 기준(docs/idea-scoring.md)과 카드(docs/idea-cards.md)를 합쳐
#   한 번에 돌리고 결과를 파일로 남긴다.
#
# 사용법
#   ./scripts/score-ideas.sh                    # 결과 → docs/idea-selection.md
#   ./scripts/score-ideas.sh --out docs/practice/idea-selection-rehearsal.md
#   ./scripts/score-ideas.sh --cards docs/practice/cards-rehearsal.md
#   ./scripts/score-ideas.sh --dry               # 프롬프트만 출력(모델 호출 없음)
#
# 종료 코드: 0 = 성공, 1 = 입력 문제, 2 = 실행 실패

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

CARDS="docs/idea-cards.md"
RUBRIC="docs/idea-scoring.md"
OUT="docs/idea-selection.md"
DRY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --cards) CARDS="$2"; shift 2 ;;
    --out)   OUT="$2";   shift 2 ;;
    --dry)   DRY=1;      shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "알 수 없는 옵션: $1" >&2; exit 1 ;;
  esac
done

for f in "$CARDS" "$RUBRIC"; do
  [ -f "$f" ] || { echo "파일이 없습니다: $f" >&2; exit 1; }
done

# 카드가 비어 있으면(템플릿 그대로) 막는다. 당일 실수로 빈 카드를 채점하는 일 방지.
FILLED=$(grep -c '^- 데모 장면: *[^ ]' "$CARDS" || true)
if [ "$FILLED" -eq 0 ]; then
  echo "아직 카드가 비어 있습니다: $CARDS" >&2
  echo "  '데모 장면' 칸이 채워진 카드가 하나도 없습니다." >&2
  exit 1
fi

# 채점 기준과 뼈대 목록을 파일에서 잘라 온다 (두 군데 적어 두면 한쪽이 낡는다)
section() { # section <시작 제목> <끝 제목>
  awk -v s="$1" -v e="$2" '$0 ~ s {f=1} $0 ~ e {f=0} f' "$RUBRIC"
}
RUBRIC_BODY=$(section '^## 2[.] 채점 기준' '^## 3[.]')
SKELETON=$(section '^## 3[.] 뼈대에 있는 것' '^## 4[.]')

[ -z "$RUBRIC_BODY" ] && { echo "채점 기준 절을 찾지 못했습니다 ($RUBRIC 2장)" >&2; exit 1; }
[ -z "$SKELETON" ] && { echo "뼈대 절을 찾지 못했습니다 ($RUBRIC 3장)" >&2; exit 1; }

PROMPT=$(cat <<EOF
너는 해커톤 아이디어 심사자야. 아래 [팀 컨텍스트]와 [채점 기준]만 써서 [아이디어 카드]들을 채점하고 1개를 골라.

규칙
- 카드에 적힌 내용만 근거로 써. 추측해서 점수 올리지 마. 필수 칸이 비었으면 그 칸에 걸린 항목은 1점.
- 데모 장면이 "행동 1개 → 화면에 뜨는 것" 형식이 아니면 채점하지 말고 "탈락: 데모 장면 없음"으로 적어.
- 모든 채점은 "최소 데모 버전" 기준. "확장" 칸의 기능은 K에서 최대 2점까지만 반영하고, D에는 넣지 마.
- D는 준비물 점수와 난이도 점수를 각각 매기고, 낮은 쪽을 D로 써. 근거에 둘 다 적어 (예: "준비물 3 / 난이도 1 → D=1").
- 준비물 점수는 [뼈대] 목록을 기준으로 판단해. "있는 것"에 해당하면 3점이고, "없는 것"에 해당하면 30분 안에 준비되는지로 2점·1점을 가려.
- AWS 서비스 요금(Bedrock, Transcribe 등)은 유료 API로 보지 마. 승인 대기나 외부 유료 결제가 필요할 때만 준비물 1점.
- 항목마다 점수 + 근거 1줄 (카드 문구를 인용).
- 합계 = A + B + K + 2D (만점 15).
- 1등과 2등 차이가 1점 이하면 D → A → B → 축소안 있는 쪽 → 카드 목록에서 먼저 나온 쪽 순서로 골라. 어느 단계에서 갈렸는지 적어.
- 마지막에 다음을 적어:
  1. 선정 / 백업
  2. 선정 아이디어의 데모 구간 6~8개를 표로 (열: # · id(영문 소문자) · 사용자 발화 1줄 · 화면에 보이는 것 1줄). 사용자 발화는 그 구간 직전에 사용자가 입력하거나 누르는 것을 한 문장으로 쓴다. 1번 구간은 시작 화면이라 비운다. 이 표가 product.md 와 mock 시나리오의 뼈대가 되고, 발화는 live 녹화 때 실제 모델에 들어간다.
  3. 선정 아이디어의 3명 분업안 (프론트 · 백엔드 · 에이전트 각 1줄, 서로 기다리지 않고 동시에 시작할 수 있게). 이렇게 나눌 수 없으면 백업을 선정으로 올리고 이유를 적어.
  4. 선정 아이디어의 가장 큰 리스크 1개
  5. 데모의 핵심 숫자가 live 모델로 재현되는가. 모델이 카드와 다르게 판단하면 어떤 숫자가 나오는지, 재현하려면 프롬프트에 어떤 제약이 필요한지 1줄

출력: 표 1개 (아이디어 | A | B | K | D(준비물/난이도) | 합계) → 항목별 근거 → 동점 처리 → 선정·백업·데모 구간·분업안·리스크·live 재현
파일은 수정하지 마. 결과만 출력해.

[팀 컨텍스트]
- 3명, 해커톤 1일 (구현 약 6시간, 11:00~18:00 중 점심 1시간 제외)
- 17:00 기능 추가 중단, 18:00 제출
- 스택: React + Vite + TypeScript (프런트) / Python + FastAPI (백엔드) / Bedrock Converse API 를 boto3 로 직접 호출
- 실행: 로컬. 배포는 기본적으로 안 함
- 데모는 USE_MOCK 모드로 재생할 수 있어야 함 (라이브 LLM 호출 실패 대비)

[뼈대]
${SKELETON}

[채점 기준]
${RUBRIC_BODY}

[아이디어 카드]
$(cat "$CARDS")
EOF
)

if [ "$DRY" -eq 1 ]; then
  printf '%s\n' "$PROMPT"
  exit 0
fi

command -v kiro-cli >/dev/null 2>&1 || { echo "kiro-cli 가 없습니다" >&2; exit 2; }

# 쓸 에이전트를 고른다 (없으면 기본 에이전트로)
AGENT_ARGS=()
if kiro-cli agent list 2>&1 | grep -q '\bbuild\b'; then
  AGENT_ARGS=(--agent build)
fi

echo "채점 중… (카드 ${FILLED}개)"
START=$(date +%s)

mkdir -p "$(dirname "$OUT")"
TMP=$(mktemp)
if ! kiro-cli chat --no-interactive --trust-workspace "${AGENT_ARGS[@]}" "$PROMPT" >"$TMP" 2>&1; then
  echo "kiro-cli 실행이 실패했습니다. 출력:" >&2
  tail -20 "$TMP" >&2
  rm -f "$TMP"
  exit 2
fi

ELAPSED=$(( $(date +%s) - START ))

{
  echo "# 아이디어 선정 결과"
  echo
  echo "- 실행: $(date '+%Y-%m-%d %H:%M:%S')  ·  소요 ${ELAPSED}초  ·  카드 ${FILLED}개"
  echo "- 기준: \`docs/idea-scoring.md\`  ·  카드: \`${CARDS}\`"
  echo
  echo '> 사람이 할 수 있는 건 "근거가 사실과 다름" 지적뿐입니다. 고칠 게 있으면 카드를 수정해 한 번만 다시 돌립니다.'
  echo
  echo "---"
  echo
  # kiro-cli 가 섞어 내보내는 진행 로그를 걷어낸다
  grep -vE '^\[(INFO|WARN|DEBUG|tool)\]' "$TMP" | sed '/^$/{N;/^\n$/D}'
} >"$OUT"
rm -f "$TMP"

echo "완료 (${ELAPSED}초) → $OUT"
echo
echo "다음 단계:"
echo "  1. $OUT 의 근거를 2분간 확인"
echo "  2. 선정 결과의 '데모 구간 6~8개' 를 .kiro/steering/product.md 에 옮긴다"
echo "  3. git add $OUT && git commit"
