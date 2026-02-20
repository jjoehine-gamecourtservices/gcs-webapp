"""add users.profile_key (manual)

Revision ID: 8b828c8bda55
Revises: 9d2206edd3eb
Create Date: 2026-02-20

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "8b828c8bda55"
down_revision = "9d2206edd3eb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("profile_key", sa.String(length=128), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "profile_key")