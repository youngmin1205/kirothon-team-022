"""코어가 mock 모드에서 끝까지 도는지 확인한다.

여기서 보는 것은 "기능"이 아니라 "뼈대"다. 당일 기능 코드를 붙이기 전에
아래가 깨지면 그날 하루가 날아간다.
"""
from __future__ import annotations

import os

import pytest

# 설정을 읽기 전에 mock 을 강제한다 (AWS 호출 없이 테스트가 돌아야 한다)
os.environ["USE_MOCK"] = "1"
os.environ.pop("BEDROCK_MODEL_ID", None)

from fastapi.testclient import TestClient  # noqa: E402

from backend.core import mock  # noqa: E402
from backend.core import session as sessions
from backend.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    sessions.clear_all()
    return TestClient(app)


def test_health_reports_mock_mode(client: TestClient) -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["mode"] == "mock"
    assert body["mockForced"] is True


def test_sample_feature_is_auto_registered(client: TestClient) -> None:
    """features/ 폴더만 만들면 등록된다 — 이게 깨지면 분담이 무너진다."""
    body = client.get("/api/health").json()
    assert "sample" in body["features"]
    assert body["beats"]["sample"] == ["intro", "work", "result", "end"]


def test_demo_runs_to_completion_without_aws(client: TestClient) -> None:
    """데모 경로 완주. 자격증명도 네트워크도 없이 끝까지 가야 한다."""
    started = client.post("/api/sample/start", json={}).json()
    sid = started["sessionId"]
    assert started["source"] == "mock"
    assert started["text"]

    seen = [started["text"]]
    for _ in range(3):
        r = client.post(
            "/api/sample/reply",
            json={"sessionId": sid, "text": "다음", "scripted": True},
        )
        assert r.status_code == 200
        seen.append(r.json()["text"])

    # 구간을 모두 재생했고, 마지막 문구가 나왔다
    assert len(seen) == 4
    assert "끝났습니다" in seen[-1]


def test_beats_repeat_after_exhaustion(client: TestClient) -> None:
    """구간을 다 쓰면 마지막을 반복한다. 데모 중 사용자가 더 눌러도 안 끊긴다."""
    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    for _ in range(8):
        r = client.post(
            "/api/sample/reply",
            json={"sessionId": sid, "text": "더", "scripted": True},
        )
        assert r.status_code == 200
    assert r.json()["text"]


def test_reset_rewinds_same_session(client: TestClient) -> None:
    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    client.post("/api/sample/reply", json={"sessionId": sid, "text": "다음", "scripted": True})
    r = client.post("/api/sample/reset", json={"sessionId": sid}).json()
    assert r["beatIndex"] == 0
    assert r["turn"] == 0
    again = client.post(
        "/api/sample/reply",
        json={"sessionId": sid, "text": "다시", "scripted": True},
    ).json()
    assert "mock 시나리오" in again["text"]


def test_mock_mode_free_input_returns_notice(client: TestClient) -> None:
    """mock 에서 사람이 직접 입력하면 대본이 아니라 안내가 온다.

    왜 중요한가: mock 재생기는 입력을 보지 않는다. 안내가 없으면 "안녕" 이라고
    쳤는데 대본 다음 줄이 나오는 것을 모델 오류로 오해한다.
    """
    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    before = client.post("/api/sample/reset", json={"sessionId": sid}).json()["beatIndex"]

    r = client.post("/api/sample/reply", json={"sessionId": sid, "text": "아무말"})
    assert r.status_code == 200
    body = r.json()
    assert body["advisory"] is True
    assert "pnpm dev" in body["text"]
    # 대본 위치가 그대로여야 한다. 그래야 이어서 #play 를 눌러도 처음부터 재생된다
    assert body["beatIndex"] == before


def test_scripted_replay_still_completes_after_free_input(client: TestClient) -> None:
    """자유 입력을 섞어도 대본 재생(#play·smoke 경로)은 완주한다."""
    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    client.post("/api/sample/reply", json={"sessionId": sid, "text": "자유 발화"})

    texts = []
    for _ in range(3):
        texts.append(
            client.post(
                "/api/sample/reply",
                json={"sessionId": sid, "text": "다음", "scripted": True},
            ).json()["text"]
        )
    assert "끝났습니다" in texts[-1]


