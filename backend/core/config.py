"""환경 설정을 한 곳에서 읽는다.

왜 한 곳인가: 당일 리전·모델·계정이 바뀐다. 코드를 고치지 않고 .env 만
바꿔서 넘어갈 수 있어야 한다.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv() -> None:
    """.env 를 읽어 환경변수에 올린다 (이미 설정된 값은 덮지 않는다).

    python-dotenv 의존성을 추가하지 않는다. 해커톤에서 의존성 하나라도
    줄이는 편이 낫고, 우리가 쓰는 형식은 KEY=VALUE 뿐이다.
    """
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv()


def _flag(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    # ── Bedrock ──────────────────────────────────────────────
    region: str = field(default_factory=lambda: os.getenv("AWS_REGION", "us-west-2"))
    model_id: str = field(default_factory=lambda: os.getenv("BEDROCK_MODEL_ID", ""))

    # AWS_PROFILE 이 비어 있으면 boto3 기본 자격증명 체인에 맡긴다.
    # (환경변수 키 → EC2 인스턴스 역할 순). 그래서 EC2 배포 시 코드 수정이 없다.
    profile: str = field(default_factory=lambda: os.getenv("AWS_PROFILE", "").strip())

    # ── 실행 모드 ────────────────────────────────────────────
    # mock 이면 Bedrock 을 호출하지 않고 고정 시나리오를 재생한다.
    # 데모 녹화와 시연의 기본값. 네트워크·크레딧·throttling 과 무관하게 완주한다.
    use_mock: bool = field(default_factory=lambda: _flag("USE_MOCK"))

    max_tokens: int = field(default_factory=lambda: int(os.getenv("MAX_TOKENS", "1024")))
    temperature: float = field(default_factory=lambda: float(os.getenv("TEMPERATURE", "0.5")))

    # ── 첨부 파일 ────────────────────────────────────────────
    # JSON 안에 base64 로 받는다. 데모 크기를 넘는 입력은 신뢰 경계에서 막는다.
    attachment_max_mb: float = field(
        default_factory=lambda: float(os.getenv("ATTACHMENT_MAX_MB", "5"))
    )

    @property
    def attachment_max_bytes(self) -> int:
        return int(self.attachment_max_mb * 1024 * 1024)

    @property
    def ready(self) -> bool:
        """실제 Bedrock 호출이 가능한 설정인가."""
        return bool(self.model_id)

    @property
    def mock_only(self) -> bool:
        """모델을 아예 호출하지 않는 상태인가 (USE_MOCK=1 또는 모델 미설정).

        이 판단이 세 곳에서 필요하다: 에이전트 루프, /api/health, 그리고
        자유 입력을 받은 기능 라우터. 한 곳에 둬서 서로 어긋나지 않게 한다.
        """
        return self.use_mock or not self.ready


settings = Settings()
