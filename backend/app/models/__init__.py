"""
Model package initializer.

This ensures that when `app.models` is imported,
all model modules are loaded and registered with Base.metadata.

Required for:
- Alembic autogenerate
- Application startup
"""

from app.models import _all_models  # noqa: F401