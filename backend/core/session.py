"""세션 저장소 (프로세스 메모리).

왜 메모리인가: 해커톤 데모는 한 프로세스에서 끝난다. DB 를 붙이면 설정과
마이그레이션에 시간을 쓰고 얻는 게 없다. 재시작하면 날아가는 것이 유일한
단점이고, 데모에서는 문제가 되지 않는다.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Session:
    id: str
    feature: str
    created_at: float = field(default_factory=time.time)

    # Converse 형식 대화 이력. bedrock.converse 가 여기에 누적한다.
    messages: list[dict[str, Any]] = field(default_factory=list)

    # 기능별 임의 상태 (점수, 수집한 항목 등)
    state: dict[str, Any] = field(default_factory=dict)

    # mock 재생 위치. 데모 구간(beat) 순서대로 올라간다.
    beat_index: int = 0

    def turn_count(self) -> int:
        return sum(1 for m in self.messages if m.get("role") == "user")


_sessions: dict[str, Session] = {}
_MAX = 200  # 데모 중 무한 증가 방지


def create(feature: str) -> Session:
    s = Session(id=uuid.uuid4().hex[:12], feature=feature)
    if len(_sessions) >= _MAX:
        oldest = min(_sessions.values(), key=lambda x: x.created_at)
        _sessions.pop(oldest.id, None)
    _sessions[s.id] = s
    return s


def get(session_id: str) -> Session | None:
    return _sessions.get(session_id)


def require(session_id: str) -> Session:
    s = get(session_id)
    if s is None:
        raise KeyError(f"세션을 찾을 수 없습니다: {session_id}")
    return s


def reset(session_id: str) -> Session | None:
    """같은 id 를 유지하면서 처음 상태로 되돌린다. 데모 재생 버튼이 쓴다."""
    s = get(session_id)
    if s is None:
        return None
    s.messages.clear()
    s.state.clear()
    s.beat_index = 0
    return s


def clear_all() -> None:
    _sessions.clear()
