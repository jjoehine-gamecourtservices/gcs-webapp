from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserPermission(Base):
    __tablename__ = "user_permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    permission_key: Mapped[str] = mapped_column(String(100), nullable=False)

    user = relationship("User", back_populates="permissions")

    __table_args__ = (
        UniqueConstraint("user_id", "permission_key", name="uq_user_permission"),
    )