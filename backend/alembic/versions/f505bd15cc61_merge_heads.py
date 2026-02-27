"""merge_heads

Revision ID: f505bd15cc61
Revises: b9a9d377c09e, 9480761f87c4
Create Date: 2026-02-27 21:25:13.334488

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f505bd15cc61"
down_revision: Union[str, None] = ("b9a9d377c09e", "9480761f87c4")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass