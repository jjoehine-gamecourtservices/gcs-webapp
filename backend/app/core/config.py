from __future__ import annotations

from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="GCS_", extra="ignore")

    # Database
    DB_URL: str = Field(default="sqlite:////data/gcs.db")

    # Security
    SECRET_KEY: str = Field(default="CHANGE_ME_IN_ENV__GCS_SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60 * 12)  # 12 hours
    COOKIE_NAME: str = Field(default="gcs_session")
    COOKIE_SECURE: bool = Field(default=True)  # HTTPS only by default
    COOKIE_SAMESITE: str = Field(default="lax")  # lax/strict/none

    # CORS
    CORS_ORIGINS: List[str] = Field(default_factory=list)

    # Initial master user seed (used by seed script)
    MASTER_EMAIL: str = Field(default="master@gcs.local")
    MASTER_PASSWORD: str = Field(default="ChangeMeNow!")

    # Monday.com integration
    MONDAY_API_TOKEN: str = Field(default="")
    MONDAY_API_URL: str = Field(default="https://api.monday.com/v2")
    MONDAY_TIMEOUT_SECONDS: int = Field(default=30)

    MONDAY_BOARD_ID: int = Field(default=0)
    MONDAY_JOB_COLUMN_ID: str = Field(default="")  # e.g. job_____1
    MONDAY_UPCOMING_LIMIT: int = Field(default=50)

    # File Gateway (Windows host service)
    # Example:
    #   GCS_FILE_GATEWAY_URL=http://host.docker.internal:8787
    #   GCS_FILE_GATEWAY_TOKEN=...
    FILE_GATEWAY_URL: Optional[str] = Field(default=None)
    FILE_GATEWAY_TOKEN: Optional[str] = Field(default=None)

    # Background Sync (scheduler auth)
    CRON_TOKEN: Optional[str] = Field(default=None)


settings = Settings()