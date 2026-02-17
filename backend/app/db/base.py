"""
SQLAlchemy declarative base + model import wiring.

Why this exists:
- SQLAlchemy only populates Base.metadata when model classes are imported.
- Alembic autogenerate depends on Base.metadata being complete.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# IMPORTANT:
# Import all model modules so they register themselves with Base.metadata.
# This must be after Base is defined to avoid circular import issues.
#
# The imported module should import each model file (User, etc).
from app.models import _all_models  # noqa: F401  (import side-effects only)
