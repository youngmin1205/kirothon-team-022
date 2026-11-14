"""예시 기능의 로직.

당일 고치는 것은 이 파일의 `SYSTEM` 문자열과 `TOOLS` 목록뿐이다.
루프와 세션 처리는 core/ 가 담당한다.
"""
from __future__ import annotations

from typing import Any

from ...core.agent_loop import Agent, Orchestrator
from ...core.bedrock import Tool

FEATURE = "sample"

# ── 도구 ────────────────────────────────────────────────────
# 모델이 호출할 수 있는 함수. input 은 아래 schema 를 따른다.


def _lookup_term(args: dict[str, Any]) -> str:
    """예시 도구: 용어를 찾아 설명한다. 당일 실제 조회로 바꾼다."""
    term = str(args.get("term", "")).strip()
    glossary = {
        "beat": "데모를 구성하는 한 단계. 화면 신호·영상 구간·mock 응답이 같은 id 를 공유한다.",
        "mock": "Bedrock 을 호출하지 않고 고정 시나리오를 재생하는 모드.",
    }
    return glossary.get(term, f"'{term}' 은(는) 아직 등록되지 않은 용어입니다.")


TOOLS = [
    Tool(
        name="lookup_term",
        description="프로젝트 용어의 뜻을 찾는다. 모르는 용어가 나오면 호출한다.",
        schema={
            "type": "object",
            "properties": {"term": {"type": "string", "description": "찾을 용어"}},
            "required": ["term"],
        },
        fn=_lookup_term,
    )
]

# ── 에이전트 ────────────────────────────────────────────────

SYSTEM = (
    "너는 예시 에이전트다. 사용자의 말에 두 문장 이내로 답한다. "
    "모르는 용어가 나오면 lookup_term 도구를 쓴다."
)

COACH_SYSTEM = (
    "너는 코치다. 직전 대화를 한 문장으로 되짚고, 다음에 할 행동 하나를 제안한다."
)


def build() -> Orchestrator:
    """오케스트레이터 + 서브에이전트 구성. 당일 역할을 늘린다."""
    orch = Orchestrator()
    orch.add(Agent(name="main", system=SYSTEM, tools=TOOLS), default=True)
    orch.add(Agent(name="coach", system=COACH_SYSTEM))
    return orch


orchestrator = build()
