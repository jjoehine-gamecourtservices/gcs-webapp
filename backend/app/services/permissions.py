from __future__ import annotations

from typing import Iterable, List

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models.user import User
from app.models.user_permission import UserPermission


PERMISSION_JOBS = "jobs"
PERMISSION_TASKS = "tasks"
PERMISSION_TASKS_RENTALS = "tasks.rentals"
PERMISSION_TASKS_STOCK = "tasks.stock"

ALL_PERMISSION_KEYS: List[str] = [
    PERMISSION_JOBS,
    PERMISSION_TASKS,
    PERMISSION_TASKS_RENTALS,
    PERMISSION_TASKS_STOCK,
]


def permission_catalog() -> list[dict[str, str | None]]:
    return [
        {
            "key": PERMISSION_JOBS,
            "label": "Jobs",
            "parent": None,
        },
        {
            "key": PERMISSION_TASKS,
            "label": "Tasks",
            "parent": None,
        },
        {
            "key": PERMISSION_TASKS_RENTALS,
            "label": "Rentals",
            "parent": PERMISSION_TASKS,
        },
        {
            "key": PERMISSION_TASKS_STOCK,
            "label": "Stock",
            "parent": PERMISSION_TASKS,
        },
    ]


def normalize_permission_keys(values: Iterable[str]) -> list[str]:
    seen = set()
    out: list[str] = []

    for value in values:
        key = str(value or "").strip()
        if not key:
            continue
        if key not in ALL_PERMISSION_KEYS:
            continue
        if key in seen:
            continue

        seen.add(key)
        out.append(key)

    return sorted(out)


def expand_permission_keys(values: Iterable[str]) -> list[str]:
    normalized = normalize_permission_keys(values)
    out = set(normalized)

    if PERMISSION_TASKS_RENTALS in out:
        out.add(PERMISSION_TASKS)

    if PERMISSION_TASKS_STOCK in out:
        out.add(PERMISSION_TASKS)

    return sorted(out)


def get_user_with_permissions(db: Session, user_id: int) -> User | None:
    stmt = (
        select(User)
        .options(selectinload(User.permissions))
        .where(User.id == user_id)
    )
    return db.scalar(stmt)


def get_direct_permission_keys(user: User) -> list[str]:
    return normalize_permission_keys(
        item.permission_key
        for item in (getattr(user, "permissions", None) or [])
    )


def get_effective_permission_keys(user: User) -> list[str]:
    if user.is_master:
        return list(ALL_PERMISSION_KEYS)

    return expand_permission_keys(get_direct_permission_keys(user))


def replace_user_permissions(db: Session, user: User, permission_keys: Iterable[str]) -> list[str]:
    normalized = normalize_permission_keys(permission_keys)

    db.execute(
        delete(UserPermission).where(UserPermission.user_id == user.id)
    )
    db.flush()

    for key in normalized:
        db.add(
            UserPermission(
                user_id=user.id,
                permission_key=key,
            )
        )

    db.commit()

    refreshed = get_user_with_permissions(db, user.id)
    if refreshed is None:
        return []

    return get_direct_permission_keys(refreshed)