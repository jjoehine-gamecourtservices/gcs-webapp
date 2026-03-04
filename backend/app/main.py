from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.monday import router as monday_router
from app.api.monday_master_json import router as monday_master_json_router


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

    # Match prod reverse-proxy contract: API routes live under /api/*
    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    app.include_router(users_router, prefix="/api/users", tags=["users"])
    app.include_router(monday_router, prefix="/api/monday", tags=["monday"])
    app.include_router(
        monday_master_json_router,
        prefix="/api/monday",
        tags=["monday-master-json"],
    )

    return app


app = create_app()