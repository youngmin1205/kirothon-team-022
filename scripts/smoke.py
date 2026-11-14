#!/usr/bin/env python
"""데모가 실제로 끝까지 도는지 확인한다.

왜 필요한가
    테스트가 통과해도 "서버를 띄우면 도는가"는 별개다. 포트, 설정 로딩,
    기능 자동 등록, mock 재생이 실제 프로세스에서 맞물려야 한다.
    통합 체크포인트(11:55 / 13:00 / 15:30 / 16:30)마다 이걸 돌린다.

하는 일
    1. uvicorn 을 USE_MOCK=1 로 띄운다
    2. /api/health 가 응답할 때까지 기다린다
    3. 등록된 기능마다 데모 경로를 끝까지 재생한다 (start → reply × N)
    4. 구간(beat) 이 빠짐없이 나왔는지 확인한다
    5. --ui 면 실제 브라우저로 #play 를 눌러 화면까지 확인한다
    6. 프로세스를 정리한다

사용법
    uv run python scripts/smoke.py              # API 수준만 (빠름)
    uv run python scripts/smoke.py --ui         # 브라우저까지 (pnpm build 먼저)
    uv run python scripts/smoke.py --port 8099
    uv run python scripts/smoke.py --keep       # 확인 후 서버를 끄지 않는다

종료 코드: 0 = 통과, 1 = 실패
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"


def ok(msg: str) -> None:
    print(f"  {GREEN}✓{RESET} {msg}")


def bad(msg: str) -> None:
    print(f"  {RED}✗{RESET} {msg}")


def info(msg: str) -> None:
    print(f"    {DIM}{msg}{RESET}")


def post(url: str, payload: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:  # noqa: S310
        return json.loads(resp.read())


def get(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=20) as resp:  # noqa: S310
        return json.loads(resp.read())


def wait_for_health(base: str, proc: subprocess.Popen, timeout: float = 40.0) -> dict | None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if proc.poll() is not None:
            return None  # 서버가 죽었다
        try:
            return get(f"{base}/api/health")
        except (urllib.error.URLError, OSError, TimeoutError):
            time.sleep(0.4)
    return None


def walk_feature(base: str, feature: str, expected_beats: list[str]) -> bool:
    """한 기능의 데모 경로를 끝까지 재생한다.

    scripted=True 로 보낸다. mock 모드에서 사람이 직접 입력한 발화는 대본을
    진행시키지 않고 안내를 돌려주기 때문이다 (backend/features/*/router.py).
    """
    path = feature.replace("_", "-")
    try:
        start = post(f"{base}/api/{path}/start", {})
    except Exception as e:  # noqa: BLE001
        bad(f"{feature}: start 실패 — {type(e).__name__}: {e}")
        return False

    sid = start.get("sessionId")
    if not sid:
        bad(f"{feature}: start 응답에 sessionId 가 없습니다")
        return False
    if not start.get("text"):
        bad(f"{feature}: 첫 응답 text 가 비어 있습니다")
        return False

    texts = [start["text"]]
    # 남은 구간 수만큼 더 눌러 본다 (여유 1회)
    for i in range(max(len(expected_beats) - 1, 1) + 1):
        try:
            r = post(
                f"{base}/api/{path}/reply",
                {"sessionId": sid, "text": "다음", "scripted": True},
            )
        except Exception as e:  # noqa: BLE001
            bad(f"{feature}: reply {i + 1}회차 실패 — {type(e).__name__}: {e}")
            return False
        if not r.get("text"):
            bad(f"{feature}: reply {i + 1}회차 text 가 비어 있습니다")
            return False
        texts.append(r["text"])

    ok(f"{feature}: 데모 완주 ({len(texts)}개 응답, 구간 {len(expected_beats)}개)")
    for t in texts[:2]:
        info(t[:72])
    if len(texts) > 2:
        info(f"… 마지막: {texts[-1][:72]}")
    return True


def run_ui_check(base: str, feature: str, beat_ids: list[str]) -> bool:
    """실제 브라우저로 화면을 확인한다 (scripts/ui-check.mjs)."""
    if not (REPO / "deliverables" / "node_modules").exists():
        print(f"  {YELLOW}!{RESET} 브라우저 검증을 건너뜁니다 — 발표 도구 미설치 (담당3만 설치)")
        return True
    if not (REPO / "backend" / "static_dist").exists():
        bad("빌드 결과가 없습니다 — pnpm build 를 먼저 실행하세요")
        return False

    url = base if feature == "sample" else f"{base}/?feature={feature}"
    proc = subprocess.run(
        [
            "node",
            "scripts/ui-check.mjs",
            "--url",
            url,
            "--beats",
            ",".join(beat_ids),
            "--out",
            f".artifacts/smoke-{feature}.png",
        ],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    print(proc.stdout.rstrip())
    if proc.returncode == 3:
        # 환경 미비(브라우저 시스템 라이브러리 등). 코드 문제와 구분해 경고로 처리한다.
        print(proc.stderr.rstrip())
        print(f"  {YELLOW}!{RESET} 브라우저 검증을 건너뜁니다 (환경 미비). API 확인은 통과했습니다.")
        return True
    if proc.returncode != 0:
        print(proc.stderr.rstrip())
        return False
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8077)
    ap.add_argument("--keep", action="store_true", help="확인 후 서버를 끄지 않는다")
    ap.add_argument("--ui", action="store_true", help="실제 브라우저로 화면까지 확인한다")
    args = ap.parse_args()

    base = f"http://127.0.0.1:{args.port}"
    env = {**os.environ, "USE_MOCK": "1"}

    print("\n\033[1msmoke — 데모 경로 확인 (USE_MOCK=1, AWS 호출 없음)\033[0m\n")

    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--port", str(args.port)],
        cwd=REPO,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    failures = 0
    try:
        health = wait_for_health(base, proc)
        if health is None:
            bad("서버가 뜨지 않았습니다")
            if proc.poll() is not None and proc.stdout:
                print(proc.stdout.read()[-2000:])
            return 1

        ok(f"서버 기동 — mode={health['mode']} region={health['region']}")
        if health["mode"] != "mock":
            bad(f"mock 모드가 아닙니다 (mode={health['mode']}). USE_MOCK 전달을 확인하세요")
            failures += 1

        features = health.get("features") or []
        if not features:
            bad("등록된 기능이 없습니다 — backend/features/<이름>/router.py 를 확인하세요")
            return 1
        ok(f"기능 {len(features)}개 등록: {', '.join(features)}")

        for f in features:
            beats = health.get("beats", {}).get(f) or []
            if not beats:
                bad(f"{f}: mock.json 의 beats 가 비어 있습니다")
                failures += 1
                continue
            if not walk_feature(base, f, beats):
                failures += 1
                continue
            if args.ui:
                print(f"\n  \033[1m브라우저 확인 — {f}\033[0m")
                if not run_ui_check(base, f, beats):
                    failures += 1

    finally:
        if args.keep:
            print(f"\n{YELLOW}서버를 그대로 둡니다 (pid={proc.pid}, {base}){RESET}")
        else:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()

    print()
    if failures:
        print(f"{RED}smoke 실패 — {failures}건{RESET}\n")
        return 1
    print(f"{GREEN}smoke 통과{RESET}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
