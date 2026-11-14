#!/usr/bin/env bash
# 당일 아침에 "내 PC가 준비됐는지"를 한 번에 확인한다.
# AWS 는 호출하지 않는다. 계정·Bedrock 확인은 ./scripts/aws-check.sh 가 담당한다.
#
# 사용법:
#   ./scripts/preflight.sh
#
# 종료 코드: 0 = 전부 통과, 1 = 필수 항목 실패

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

PASS=0; FAIL=0; WARN=0
ok()   { printf '  \033[32m✓\033[0m %-26s %s\n' "$1" "${2:-}"; PASS=$((PASS+1)); }
bad()  { printf '  \033[31m✗\033[0m %-26s %s\n' "$1" "${2:-}"; FAIL=$((FAIL+1)); }
warn() { printf '  \033[33m!\033[0m %-26s %s\n' "$1" "${2:-}"; WARN=$((WARN+1)); }
head2(){ printf '\n\033[1m%s\033[0m\n' "$1"; }

# major 버전만 비교한다 (팀 규칙: 메이저만 통일, 패치는 자유)
major() { echo "${1#v}" | cut -d. -f1; }
# "현재 >= 기준" 인지
ge() { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -1)" = "$2" ]; }

head2 "1. 런타임"

if command -v node >/dev/null 2>&1; then
  NODE_CUR=$(node -v)
  NODE_WANT=$(cat .nvmrc 2>/dev/null || echo "")
  if [ -n "$NODE_WANT" ] && [ "$(major "$NODE_CUR")" != "$(major "$NODE_WANT")" ]; then
    warn "node" "$NODE_CUR (.nvmrc=$NODE_WANT) — 메이저가 다릅니다. nvm use 로 맞추세요"
  else
    ok "node" "$NODE_CUR"
  fi
else
  bad "node" "없음 — nvm 또는 fnm 으로 설치 (.nvmrc 참고)"
fi

if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm" "$(pnpm -v)"
else
  bad "pnpm" "없음 — npm i -g pnpm (또는 corepack enable)"
fi

PY=""
for c in python3 python; do command -v "$c" >/dev/null 2>&1 && { PY="$c"; break; }; done
if [ -n "$PY" ]; then
  PY_CUR=$($PY --version 2>&1 | awk '{print $2}')
  PY_WANT=$(cat .python-version 2>/dev/null || echo "")
  PY_CUR_MM=$(echo "$PY_CUR" | cut -d. -f1,2)
  if [ -n "$PY_WANT" ] && [ "$PY_CUR_MM" != "$PY_WANT" ]; then
    warn "python" "$PY_CUR (.python-version=$PY_WANT) — uv 가 맞춰 줍니다"
  else
    ok "python" "$PY_CUR"
  fi
else
  bad "python" "없음"
fi

if command -v uv >/dev/null 2>&1; then
  ok "uv" "$(uv --version | awk '{print $2}')"
else
  bad "uv" "없음 — curl -LsSf https://astral.sh/uv/install.sh | sh"
fi

head2 "2. 도구"

if command -v aws >/dev/null 2>&1; then
  AWS_V=$(aws --version 2>&1 | awk '{print $1}' | cut -d/ -f2)
  if ge "$AWS_V" "2.0.0"; then ok "aws cli" "$AWS_V"; else bad "aws cli" "$AWS_V — v2 가 필요합니다"; fi
else
  bad "aws cli" "없음"
fi

if command -v kiro-cli >/dev/null 2>&1; then
  K_V=$(kiro-cli --version 2>&1 | awk '{print $2}')
  if ge "$K_V" "3.2.1"; then
    ok "kiro-cli" "$K_V"
  else
    bad "kiro-cli" "$K_V — 3.2.1 이상이 필요합니다. kiro-cli update"
  fi
else
  bad "kiro-cli" "없음"
fi

command -v git >/dev/null 2>&1 && ok "git" "$(git --version | awk '{print $3}')" || bad "git" "없음"

head2 "3. Kiro 설정"

