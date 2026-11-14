"""밥은 먹었니 기능의 HTTP 계약 (sample 과 같은 네 엔드포인트, 경로만 /api/bab).

이 네 엔드포인트가 기능마다 반복되는 기본 형태다. 프런트는 이 형태만 알면
백엔드 로직을 기다리지 않고 화면을 끝까지 만들 수 있다.

    POST /api/bab/start   세션 시작 → 첫 응답
    POST /api/bab/reply   사용자 발화 → 다음 응답 (scripted=true 면 대본 재생)
    POST /api/bab/reset   같은 세션을 처음 상태로
    GET  /api/bab/beats   데모 구간 id 목록 (화면·녹화 설정과 맞추는 용도)

입력은 세 가지를 받는다. 셋 다 선택이므로 쓰지 않는 기능은 신경 쓰지 않아도 된다.

    text      사용자가 입력한 한 줄 (대화형)
    payload   폼 값·선택지·좌표 같은 구조화 입력 (폼·대시보드형)
    files     사진·CSV·PDF 첨부 (업로드형). 검증은 core/attachments.py 가 한다
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...core import attachments, mock
from ...core import session as sessions
from ...core.attachments import MAX_FILES, Attachment
from ...core.config import settings
from .service import FEATURE, orchestrator

router = APIRouter()

# mock 모드에서 자유 입력을 받았을 때 돌려주는 안내.
# 왜 필요한가: mock 재생기는 user_text 를 보지 않고 mock.json 의 다음 구간을
# 꺼낸다. 그래서 "안녕"이라고 쳐도 대본의 다음 줄이 나온다. 안내 없이 두면
# 모델이 엉뚱하게 답한 것으로 오해하고 디버깅에 시간을 쓴다.
MOCK_FREE_INPUT_NOTICE = (
    "고정 시나리오에서는 자유 대화가 반영되지 않습니다. pnpm dev 로 실행하세요."
)


class StartIn(BaseModel):
    agent: str | None = Field(default=None, description="시작할 서브에이전트 이름")
    payload: dict[str, Any] | None = Field(
        default=None, description="시작 시점의 구조화 입력 (폼 값·선택지 등)"
    )


class ReplyIn(BaseModel):
    sessionId: str
    # 첨부만 보내는 경우가 있어 text 는 비어 있을 수 있다 (예: 사진 한 장 업로드)
    text: str = Field(default="", max_length=2000)
    scripted: bool = Field(
        default=False,
        description="대본 재생(#play·smoke·녹화)인가. False 면 사람이 직접 입력한 자유 발화다.",
    )
    payload: dict[str, Any] | None = Field(
        default=None, description="폼 값·선택지·좌표 같은 구조화 입력"
    )
    files: list[Attachment] | None = Field(
        default=None, max_length=MAX_FILES, description="사진·CSV·PDF 첨부"
    )

    def prompt_text(self) -> str:
        """모델에게 보낼 한 줄. 구조화 입력이 있으면 뒤에 붙인다.

        왜 붙이나: 모델은 JSON 필드를 따로 보지 못한다. 폼 값을 프롬프트에
        넣어야 쓸 수 있다. 화면용 원본은 session.state 에 그대로 남긴다.
        """
        parts = [self.text.strip()] if self.text.strip() else []
        if self.payload:
            parts.append("[입력값]\n" + json.dumps(self.payload, ensure_ascii=False))
        if self.files:
            parts.append("[첨부]\n" + attachments.summarize(self.files))
        return "\n\n".join(parts) or "시작"


class ResetIn(BaseModel):
    sessionId: str


def _envelope(s: sessions.Session, payload: dict[str, Any]) -> dict[str, Any]:
    """모든 응답이 같은 모양을 갖게 한다. 프런트가 분기를 줄일 수 있다."""
    return {
        "sessionId": s.id,
        "turn": s.turn_count(),
        "beatIndex": s.beat_index,
        "state": s.state,
        **payload,
    }


def _free_input_notice(body: ReplyIn) -> str:
    """mock 모드 안내. 첨부·입력값이 왔으면 무엇을 받았는지 먼저 알려준다.

    왜: 업로드가 서버까지 도달했는지 화면에서 확인할 방법이 없으면, 고정
    시나리오 안내만 보고 "업로드가 안 됐다"고 오해한다.
    """
    received: list[str] = []
    if body.files:
        received.append(f"첨부 {attachments.summarize(body.files)}")
    if body.payload:
        received.append(f"입력값 {json.dumps(body.payload, ensure_ascii=False)}")
    if not received:
        return MOCK_FREE_INPUT_NOTICE
    return " · ".join(received) + " 을 받았습니다. " + MOCK_FREE_INPUT_NOTICE


@router.post("/start")
def start(body: StartIn) -> dict[str, Any]:
    s = sessions.create(FEATURE)
    if body.agent:
        if body.agent not in orchestrator.agents:
            raise HTTPException(400, f"알 수 없는 에이전트: {body.agent}")
        s.state["agent"] = body.agent
    text = "시작"
    if body.payload:
        s.state["input"] = body.payload
        text += "\n\n[입력값]\n" + json.dumps(body.payload, ensure_ascii=False)
    result = orchestrator.run(s, text)
    return _envelope(s, result)


@router.post("/reply")
def reply(body: ReplyIn) -> dict[str, Any]:
    try:
        s = sessions.require(body.sessionId)
    except KeyError as e:
        raise HTTPException(404, str(e)) from e

    # 구조화 입력은 화면이 다시 꺼내 쓸 수 있게 세션에 원본으로 남긴다
    if body.payload is not None:
        s.state["input"] = body.payload

    # mock 모드 + 사람이 직접 입력 → 대본을 진행시키지 않고 안내만 돌려준다.
    # beat_index 를 건드리지 않으므로 그 뒤에 #play 를 눌러도 처음부터 재생된다.
    if settings.mock_only and not body.scripted:
        return _envelope(
            s,
            {
                "text": _free_input_notice(body),
                "source": "mock",
                "reason": "free-input-ignored",
                "advisory": True,
            },
        )

    result = orchestrator.run(s, body.prompt_text(), body.files)
    return _envelope(s, result)


@router.post("/reset")
def reset(body: ResetIn) -> dict[str, Any]:
    s = sessions.reset(body.sessionId)
    if s is None:
        raise HTTPException(404, f"세션을 찾을 수 없습니다: {body.sessionId}")
    return _envelope(s, {"text": "", "source": "reset"})


@router.get("/beats")
def beats() -> dict[str, Any]:
    return {"feature": FEATURE, "beats": mock.beats(FEATURE), "ids": mock.beat_ids(FEATURE)}