def test_turn_carries_structured_data(client: TestClient) -> None:
    """턴 응답이 구간의 구조화 값을 함께 싣는다.

    왜 중요한가: 결과가 텍스트뿐이면 채점에서 깎인다("텍스트만 나오는 챗봇").
    숫자·표·게이지를 그리려면 화면이 턴마다 값을 받아야 한다. mock.json 의
    beat.data 가 그 자리다.
    """
    fixture = {b["id"]: b.get("data") for b in mock.beats("sample")}

    started = client.post("/api/sample/start", json={}).json()
    assert started["data"] == fixture["intro"]

    sid = started["sessionId"]
    r = client.post(
        "/api/sample/reply",
        json={"sessionId": sid, "text": "다음", "scripted": True},
    ).json()
    assert r["data"] == fixture["work"]


def test_advisory_has_no_structured_data(client: TestClient) -> None:
    """안내는 대화가 아니다. 화면이 들고 있는 값을 덮지 않아야 한다."""
    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    body = client.post("/api/sample/reply", json={"sessionId": sid, "text": "아무말"}).json()
    assert body["advisory"] is True
    assert "data" not in body


def test_parse_json_block_reads_model_output() -> None:
    """실제 모델 모드에서도 구조화 값을 뽑을 수 있어야 한다.

    mock 은 beat.data 가 있지만 Bedrock 응답은 텍스트뿐이다. 모델에게 JSON 을
    같이 달라고 하고 이 함수로 뽑으면 두 모드가 같은 모양이 된다.
    """
    from backend.core.bedrock import parse_json_block

    assert parse_json_block('앞말 ```json\n{"score": 72}\n``` 뒷말') == {"score": 72}
    assert parse_json_block('설명 {"zones": [1, 2]} 끝') == {"zones": [1, 2]}
    assert parse_json_block("JSON 이 없는 평범한 문장") is None
    assert parse_json_block('{"깨진": ') is None


def test_unknown_session_is_404(client: TestClient) -> None:
    r = client.post("/api/sample/reply", json={"sessionId": "nope", "text": "x"})
    assert r.status_code == 404


# ── 입력 경로: 구조화 입력과 첨부 ────────────────────────────
# 왜 뼈대에 있나: 입력이 텍스트 한 줄뿐이면 "사진을 올리면", "CSV를 올리면" 으로
# 시작하는 아이디어를 당일에 받을 수 없다.

PNG_1PX = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH"
    "/q842iQAAAABJRU5ErkJggg=="
)


def _attach(name: str = "a.png", mime: str = "image/png", b64: str = PNG_1PX) -> dict[str, str]:
    return {"name": name, "mimeType": mime, "dataBase64": b64}


