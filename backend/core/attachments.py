"""첨부 파일 입력.

왜 뼈대에 있나
    입력이 텍스트 한 줄뿐이면 "사진을 올리면", "CSV를 올리면" 으로 시작하는
    아이디어를 당일에 받을 수 없다. 업로드 경로가 없으면 그런 아이디어는
    채점에서 D(하루 안에 구현) 준비물 점수를 잃는다. 그래서 주제와 무관하게
    미리 열어 둔다.

어떻게 받나
    multipart 가 아니라 **JSON 안에 base64** 로 받는다. 그래야 응답·요청 형식이
    한 파일(`frontend/src/types/api.ts`)에서 끝나고, 프런트가 `api.*` 래퍼만
    쓰면 된다. 데모 크기(수 MB)에서는 이게 더 단순하다.

신뢰 경계
    개수·크기·형식을 여기서 막는다. 파일 이름은 경로와 제어문자를 털어낸다.
    위반은 ValueError 로 던지고 FastAPI 가 422 로 바꾼다.
"""
from __future__ import annotations

import base64
import binascii
import re
from typing import Any

from pydantic import BaseModel, Field, PrivateAttr, model_validator

from .config import settings

# 첨부 하나당 최대 개수. 데모에서 이보다 많이 필요한 경우를 아직 못 봤다.
MAX_FILES = 3

# 받는 형식과 Converse 에 넣을 때 쓰는 이름.
# 모르는 형식을 통과시키지 않는다 — 모델에 그대로 넘어가면 실패 원인을 찾기 어렵다.
IMAGE_FORMATS = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/webp": "webp",
    "image/gif": "gif",
}
TEXT_MIMES = {"text/plain", "text/csv"}
DOCUMENT_FORMATS = {"application/pdf": "pdf"}
ALLOWED_MIMES = set(IMAGE_FORMATS) | TEXT_MIMES | set(DOCUMENT_FORMATS)

# 텍스트 첨부를 모델에 넣을 때 자르는 길이. 통째로 넣으면 토큰이 녹는다.
MAX_TEXT_CHARS = 4000

_UNSAFE_NAME = re.compile(r"[\x00-\x1f\x7f]")


def _safe_name(raw: str) -> str:
    """파일 이름에서 경로와 제어문자를 털어낸다.

    이 이름은 화면과 로그에 그대로 보인다. 사용자가 준 문자열을 믿지 않는다.
    """
    name = raw.replace("\\", "/").split("/")[-1]
    name = _UNSAFE_NAME.sub("", name).strip()
    return name[:200] or "첨부"


def size_label(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.0f}KB"
    return f"{n / 1024 / 1024:.1f}MB"


class Attachment(BaseModel):
    """JSON 으로 올라온 파일 하나."""

    name: str = Field(min_length=1, max_length=300)
    mimeType: str = Field(min_length=3, max_length=100)
    dataBase64: str = Field(min_length=1)

    _raw: bytes = PrivateAttr(default=b"")

    @model_validator(mode="after")
    def _decode_and_check(self) -> Attachment:
        if self.mimeType not in ALLOWED_MIMES:
            raise ValueError(
                f"지원하지 않는 형식입니다: {self.mimeType} "
                f"(가능: {', '.join(sorted(ALLOWED_MIMES))})"
            )
        try:
            raw = base64.b64decode(self.dataBase64, validate=True)
        except (binascii.Error, ValueError) as e:
            raise ValueError(f"base64 로 읽을 수 없습니다: {e}") from e
        if not raw:
            raise ValueError("빈 파일입니다")
        limit = settings.attachment_max_bytes
        if len(raw) > limit:
            raise ValueError(
                f"파일이 너무 큽니다: {size_label(len(raw))} (상한 {size_label(limit)})"
            )
        self._raw = raw
        return self

    @property
    def raw(self) -> bytes:
        """디코딩된 내용. 검증 때 한 번만 디코딩한다."""
        return self._raw

    @property
    def safe_name(self) -> str:
        return _safe_name(self.name)

    def summary(self) -> str:
        return f"{self.safe_name} · {size_label(len(self.raw))} · {self.mimeType}"


def summarize(files: list[Attachment] | None) -> str:
    """받은 파일을 한 줄로. 업로드가 실제로 도달했는지 화면에서 보려고 쓴다."""
    if not files:
        return ""
    return ", ".join(f.summary() for f in files)


def to_content_blocks(files: list[Attachment] | None) -> list[dict[str, Any]]:
    """Converse 메시지의 content 블록으로 바꾼다.

    이미지는 image 블록, pdf 는 document 블록, 텍스트·CSV 는 잘라서 text 블록으로
    넣는다. mock 모드에서는 호출되지 않는다.
    """
    blocks: list[dict[str, Any]] = []
    for f in files or []:
        if f.mimeType in IMAGE_FORMATS:
            blocks.append(
                {
                    "image": {
                        "format": IMAGE_FORMATS[f.mimeType],
                        "source": {"bytes": f.raw},
                    }
                }
            )
        elif f.mimeType in DOCUMENT_FORMATS:
            blocks.append(
                {
                    "document": {
                        "format": DOCUMENT_FORMATS[f.mimeType],
                        # Converse 의 document name 은 영숫자·공백·하이픈만 안전하다
                        "name": re.sub(r"[^\w\s-]", "_", f.safe_name) or "document",
                        "source": {"bytes": f.raw},
                    }
                }
            )
        else:
            text = f.raw.decode("utf-8", errors="replace")[:MAX_TEXT_CHARS]
            blocks.append({"text": f"[첨부 {f.safe_name}]\n{text}"})
    return blocks
