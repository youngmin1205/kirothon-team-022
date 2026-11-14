"""밥은 먹었니 — 모델을 호출하는 두 에이전트 (judge · compose).

역할 나눔
    judge    사진을 보고 **밥(meal)·귀가(home)** 만 판정한다. 기분은 판단하지 않는다 (R2).
    compose  받는 사람마다 공개 항목과 말투가 다른 안부 문장을 쓴다 (R5).

이 파일은 프롬프트와 호출만 담당한다. 거르고·요약하고·검증하는 순수 코드는
`rules.py`(영신, task 1)가 한다. 여기서는 `rules.*` 를 호출만 하고 고정 어휘를
다시 적지 않는다. 적으면 두 곳이 어긋난다.

라우터(task 2)와의 계약
    `router.py` 가 단계마다 아래를 import 해서 꽂는다. 라우터는 단계 진행과
    응답 조립만 하고, 모델 호출은 전부 이 파일을 거친다.

        from .service import FEATURE, STEPS, orchestrator, run_judge, run_compose

    - `judge` 단계: `run_judge(session, files)` → `checks` 를 만들고
      `session.state["facts"]["checks"]` 에 넣는다.
    - `compose` 단계: `run_compose(session)` → 받는 사람 수만큼 `messages` 를 만든다.
    - mock 모드(`USE_MOCK=1`)는 라우터가 기존 `orchestrator.run()` 재생 경로를 그대로
      쓴다. 그 경로는 여기 두 함수를 거치지 않는다.

받는 사람마다 세션을 따로 쓰는 이유
    `Agent.run()` 은 `session.messages` 에 이력을 쌓고 `converse()` 가 전체 이력을
    보낸다. 엄마용을 먼저 호출하면 그 응답이 이력에 남아 **아빠용 입력에 기분이
    섞여 들어간다.** 그래서 호출마다 등록하지 않은 임시 `Session` 을 쓴다 (R4-2).
"""
from __future__ import annotations

import base64
import json
import logging
from pathlib import Path
from typing import Any

from ...core.agent_loop import Agent, Orchestrator
from ...core.attachments import Attachment
from ...core.bedrock import Result, parse_json_block
from ...core.session import Session
from . import rules

logger = logging.getLogger("bab")

FEATURE = "bab"
SAMPLES_DIR = Path(__file__).resolve().parent / "samples"

# 라우터(task 2)가 이 순서로 단계를 센다. judge·compose 호출 위치도 여기서 찾는다.
# 한 곳에만 둔다 — 라우터는 redefine 하지 말고 이걸 import 한다.
STEPS: list[str] = [
    "home", "upload", "judge", "confirm", "compose", "deliver", "react", "reply",
]

# judge 가 첨부 없이 불릴 때 붙이는 데모 사진. #play 는 사진을 보내지 않는다
# (frontend/src/app/useDemo.ts:307). 라벨은 rules 의 기본 라벨 순서와 맞춘다.
SAMPLE_PHOTOS: tuple[str, ...] = ("lunch.jpg", "door.jpg")

# 받는 사람 말투 프리셋. 화면은 이 key 를 보내고, 여기 문자열로 풀어 모델 tone 에 넣는다.
# 모르는 key 는 무시하고 받는 사람 프로필의 기본 tone 을 쓴다 (R9). 말투는 "어떻게 쓸지"만
# 바꾼다 — 무엇을 공개할지는 rules.filter_facts 가 그대로 결정한다.
TONE_PRESETS: dict[str, str] = {
    "warm": "다정하고 구체적으로, 반말",
    "brief": "짧고 담백하게",
    "formal": "정중한 존댓말로",
    "dialect": "구수한 경상도 사투리로",
    "cheerful": "밝고 가볍게, 이모지를 조금 섞어",
}
MAX_TONE = 40  # 커스텀 말투 문자열 상한
MAX_VOICE_ITEMS = 3  # 자녀 말투 예시 문장 개수 상한
MAX_VOICE_LEN = 80  # 예시 문장 하나의 길이 상한
MAX_ADDRESS = 12  # 호칭(아빠→아버지/아부지 등) 문자열 상한


# ── 에이전트 프롬프트 ──────────────────────────────────────────────────────

