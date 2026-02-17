from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.auth import router as auth_router


def create_app() -> FastAPI:
    app = FastAPI(title="GCS WebApp", version="0.0.1")

    # Minimal CORS for Phase 3; tighten later.
    if settings.CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.CORS_ORIGINS,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.get("/health")
    def health():
        return {"status": "ok"}

    app.include_router(auth_router, prefix="/auth", tags=["auth"])

    return app


app = create_app()
