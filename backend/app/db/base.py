"""SQLAlchemy declarative base.

Keep this module *pure* (no side-effect imports).

Why:
- Importing models from here creates circular imports when models import Base.
- Import models in application startup and in Alembic env.py instead,
  so Base.metadata is populated when needed.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass