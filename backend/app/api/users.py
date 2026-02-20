from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_master
from app.core.security import hash_password
from app.db.session import db_dependency
from app.models.user import User

router = APIRouter()


class UserOut(BaseModel):
    id: int
    email: EmailStr
    is_master: bool
    is_active: bool
    profile_key: str | None


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    profile_key: str | None = None
    is_active: bool = True


class UserUpdate(BaseModel):
    # Keep this minimal. No is_master toggling unless you explicitly want it.
    is_active: bool | None = None
    profile_key: str | None = None


class PasswordReset(BaseModel):
    password: str = Field(min_length=8)


def _normalize_email(email: str) -> str:
    return email.lower().strip()


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(db_dependency),
    _master: User = Depends(require_master),
):
    users = db.scalars(select(User).order_by(User.id.asc())).all()
    return [
        UserOut(
            id=u.id,
            email=u.email,
            is_master=u.is_master,
            is_active=u.is_active,
            profile_key=u.profile_key,
        )
        for u in users
    ]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(db_dependency),
    master: User = Depends(require_master),
):
    email = _normalize_email(str(payload.email))

    # Prevent accidental lockouts / escalation paths:
    if email == master.email:
        raise HTTPException(status_code=400, detail="Cannot create a duplicate of the current user")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        is_master=False,  # intentionally hard-coded
        is_active=payload.is_active,
        profile_key=payload.profile_key,
    )

    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already exists")
    db.refresh(user)

    return UserOut(
        id=user.id,
        email=user.email,
        is_master=user.is_master,
        is_active=user.is_active,
        profile_key=user.profile_key,
    )


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(db_dependency),
    master: User = Depends(require_master),
):
    if user_id == master.id:
        # Minimal safety: don’t let master deactivate or mess their own profile here.
        # If you want to allow profile_key change for master, say so and I’ll loosen this.
        raise HTTPException(status_code=400, detail="Cannot modify the current master user here")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_master:
        raise HTTPException(status_code=400, detail="Cannot modify master users")

    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.profile_key is not None:
        user.profile_key = payload.profile_key

    db.add(user)
    db.commit()
    db.refresh(user)

    return UserOut(
        id=user.id,
        email=user.email,
        is_master=user.is_master,
        is_active=user.is_active,
        profile_key=user.profile_key,
    )


@router.post("/{user_id}/reset-password", response_model=UserOut)
def reset_password(
    user_id: int,
    payload: PasswordReset,
    db: Session = Depends(db_dependency),
    master: User = Depends(require_master),
):
    if user_id == master.id:
        raise HTTPException(status_code=400, detail="Cannot reset your own password here")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_master:
        raise HTTPException(status_code=400, detail="Cannot modify master users")

    user.password_hash = hash_password(payload.password)
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserOut(
        id=user.id,
        email=user.email,
        is_master=user.is_master,
        is_active=user.is_active,
        profile_key=user.profile_key,
    )