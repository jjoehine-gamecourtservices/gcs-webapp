"""seed_rbac

Revision ID: 9480761f87c4
Revises: c5795519274b
Create Date: 2026-02-27

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "9480761f87c4"
down_revision = "8b828c8bda55"
branch_labels = None
depends_on = None

MASTER_ROLE = "master"
USER_ROLE = "user"

PERMISSIONS = [
    "admin:access",
    "dashboard:view",
    "users:read",
    "permissions:read",
]

# Deterministic assignment target for this seed migration:
# joe@gamecourtservices.com
MASTER_USER_ID = 1


def _get_id(conn: sa.Connection, table: str, name: str) -> int | None:
    row = conn.execute(
        sa.text(f"SELECT id FROM {table} WHERE name = :name"),
        {"name": name},
    ).fetchone()
    return int(row[0]) if row else None


def _ensure_role(conn: sa.Connection, name: str) -> int:
    role_id = _get_id(conn, "roles", name)
    if role_id is not None:
        return role_id

    conn.execute(sa.text("INSERT INTO roles (name) VALUES (:name)"), {"name": name})
    role_id = _get_id(conn, "roles", name)
    if role_id is None:
        raise RuntimeError(f"Failed to create role: {name}")
    return role_id


def _ensure_permission(conn: sa.Connection, name: str) -> int:
    perm_id = _get_id(conn, "permissions", name)
    if perm_id is not None:
        return perm_id

    conn.execute(sa.text("INSERT INTO permissions (name) VALUES (:name)"), {"name": name})
    perm_id = _get_id(conn, "permissions", name)
    if perm_id is None:
        raise RuntimeError(f"Failed to create permission: {name}")
    return perm_id


def _ensure_role_permission(conn: sa.Connection, role_id: int, permission_id: int) -> None:
    exists = conn.execute(
        sa.text(
            "SELECT 1 FROM role_permissions "
            "WHERE role_id = :rid AND permission_id = :pid"
        ),
        {"rid": role_id, "pid": permission_id},
    ).fetchone()
    if exists:
        return

    conn.execute(
        sa.text(
            "INSERT INTO role_permissions (role_id, permission_id) "
            "VALUES (:rid, :pid)"
        ),
        {"rid": role_id, "pid": permission_id},
    )


def _ensure_user_role(conn: sa.Connection, user_id: int, role_id: int) -> None:
    exists = conn.execute(
        sa.text(
            "SELECT 1 FROM user_roles "
            "WHERE user_id = :uid AND role_id = :rid"
        ),
        {"uid": user_id, "rid": role_id},
    ).fetchone()
    if exists:
        return

    conn.execute(
        sa.text("INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid)"),
        {"uid": user_id, "rid": role_id},
    )


def _debug_counts(conn: sa.Connection, label: str) -> None:
    roles = conn.execute(sa.text("SELECT COUNT(*) FROM roles")).scalar_one()
    perms = conn.execute(sa.text("SELECT COUNT(*) FROM permissions")).scalar_one()
    rp = conn.execute(sa.text("SELECT COUNT(*) FROM role_permissions")).scalar_one()
    ur = conn.execute(sa.text("SELECT COUNT(*) FROM user_roles")).scalar_one()
    print(f"[seed_rbac] {label} roles={roles} perms={perms} role_perms={rp} user_roles={ur}")


def upgrade() -> None:
    conn = op.get_bind()

    _debug_counts(conn, "before")

    master_role_id = _ensure_role(conn, MASTER_ROLE)
    user_role_id = _ensure_role(conn, USER_ROLE)

    perm_ids: dict[str, int] = {}
    for p in PERMISSIONS:
        perm_ids[p] = _ensure_permission(conn, p)

    for pid in perm_ids.values():
        _ensure_role_permission(conn, master_role_id, pid)

    _ensure_role_permission(conn, user_role_id, perm_ids["dashboard:view"])

    _ensure_user_role(conn, MASTER_USER_ID, master_role_id)

    # Force flush/commit for SQLite/transaction edge cases
    try:
        conn.commit()
    except Exception:
        # Some SQLAlchemy connection wrappers may not expose commit(); ignore if so
        pass

    _debug_counts(conn, "after")


def downgrade() -> None:
    conn = op.get_bind()

    master_role_id = _get_id(conn, "roles", MASTER_ROLE)
    user_role_id = _get_id(conn, "roles", USER_ROLE)

    if master_role_id is not None:
        conn.execute(
            sa.text("DELETE FROM user_roles WHERE user_id = :uid AND role_id = :rid"),
            {"uid": MASTER_USER_ID, "rid": master_role_id},
        )

    if master_role_id is not None:
        conn.execute(
            sa.text("DELETE FROM role_permissions WHERE role_id = :rid"),
            {"rid": master_role_id},
        )
    if user_role_id is not None:
        conn.execute(
            sa.text("DELETE FROM role_permissions WHERE role_id = :rid"),
            {"rid": user_role_id},
        )

    if master_role_id is not None:
        conn.execute(sa.text("DELETE FROM roles WHERE id = :rid"), {"rid": master_role_id})
    if user_role_id is not None:
        conn.execute(sa.text("DELETE FROM roles WHERE id = :rid"), {"rid": user_role_id})

    conn.execute(
        sa.text("DELETE FROM permissions WHERE name IN (:p1, :p2, :p3, :p4)"),
        {
            "p1": PERMISSIONS[0],
            "p2": PERMISSIONS[1],
            "p3": PERMISSIONS[2],
            "p4": PERMISSIONS[3],
        },
    )

    try:
        conn.commit()
    except Exception:
        pass