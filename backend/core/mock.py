"""데모 구간(beat) 고정 시나리오 재생기.

핵심 아이디어
    deliverables/product.md 의 `capture.beats` 와 **같은 id** 를 쓴다.
    그러면 화면·영상·슬라이드·mock 이 한 목록에서 나온다. 기능이 하나도
    없는 상태에서도 데모를 처음부터 끝까지 재생할 수 있고, 녹화도 된다.

파일 위치
    backend/features/<기능>/mock.json

형식
    {
      "beats": [
        { "id": "intro", "text": "서울중앙지검 수사관입니다.", "delayMs": 700,
          "data": { "riskScore": 10 } },
        { "id": "hook", "say": "무슨 일이시죠?", "text": "...", "delayMs": 700 }
      ]

    say  (선택) 이 구간 직전 사용자 발화. #play 가 서버에 보낸다.
         live 녹화에서 모델이 대본대로 반응하게 한다. mock 재생은 무시한다.
    }

규칙
    - 순서대로 하나씩 꺼낸다. 세션의 beat_index 가 위치를 기억한다.
    - 다 쓰면 마지막 beat 를 반복한다(데모가 끊기지 않게).
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

from .session import Session

logger = logging.getLogger("mock")

FEATURES_DIR = Path(__file__).resolve().parent.parent / "features"


@lru_cache(maxsize=32)
def _load(feature: str) -> list[dict[str, Any]]:
    path = FEATURES_DIR / feature / "mock.json"
    if not path.exists():
        logger.warning("mock 파일이 없습니다: %s", path)
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        logger.error("mock 파일 파싱 실패 %s: %s", path, e)
        return []
    beats = data.get("beats", [])
    if not isinstance(beats, list):
        logger.error("mock 파일의 beats 가 배열이 아닙니다: %s", path)
        return []
    return beats


def beats(feature: str) -> list[dict[str, Any]]:
    return _load(feature)


def beat_ids(feature: str) -> list[str]:
    """프런트·녹화 설정과 id 가 맞는지 확인할 때 쓴다."""
    return [b.get("id", f"beat-{i}") for i, b in enumerate(_load(feature))]


def next_beat(session: Session) -> dict[str, Any]:
    """세션의 다음 구간을 꺼낸다. 없으면 마지막을 반복한다."""
    items = _load(session.feature)
    if not items:
        return {
            "id": "end",
            "text": f"[mock 없음] backend/features/{session.feature}/mock.json 을 만드세요.",
            "done": True,
        }

    idx = min(session.beat_index, len(items) - 1)
    beat = dict(items[idx])
    session.beat_index = idx + 1

    beat.setdefault("id", f"beat-{idx}")
    beat["index"] = idx
    beat["total"] = len(items)
    beat["done"] = idx >= len(items) - 1
    return beat


def reload() -> None:
    """mock.json 을 고친 뒤 서버 재시작 없이 다시 읽는다."""
    _load.cache_clear()
