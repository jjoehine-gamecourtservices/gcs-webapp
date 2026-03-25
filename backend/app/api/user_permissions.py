from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_master
from app.db.session import db_dependency
from app.models.user import User
from app.services.permissions import (
    get_direct_permission_keys,
    permission_catalog,
    replace_user_permissions,
)

router = APIRouter()


class PermissionCatalogItem(BaseModel):
    key: str
    label: str
    parent: str | None = None


class PermissionCatalogResponse(BaseModel):
    items: List[PermissionCatalogItem]


class UserPermissionsItem(BaseModel):
    id: int
    email: str
    is_master: bool
    is_active: bool
    name: str | None = None
    permissions: List[str]


class UserPermissionsListResponse(BaseModel):
    users: List[UserPermissionsItem]


class UserPermissionsUpdateRequest(BaseModel):
    is_master: bool
    permissions: List[str]


class UserPermissionsUpdateResponse(BaseModel):
    id: int
    email: str
    is_master: bool
    is_active: bool
    name: str | None = None
    permissions: List[str]


def _load_user_with_permissions(db: Session, user_id: int) -> User | None:
    stmt = (
        select(User)
        .options(selectinload(User.permissions))
        .where(User.id == user_id)
    )
    return db.scalar(stmt)


def _to_user_permissions_item(user: User) -> UserPermissionsItem:
    return UserPermissionsItem(
        id=user.id,
        email=user.email,
        is_master=user.is_master,
        is_active=user.is_active,
        name=user.name,
        permissions=get_direct_permission_keys(user),
    )


@router.get("/catalog", response_model=PermissionCatalogResponse)
def get_permission_catalog(_master: User = Depends(require_master)):
    items = [PermissionCatalogItem(**item) for item in permission_catalog()]
    return PermissionCatalogResponse(items=items)


@router.get("/users", response_model=UserPermissionsListResponse)
def list_users_with_permissions(
    db: Session = Depends(db_dependency),
    _master: User = Depends(require_master),
):
    stmt = select(User).options(selectinload(User.permissions)).order_by(User.id.asc())
    users = db.scalars(stmt).all()
    return UserPermissionsListResponse(users=[_to_user_permissions_item(user) for user in users])


@router.put("/{user_id}", response_model=UserPermissionsUpdateResponse)
def update_user_permissions(
    user_id: int,
    payload: UserPermissionsUpdateRequest,
    db: Session = Depends(db_dependency),
    current_master: User = Depends(require_master),
):
    user = _load_user_with_permissions(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_master.id and not payload.is_master:
        raise HTTPException(status_code=400, detail="Cannot remove admin from your own account")

    user.is_master = payload.is_master

    if user.is_master:
        user.permissions.clear()
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        replace_user_permissions(db, user, payload.permissions)
        user = _load_user_with_permissions(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found after update")

    return UserPermissionsUpdateResponse(
        id=user.id,
        email=user.email,
        is_master=user.is_master,
        is_active=user.is_active,
        name=user.name,
        permissions=get_direct_permission_keys(user),
    )