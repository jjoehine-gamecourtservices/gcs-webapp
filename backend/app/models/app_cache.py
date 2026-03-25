from __future__ import annotations

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AppCache(Base):
    __tablename__ = "app_cache"

    cache_key: Mapped[str] = mapped_column(String(100), primary_key=True)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    updated_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    refresh_started_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    refresh_finished_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    refresh_error: Mapped[str | None] = mapped_column(Text, nullable=True)