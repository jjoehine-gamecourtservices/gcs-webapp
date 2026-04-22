# backend/alembic/versions/6b2a7f1d9c10_create_stock_tables.py
"""create_stock_tables

Revision ID: 6b2a7f1d9c10
Revises: 99a39ba15e75
Create Date: 2026-03-31 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6b2a7f1d9c10"
down_revision: Union[str, None] = "99a39ba15e75"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stock_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("size", sa.String(length=255), nullable=True),
        sa.Column("model_number", sa.String(length=255), nullable=True),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("picture_path", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_items_name", "stock_items", ["name"], unique=False)
    op.create_index("ix_stock_items_model_number", "stock_items", ["model_number"], unique=False)

    op.create_table(
        "stock_item_vendors",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("stock_item_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["stock_item_id"], ["stock_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_item_vendors_stock_item_id", "stock_item_vendors", ["stock_item_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_stock_item_vendors_stock_item_id", table_name="stock_item_vendors")
    op.drop_table("stock_item_vendors")

    op.drop_index("ix_stock_items_model_number", table_name="stock_items")
    op.drop_index("ix_stock_items_name", table_name="stock_items")
    op.drop_table("stock_items")