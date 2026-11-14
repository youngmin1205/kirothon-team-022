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
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...core import attachments, mock
from ...core import session as sessions
from ...core.attachments import MAX_FILES, Attachment
from ...core.config import settings
from . import rules
from .service import (
    FEATURE,
    SAMPLE_PHOTOS,
    STEPS,
    orchestrator,
    run_compose,
    run_judge,
)

router = APIRouter()

# 부모님이 받는 링크. 실제 발송은 범위 밖이므로 고정값이다 (mock.json 과 같은 값)
DEMO_LINK = "https://bab.example.com/r/demo01"

# judge 결과를 사람이 읽는 한 줄로 만들 때 쓰는 가짜 받는 사람.
# build_summary 는 받는 사람 프로필을 받아 공개 항목만 요약한다. 판정 화면에는
# 사진으로 판정한 meal·home 만 보여야 하므로 그 둘만 가진 프로필을 만들어 넘긴다.
PHOTO_ONLY: dict[str, Any] = {
    "id": "self",
    "name": "",
    "items": list(rules.PHOTO_ITEMS),
}

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


# ── 단계 진행 ──────────────────────────────────────────────────────────────
#
# beat_index 는 mock 재생기만 올린다. 그걸로 분기하면 live 에서 다음 단계가
# 불리지 않는다 (리허설에서 깨진 지점). 그래서 라우터가 직접 센다.


def _advance(s: sessions.Session) -> str:
    """현재 구간 id 를 돌려주고 다음으로 한 칸 올린다. 끝이면 마지막을 반복한다."""
    i = min(int(s.state.get("step", 0)), len(STEPS) - 1)
    s.state["step"] = i + 1
    return STEPS[i]


def _facts(s: sessions.Session) -> dict[str, Any]:
    """구간마다 모아 두는 사실 한 덩어리. 다음 구간은 이것만 보고 만든다."""
    facts = s.state.setdefault("facts", {})
    facts.setdefault("child", rules.child_name())
    return facts


def _labels(keys: list[str]) -> str:
    """항목 key 를 사람이 읽는 라벨로. 고정 어휘는 profiles.json 이 원본이다."""
    return "·".join(rules.items()[k]["label"] for k in keys if k in rules.items())


# ── 구간별 data (모델을 쓰지 않는 6구간) ───────────────────────────────────


def _home(s: sessions.Session, payload: dict[str, Any] | None, files: Any) -> dict[str, Any]:
    facts = _facts(s)
    recipients = [
        {
            "id": r["id"],
            "name": r["name"],
            "items": [i for i in r.get("items", []) if i in rules.items()],
            "channel": r.get("channel", ""),
        }
        for r in rules.recipients()
    ]
    names = ", ".join(r["name"] for r in recipients)
    return {
        "text": f"오늘 안부 보낼 사람은 {names}예요. 사진을 올리고 기분을 골라 주세요.",
        "data": {"child": facts["child"], "recipients": recipients},
    }


def _upload(
    s: sessions.Session, payload: dict[str, Any] | None, files: list[Attachment] | None
) -> dict[str, Any]:
    """사진 목록과 기분. 기분은 자녀가 고른 값을 그대로 쓴다 (AI 가 판정하지 않는다, R3)."""
    # #play·smoke 는 사진을 보내지 않는다. 그때는 samples/ 의 데모 사진 이름을 쓴다
    names = [f.name for f in files] if files else list(SAMPLE_PHOTOS)
    photos = rules.photo_entries(names)
    mood = rules.normalize_mood(payload)
    note = rules.normalize_note(payload)

    facts = _facts(s)
    facts["photos"] = photos
    facts["mood"] = mood
    facts["note"] = note
    return {
        "text": f'사진 {len(photos)}장과 기분 "{mood["emoji"]} {mood["label"]}"를 받았어요.',
        "data": {"photos": photos, "mood": mood, "note": note},
    }


def _confirm(
    s: sessions.Session, payload: dict[str, Any] | None, files: Any
) -> dict[str, Any]:
    """자녀가 고친 값을 judge 결과 위에 덮는다 (R2-2). 수정이 없으면 그대로 간다."""
    facts = _facts(s)
    checks = rules.normalize_checks(payload, facts.get("checks"))
    facts["checks"] = checks
    return {
        "text": "확인했어요. 이 내용으로 메시지를 만들게요.",
        "data": {"confirmed": True, "checks": checks, "mood": facts.get("mood")},
    }


