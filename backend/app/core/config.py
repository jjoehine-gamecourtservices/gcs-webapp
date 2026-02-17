from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List


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


settings = Settings()
