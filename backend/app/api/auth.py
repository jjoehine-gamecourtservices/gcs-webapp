from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import settings
from app.core.security import verify_password, create_access_token
from app.db.session import db_dependency
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class MeResponse(BaseModel):
    id: int
    email: EmailStr
    is_master: bool
    is_active: bool
    permissions: list[str]


def _get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def _permissions_for_user(user: User) -> list[str]:
    """
    Backend is the source of truth for permissions.
    For now, keep it simple and deterministic:
      - Master: full access
      - Non-master: dashboard only
    Later: replace with role/permission tables without changing frontend patterns.
    """
    if user.is_master:
        return [
            "admin:access",
            "dashboard:view",
            "users:read",
            "permissions:read",
        ]
    return [
        "dashboard:view",
    ]


@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(db_dependency)):
    user = _get_user_by_email(db, payload.email.lower().strip())
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(subject=str(user.id))

    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )
    return {"status": "ok"}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=settings.COOKIE_NAME, path="/")
    return {"status": "ok"}


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)):
    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        is_master=current_user.is_master,
        is_active=current_user.is_active,
        permissions=_permissions_for_user(current_user),
    )