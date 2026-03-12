from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.monday import router as monday_router
from app.api.monday_master_json import router as monday_master_json_router
from app.api.job_prefs import router as job_prefs_router
from app.api.jobs import router as jobs_router
from app.api.rentals import router as rentals_router
from app.api.rental_request_sources import router as rental_request_sources_router
from app.api.rental_requests import router as rental_requests_router


def create_app() -> FastAPI:
    app = FastAPI(title="GCS WebApp", version="0.0.1")

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

    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    app.include_router(users_router, prefix="/api/users", tags=["users"])
    app.include_router(monday_router, prefix="/api/monday", tags=["monday"])
    app.include_router(
        monday_master_json_router,
        prefix="/api/monday",
        tags=["monday-master-json"],
    )
    app.include_router(job_prefs_router, prefix="/api/user/job-prefs", tags=["job-prefs"])
    app.include_router(jobs_router, prefix="/api/jobs", tags=["jobs"])
    app.include_router(rentals_router, prefix="/api/rentals", tags=["rentals"])
    app.include_router(rental_request_sources_router, prefix="/api/rental-request-sources", tags=["rental-request-sources"])
    app.include_router(rental_requests_router, prefix="/api/rental-requests", tags=["rental-requests"])

    return app


app = create_app()