def test_attachment_reaches_server_and_is_echoed(client: TestClient) -> None:
    """업로드가 서버에 닿았는지 화면에서 확인할 수 있어야 한다."""
    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    r = client.post(
        "/api/sample/reply",
        json={"sessionId": sid, "text": "", "files": [_attach("현장.png")]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["advisory"] is True
    assert "현장.png" in body["text"]
    assert "image/png" in body["text"]


def test_attachment_does_not_advance_script(client: TestClient) -> None:
    """첨부는 대본을 진행시키지 않는다. 그 뒤에 #play 를 눌러도 처음부터 돈다."""
    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    before = client.post("/api/sample/reset", json={"sessionId": sid}).json()["beatIndex"]
    body = client.post(
        "/api/sample/reply", json={"sessionId": sid, "text": "", "files": [_attach()]}
    ).json()
    assert body["beatIndex"] == before


def test_oversized_attachment_is_rejected(client: TestClient) -> None:
    """신뢰 경계에서 막는다. 상한은 settings.attachment_max_mb."""
    import base64

    from backend.core.config import settings

    big = base64.b64encode(b"\0" * (settings.attachment_max_bytes + 1)).decode()
    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    r = client.post(
        "/api/sample/reply",
        json={"sessionId": sid, "text": "", "files": [_attach("big.png", "image/png", big)]},
    )
    assert r.status_code == 422
    assert "너무 큽니다" in r.text


def test_unsupported_mime_is_rejected(client: TestClient) -> None:
    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    r = client.post(
        "/api/sample/reply",
        json={
            "sessionId": sid,
            "text": "",
            "files": [_attach("x.zip", "application/zip", "AAAA")],
        },
    )
    assert r.status_code == 422
    assert "지원하지 않는 형식" in r.text


def test_too_many_attachments_is_rejected(client: TestClient) -> None:
    from backend.core.attachments import MAX_FILES

    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    r = client.post(
        "/api/sample/reply",
        json={"sessionId": sid, "text": "", "files": [_attach()] * (MAX_FILES + 1)},
    )
    assert r.status_code == 422


def test_broken_base64_is_rejected(client: TestClient) -> None:
    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    r = client.post(
        "/api/sample/reply",
        json={"sessionId": sid, "text": "", "files": [_attach("x.png", "image/png", "!!!!")]},
    )
    assert r.status_code == 422


def test_structured_payload_is_kept_in_state(client: TestClient) -> None:
    """폼 값·좌표 같은 입력은 원본 그대로 세션에 남아 화면이 다시 쓴다."""
    sid = client.post("/api/sample/start", json={}).json()["sessionId"]
    body = client.post(
        "/api/sample/reply",
        json={"sessionId": sid, "text": "", "payload": {"areaM2": 120, "grid": [3, 3]}},
    ).json()
    assert body["state"]["input"] == {"areaM2": 120, "grid": [3, 3]}
    assert "areaM2" in body["text"]


def test_start_accepts_payload(client: TestClient) -> None:
    """입력이 없는 화면(폼 한 번 제출·대시보드형)은 start 에 값을 실어 보낸다."""
    body = client.post("/api/sample/start", json={"payload": {"zone": "A"}}).json()
    assert body["state"]["input"] == {"zone": "A"}


def test_attachment_becomes_converse_blocks() -> None:
    """실제 모델 모드에서 이미지·CSV 가 Converse 블록으로 들어간다."""
    from backend.core.attachments import Attachment, to_content_blocks

    img = Attachment(name="../../etc/현장.png", mimeType="image/png", dataBase64=PNG_1PX)
    # 파일 이름의 경로는 털어낸다 (화면·로그에 그대로 보이는 값이다)
    assert img.safe_name == "현장.png"

    import base64

    csv = Attachment(
        name="t.csv",
        mimeType="text/csv",
        dataBase64=base64.b64encode(b"a,b\n1,2\n").decode(),
    )
    blocks = to_content_blocks([img, csv])
    assert blocks[0]["image"]["format"] == "png"
    assert blocks[0]["image"]["source"]["bytes"] == img.raw
    assert "a,b" in blocks[1]["text"]


def test_prompt_text_merges_text_payload_and_files() -> None:
    """세 입력이 한 프롬프트로 합쳐진다. 모델은 JSON 필드를 따로 보지 못한다."""
    from backend.features.sample.router import ReplyIn

    body = ReplyIn(
        sessionId="x",
        text="이 사진 봐줘",
        payload={"areaM2": 120},
        files=[_attach("현장.png")],  # type: ignore[list-item]
    )
    prompt = body.prompt_text()
    assert "이 사진 봐줘" in prompt
    assert "areaM2" in prompt
    assert "현장.png" in prompt
    # 입력이 하나도 없으면 빈 프롬프트가 아니라 "시작" 이 된다
    assert ReplyIn(sessionId="x").prompt_text() == "시작"


def test_tool_function_runs_standalone() -> None:
    """도구는 모델 없이도 호출 가능해야 한다. 디버깅이 쉬워진다."""
    from backend.features.sample.service import TOOLS

    tool = next(t for t in TOOLS if t.name == "lookup_term")
    assert "데모" in tool.fn({"term": "beat"})
    assert "등록되지 않은" in tool.fn({"term": "없는용어"})


def test_mock_beat_ids_match_fixture() -> None:
    assert mock.beat_ids("sample") == ["intro", "work", "result", "end"]
