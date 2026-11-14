"""Bedrock Converse 래퍼.

설계 이유
- 자격증명을 세 경우 모두 지원한다: AWS_PROFILE / 환경변수 키 / 인스턴스 역할.
  EC2 에 올릴 때 코드를 고치지 않기 위해서다.
- 실패하면 예외를 띄우지 않고 mock 으로 떨어진다. 데모 도중에 화면이 죽는 것이
  가장 나쁜 결과이기 때문이다.
- tool use 루프를 여기 둔다. 기능 코드는 도구 함수만 등록하면 된다.
"""
from __future__ import annotations

import json
import logging
import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from .config import settings

logger = logging.getLogger("bedrock")

Message = dict[str, Any]
ToolFn = Callable[[dict[str, Any]], str]


@dataclass
class Tool:
    """에이전트가 호출할 수 있는 도구 하나."""

    name: str
    description: str
    schema: dict[str, Any]  # JSON Schema (properties / required)
    fn: ToolFn

    def spec(self) -> dict[str, Any]:
        return {
            "toolSpec": {
                "name": self.name,
                "description": self.description,
                "inputSchema": {"json": self.schema},
            }
        }


@dataclass
class Result:
    text: str
    source: str  # "bedrock" | "mock"
    reason: str = ""
    usage: dict[str, Any] | None = None
    tool_calls: list[str] | None = None
    # 화면이 그릴 구조화 값 (점수, 구역별 수치, 표 행 등).
    # 결과가 텍스트뿐이면 채점에서 깎인다. 숫자·표·게이지를 그리려면 턴마다
    # 이 자리에 값이 와야 한다. mock 은 beat.data, 실제 모델은 parse_json_block.
    data: dict[str, Any] | None = None

    def as_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"text": self.text, "source": self.source}
        if self.reason:
            out["reason"] = self.reason
        if self.usage:
            out["usage"] = self.usage
        if self.tool_calls:
            out["toolCalls"] = self.tool_calls
        if self.data:
            out["data"] = self.data
        return out


def parse_json_block(text: str) -> dict[str, Any] | None:
    """모델 응답에서 JSON 객체 하나를 뽑는다. 없거나 깨졌으면 None.

    왜 필요한가: mock 모드는 mock.json 의 `data` 를 그대로 쓰지만, 실제 모델은
    텍스트만 돌려준다. 프롬프트에 "수치는 JSON 으로 같이 달라"고 적고 이 함수로
    뽑으면 두 모드가 화면에서 같은 모양이 된다. 실패해도 예외를 던지지 않는다 —
    데모 중에는 설명 텍스트만이라도 보이는 편이 낫다.
    """
    if not text:
        return None
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else None
    if candidate is None:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            return None
        candidate = text[start : end + 1]
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


_client = None
_client_error: str | None = None


def _get_client():
    """bedrock-runtime 클라이언트를 한 번만 만든다."""
    global _client, _client_error
    if _client is not None or _client_error is not None:
        return _client

    try:
        import boto3

        if settings.profile:
            session = boto3.Session(profile_name=settings.profile, region_name=settings.region)
        else:
            # 환경변수 키 → 인스턴스 역할 순으로 boto3 기본 체인이 찾는다
            session = boto3.Session(region_name=settings.region)
        _client = session.client("bedrock-runtime")
        logger.info(
            "bedrock client 준비됨 (region=%s, profile=%s)",
            settings.region,
            settings.profile or "(기본 체인)",
        )
    except Exception as e:  # noqa: BLE001
        _client_error = f"{type(e).__name__}: {e}"
        logger.warning("bedrock client 생성 실패: %s", _client_error)
    return _client


def available() -> bool:
    """실제 호출을 시도할 수 있는 상태인가."""
    return not settings.use_mock and settings.ready and _get_client() is not None


def converse(
    messages: list[Message],
    system: str | None = None,
    tools: list[Tool] | None = None,
    max_tool_rounds: int = 4,
) -> Result:
    """대화 이력을 보내고 답을 받는다. 도구가 있으면 tool use 루프를 돈다.

    messages 는 Converse 형식이다:
        [{"role": "user", "content": [{"text": "..."}]}]
    호출 후 messages 에 모델 응답과 도구 결과가 누적된다(이력 유지).
    """
    if settings.use_mock:
        return Result(text="", source="mock", reason="USE_MOCK=1")
    if not settings.ready:
        return Result(text="", source="mock", reason="BEDROCK_MODEL_ID 미설정")

    client = _get_client()
    if client is None:
        return Result(text="", source="mock", reason=f"클라이언트 없음 ({_client_error})")

    by_name = {t.name: t for t in (tools or [])}
    called: list[str] = []

    try:
        for _round in range(max_tool_rounds + 1):
            kwargs: dict[str, Any] = {
                "modelId": settings.model_id,
                "messages": messages,
                "inferenceConfig": {
                    "maxTokens": settings.max_tokens,
                    "temperature": settings.temperature,
                },
            }
            if system:
                kwargs["system"] = [{"text": system}]
            if by_name:
                kwargs["toolConfig"] = {"tools": [t.spec() for t in by_name.values()]}

            resp = client.converse(**kwargs)
            out_msg = resp["output"]["message"]
            messages.append(out_msg)

            if resp.get("stopReason") != "tool_use":
                text = "".join(
                    block["text"] for block in out_msg.get("content", []) if "text" in block
                )
                return Result(
                    text=text,
                    source="bedrock",
                    usage=resp.get("usage"),
                    tool_calls=called or None,
                )

            # 도구 호출 처리
            results = []
            for block in out_msg.get("content", []):
                use = block.get("toolUse")
                if not use:
                    continue
                tool = by_name.get(use["name"])
                called.append(use["name"])
                if tool is None:
                    payload, status = f"알 수 없는 도구: {use['name']}", "error"
                else:
                    try:
                        payload, status = tool.fn(use.get("input") or {}), "success"
                    except Exception as e:  # noqa: BLE001
                        payload, status = f"{type(e).__name__}: {e}", "error"
                results.append(
                    {
                        "toolResult": {
                            "toolUseId": use["toolUseId"],
                            "content": [{"text": str(payload)}],
                            "status": status,
                        }
                    }
                )
            messages.append({"role": "user", "content": results})

        return Result(
            text="",
            source="mock",
            reason=f"도구 루프 {max_tool_rounds}회 초과",
            tool_calls=called or None,
        )

    except Exception as e:  # noqa: BLE001  데모 안정성 우선
        # AccessDenied / ValidationException / ExpiredToken / Throttling 등 전부 여기로
        return Result(text="", source="mock", reason=f"{type(e).__name__}: {e}")


def ask(prompt: str, system: str | None = None) -> Result:
    """한 번만 묻는 단축 함수."""
    return converse([{"role": "user", "content": [{"text": prompt}]}], system=system)
