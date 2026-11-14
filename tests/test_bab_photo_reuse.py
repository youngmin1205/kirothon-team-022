"""자녀가 올린 사진은 judge 요청에 첨부가 빠져도 그대로 판정에 쓰인다 (R2-3).

judge 는 upload 와 다른 요청이다. 세션이 사진을 들고 있지 않으면 서버가 samples/
데모 밥 사진으로 판정해서, 밥이 아닌 사진도 "밥 먹었어요"가 됐다.
"""

from __future__ import annotations

import base64
import os
from types import SimpleNamespace

os.environ["USE_MOCK"] = "1"
os.environ.pop("BEDROCK_MODEL_ID", None)

from fastapi.testclient import TestClient  # noqa: E402

from backend.core import session as sessions  # noqa: E402
from backend.features.bab import router  # noqa: E402
from backend.main import app  # noqa: E402

JPEG = base64.b64encode(bytes([0xFF, 0xD8, 0xFF, 0xD9])).decode()


def _run(monkeypatch, upload_files: list | None) -> list:
    seen: list = []

    def fake_judge(s, files=None):
        seen.append([f.name for f in files] if files else None)
        return {"checks": []}

    monkeypatch.setattr(router, "run_judge", fake_judge)
    # mock 모드는 대본 재생기라 judge 빌더를 부르지 않는다. live 단계 배선만 탄다 (모델은 가짜)
    monkeypatch.setattr(router, "settings", SimpleNamespace(mock_only=False))
    sessions.clear_all()
    client = TestClient(app)
    sid = client.post("/api/bab/start", json={}).json()["sessionId"]
    for files in (upload_files, None):  # upload → judge (judge 에는 첨부 없음)
        body = {"sessionId": sid, "text": "다음", "scripted": True}
        if files:
            body["files"] = files
        assert client.post("/api/bab/reply", json=body).status_code == 200
    return seen


def test_judge_reuses_uploaded_photo(monkeypatch) -> None:
    files = [{"name": "desk.jpg", "mimeType": "image/jpeg", "dataBase64": JPEG}]
    assert _run(monkeypatch, files) == [["desk.jpg"]]


def test_judge_without_upload_falls_back_to_samples(monkeypatch) -> None:
    # 사진을 올리지 않은 #play 경로는 run_judge 가 samples/ 를 붙인다 (첨부 None 으로 호출)
    assert _run(monkeypatch, None) == [None]