JUDGE_SYSTEM = (
    "너는 사진을 보고 자취하는 자녀의 하루를 확인하는 도우미다. "
    "사진으로 확인할 수 있는 것은 밥(meal)과 귀가(home) 두 가지뿐이다. "
    "기분은 절대 판단하지 않는다. 기분은 자녀가 버튼으로 직접 고른다. "
    "status 는 사진으로 확인되면 done, 아직이면 not_yet, 사진으로 알 수 없으면 unknown 이다. "
    "지어내지 말고, 확실하지 않으면 unknown 으로 둔다. detail 은 사진에 보이는 것만 짧게 적는다 (예: 점심 김치찌개, 현관 도착). '확인'·'완료' 같은 말은 쓰지 않는다. 부모님 메시지에 그대로 들어간다. "
    "답은 아래 JSON 한 덩어리로만 준다. item 은 meal 과 home 만 쓴다.\n"
    '```json\n'
    '{"checks": ['
    '{"item": "meal", "status": "done", "detail": "점심 김치찌개", "photo": "lunch.jpg"}, '
    '{"item": "home", "status": "done", "detail": "21시 귀가", "photo": "door.jpg"}'
    ']}\n'
    '```'
)

COMPOSE_SYSTEM = (
    "너는 자녀의 하루 안부를 부모님께 전하는 메시지를 쓴다. "
    "입력(JSON)에 담긴 항목만 쓴다. 입력에 없는 것은 모르는 것이니 지어내거나 추측하지 않는다. "
    "기분(mood)이 입력에 있으면 그 뜻을 바꾸지 않는다. "
    "힘들다·아프다·피곤하다를 괜찮다로 바꾸지 말고 말투만 다듬는다. "
    "voice_examples 가 있으면 그 말버릇·이모지를 따라 쓰되, 받는 사람과의 관계(존댓말/반말)는 "
    "tone 을 우선한다. 입력에 없는 사실은 말투 때문에라도 지어내지 않는다. "
    "call_them 이 있으면 그 호칭으로 부른다(없으면 to 를 쓴다). "
    "받는 사람의 tone 에 맞춰 두 문장 이내로 쓴다. "
    "facts 는 코드가 확정한 사실 문장이다. 뜻을 바꾸거나 반대로 말하지 않는다. "
    "'아직 ~못/안 ~다'는 아직 안 했다는 뜻이다. 확인·사진·판정·AI 같은 말은 쓰지 않는다. "
    "답은 아래 JSON 한 덩어리로만 준다.\n"
    '```json\n{"text": "엄마~ 점심 잘 먹었고 9시에 집 들어왔어."}\n```'
)


def build() -> Orchestrator:
    """judge(기본) + compose 두 에이전트. 둘 다 JSON 블록을 뽑는다 (backend.md 규칙 3)."""
    orch = Orchestrator()
    orch.add(Agent(name="judge", system=JUDGE_SYSTEM, parse=parse_json_block), default=True)
    orch.add(Agent(name="compose", system=COMPOSE_SYSTEM, parse=parse_json_block))
    return orch


orchestrator = build()


# ── 임시 세션·샘플 사진 ────────────────────────────────────────────────────


def _scratch(parent: Session, beat: str) -> Session:
    """등록하지 않은 임시 세션. 이력이 본 세션·다른 받는 사람과 섞이지 않게 한다 (R4-2).

    beat_index 를 그 구간에 맞춰 두면 Bedrock 이 실패했을 때 Agent._mock_turn 이
    home 이 아니라 그 구간의 mock 값으로 떨어진다 (R8-1). 단계 사이 맥락은 이력이
    아니라 parent.state["facts"] 가 들고 있으므로 잃는 것이 없다.
    """
    s = Session(id=f"{parent.id}:{beat}", feature=FEATURE)
    s.beat_index = STEPS.index(beat)
    return s


def _sample_photos() -> list[Attachment]:
    """samples/ 의 데모 사진을 Attachment 로. 파일이 없으면 빈 목록 (사진 없이 진행, R2-3).

    디코딩·검증·상한은 core/attachments.py 가 한다. 여기서 다시 하지 않는다.
    """
    out: list[Attachment] = []
    if not SAMPLES_DIR.is_dir():
        return out
    for name in SAMPLE_PHOTOS:
        path = SAMPLES_DIR / name
        if not path.is_file():
            continue
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        try:
            out.append(Attachment(name=name, mimeType="image/jpeg", dataBase64=encoded))
        except ValueError as e:  # 손상된 샘플이 데모를 멈추게 두지 않는다
            logger.warning("샘플 사진 %s 건너뜀: %s", name, e)
    return out


# ── judge: 사진 → 밥·귀가 ──────────────────────────────────────────────────


