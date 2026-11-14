"""순수 코드 규칙 단위 테스트 (task 1).

모델을 호출하지 않는다. 그래서 크레딧 없이 돌고, 실패하면 원인이 한 곳이다.
확인하는 것은 requirements.md 의 R3 · R4 · R5-4 · R6 · R7 · R8-4 다.
"""
from __future__ import annotations

import os

os.environ["USE_MOCK"] = "1"

from backend.features.bab import rules  # noqa: E402

MOM = next(r for r in rules.recipients() if r["id"] == "mom")
DAD = next(r for r in rules.recipients() if r["id"] == "dad")

FACTS = {
    "child": "민지",
    "checks": [
        {"item": "meal", "emoji": "🍚", "label": "밥", "status": "done", "detail": "점심 김치찌개"},
        {"item": "home", "emoji": "🏠", "label": "귀가", "status": "done", "detail": "21시 귀가"},
    ],
    "mood": {"key": "tired", "emoji": "😪", "label": "피곤해", "custom": None},
    "note": None,
}


# ── R3 기분은 버튼으로 고른다 ────────────────────────────────────────────


def test_mood_defaults_when_payload_missing() -> None:
    """#play·smoke 는 payload 를 보내지 않는다. 400 이 아니라 기본값으로 진행해야 한다."""
    assert rules.normalize_mood(None)["key"] == rules.DEFAULT_MOOD_KEY


def test_mood_rejects_unknown_key() -> None:
    assert rules.normalize_mood({"mood": {"key": "angry"}})["key"] == rules.DEFAULT_MOOD_KEY


def test_mood_keeps_custom_sentence_as_is() -> None:
    m = rules.normalize_mood({"mood": {"key": "custom", "custom": "허리가 좀 아파"}})
    assert m["key"] == "custom"
    assert m["custom"] == "허리가 좀 아파"
    assert m["label"] == "허리가 좀 아파"  # 뜻을 바꾸지 않는다


def test_custom_is_none_unless_custom_selected() -> None:
    assert rules.normalize_mood({"mood": {"key": "good", "custom": "몰래 넣은 값"}})["custom"] is None


def test_empty_custom_falls_back() -> None:
    assert rules.normalize_mood({"mood": {"key": "custom", "custom": "  "}})["key"] == "tired"


# ── R2 판정은 밥·귀가만 ──────────────────────────────────────────────────


def test_checks_drop_non_photo_items() -> None:
    rows = rules.normalize_checks({"checks": [{"item": "mood", "status": "done"}]}, FACTS["checks"])
    assert {c["item"] for c in rows} == {"meal", "home"}


def test_confirm_overrides_judge_result() -> None:
    rows = rules.normalize_checks(
        {"checks": [{"item": "meal", "status": "not_yet", "detail": "아직 못 먹음"}]},
        FACTS["checks"],
    )
    meal = next(c for c in rows if c["item"] == "meal")
    assert meal["status"] == "not_yet"
    assert meal["detail"] == "아직 못 먹음"


def test_unknown_status_becomes_unknown() -> None:
    rows = rules.normalize_checks({"checks": [{"item": "home", "status": "맞음"}]})
    assert rows[0]["status"] == "unknown"


def test_check_order_is_fixed() -> None:
    rows = rules.normalize_checks({"checks": list(reversed(FACTS["checks"]))})
    assert [c["item"] for c in rows] == ["meal", "home"]


# ── R7 부모님은 고정 버튼만 ─────────────────────────────────────────────


def test_pressed_filters_and_defaults() -> None:
    assert rules.normalize_pressed({"pressed": ["heart", "해킹", "ate", "heart"]}) == [
        "heart",
        "ate",
    ]
    assert rules.normalize_pressed(None) == list(rules.DEFAULT_PRESSED)


# ── R4 프로필 필터 (이 테스트가 핵심이다) ────────────────────────────────


def test_dad_input_has_no_mood_key_at_all() -> None:
    """아빠에게 넘기는 모델 입력에 기분이 문자열로도 남으면 안 된다."""
    sent = rules.filter_facts(DAD, FACTS)
    assert "mood" not in sent
    assert "피곤" not in str(sent)
    assert {c["item"] for c in sent["checks"]} == {"home"}


def test_mom_input_keeps_her_items() -> None:
    sent = rules.filter_facts(MOM, FACTS)
    assert sent["mood"]["key"] == "tired"
    assert {c["item"] for c in sent["checks"]} == {"meal", "home"}


# ── R5-4 · R6 요약과 본문은 코드가 조립한다 ──────────────────────────────