if command -v kiro-cli >/dev/null 2>&1; then
  AGENTS=$(kiro-cli agent list 2>&1 | sed 's/\x1b\[[0-9;]*m//g')
  for a in build review; do
    if echo "$AGENTS" | grep -q "$a"; then ok "agent: $a" "보임"; else bad "agent: $a" "안 보임 — 레포 루트에서 실행했는지 확인"; fi
  done
  for f in .kiro/agents/*.json; do
    [ -f "$f" ] || continue
    n=$(basename "$f")
    kiro-cli agent validate --path "$f" >/dev/null 2>&1 && ok "validate: $n" "" || bad "validate: $n" "스키마 오류"
  done
  warn "워크스페이스 신뢰" "레포 루트에서 kiro-cli 를 한 번 띄워 승인해야 훅·에이전트·MCP 가 로드됩니다"
fi

head2 "4. 환경변수"

if [ -f .env ]; then
  ok ".env" "있음"
  # shellcheck disable=SC1091
  REGION=$(grep -E '^AWS_REGION=' .env | tail -1 | cut -d= -f2-)
  MODEL=$(grep -E '^BEDROCK_MODEL_ID=' .env | tail -1 | cut -d= -f2-)
  PROFILE=$(grep -E '^AWS_PROFILE=' .env | tail -1 | cut -d= -f2-)
  KEYID=$(grep -E '^AWS_ACCESS_KEY_ID=' .env | tail -1 | cut -d= -f2-)
  [ -n "$REGION" ] && ok "AWS_REGION" "$REGION" || bad "AWS_REGION" "비어 있음"
  [ -n "$MODEL" ]  && ok "BEDROCK_MODEL_ID" "$MODEL" || bad "BEDROCK_MODEL_ID" "비어 있음 — ./scripts/aws-check.sh 로 찾으세요"
  if [ -n "$PROFILE" ] || [ -n "$KEYID" ]; then
    ok "자격증명 설정" "$([ -n "$PROFILE" ] && echo "프로필 $PROFILE" || echo "환경변수 키")"
  else
    warn "자격증명 설정" "프로필도 키도 없음 — EC2 인스턴스 역할을 쓸 때만 정상입니다"
  fi
else
  bad ".env" "없음 — cp .env.example .env"
fi

head2 "5. 오프라인 준비 (행사장 네트워크로 받지 않기)"

if [ -d deliverables/node_modules ]; then
  ok "발표 도구 (담당3)" "설치됨"

  PW_CACHE=""
  for d in "$HOME/.cache/ms-playwright" "$HOME/Library/Caches/ms-playwright"; do
    [ -d "$d" ] && { PW_CACHE="$d"; break; }
  done
  if [ -n "$PW_CACHE" ] && ls "$PW_CACHE" 2>/dev/null | grep -qi chromium; then
    ok "playwright chromium" "캐시됨"

    # 캐시가 있어도 실행이 안 되는 경우가 있다. Linux 는 시스템 라이브러리가 따로 필요하다.
    # (실측: libasound.so.2 가 없어 chrome-headless-shell 이 exit 127 로 죽었다)
    if command -v ldd >/dev/null 2>&1; then
      SHELL_BIN=$(find "$PW_CACHE" -name 'chrome-headless-shell' -type f 2>/dev/null | head -1)
      [ -z "$SHELL_BIN" ] && SHELL_BIN=$(find "$PW_CACHE" -name 'chrome' -type f 2>/dev/null | head -1)
      if [ -n "$SHELL_BIN" ]; then
        MISSING=$(ldd "$SHELL_BIN" 2>/dev/null | awk '/not found/{print $1}' | sort -u | tr '\n' ' ')
        if [ -n "$MISSING" ]; then
          warn "브라우저 실행 라이브러리" "없음: $MISSING"
          echo "       → sudo npx playwright install-deps chromium"
          echo "         (영상·슬라이드 생성만 막힙니다. macOS 는 해당 없음)"
        else
          ok "브라우저 실행 라이브러리" "충족"
        fi
      fi
    fi
  else
    warn "playwright chromium" "없음 — pnpm bootstrap:deliverables"
  fi
else
  ok "발표 도구 (담당3)" "미설치 — 정상입니다"
  echo "       발표 산출물 담당만 pnpm bootstrap:deliverables 를 돌립니다 (약 1.7GB, macOS)"
fi

# 설치 누락을 통과시키지 않는다. 과거에 `pnpm setup` 이 pnpm 내장 명령과 이름이 겹쳐
# 라이브러리가 안 깔린 채 preflight 를 통과한 사고가 있었다 (그래서 스크립트 이름이 bootstrap 이다).
if [ -d .venv ] || [ -d backend/.venv ]; then
  ok "python 가상환경" "있음"
else
  bad "python 가상환경" "없음 — pnpm bootstrap 을 돌리세요"
fi

if [ -d frontend/node_modules ]; then
  ok "프런트 라이브러리" "설치됨"
else
  bad "프런트 라이브러리" "없음 — pnpm bootstrap 을 돌리세요"
fi

head2 "6. 비밀키"

if [ -x scripts/scan-secrets.sh ]; then
  if ./scripts/scan-secrets.sh --all >/dev/null 2>&1; then
    ok "scan-secrets" "깨끗함"
  else
    bad "scan-secrets" "의심 항목 있음 — ./scripts/scan-secrets.sh --all 로 확인"
  fi
else
  bad "scan-secrets.sh" "실행 권한 없음 — chmod +x scripts/scan-secrets.sh"
fi

if git check-ignore -q .env 2>/dev/null; then ok ".env gitignore" "무시됨"; else bad ".env gitignore" ".env 가 커밋될 수 있습니다"; fi

printf '\n\033[1m결과\033[0m  통과 %d · 경고 %d · 실패 %d\n' "$PASS" "$WARN" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf '\n위 ✗ 항목을 먼저 해결하세요. AWS 계정과 Bedrock 확인은 따로입니다:\n  ./scripts/aws-check.sh\n\n'
  exit 1
fi
printf '\n로컬 준비는 끝났습니다. 다음은 계정 확인입니다:\n  ./scripts/aws-check.sh --invoke\n\n'
exit 0
