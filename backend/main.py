"""FastAPI 앱.

이 파일은 당일에 거의 손대지 않는다. 기능은 backend/features/<이름>/ 폴더를
만들면 자동으로 등록된다. 그래서 세 사람이 같은 파일을 동시에 고치는 일이 없다.

새 기능 추가하는 법
    backend/features/my_thing/
    ├── __init__.py
    ├── router.py     # router = APIRouter() 를 export 한다
    ├── service.py    # 로직
    └── mock.json     # 데모 구간(beat) 고정 시나리오

실행
    개발:  uvicorn backend.main:app --reload --port 8000   (레포 루트에서)
    배포:  빌드된 프런트를 backend/static_dist 에 두면 이 앱 하나가 전부 서빙한다
"""
from __future__ import annotations

import importlib
import logging
import pkgutil
from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .core import mock
from .core.config import settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("app")

BACKEND_DIR = Path(__file__).resolve().parent
FEATURES_DIR = BACKEND_DIR / "features"
DIST_DIR = BACKEND_DIR / "static_dist"   # pnpm build 결과물 (배포용)
LEGACY_STATIC = BACKEND_DIR / "static"   # 프런트가 없을 때 쓰는 최소 화면


def discover_features() -> list[tuple[str, APIRouter]]:
    """features/*/router.py 의 `router` 를 모아 온다."""
    found: list[tuple[str, APIRouter]] = []
    if not FEATURES_DIR.exists():
        return found

    for info in pkgutil.iter_modules([str(FEATURES_DIR)]):
        if not info.ispkg or info.name.startswith("_"):
            continue
        module_path = f"{__package__}.features.{info.name}.router"
        try:
            module = importlib.import_module(module_path)
        except Exception as e:  # noqa: BLE001
            # 한 기능이 깨져도 나머지는 떠야 한다. 데모 중에 전체가 죽으면 안 된다.
            logger.error("기능 로드 실패 [%s]: %s: %s", info.name, type(e).__name__, e)
            continue
        router = getattr(module, "router", None)
        if router is None:
            logger.warning("기능 [%s] 에 router 가 없습니다", info.name)
            continue
        found.append((info.name, router))
    return found


def create_app() -> FastAPI:
    app = FastAPI(title="KIROTHON", docs_url="/api/docs", openapi_url="/api/openapi.json")

    features: list[str] = []
    for name, router in discover_features():
        app.include_router(router, prefix=f"/api/{name.replace('_', '-')}", tags=[name])
        features.append(name)
        logger.info("기능 등록: /api/%s", name.replace("_", "-"))

    @app.get("/api/health")
    def health() -> dict:
        """지금 어떤 모드로 돌고 있는지 한눈에 본다. preflight 와 smoke 가 쓴다."""
        return {
            "status": "ok",
            "mode": "mock" if settings.mock_only else "bedrock",
            "mockForced": settings.use_mock,
            "modelConfigured": bool(settings.model_id),
            "region": settings.region,
            "profile": settings.profile or None,
            "features": features,
            "beats": {f: mock.beat_ids(f) for f in features},
        }

    @app.post("/api/mock/reload")
    def mock_reload() -> dict:
        """mock.json 을 고친 뒤 서버 재시작 없이 다시 읽는다."""
        mock.reload()
        return {"status": "reloaded"}

    # ── 정적 파일 ────────────────────────────────────────────
    # 배포 모드: 빌드된 프런트를 이 앱이 직접 서빙한다 (단일 프로세스, 단일 포트)
    if DIST_DIR.exists():
        app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="spa")
        logger.info("빌드된 프런트를 서빙합니다: %s", DIST_DIR)
    elif LEGACY_STATIC.exists():
        @app.get("/")
        def index() -> FileResponse:
            return FileResponse(LEGACY_STATIC / "index.html")

        app.mount("/static", StaticFiles(directory=LEGACY_STATIC), name="static")
        logger.info("최소 화면을 서빙합니다 (개발 중에는 Vite 가 :5173 을 담당)")
    else:
        @app.get("/")
        def root() -> JSONResponse:
            return JSONResponse({"status": "ok", "hint": "개발 중에는 프런트가 :5173 입니다"})

    return app


app = create_app()
