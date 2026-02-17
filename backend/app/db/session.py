from __future__ import annotations

import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.base import Base

# Engine
engine = create_engine(
    settings.DB_URL,
    connect_args={"check_same_thread": False} if settings.DB_URL.startswith("sqlite") else {},
)

# SQLite safety PRAGMAs (per-connection)
@event.listens_for(engine, "connect")
def _sqlite_pragmas(dbapi_connection, connection_record):  # noqa: ARG001
    if not str(engine.url).startswith("sqlite"):
        return
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA journal_mode=WAL")
        # Do NOT set synchronous here; it's persisted DB-wide and should be managed explicitly.
    finally:
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def db_dependency():
    """FastAPI dependency: yield a DB session and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db() -> Session:
    """
    Legacy convenience for non-FastAPI contexts.
    Prefer db_dependency() for request-scoped sessions.
    """
    return SessionLocal()


def init_db() -> None:
    """
    Production rule: NEVER auto-create schema on startup.
    Schema changes must be applied via Alembic during the release process.

    For dev/test only, you may opt-in by setting:
      GCS_ALLOW_SCHEMA_CREATE=1
    """
    allow = os.getenv("GCS_ALLOW_SCHEMA_CREATE", "").strip().lower() in {"1", "true", "yes", "on"}
    if not allow:
        return

    # Dev/Test opt-in only:
    Base.metadata.create_all(bind=engine)
