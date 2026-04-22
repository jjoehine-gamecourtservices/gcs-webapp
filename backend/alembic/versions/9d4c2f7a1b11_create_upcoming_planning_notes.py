# backend/alembic/versions/9d4c2f7a1b11_create_upcoming_planning_notes.py
"""create_upcoming_planning_notes

Revision ID: 9d4c2f7a1b11
Revises: 6b2a7f1d9c10
Create Date: 2026-04-01 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9d4c2f7a1b11"
down_revision: Union[str, None] = "6b2a7f1d9c10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "upcoming_planning_notes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("item_id", sa.String(length=32), nullable=False),
        sa.Column("note_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_upcoming_planning_notes_item_id",
        "upcoming_planning_notes",
        ["item_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_upcoming_planning_notes_item_id", table_name="upcoming_planning_notes")
    op.drop_table("upcoming_planning_notes")