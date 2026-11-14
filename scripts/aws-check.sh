#!/usr/bin/env bash
# AWS 계정과 Bedrock을 쓸 수 있는지 확인하고, .env 에 넣을 줄을 출력한다.
#
# 당일 쓰는 법:
#   주최 측 계정을 받은 직후 .env 의 (B) 블록을 채우고 아래를 실행한다.
#
#     ./scripts/aws-check.sh --invoke
#
#   출력 마지막의 두 줄을 .env 에 붙이면 끝이다.
#
# 모드:
#   (기본)     읽기 전용. 계정 확인 + 모델 목록 + EC2 읽기 권한
#   --invoke   위에 더해 모델을 실제로 1회 호출해 "되는" 모델 ID를 찾는다
#              → 과금되는 API 호출이다. 회사 계정에서는 함부로 돌리지 않는다
#
# 리전은 아래 CANDIDATE_REGIONS 순서로 본다. 필요하면 인자로 준다:
#   ./scripts/aws-check.sh --invoke us-west-2 ap-northeast-2

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

INVOKE=0
REGIONS=()
for arg in "$@"; do
  case "$arg" in
    --invoke) INVOKE=1 ;;
    -*) echo "알 수 없는 옵션: $arg" >&2; exit 2 ;;
    *) REGIONS+=("$arg") ;;
  esac
