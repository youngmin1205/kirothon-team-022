"""밥은 먹었니 기능의 로직.

지금은 계약(mock.json · profiles.json)만 고정한 상태다. 아래 SYSTEM 과 TOOLS 는
spec(.kiro/specs/bab/) 으로 채운다. 지켜야 할 규칙은 .kiro/steering/product.md 의
"고정 규칙" 절에 있다. 특히:
    - AI 는 사진으로 밥·귀가만 판정한다. 기분은 자녀가 버튼으로 고른 값을 그대로 쓴다
    - 받는 사람 프로필에 없는 항목은 코드가 걸러낸 뒤 모델에 넘긴다 (프롬프트로 막지 않는다)
    - 응답 JSON 은 mock.json 의 beats[].data 와 같은 모양이어야 한다
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from ...core.agent_loop import Agent, Orchestrator

FEATURE = "bab"

PROFILES_PATH = Path(__file__).resolve().parent / "profiles.json"


@lru_cache(maxsize=1)
def profiles() -> dict[str, Any]:
    """데모용 고정 프로필. 설정 화면은 범위 밖이라 파일에서 읽는다."""
    return json.loads(PROFILES_PATH.read_text(encoding="utf-8"))


# TODO(spec): 판정 에이전트·작성 에이전트로 나누고, 프로필 필터·요약 조립은 순수 코드 도구로 만든다
SYSTEM = (
    "너는 자취하는 자녀의 하루 안부를 부모님께 전하는 도우미다. "
    "사진으로는 밥과 귀가만 판단하고, 기분은 사용자가 고른 값을 바꾸지 않는다. "
    "답은 두 문장 이내로 하고, 화면용 값은 JSON 블록 하나로 준다."
)


def build() -> Orchestrator:
    orch = Orchestrator()
    orch.add(Agent(name="main", system=SYSTEM), default=True)
    return orch


orchestrator = build()