def test_summary_shape_matches_mock() -> None:
    summary = rules.build_summary(MOM, FACTS)
    assert summary == "🍚 점심 김치찌개 · 🏠 21시 귀가 · 😪 피곤해"
    assert " · " in summary  # mock.json 의 요약과 같은 구분자


def test_dad_summary_has_no_mood() -> None:
    summary = rules.build_summary(DAD, FACTS)
    assert summary == "🏠 21시 귀가"
    assert "피곤" not in summary and "😪" not in summary


def test_unknown_check_is_not_sent() -> None:
    # 사진으로 모르는 항목은 부모님께 보내지 않는다 (R4-5). 모델 입력에도 없다
    facts = {
        **FACTS,
        "checks": [
            {"item": "meal", "status": "unknown", "detail": "음식 사진 없음"},
            {"item": "home", "status": "done", "detail": "21시 귀가"},
        ],
    }
    summary = rules.build_summary(MOM, facts)
    assert "확인 안 됨" not in summary and "밥" not in summary
    assert "21시 귀가" in summary
    assert [c["item"] for c in rules.filter_facts(MOM, facts)["checks"]] == ["home"]
    assert "checks" not in rules.filter_facts(DAD, {**facts, "checks": facts["checks"][:1]})


def test_bubble_carries_summary_and_link() -> None:
    summary = rules.build_summary(MOM, FACTS)
    bubble = rules.build_bubble("민지", summary, "https://bab.example.com/r/demo01")
    assert summary in bubble  # 링크를 열지 않아도 안부를 안다
    assert "민지 오늘 안부" in bubble
    assert "https://bab.example.com/r/demo01" in bubble


def test_preview_description_is_the_same_summary() -> None:
    summary = rules.build_summary(MOM, FACTS)
    assert rules.build_preview("민지", summary, "lunch.jpg")["description"] == summary


# ── R8-4 폴백 ────────────────────────────────────────────────────────────


def test_mock_data_returns_beat_data() -> None:
    assert "checks" in rules.mock_data("judge")
    assert rules.mock_data("없는구간") is None


def test_compose_input_lists_only_present_items() -> None:
    # 프로필에 meal 이 있어도 unknown 이라 빠졌으면 모델 입력 items 에도 없다 (R4-5)
    from backend.features.bab import service

    facts = {**FACTS, "checks": [{"item": "meal", "status": "unknown", "detail": None}]}
    allowed = rules.filter_facts(MOM, facts)
    assert "meal" not in service._present_items(allowed)
    assert service._present_items(rules.filter_facts(DAD, facts)) == []


# ── R4-6: 사실의 뜻은 코드가 정하고, 어긋난 문장은 코드가 잡는다 ─────────────


def test_child_status_change_drops_stale_judge_detail() -> None:
    base = [{"item": "meal", "status": "done", "detail": "점심 식사 완료"}]
    rows = rules.normalize_checks(
        {"checks": [{"item": "meal", "status": "not_yet", "detail": "점심 식사 완료"}]}, base
    )
    assert rows[0]["status"] == "not_yet" and rows[0]["detail"] is None
    # 자녀가 설명까지 새로 쓰면 그 설명은 남는다
    rows = rules.normalize_checks(
        {"checks": [{"item": "meal", "status": "not_yet", "detail": "저녁은 이따"}]}, base
    )
    assert rows[0]["detail"] == "저녁은 이따"


def test_fact_sentences_spell_out_not_yet() -> None:
    facts = {**FACTS, "checks": [
        {"item": "meal", "status": "not_yet", "detail": None},
        {"item": "home", "status": "not_yet", "detail": None},
    ]}
    sentences = rules.fact_sentences(rules.filter_facts(MOM, facts))
    assert "아직 밥을 못 먹었다" in sentences and "아직 집에 안 들어왔다" in sentences
    assert not any("not_yet" in x or "확인" in x for x in sentences)
    assert "아직 밥 전" in rules.build_summary(MOM, facts)


def test_check_text_catches_contradictions() -> None:
    facts = {**FACTS, "checks": [
        {"item": "meal", "status": "not_yet", "detail": None},
        {"item": "home", "status": "not_yet", "detail": None},
    ]}
    allowed = rules.filter_facts(MOM, facts)  # mood = 피곤해
    assert rules.check_text("엄마, 아직 밥 못 먹었고 집에도 안 들어왔어. 좀 피곤해.", allowed) == []
    assert rules.check_text("엄마, 밥이랑 집은 아직 확인 못했어요.", allowed)  # 시스템 단어
    assert rules.check_text("엄마, 점심 잘 먹었어. 피곤해.", allowed)  # 반대 사실
    assert rules.check_text("엄마, 아직 밥 못 먹었어. 근데 괜찮아!", allowed)  # 기분 바꿈
