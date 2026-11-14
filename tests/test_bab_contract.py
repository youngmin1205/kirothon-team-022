"""밥은 먹었니 계약 확인.

mock.json · profiles.json · product.md 데모 구간 표가 서로 어긋나면 화면·녹화·smoke 가
다른 id 를 보게 된다. 여기서 먼저 잡는다.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

os.environ["USE_MOCK"] = "1"
os.environ.pop("BEDROCK_MODEL_ID", None)

from fastapi.testclient import TestClient  # noqa: E402

from backend.core import session as sessions  # noqa: E402
from backend.main import app  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
FEATURE_DIR = REPO / "backend" / "features" / "bab"
MOCK = json.loads((FEATURE_DIR / "mock.json").read_text(encoding="utf-8"))
PROFILES = json.loads((FEATURE_DIR / "profiles.json").read_text(encoding="utf-8"))

BEAT_IDS = ["home", "upload", "judge", "confirm", "compose", "deliver", "react", "reply"]
ITEM_KEYS = {i["key"] for i in PROFILES["items"]}
MOOD_KEYS = {m["key"] for m in PROFILES["moodOptions"]}
PARENT_KEYS = {b["key"] for b in PROFILES["parentButtons"]}
CHECK_STATUS = {"done", "not_yet", "unknown"}


def _beat(beat_id: str) -> dict:
    return next(b for b in MOCK["beats"] if b["id"] == beat_id)["data"]


def test_mock_beats_match_product_md_table() -> None:
    table = (REPO / ".kiro" / "steering" / "product.md").read_text(encoding="utf-8")
    ids_in_doc = re.findall(r"^\| \d+ \| `([a-z-]+)` \|", table, flags=re.M)
    assert ids_in_doc == BEAT_IDS
    assert [b["id"] for b in MOCK["beats"]] == BEAT_IDS


def test_fixed_vocabulary() -> None:
    assert ITEM_KEYS == {"meal", "home", "mood", "note"}
    assert {"good", "ok", "tired", "busy", "sick", "custom"} == MOOD_KEYS
    assert {"heart", "call", "ate", "hospital", "fine"} == PARENT_KEYS


def test_recipient_items_are_known_items() -> None:
    for r in PROFILES["recipients"]:
        assert set(r["items"]) <= ITEM_KEYS, r["id"]


def test_no_orphan_items() -> None:
    """정의만 되고 받는 사람이 0명인 항목이 있으면 그 기능은 화면에서 잠겨만 있다.

    과거 `note`(한마디)가 어휘엔 있었지만 어떤 받는 사람의 items 에도 없어 ＋시트에서 늘
    🔒 로 떴다. 이 테스트가 있었으면 그때 바로 잡혔다.
    """
    used = set().union(*(set(r["items"]) for r in PROFILES["recipients"]))
    assert used == ITEM_KEYS, f"아무도 받지 않는 항목: {sorted(ITEM_KEYS - used)}"


def test_home_recipients_match_profiles() -> None:
    """home 구간 recipients(화면 잠금 표시의 원본)가 profiles.json 과 어긋나지 않는다."""
    by_id = {r["id"]: r for r in PROFILES["recipients"]}
    for r in _beat("home")["recipients"]:
        assert r["items"] == by_id[r["id"]]["items"], r["id"]


def test_ai_judges_only_meal_and_home() -> None:
    """기분은 버튼으로 고른다. judge 구간에 기분 판정이 들어가면 안 된다."""
    items = {c["item"] for c in _beat("judge")["checks"]}
    assert items <= {"meal", "home"}
    for c in _beat("judge")["checks"]:
        assert c["status"] in CHECK_STATUS
    assert _beat("upload")["mood"]["key"] in MOOD_KEYS


def test_compose_respects_recipient_profile() -> None:
    """메시지마다 공개 항목이 프로필과 같고, 아빠 메시지엔 기분이 없다."""
    by_id = {r["id"]: r for r in PROFILES["recipients"]}
    for m in _beat("compose")["messages"]:
        assert m["items"] == by_id[m["to"]]["items"]
    dad = next(m for m in _beat("compose")["messages"] if m["to"] == "dad")
    assert "mood" not in dad["items"]
    assert "피곤" not in dad["text"] and "피곤" not in dad["summary"]


def test_deliver_bubble_carries_summary_without_opening_link() -> None:
    d = _beat("deliver")
    mom = next(m for m in _beat("compose")["messages"] if m["to"] == "mom")
    assert mom["summary"] in d["bubble"]


def test_parent_reactions_use_fixed_buttons() -> None:
    assert set(_beat("react")["pressed"]) <= PARENT_KEYS
    assert {c["key"] for c in _beat("reply")["chips"]} <= PARENT_KEYS


def test_bab_demo_runs_to_completion() -> None:
    sessions.clear_all()
    client = TestClient(app)
    started = client.post("/api/bab/start", json={}).json()
    seen = [started["data"]]
    for _ in range(len(BEAT_IDS) - 1):
        r = client.post(
            "/api/bab/reply",
            json={"sessionId": started["sessionId"], "text": "다음", "scripted": True},
        )
        assert r.status_code == 200
        seen.append(r.json()["data"])
    assert seen[-1]["celebrate"] is True
    assert client.get("/api/health").json()["beats"]["bab"] == BEAT_IDS
