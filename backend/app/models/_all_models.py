# backend/app/models/_all_models.py
"""Import all SQLAlchemy models for side effects.

This module exists so that:
- Alembic autogenerate can load all model classes and populate Base.metadata.
- The application can ensure all models are registered at startup.

Do NOT import this from app.db.base (that causes circular imports).
"""

# Core models
from app.models.user import User  # noqa: F401
from app.models.user_permission import UserPermission  # noqa: F401
from app.models.app_cache import AppCache  # noqa: F401

# RBAC models
from app.models.role import Role  # noqa: F401
from app.models.permission import Permission  # noqa: F401
from app.models.associations import RolePermission, UserRole  # noqa: F401

# User job preferences (recent + pinned)
from app.models.user_job_prefs import UserJobPrefs  # noqa: F401

# Stock
from app.models.stock_item import StockItem  # noqa: F401
from app.models.stock_item_vendor import StockItemVendor  # noqa: F401

# Upcoming planning notes
from app.models.upcoming_planning_note import UpcomingPlanningNote  # noqa: F401