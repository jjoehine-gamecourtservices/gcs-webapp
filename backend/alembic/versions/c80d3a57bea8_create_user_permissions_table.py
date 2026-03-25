"""create_user_permissions_table

Revision ID: c80d3a57bea8
Revises: c3d1b2a4f0a1
Create Date: 2026-03-13 15:57:04.539124

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c80d3a57bea8'
down_revision: Union[str, None] = 'c3d1b2a4f0a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('permission_key', sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'permission_key', name='uq_user_permission')
    )


def downgrade() -> None:
    op.drop_table('user_permissions')