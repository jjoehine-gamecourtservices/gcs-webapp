"""Import all SQLAlchemy models for side effects.

This module exists so that:
- Alembic autogenerate can load all model classes and populate Base.metadata.
- The application can ensure all models are registered at startup.

Do NOT import this from app.db.base (that causes circular imports).
"""

# Import each model module here.
from app.models.user import User  # noqa: F401