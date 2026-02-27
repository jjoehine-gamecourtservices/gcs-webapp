"""add users.profile_key

Revision ID: 8b828c8bda55
Revises: a0757730eea7
Create Date: 2026-02-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "8b828c8bda55"
down_revision: Union[str, None] = "a0757730eea7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table: str, col: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    return any(c["name"] == col for c in insp.get_columns(table))


def upgrade() -> None:
    if not _has_column("users", "profile_key"):
        op.add_column(
            "users",
            sa.Column("profile_key", sa.String(length=255), nullable=True),
        )


def downgrade() -> None:
    if _has_column("users", "profile_key"):
        op.drop_column("users", "profile_key")