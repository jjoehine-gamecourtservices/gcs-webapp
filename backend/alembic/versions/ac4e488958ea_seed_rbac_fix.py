"""seed_rbac_fix

Revision ID: ac4e488958ea
Revises: f505bd15cc61
Create Date: 2026-02-27 21:38:37.144588

Idempotently seed RBAC data (roles, permissions, links, and master assignment).

Why this exists:
- Prior RBAC seed revision 9480761f87c4 was marked applied but did not populate data.
- We do NOT re-run old revisions; we apply a new revision after the current head.
- This migration must be safe to run multiple times (idempotent).
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision: str = "ac4e488958ea"
down_revision: Union[str, None] = "f505bd15cc61"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


RBAC_ROLES: list[str] = [
    "admin",
]

RBAC_PERMISSIONS: list[str] = [
    "users:read",
    "users:write",
    "rbac:read",
    "rbac:write",
    "monday:read",
    "monday:write",
    "jobs:read",
    "jobs:write",
]


def upgrade() -> None:
    bind = op.get_bind()

    # 1) Seed roles
    for role_name in RBAC_ROLES:
        bind.execute(
            sa.text(
                "INSERT INTO roles (name) VALUES (:name) "
                "ON CONFLICT(name) DO NOTHING"
            ),
            {"name": role_name},
        )

    # 2) Seed permissions
    for perm_name in RBAC_PERMISSIONS:
        bind.execute(
            sa.text(
                "INSERT INTO permissions (name) VALUES (:name) "
                "ON CONFLICT(name) DO NOTHING"
            ),
            {"name": perm_name},
        )

    # 3) Link seeded permissions to admin role
    admin_role_id = bind.execute(
        sa.text("SELECT id FROM roles WHERE name = :name"),
        {"name": "admin"},
    ).scalar_one()

    for perm_name in RBAC_PERMISSIONS:
        perm_id = bind.execute(
            sa.text("SELECT id FROM permissions WHERE name = :name"),
            {"name": perm_name},
        ).scalar_one()

        bind.execute(
            sa.text(
                "INSERT OR IGNORE INTO role_permissions (role_id, permission_id) "
                "VALUES (:role_id, :permission_id)"
            ),
            {"role_id": admin_role_id, "permission_id": perm_id},
        )

    # 4) Assign all master users to admin role
    master_users = bind.execute(
        sa.text("SELECT id FROM users WHERE is_master = 1")
    ).fetchall()

    for (user_id,) in master_users:
        bind.execute(
            sa.text(
                "INSERT OR IGNORE INTO user_roles (user_id, role_id) "
                "VALUES (:user_id, :role_id)"
            ),
            {"user_id": user_id, "role_id": admin_role_id},
        )


def downgrade() -> None:
    bind = op.get_bind()

    admin_role_id = bind.execute(
        sa.text("SELECT id FROM roles WHERE name = :name"),
        {"name": "admin"},
    ).scalar_one_or_none()

    if admin_role_id is not None:
        bind.execute(
            sa.text("DELETE FROM user_roles WHERE role_id = :role_id"),
            {"role_id": admin_role_id},
        )
        bind.execute(
            sa.text("DELETE FROM role_permissions WHERE role_id = :role_id"),
            {"role_id": admin_role_id},
        )

    for perm_name in RBAC_PERMISSIONS:
        bind.execute(
            sa.text("DELETE FROM permissions WHERE name = :name"),
            {"name": perm_name},
        )

    for role_name in RBAC_ROLES:
        bind.execute(
            sa.text("DELETE FROM roles WHERE name = :name"),
            {"name": role_name},
        )