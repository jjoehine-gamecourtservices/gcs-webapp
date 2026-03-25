"""create_app_cache_table

Revision ID: 99a39ba15e75
Revises: c80d3a57bea8
Create Date: 2026-03-13 18:03:42.706890

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99a39ba15e75'
down_revision: Union[str, None] = 'c80d3a57bea8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'app_cache',
        sa.Column('cache_key', sa.String(length=100), nullable=False),
        sa.Column('payload_json', sa.Text(), nullable=False),
        sa.Column('updated_at', sa.String(length=64), nullable=False),
        sa.Column('refresh_started_at', sa.String(length=64), nullable=True),
        sa.Column('refresh_finished_at', sa.String(length=64), nullable=True),
        sa.Column('refresh_error', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('cache_key')
    )


def downgrade() -> None:
    op.drop_table('app_cache')