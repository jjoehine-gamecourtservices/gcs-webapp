"""
Import aggregator for SQLAlchemy models.

Import every module that defines a SQLAlchemy model here so that:
- Base.metadata is complete at runtime
- Alembic autogenerate sees all tables
"""

from app.models.user import User  # noqa: F401
