from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserJobPrefs(Base):
    __tablename__ = "user_job_prefs"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_job_prefs_user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Foreign key intentionally omitted to avoid cascade/constraint surprises in SQLite;
    # we enforce existence via the authenticated user context.
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # JSON-encoded arrays of jobNumber strings (e.g. ["12731","12526"]).
    recent_job_numbers: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    pinned_job_numbers: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )