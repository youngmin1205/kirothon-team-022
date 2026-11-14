"""밥은 먹었니 — judge·compose 흐름 확인 (task 3·4).

USE_MOCK=1 에서 돈다. bedrock 없이도:
    - judge 가 meal·home 만 판정해 facts 에 넣는지 (R2)
    - compose 가 받는 사람마다 한 번씩, 아빠용엔 기분 0건, 엄마용과 다른 본문을 내는지 (R4·R5)
를 확인한다. 모델 호출 결과가 아니라 **코드가 지키는 규칙**을 검증하는 테스트다.
"""
from __future__ import annotations

import os

os.environ["USE_MOCK"] = "1"
os.environ.pop("BEDROCK_MODEL_ID", None)

from backend.core.session import Session  # noqa: E402
from backend.features.bab import service  # noqa: E402

# 아빠용에 새면 안 되는 기분 표현 (라벨·이모지)
MOOD_WORDS = ("피곤", "😪", "아파", "🤒", "바빠", "😵", "좋아", "😊")


def _facts() -> dict:
    return {
        "child": "민지",
        "checks": [
            {"item": "meal", "status": "done", "detail": "점심 김치찌개"},
            {"item": "home", "status": "done", "detail": "21시 귀가"},
        ],
        "mood": {"key": "tired", "emoji": "😪", "label": "피곤해", "custom": None},
        "note": None,
    }


def _with_facts(session_id: str) -> Session:
    s = Session(id=session_id, feature="bab")
    s.state["facts"] = _facts()
    return s


def test_judge_writes_only_meal_and_home() -> None:
    s = Session(id="t-judge", feature="bab")
    out = service.run_judge(s)
    items = {c["item"] for c in out["checks"]}
    assert items <= {"meal", "home"}
    assert s.state["facts"]["checks"] == out["checks"]
    for c in out["checks"]:
        assert c["status"] in {"done", "not_yet", "unknown"}


def test_compose_makes_one_message_per_recipient() -> None:
    out = service.run_compose(_with_facts("t-count"))
    assert [m["to"] for m in out["messages"]] == ["mom", "dad"]


def test_dad_message_carries_no_mood() -> None:
    out = service.run_compose(_with_facts("t-dad"))
    dad = next(m for m in out["messages"] if m["to"] == "dad")
    assert dad["items"] == ["home"]
    for w in MOOD_WORDS:
        assert w not in dad["text"], w
        assert w not in dad["summary"], w


def test_mom_and_dad_differ() -> None:
    out = service.run_compose(_with_facts("t-diff"))
    mom = next(m for m in out["messages"] if m["to"] == "mom")
    dad = next(m for m in out["messages"] if m["to"] == "dad")
    assert mom["text"] != dad["text"]
    assert mom["summary"] != dad["summary"]
