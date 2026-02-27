"""add user profile fields

Revision ID: b9a9d377c09e
Revises: 8b828c8bda55
Create Date: 2026-02-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b9a9d377c09e"
down_revision: Union[str, None] = "8b828c8bda55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("position", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "position")
    op.drop_column("users", "phone")
    op.drop_column("users", "name")