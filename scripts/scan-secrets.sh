#!/usr/bin/env bash
# 자격증명이 코드에 섞여 들어갔는지 검사한다.
#
# 왜 훅이 아니라 스크립트인가:
#   PostFileSave 훅에 agent 액션을 걸면 파일을 저장할 때마다 모델을 호출해
#   크레딧과 지연이 커진다. 그리고 PostFileSave의 stdout은 세션에 전달되지
#   않아 경고가 사람에게 보이지 않는다. 비밀키는 "저장할 때"가 아니라
#   "커밋할 때" 막으면 충분하므로 여기로 옮겼다.
#
# 사용법:
#   ./scripts/scan-secrets.sh            # staged 변경만 검사 (커밋 전 기본)
#   ./scripts/scan-secrets.sh --all      # 추적 중인 파일 전체 검사
#
# 범위 주의:
#   --all 은 `git ls-files` 기준이라 **추적되지 않은 새 파일은 보지 않는다.**
#   커밋 관문은 기본(staged) 모드이고, 그쪽은 `git add` 된 파일을 모두 본다.
#
# 종료 코드: 0 = 깨끗함, 1 = 의심 항목 발견

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

MODE="${1:-staged}"
SELF="scripts/scan-secrets.sh"

# 검사 대상 파일 목록
if [ "$MODE" = "--all" ]; then
  mapfile -t FILES < <(git ls-files)
else
  mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACMR)
fi

# 바이너리·의존성·예시 파일·이 스크립트 자체는 제외
FILTERED=()
for f in "${FILES[@]:-}"; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue
  case "$f" in
    "$SELF"|*.env.example|node_modules/*|*/node_modules/*) continue ;;
    *.png|*.jpg|*.jpeg|*.gif|*.webp|*.pdf|*.mp4|*.webm|*.wav|*.otf|*.ttf|*.woff*) continue ;;
    *.lock|package-lock.json|pnpm-lock.yaml|uv.lock) continue ;;
  esac
  FILTERED+=("$f")
done

if [ ${#FILTERED[@]} -eq 0 ]; then
  echo "scan-secrets: 검사할 파일이 없습니다 (mode=$MODE)"
  exit 0
fi

# 패턴: 설명 + 정규식
PATTERNS=(
  "AWS 액세스 키 ID|(AKIA|ASIA)[0-9A-Z]{16}"
  "AWS 시크릿 키 할당|aws_secret_access_key[[:space:]]*[=:][[:space:]]*['\"][A-Za-z0-9/+=]{30,}"
  "세션 토큰 할당|aws_session_token[[:space:]]*[=:][[:space:]]*['\"][A-Za-z0-9/+=]{50,}"
  "개인키 블록|-----BEGIN[A-Z ]*PRIVATE KEY-----"
  "Bearer 토큰 하드코딩|[Bb]earer[[:space:]]+[A-Za-z0-9._~+/-]{24,}"
  "GitHub 토큰|gh[pousr]_[A-Za-z0-9]{30,}"
  "비밀값 직접 대입|(api[_-]?key|secret|password|passwd|token)[[:space:]]*[=:][[:space:]]*['\"][^'\"[:space:]]{12,}['\"]"
)

FOUND=0
for entry in "${PATTERNS[@]}"; do
  label="${entry%%|*}"
  regex="${entry#*|}"
  hits=$(grep -nIE "$regex" "${FILTERED[@]}" 2>/dev/null \
         | grep -vE '(例|example|EXAMPLE|placeholder|your[_-]?key|여기에|채운다|<[A-Za-z_-]+>)') || true
  if [ -n "$hits" ]; then
    FOUND=1
    echo ""
    echo "❌ $label"
    echo "$hits" | sed 's/^/   /'
  fi
done

echo ""
if [ "$FOUND" -eq 1 ]; then
  cat <<'MSG'
자격증명으로 보이는 값이 있습니다. 커밋하지 말고 .env 로 옮기세요.
  1) 값을 .env 에 넣는다 (.env 는 .gitignore 에 있습니다)
  2) 코드에서는 os.environ / import.meta.env 로 읽는다
  3) 이미 커밋했다면 해당 키를 폐기(rotate)한다 — 되돌려도 히스토리에 남습니다
MSG
  exit 1
fi

echo "✅ scan-secrets: 깨끗합니다 (${#FILTERED[@]}개 파일, mode=$MODE)"
exit 0
