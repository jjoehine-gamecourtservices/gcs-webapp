from __future__ import annotations

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import db_dependency
from app.models.user import User


def get_current_user(
    db: Session = Depends(db_dependency),
    token: str | None = Cookie(default=None, alias=settings.COOKIE_NAME),
) -> User:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        claims = decode_access_token(token)
        user_id = int(claims["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    stmt = (
        select(User)
        .options(selectinload(User.permissions))
        .where(User.id == user_id)
    )
    user = db.scalar(stmt)

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    return user


def require_master(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_master:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Master access required")
    return current_user