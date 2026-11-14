"""밥은 먹었니 — 순수 코드 규칙. 모델을 호출하지 않는다.

왜 따로 두나
    "프로필에 없는 항목은 모델에 넘기지 않는다" 는 프롬프트로 지킬 수 없다.
    "말하지 마" 라고 적어도 새어 나온다. 그래서 거르는 일을 코드로 내리고,
    모델에는 **이미 걸러진 입력만** 준다 (requirements R4).

    여기 있는 함수는 전부 모델 없이 호출된다. 그래서 단위 테스트가 되고,
    데모 중에 값이 틀려도 원인을 한 곳에서 찾는다.

고정 어휘(항목·기분·버튼·받는 사람)는 profiles.json 이 원본이다.
코드에 다시 적지 않는다. 적으면 두 곳이 어긋난다.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from ...core import mock

FEATURE = "bab"
PROFILES_PATH = Path(__file__).resolve().parent / "profiles.json"

# AI 가 사진으로 판정하는 항목. 기분은 자녀가 버튼으로 고르므로 여기 없다 (R2-1)
PHOTO_ITEMS: tuple[str, ...] = ("meal", "home")
STATUSES: frozenset[str] = frozenset({"done", "not_yet", "unknown"})

# 데모 기본값. #play·smoke 는 payload 를 보내지 않으므로 이 값으로 진행한다 (R3-4, R7-3)
DEFAULT_MOOD_KEY = "tired"
DEFAULT_PRESSED: tuple[str, ...] = ("heart", "ate")
DEFAULT_PHOTO_LABELS: tuple[str, ...] = ("점심", "현관", "오늘")

MAX_TEXT = 200  # 사용자 입력 문자열 상한. 화면·메시지에 그대로 들어가므로 자른다


# ── profiles.json 읽기 ────────────────────────────────────────────────────


@lru_cache(maxsize=1)
def profiles() -> dict[str, Any]:
    """데모용 고정 프로필. 설정 화면은 범위 밖이라 파일에서 읽는다."""
    return json.loads(PROFILES_PATH.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def items() -> dict[str, dict[str, Any]]:
    return {i["key"]: i for i in profiles()["items"]}


@lru_cache(maxsize=1)
def moods() -> dict[str, dict[str, Any]]:
    return {m["key"]: m for m in profiles()["moodOptions"]}


@lru_cache(maxsize=1)
def parent_buttons() -> dict[str, dict[str, Any]]:
    return {b["key"]: b for b in profiles()["parentButtons"]}


def recipients() -> list[dict[str, Any]]:
    return list(profiles()["recipients"])


def child_name() -> str:
    return str(profiles()["child"]["name"])


# ── 입력 정규화 (신뢰 경계) ───────────────────────────────────────────────


def _text(value: Any) -> str | None:
    """사용자 문자열을 다듬는다. 비면 None 이다."""
    if not isinstance(value, str):
        return None
    cleaned = " ".join(value.split())[:MAX_TEXT]
    return cleaned or None


def _section(payload: dict[str, Any] | None, key: str) -> Any:
    """payload[key] 를 꺼낸다. 화면이 중간 키 없이 바로 보내도 받아 준다."""
    if not isinstance(payload, dict):
        return None
    if key in payload:
        return payload[key]
    # {"key": "tired"} 처럼 해당 구간 값만 온 경우
    return payload if key == "mood" and "key" in payload else None


def normalize_mood(payload: dict[str, Any] | None) -> dict[str, Any]:
    """기분을 profiles.json 의 6개 안으로 제한한다 (R3).

    AI 가 기분을 판정하지 않는다. 허용 밖 값이 오면 거부하고 데모 기본값을 쓴다.
    직접 입력(custom)일 때만 custom 이 문자열이고, 그 밖에는 None 이다.
    """
    raw = _section(payload, "mood")
    key = raw.get("key") if isinstance(raw, dict) else None
    if key not in moods():
        key = DEFAULT_MOOD_KEY

    custom = _text(raw.get("custom")) if isinstance(raw, dict) else None
    if key != "custom":
        custom = None
    elif custom is None:
        # 직접 입력을 골랐는데 내용이 없으면 화면에 빈 칩이 뜬다. 기본값으로 떨어뜨린다
        key = DEFAULT_MOOD_KEY

    option = moods()[key]
    return {
        "key": key,
        "emoji": option["emoji"],
        "label": custom or option["label"],
        "custom": custom,
    }


def normalize_note(payload: dict[str, Any] | None) -> str | None:
    return _text(_section(payload, "note"))


def _check(item: str, status: Any, detail: Any, photo: Any = None) -> dict[str, Any]:
    meta = items()[item]
    return {
        "item": item,
        "emoji": meta["emoji"],
        "label": meta["label"],
        "status": status if status in STATUSES else "unknown",
        "detail": _text(detail),
        **({"photo": photo} if isinstance(photo, str) else {}),
    }


def normalize_checks(
    payload: dict[str, Any] | None, base: list[dict[str, Any]] | None = None
) -> list[dict[str, Any]]:
    """판정 칩을 meal·home 두 개로 고정하고, 자녀가 수정한 값을 위에 덮는다 (R2).

    base 는 judge 에이전트 결과다. confirm 구간에서 자녀가 고친 값이 우선이다.
    사진으로 알 수 없으면 status 는 unknown 이고, 그래도 다음 구간으로 넘어간다.
    """
    merged: dict[str, dict[str, Any]] = {}
    for source in (base or [], _section(payload, "checks") or []):
        if not isinstance(source, list):
            continue
        for row in source:
            if not isinstance(row, dict):
                continue
            item = row.get("item")
            if item not in PHOTO_ITEMS:
                continue  # mood·note 는 판정 대상이 아니다
            merged[item] = _check(item, row.get("status"), row.get("detail"), row.get("photo"))

    # 화면 순서를 고정한다. 칩이 매번 다른 순서로 뜨면 녹화가 흔들린다
    return [merged[i] for i in PHOTO_ITEMS if i in merged]


def normalize_pressed(payload: dict[str, Any] | None) -> list[str]:
    """부모님 버튼을 profiles.json 의 5개 안으로 제한한다 (R7). 자유 입력은 범위 밖이다."""
    raw = _section(payload, "pressed")
    if not isinstance(raw, list):
        return list(DEFAULT_PRESSED)
    seen = [k for k in dict.fromkeys(raw) if k in parent_buttons()]
    return seen or list(DEFAULT_PRESSED)


def photo_entries(names: list[str] | None) -> list[dict[str, str]]:
    """첨부 이름을 화면용 목록으로. 라벨은 올린 순서로 붙인다."""
    out: list[dict[str, str]] = []
    for i, name in enumerate(names or []):
        label = DEFAULT_PHOTO_LABELS[i] if i < len(DEFAULT_PHOTO_LABELS) else f"사진 {i + 1}"
        out.append({"name": str(name), "label": label})
    return out


# ── 받는 사람별 처리 ─────────────────────────────────────────────────────


def filter_facts(recipient: dict[str, Any], facts: dict[str, Any]) -> dict[str, Any]:
    """공개하지 않은 항목을 **모델에 넘기기 전에** 지운다 (R4-1·2).

    아빠 프로필에 mood 가 없으면 결과에 mood 키 자체가 없다. None 으로 두지 않는다.
    모델 입력에 문자열로라도 남으면 말투에 섞여 나온다.
    """
    allowed = set(recipient.get("items", []))
    out: dict[str, Any] = {
        "to": recipient["id"],
        "name": recipient["name"],
        "tone": recipient.get("tone", ""),
        "channel": recipient.get("channel", ""),
        "items": [i for i in recipient.get("items", []) if i in items()],
        "child": facts.get("child") or child_name(),
    }

    # 확인 단계를 거치고도 unknown 인 항목은 보내지 않는다. "귀가 확인이 안 됐어요" 같은
    # 문장은 정직하지만 부모님을 불안하게 만든다. 모르는 것은 말하지 않는다 (R4-5)
    checks = [
        c for c in facts.get("checks", [])
        if c.get("item") in allowed and c.get("status") != "unknown"
    ]
    if checks:
        out["checks"] = checks
    if "mood" in allowed and facts.get("mood"):
        out["mood"] = facts["mood"]
    if "note" in allowed and facts.get("note"):
        out["note"] = facts["note"]
    return out


def _piece(check: dict[str, Any]) -> str:
    """칩 하나를 사람이 읽는 한 토막으로.

    emoji·label 은 받은 dict 를 믿지 않고 profiles.json 에서 찾는다.
    모델이 돌려준 checks 에는 이 둘이 없을 수 있다.
    """
    meta = items().get(check.get("item", ""), {})
    emoji = check.get("emoji") or meta.get("emoji", "•")
    label = check.get("label") or meta.get("label", "항목")
    status, detail = check.get("status"), check.get("detail")
    if status == "done":
        body = detail or f"{label} 확인"
    elif status == "not_yet":
        body = f"{label} 아직"
    else:
        body = f"{label} 확인 안 됨"
    return f"{emoji} {body}"


def build_summary(recipient: dict[str, Any], facts: dict[str, Any]) -> str:
    """메시지 본문에 그대로 들어가는 항목 요약 (R5-4, R6-1).

    모델 출력으로 만들지 않는다. 모델이 바꿔 쓰면 본문과 칩이 어긋난다.
    """
    allowed = filter_facts(recipient, facts)
    parts = [_piece(c) for c in allowed.get("checks", [])]
    mood = allowed.get("mood")
    if mood:
        parts.append(f"{mood['emoji']} {mood['label']}")
    note = allowed.get("note")
    if note:
        parts.append(f"{items()['note']['emoji']} {note}")
    return " · ".join(parts)


def build_bubble(child: str, summary: str, link: str) -> str:
    """카톡·문자 본문. 링크를 열지 않아도 안부를 알 수 있어야 한다 (R6-1·3)."""
    return f"{child} 오늘 안부\n{summary}\n❤️ 답하기 ▶ {link}"


def build_preview(child: str, summary: str, image: str | None = None) -> dict[str, Any]:
    """링크 미리보기(OG). 본문과 같은 요약을 보여 준다 (R6-2)."""
    return {
        "title": f"{child} 오늘 안부",
        "description": summary,
        "image": image or "",
    }


# ── 폴백 ─────────────────────────────────────────────────────────────────


def mock_data(beat: str) -> dict[str, Any] | None:
    """해당 구간의 mock.json data. 모델이 JSON 을 안 줬을 때 화면을 채운다 (R8-4).

    core/mock.py 에 id 로 찾는 헬퍼가 없고 core/ 는 lead 영역이라 여기에 둔다.
    """
    for b in mock.beats(FEATURE):
        if b.get("id") == beat:
            return b.get("data") or None
    return None
