from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.db.session import db_dependency
from app.models.user import User
from app.services.permissions import (
    PERMISSION_JOBS,
    PERMISSION_TASKS,
    PERMISSION_TASKS_RENTALS,
    get_effective_permission_keys,
)

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
    name: str | None = None
    phone: str | None = None
    position: str | None = None


def _get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def _legacy_permissions_for_frontend(user: User, module_permissions: list[str]) -> list[str]:
    perms = set(module_permissions)

    # Keep current frontend alive during migration.
    perms.add("dashboard:view")

    if PERMISSION_JOBS in module_permissions:
        perms.add("jobs:view")

    if PERMISSION_TASKS in module_permissions or PERMISSION_TASKS_RENTALS in module_permissions:
        perms.add("tasks:view")

    if user.is_master:
        perms.add("admin:access")
        perms.add("users:read")
        perms.add("permissions:read")

    return sorted(perms)


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
    module_permissions = get_effective_permission_keys(current_user)
    response_permissions = _legacy_permissions_for_frontend(current_user, module_permissions)

    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        is_master=current_user.is_master,
        is_active=current_user.is_active,
        permissions=response_permissions,
        name=getattr(current_user, "name", None),
        phone=getattr(current_user, "phone", None),
        position=getattr(current_user, "position", None),
    )