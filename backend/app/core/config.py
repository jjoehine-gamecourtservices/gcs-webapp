from __future__ import annotations

from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="GCS_", extra="ignore")

    # Database
    DB_URL: str = Field(default="sqlite:////data/gcs.db")

    # Security
    SECRET_KEY: str = Field(default="CHANGE_ME_IN_ENV__GCS_SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60 * 12)
    COOKIE_NAME: str = Field(default="gcs_session")
    COOKIE_SECURE: bool = Field(default=True)
    COOKIE_SAMESITE: str = Field(default="lax")
    COOKIE_MAX_AGE_SECONDS: int = Field(default=60 * 60 * 24 * 365 * 10)

    # CORS
    CORS_ORIGINS: List[str] = Field(default_factory=list)

    # Initial master user seed
    MASTER_EMAIL: str = Field(default="master@gcs.local")
    MASTER_PASSWORD: str = Field(default="ChangeMeNow!")

    # Monday.com
    MONDAY_API_TOKEN: str = Field(default="")
    MONDAY_API_URL: str = Field(default="https://api.monday.com/v2")
    MONDAY_TIMEOUT_SECONDS: int = Field(default=30)
    MONDAY_BOARD_ID: int = Field(default=0)
    MONDAY_JOB_COLUMN_ID: str = Field(default="")
    MONDAY_UPCOMING_LIMIT: int = Field(default=50)

    # Direct storage
    SHARES_ROOT: str = Field(default="/mnt/shares")
    ALL_JOBS_JSON_ROOT: str = Field(default="/mnt/shares/Application/ALL JOBS JSON/jobs")

    # Background sync
    CRON_TOKEN: str = Field(default="")


settings = Settings()
