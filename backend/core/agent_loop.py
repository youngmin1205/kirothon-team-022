"""오케스트레이터 + 서브에이전트 틀.

구조
    Agent          역할 하나 (이름 + 시스템 프롬프트 + 쓸 수 있는 도구)
    Orchestrator   어떤 Agent 에게 넘길지 고르고, 결과를 합친다

당일에 바꾸는 것은 `system` 문자열과 `tools` 목록뿐이다. 루프는 건드리지 않는다.

mock 모드에서는 Bedrock 을 호출하지 않고 features/<기능>/mock.json 의 구간을
순서대로 재생한다. 그래서 자격증명이나 네트워크가 없어도 데모가 완주한다.
"""
from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from . import mock
from .attachments import Attachment, to_content_blocks
from .bedrock import Result, Tool, converse, parse_json_block
from .config import settings
from .session import Session

logger = logging.getLogger("agent")


@dataclass
class Agent:
    """역할 하나. 당일 여기에 프롬프트를 채운다."""

    name: str
    system: str
    tools: list[Tool] = field(default_factory=list)
    # 응답 텍스트에서 화면이 그릴 수치를 뽑는 함수. 기본값은 JSON 블록 하나.
    # 쓰지 않으려면 parse=None 으로 둔다 (텍스트만 돌려준다).
    parse: Callable[[str], dict[str, Any] | None] | None = parse_json_block

    def run(self, session: Session, user_text: str, files: list[Attachment] | None = None) -> Result:
        """세션 이력에 사용자 발화를 넣고 한 턴 돌린다.

        `files` 가 있으면 같은 메시지에 이미지·문서·텍스트 블록으로 함께 넣는다.
        그래서 "사진을 올리면" 으로 시작하는 기능도 루프를 고치지 않고 만들 수 있다.
        """
        if settings.mock_only:
            return self._mock_turn(session, user_text)

        content: list[dict[str, Any]] = [{"text": user_text}]
        content.extend(to_content_blocks(files))
        session.messages.append({"role": "user", "content": content})
        result = converse(session.messages, system=self.system, tools=self.tools)

        if result.source == "mock":
            # 실제 호출이 실패했다. 이력을 되돌리고 mock 으로 떨어진다.
            # 되돌리지 않으면 실패한 턴이 이력에 남아 다음 호출까지 망친다.
            session.messages.pop()
            logger.warning("[%s] bedrock 실패 → mock 폴백: %s", self.name, result.reason)
            return self._mock_turn(session, user_text, reason=result.reason)

        # 실제 모델 모드에서도 화면이 쓸 수치를 같은 자리에 담는다.
        # 그래야 mock 과 bedrock 이 프런트에서 같은 모양으로 보인다.
        if self.parse is not None and result.data is None:
            result.data = self.parse(result.text)

        return result

    def _mock_turn(self, session: Session, user_text: str, reason: str = "") -> Result:
        beat = mock.next_beat(session)
        if not reason:
            reason = "USE_MOCK=1" if settings.use_mock else "BEDROCK_MODEL_ID 미설정"
        return Result(
            text=beat.get("text", ""),
            source="mock",
            reason=reason,
            usage={"beat": beat.get("id"), "index": beat.get("index")},
            data=beat.get("data") or None,
        )


@dataclass
class Orchestrator:
    """서브에이전트를 들고 있다가 하나에게 넘긴다.

    지금은 이름으로 직접 고르는 수동 라우팅이다. 당일 필요해지면
    `route()` 안에서 모델이 고르게 바꾼다 (그 전까지는 과한 설계다).
    """

    agents: dict[str, Agent] = field(default_factory=dict)
    default: str = ""

    def add(self, agent: Agent, *, default: bool = False) -> Agent:
        self.agents[agent.name] = agent
        if default or not self.default:
            self.default = agent.name
        return agent

    def route(self, session: Session, user_text: str) -> Agent:
        name = session.state.get("agent") or self.default
        agent = self.agents.get(name)
        if agent is None:
            raise KeyError(f"등록되지 않은 에이전트: {name} (등록됨: {list(self.agents)})")
        return agent

    def run(self, session: Session, user_text: str, files: list[Attachment] | None = None) -> dict[str, Any]:
        agent = self.route(session, user_text)
        result = agent.run(session, user_text, files)
        out = result.as_dict()
        out["agent"] = agent.name
        out["turn"] = session.turn_count()
        return out
