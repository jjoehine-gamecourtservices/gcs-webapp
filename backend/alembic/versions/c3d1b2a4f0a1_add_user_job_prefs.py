"""add_user_job_prefs

Revision ID: c3d1b2a4f0a1
Revises: ac4e488958ea
Create Date: 2026-03-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d1b2a4f0a1"
down_revision: Union[str, None] = "ac4e488958ea"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_job_prefs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("recent_job_numbers", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("pinned_job_numbers", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", name="uq_user_job_prefs_user_id"),
    )


def downgrade() -> None:
    op.drop_table("user_job_prefs")