def run_judge(parent: Session, files: list[Attachment] | None = None) -> dict[str, Any]:
    """사진으로 밥·귀가를 판정하고 checks 를 facts 에 넣는다 (R2).

    - 첨부가 없으면 samples/ 사진을 붙인다. 그것도 없으면 사진 없이 호출한다.
    - 모델이 checks JSON 을 안 주면 mock.json 의 judge 값으로 떨어진다 (R2-4, R8-4).
    - meal·home 만 남기고 status enum 을 검증하는 일은 rules.normalize_checks 가 한다.
      모델이 기분을 끼워 넣어도 코드가 지운다 (프롬프트로만 막지 않는다).
    """
    photos = files or _sample_photos()
    prompt = "이 사진으로 오늘 밥과 귀가를 확인해 줘. 기분은 판단하지 마."
    result = orchestrator.agents["judge"].run(_scratch(parent, "judge"), prompt, photos or None)

    data = result.data if isinstance(result.data, dict) else None
    if not data:
        data = rules.mock_data("judge") or {}
    checks = rules.normalize_checks({"checks": data.get("checks")})

    facts = parent.state.setdefault("facts", {})
    facts["checks"] = checks
    return {"checks": checks}


# ── compose: 받는 사람별 말투 ──────────────────────────────────────────────


def _present_items(allowed: dict[str, Any]) -> list[str]:
    """filter_facts 결과에서 값이 실제로 있는 항목 key 만."""
    present = [c["item"] for c in allowed.get("checks", [])]
    return present + [k for k in ("mood", "note") if k in allowed]


def normalize_style(payload: dict[str, Any] | None) -> dict[str, Any]:
    """compose 의 선택 입력(말투·보이스)을 안전하게 다듬는다 (R9).

    핵심: 이 함수는 **무엇을 공개할지에 관여하지 않는다.** 오직 "어떻게 쓸지"(tone·voice)만
    만든다. 공개 여부는 rules.filter_facts 가 그대로 결정하므로, 화면이 말투를 아무리 바꿔도
    걸러진 항목(예: 아빠의 기분)은 다시 들어오지 않는다.

    - tones[recipientId]: 프리셋 key 면 TONE_PRESETS 로 풀고, 커스텀 문자열이면 길이 제한.
      모르는 값은 버린다(→ 프로필 기본 tone 유지).
    - voice: 자녀 말투 예시 문장. 개수·길이 제한.
    - addresses[recipientId]: 호칭(아빠→"아버지"·"아부지" 등). 길이 제한. 없으면 프로필 이름.
    """
    if not isinstance(payload, dict):
        return {"tones": {}, "voice": [], "addresses": {}}

    tones: dict[str, str] = {}
    raw_tones = payload.get("tones")
    if isinstance(raw_tones, dict):
        for rid, val in raw_tones.items():
            if not isinstance(rid, str) or not isinstance(val, str):
                continue
            text = TONE_PRESETS.get(val) or " ".join(val.split())[:MAX_TONE]
            if text:
                tones[rid] = text

    voice: list[str] = []
    raw_voice = payload.get("voice")
    if isinstance(raw_voice, list):
        for s in raw_voice:
            if not isinstance(s, str):
                continue
            cleaned = " ".join(s.split())[:MAX_VOICE_LEN]
            if cleaned:
                voice.append(cleaned)
            if len(voice) >= MAX_VOICE_ITEMS:
                break

    addresses: dict[str, str] = {}
    raw_addr = payload.get("addresses")
    if isinstance(raw_addr, dict):
        for rid, val in raw_addr.items():
            if not isinstance(rid, str) or not isinstance(val, str):
                continue
            text = " ".join(val.split())[:MAX_ADDRESS]  # 자유 입력, 길이만 제한
            if text:
                addresses[rid] = text

    return {"tones": tones, "voice": voice, "addresses": addresses}


def _compose_prompt(
    allowed: dict[str, Any],
    summary: str,
    tone: str | None = None,
    voice: list[str] | None = None,
    address: str | None = None,
) -> str:
    """모델에 넘길 한 덩어리. filter_facts 로 **이미 걸러진** 입력만 담는다.

    아빠 프로필에 mood 가 없으면 이 JSON 에 mood 키 자체가 없다. "말하지 마"라고
    적어서 막는 것이 아니라, 입력에 존재하지 않게 만든다 (R4-1). tone·voice·호칭(call_them)
    은 말투·부르는 법만 바꾸고, 공개 항목에는 손대지 않는다 (R9).
    """
    payload: dict[str, Any] = {
        "to": allowed["name"],
        # 화면이 말투를 바꿨으면 그 값을, 아니면 프로필 기본 tone 을 쓴다
        "tone": tone or allowed.get("tone", ""),
        # 프로필의 공개 항목이 아니라 **실제로 값이 있는** 항목만 넘긴다. 프로필 목록을 주면
        # unknown 이라 빠진 밥·귀가까지 모델이 "잘 먹었어"로 지어낸다 (R4-5)
        "items": _present_items(allowed),
        "summary": summary,
    }
    if address:
        # 자녀가 정한 호칭으로 부른다. 없으면 모델이 to(프로필 이름)로 부른다
        payload["call_them"] = address
    # status 코드·judge 설명 대신 코드가 만든 사실 문장만 넘긴다 (R4-6)
    payload["facts"] = rules.fact_sentences(allowed)
    if voice:
        payload["voice_examples"] = voice
    return f"{allowed['name']}에게 보낼 안부 메시지를 써 줘.\n{json.dumps(payload, ensure_ascii=False)}"