def _deliver(
    s: sessions.Session, payload: dict[str, Any] | None, files: Any
) -> dict[str, Any]:
    """본문만 봐도 안부를 알 수 있어야 한다. 링크는 사진·답하기 때만 연다 (R6)."""
    facts = _facts(s)
    messages = _messages(s)
    first = messages[0]
    photos = facts.get("photos") or []
    bubble = rules.build_bubble(facts["child"], first["summary"], DEMO_LINK)
    preview = rules.build_preview(
        facts["child"], first["summary"], photos[0]["name"] if photos else None
    )
    names = "·".join(m["name"] for m in messages)
    return {
        "text": f"{names}에게 보냈어요.",
        "data": {
            "to": first["to"],
            "name": first["name"],
            "channel": first["channel"],
            "sentAt": datetime.now().strftime("%H:%M"),
            "bubble": bubble,
            "preview": preview,
            "link": DEMO_LINK,
            # 실제 폰 테스트용 (추가 필드). 자녀 폰이 이 id 로 부모 링크를 만들고 답장을 기다린다
            "session": s.id,
        },
    }


def _react(
    s: sessions.Session, payload: dict[str, Any] | None, files: Any
) -> dict[str, Any]:
    """부모님은 고정 버튼으로만 답한다. 자유 입력은 범위 밖이다 (R7)."""
    parent = _messages(s)[0]
    pressed = rules.normalize_pressed(payload)
    _facts(s)["pressed"] = pressed
    buttons = [dict(b) for b in rules.profiles()["parentButtons"]]
    chips = ", ".join(f"{rules.parent_buttons()[k]['emoji']} {rules.parent_buttons()[k]['label']}" for k in pressed)
    return {
        "text": f"{parent['name']}가 {chips}를 눌렀어요.",
        "data": {
            "from": parent["to"],
            "name": parent["name"],
            "buttons": buttons,
            "pressed": pressed,
        },
    }


def _reply(
    s: sessions.Session, payload: dict[str, Any] | None, files: Any
) -> dict[str, Any]:
    """부모님 반응을 자녀 폰에 칩·토스트로 돌려준다. celebrate 는 이 구간에서 한 번만."""
    parent = _messages(s)[0]
    facts = _facts(s)
    pressed = facts.get("pressed") or rules.normalize_pressed(payload)
    chips = [
        {"key": k, "emoji": rules.parent_buttons()[k]["emoji"], "label": rules.parent_buttons()[k]["label"]}
        for k in pressed
        if k in rules.parent_buttons()
    ]
    return {
        "text": f"{_toast(parent['name'], pressed)}.",
        "data": {
            "from": parent["to"],
            "name": parent["name"],
            "chips": chips,
            "toast": _toast(parent["name"], pressed),
            "celebrate": True,
        },
    }


def _toast(name: str, pressed: list[str]) -> str:
    """가장 중요한 버튼 하나를 골라 한 줄로. 버튼 순서가 아니라 의미 순서다."""
    if "ate" in pressed:
        return f"{name}도 밥 드셨대요"
    if "hospital" in pressed:
        return f"{name}가 병원 다녀오셨대요"
    if "call" in pressed:
        return f"{name}가 전화하신대요"
    if "fine" in pressed:
        return f"{name}는 오늘 괜찮으시대요"
    return f"{name}가 잘 받으셨대요"


# ── 구간별 data (모델을 쓰는 2구간) ────────────────────────────────────────


def _judge(
    s: sessions.Session, payload: dict[str, Any] | None, files: list[Attachment] | None
) -> dict[str, Any]:
    """사진 → 밥·귀가. 모델 호출은 service.run_judge 가 한다 (task 3)."""
    out = run_judge(s, files)
    line = rules.build_summary(PHOTO_ONLY, {"checks": out["checks"]})
    text = f"사진으로 {line} 을 확인했어요." if line else "사진으로 확인한 것이 없어요."
    return {"text": text, "data": out, "agent": "judge"}


def _compose(
    s: sessions.Session, payload: dict[str, Any] | None, files: Any
) -> dict[str, Any]:
    """받는 사람별 메시지. 프로필 필터 → 모델 → 요약 조립은 service.run_compose (task 4)."""
    out = run_compose(s)
    messages = out["messages"]
    s.state["messages"] = messages
    detail = " · ".join(f"{m['name']} {_labels(m['items'])}" for m in messages)
    return {
        "text": f"받는 사람마다 공개 항목이 달라요 — {detail}",
        "data": out,
        "agent": "compose",
    }


def _messages(s: sessions.Session) -> list[dict[str, Any]]:
    """compose 결과. 건너뛰고 들어온 경우에도 요약만으로 화면을 채운다 (데모를 멈추지 않는다)."""
    messages = s.state.get("messages")
    if isinstance(messages, list) and messages:
        return messages
    facts = _facts(s)
    return [
        {
            "to": r["id"],
            "name": r["name"],
            "channel": r.get("channel", ""),
            "items": [i for i in r.get("items", []) if i in rules.items()],
            "summary": rules.build_summary(r, facts),
            "text": rules.build_summary(r, facts),
        }
        for r in rules.recipients()
    ]


BUILDERS = {
    "home": _home,
    "upload": _upload,
    "judge": _judge,
    "confirm": _confirm,
    "compose": _compose,
    "deliver": _deliver,
    "react": _react,
    "reply": _reply,
}


def _turn(
    s: sessions.Session,
    prompt: str,
    payload: dict[str, Any] | None = None,
    files: list[Attachment] | None = None,
) -> dict[str, Any]:
    """한 턴. 단계를 한 칸 올리고 그 구간의 응답을 만든다.

    mock 모드는 기존 재생기(orchestrator.run → mock.json)를 그대로 쓴다.
    pnpm smoke 가 통과하는 경로를 건드리지 않기 위해서다. step 은 두 모드에서
    똑같이 올려 세션 상태를 같게 유지한다.
    """
    beat = _advance(s)
    if settings.mock_only:
        return {"beat": beat, **orchestrator.run(s, prompt, files)}

    build = BUILDERS.get(beat, _home)
    out = build(s, payload, files)
    # data 가 비면 같은 구간의 mock 값으로 메운다. 화면이 빈 칩을 그리지 않게 한다 (R8-4)
    data = out.get("data") or rules.mock_data(beat)
    return {
        "beat": beat,
        "text": out["text"],
        "source": "bedrock",
        "data": data,
        **({"agent": out["agent"]} if "agent" in out else {}),
    }


@router.post("/start")
def start(body: StartIn) -> dict[str, Any]:
    """payload 없이도 200 이다. #play·smoke 는 입력 없이 start 한다 (R1-3)."""
    s = sessions.create(FEATURE)
    if body.agent:
        if body.agent not in orchestrator.agents:
            raise HTTPException(400, f"알 수 없는 에이전트: {body.agent}")
        s.state["agent"] = body.agent
    text = "시작"
    if body.payload:
        s.state["input"] = body.payload
        text += "\n\n[입력값]\n" + json.dumps(body.payload, ensure_ascii=False)
    return _envelope(s, _turn(s, text, body.payload))


@router.get("/link/{session_id}")
def link(session_id: str) -> dict[str, Any]:
    """부모님 폰이 여는 답장 페이지 (실제 폰 테스트용, 읽기 전용).

    자녀 폰도 이걸 2초마다 읽어 답장이 왔는지 본다. 세션은 메모리에만 있으므로
    서버를 재시작하면 링크가 404 가 된다.
    """
    s = sessions.get(session_id)
    if s is None:
        raise HTTPException(404, f"세션을 찾을 수 없습니다: {session_id}")
    facts = _facts(s)
    parent = _messages(s)[0]
    step = int(s.state.get("step", 0))
    return {
        "child": facts["child"],
        "name": parent["name"],
        "summary": parent.get("summary", ""),
        "buttons": [dict(b) for b in rules.profiles()["parentButtons"]],
        "pressed": facts.get("pressed") or [],
        # 다음에 올 구간. "react" 일 때만 부모님이 답할 수 있다
        "next": STEPS[step] if step < len(STEPS) else None,
    }


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
    # step·beat_index 를 건드리지 않으므로 그 뒤에 #play 를 눌러도 처음부터 재생된다.
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

    return _envelope(s, _turn(s, body.prompt_text(), body.payload, body.files))


@router.post("/reset")
def reset(body: ResetIn) -> dict[str, Any]:
    s = sessions.reset(body.sessionId)
    if s is None:
        raise HTTPException(404, f"세션을 찾을 수 없습니다: {body.sessionId}")
    return _envelope(s, {"text": "", "source": "reset"})


@router.get("/beats")
def beats() -> dict[str, Any]:
    return {"feature": FEATURE, "beats": mock.beats(FEATURE), "ids": mock.beat_ids(FEATURE)}
