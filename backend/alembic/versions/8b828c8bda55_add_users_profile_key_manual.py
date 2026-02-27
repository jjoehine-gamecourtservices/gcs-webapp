"""add user profile fields

Revision ID: b9a9d377c09e
Revises: 8b828c8bda55
Create Date: 2026-02-27

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b9a9d377c09e"
down_revision: Union[str, None] = "8b828c8bda55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(table_name: str) -> set[str]:
    """Return existing column names for a SQLite table."""
    conn = op.get_bind()
    rows = conn.execute(sa.text(f"PRAGMA table_info({table_name})")).fetchall()
    # PRAGMA table_info columns: cid, name, type, notnull, dflt_value, pk
    return {str(r[1]) for r in rows}


def upgrade() -> None:
    cols = _existing_columns("users")

    if "name" not in cols:
        op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))
    if "phone" not in cols:
        op.add_column("users", sa.Column("phone", sa.String(length=64), nullable=True))
    if "position" not in cols:
        op.add_column("users", sa.Column("position", sa.String(length=255), nullable=True))


def downgrade() -> None:
    # SQLite supports DROP COLUMN only on newer versions; Alembic will attempt it.
    # Make this safe/idempotent as well.
    cols = _existing_columns("users")

    if "position" in cols:
        op.drop_column("users", "position")
    if "phone" in cols:
        op.drop_column("users", "phone")
    if "name" in cols:
        op.drop_column("users", "name")