def _compose_text(result: Result, recipient: dict[str, Any], summary: str) -> str:
    """모델 응답에서 본문 한 줄을 고른다. 실패하면 요약으로 채운다 (R8-4).

    mock 폴백에서는 compose 구간 data 가 messages[] 를 통째로 들고 오므로,
    이 받는 사람 것을 골라 쓴다.
    """
    data = result.data if isinstance(result.data, dict) else None
    if data:
        text = data.get("text")
        if isinstance(text, str) and text.strip():
            return text.strip()
        for m in data.get("messages", []):
            if m.get("to") == recipient["id"] and isinstance(m.get("text"), str):
                return m["text"]
    if result.source == "bedrock" and result.text.strip():
        return result.text.strip()
    return summary or recipient["name"]


def _guarded_text(
    parent: Session,
    recipient: dict[str, Any],
    allowed: dict[str, Any],
    summary: str,
    tone: str | None,
    voice: list[str],
    address: str | None = None,
) -> str:
    """생성 → 코드 검증 → 1회 재시도 → 코드 문장 (R4-6).

    프롬프트 규칙은 모델이 어길 수 있다. 사실과 어긋난 문장은 부모님께 가기 전에 코드가 잡는다.
    """
    prompt = _compose_prompt(allowed, summary, tone, voice, address)
    for attempt in range(2):
        result = orchestrator.agents["compose"].run(_scratch(parent, "compose"), prompt)
        text = _compose_text(result, recipient, summary)
        if result.source != "bedrock":
            return text  # mock 폴백 문장은 검증 대상이 아니다
        problems = rules.check_text(text, allowed)
        if not problems:
            return text
        logger.warning("[compose:%s] 검증 실패 %d회: %s | %s", recipient["id"], attempt + 1, problems, text)
        prompt += "\n\n방금 답은 이 점이 틀렸다: " + "; ".join(problems) + ". facts 의 뜻대로 다시 써."
    return rules.fallback_text(allowed, summary)


def run_compose(parent: Session) -> dict[str, Any]:
    """받는 사람마다 공개 항목과 말투가 다른 메시지를 만든다 (R4, R5).

    - 받는 사람마다 filter_facts 로 공개 항목만 남긴 뒤 모델에 넘긴다.
    - 받는 사람마다 임시 세션을 따로 써서 기분이 아빠 호출에 새지 않게 한다 (R4-2).
    - summary 는 rules.build_summary 가 조립한다. 모델 출력으로 만들지 않는다 (R5-4).
    - items 는 그 사람 프로필과 같다. text 만 모델이 쓴다.
    - 화면이 말투/보이스(state["input"].tones·voice)를 보냈으면 반영한다. 말투는 "어떻게
      쓸지"만 바꾸고, 공개 여부는 filter_facts 가 그대로 결정한다 (R9).
    """
    facts = parent.state.get("facts", {})
    style = normalize_style(parent.state.get("input"))
    messages: list[dict[str, Any]] = []
    for recipient in rules.recipients():
        allowed = rules.filter_facts(recipient, facts)
        summary = rules.build_summary(recipient, facts)
        tone = style["tones"].get(recipient["id"])
        address = style["addresses"].get(recipient["id"])
        if _present_items(allowed):
            text = _guarded_text(
                parent, recipient, allowed, summary, tone, style["voice"], address
            )
        else:
            # 보낼 사실이 하나도 없으면 모델을 부르지 않는다. 부르면 빈 입력을 지어내서 채운다
            text = f"{recipient['name']}, 오늘 안부 전해요."
        messages.append(
            {
                "to": recipient["id"],
                "name": recipient["name"],
                "channel": recipient.get("channel", ""),
                "items": allowed.get("items", []),
                "summary": summary,
                "text": text,
            }
        )
    return {"messages": messages}