done
if [ ${#REGIONS[@]} -eq 0 ]; then
  REGIONS=(us-west-2 us-east-1 ap-northeast-2)
fi

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
head2(){ printf '\n\033[1m%s\033[0m\n' "$1"; }

# .env 가 있으면 읽어 자격증명·리전을 환경에 올린다
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  ok ".env 로드"
else
  warn ".env 가 없습니다 (cp .env.example .env 후 채우세요)"
fi

command -v aws >/dev/null 2>&1 || { bad "aws CLI 가 없습니다"; exit 1; }

# ─────────────────────────────────────────────────────────────
head2 "1. 어느 계정인가"
# ─────────────────────────────────────────────────────────────
IDENTITY=$(aws sts get-caller-identity --output json 2>&1)
if [ $? -ne 0 ]; then
  bad "자격증명이 동작하지 않습니다"
  echo "$IDENTITY" | sed 's/^/    /'
  echo
  echo "  확인할 것: .env 의 AWS_PROFILE 또는 AWS_ACCESS_KEY_ID/SECRET/SESSION_TOKEN"
  echo "  SSO 라면: aws sso login --profile <프로필>"
  exit 1
fi
ACCOUNT=$(echo "$IDENTITY" | grep -o '"Account"[^,]*' | cut -d'"' -f4)
ARN=$(echo "$IDENTITY" | grep -o '"Arn"[^,}]*' | cut -d'"' -f4)
ok "계정 $ACCOUNT"
echo "    $ARN"
if [ -n "${AWS_PROFILE:-}" ]; then
  echo "    (AWS_PROFILE=$AWS_PROFILE 사용)"
elif [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
  echo "    (환경변수 키 사용)"
else
  echo "    (기본 자격증명 체인 사용 — EC2 인스턴스 역할 등)"
fi

# ─────────────────────────────────────────────────────────────
head2 "2. 리전별로 쓸 수 있는 Claude 모델"
# ─────────────────────────────────────────────────────────────
FOUND_REGION=""
FOUND_IDS=""
for r in "${REGIONS[@]}"; do
  printf '  [%s] ' "$r"
  PROFILES=$(aws bedrock list-inference-profiles --region "$r" --output text \
              --query 'inferenceProfileSummaries[?status==`ACTIVE`].inferenceProfileId' 2>/dev/null)
  if [ -z "$PROFILES" ]; then
    # inference profile 이 없으면 foundation model 목록으로 대체
    PROFILES=$(aws bedrock list-foundation-models --region "$r" --by-provider anthropic --output text \
                --query 'modelSummaries[].modelId' 2>/dev/null)
  fi
  CLAUDE=$(echo "$PROFILES" | tr '\t' '\n' | grep -i claude | sort -u)
  if [ -z "$CLAUDE" ]; then
    echo "사용 가능한 Claude 모델 없음 (또는 조회 권한 없음)"
    continue
  fi
  COUNT=$(echo "$CLAUDE" | wc -l | tr -d ' ')
  echo "${COUNT}개"
  echo "$CLAUDE" | sed 's/^/      /'
  if [ -z "$FOUND_REGION" ]; then
    FOUND_REGION="$r"
    FOUND_IDS="$CLAUDE"
  fi
done

if [ -z "$FOUND_REGION" ]; then
  bad "어느 리전에서도 Claude 모델을 찾지 못했습니다"
  echo "    Bedrock 콘솔 > Model access 에서 모델 활성화가 필요할 수 있습니다"
  echo "    주최 측 계정이라면 어떤 리전·모델이 열려 있는지 운영진에 확인하세요"
  exit 1
fi

# 선호 순서: Sonnet 계열 > 나머지. us./global. 접두어가 붙은 inference profile 우선
RANKED=$(echo "$FOUND_IDS" | grep -E '^(us|global)\.' | grep -i sonnet)
[ -z "$RANKED" ] && RANKED=$(echo "$FOUND_IDS" | grep -i sonnet)
[ -z "$RANKED" ] && RANKED=$(echo "$FOUND_IDS" | grep -E '^(us|global)\.')
[ -z "$RANKED" ] && RANKED="$FOUND_IDS"

# ─────────────────────────────────────────────────────────────
head2 "3. 실제 호출 테스트"
# ─────────────────────────────────────────────────────────────
WORKING_ID=""
if [ "$INVOKE" -ne 1 ]; then
  warn "건너뜀 (읽기 전용 모드). 실제로 되는 모델을 확정하려면: ./scripts/aws-check.sh --invoke"
  WORKING_ID=$(echo "$RANKED" | head -1)
  echo "    목록 기준 후보: $WORKING_ID"
else
  for id in $(echo "$RANKED" | head -4); do
    printf '  %s ... ' "$id"
    OUT=$(aws bedrock-runtime converse \
            --region "$FOUND_REGION" \
            --model-id "$id" \
            --messages '[{"role":"user","content":[{"text":"ping"}]}]' \
            --inference-config '{"maxTokens":8}' \
            --output text 2>&1)
    if [ $? -eq 0 ]; then
      echo "성공"
      WORKING_ID="$id"
      break
    fi
    # 메시지 첫 줄만 짧게
    echo "실패 — $(echo "$OUT" | head -1 | cut -c1-110)"
  done
  if [ -z "$WORKING_ID" ]; then
    bad "호출에 성공한 모델이 없습니다"
    echo "    흔한 원인: 모델 액세스 미승인, 리전 불일치, 쿼터 0, 권한 부족"
    exit 1
  fi
  ok "사용할 모델 확정: $WORKING_ID"
fi

# ─────────────────────────────────────────────────────────────
head2 "4. 배포 권한 (EC2 읽기)"
# ─────────────────────────────────────────────────────────────
if aws ec2 describe-instances --region "$FOUND_REGION" --max-results 5 >/dev/null 2>&1; then
  ok "EC2 조회 가능 — 컨테이너 배포(2단계)를 선택지로 둘 수 있습니다"
  echo "    실제 기동 권한은 별도입니다. 확인하려면:"
  echo "      aws ec2 run-instances --dry-run --image-id <ami> --instance-type t3.small --region $FOUND_REGION"
  echo "      → DryRunOperation 이면 가능, UnauthorizedOperation 이면 불가"
else
  warn "EC2 조회 불가 — 배포는 터널(1단계)로 갑니다"
  echo "    노트북에서 앱을 띄운 뒤 공개 HTTPS 주소만 노출하는 방식입니다"
fi

# ─────────────────────────────────────────────────────────────
head2 "5. .env 에 넣을 줄"
# ─────────────────────────────────────────────────────────────
cat <<EOF

  AWS_REGION=$FOUND_REGION
  BEDROCK_MODEL_ID=$WORKING_ID

EOF
if [ "$INVOKE" -ne 1 ]; then
  warn "위 BEDROCK_MODEL_ID 는 목록 기준 후보입니다. --invoke 로 한 번 검증하세요."
fi
