from __future__ import annotations

import json
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models.app_cache import AppCache


_memory_lock = Lock()
_memory_cache: Dict[str, Dict[str, Any]] = {}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_cache_row(row: AppCache) -> dict[str, Any]:
    payload: Any
    try:
        payload = json.loads(row.payload_json or "{}")
    except Exception:
        payload = {}

    return {
        "cacheKey": row.cache_key,
        "payload": payload,
        "updatedAt": row.updated_at or "",
        "refreshStartedAt": row.refresh_started_at,
        "refreshFinishedAt": row.refresh_finished_at,
        "refreshError": row.refresh_error,
    }


def get_cache_record(db: Session, cache_key: str) -> dict[str, Any] | None:
    with _memory_lock:
        cached = _memory_cache.get(cache_key)
        if cached is not None:
            return dict(cached)

    row = db.get(AppCache, cache_key)
    if row is None:
        return None

    normalized = _normalize_cache_row(row)

    with _memory_lock:
        _memory_cache[cache_key] = dict(normalized)

    return normalized


def upsert_cache_record(
    db: Session,
    *,
    cache_key: str,
    payload: Any,
    refresh_error: str | None = None,
    refresh_started_at: str | None = None,
    refresh_finished_at: str | None = None,
) -> dict[str, Any]:
    row = db.get(AppCache, cache_key)
    now_iso = utc_now_iso()

    if row is None:
        row = AppCache(
            cache_key=cache_key,
            payload_json="{}",
            updated_at=now_iso,
            refresh_started_at=None,
            refresh_finished_at=None,
            refresh_error=None,
        )

    row.payload_json = json.dumps(payload, ensure_ascii=False)
    row.updated_at = now_iso
    row.refresh_started_at = refresh_started_at
    row.refresh_finished_at = refresh_finished_at
    row.refresh_error = refresh_error

    db.add(row)
    db.commit()
    db.refresh(row)

    normalized = _normalize_cache_row(row)

    with _memory_lock:
        _memory_cache[cache_key] = dict(normalized)

    return normalized


def mark_cache_refresh_started(db: Session, cache_key: str) -> dict[str, Any]:
    row = db.get(AppCache, cache_key)
    now_iso = utc_now_iso()

    if row is None:
        row = AppCache(
            cache_key=cache_key,
            payload_json="{}",
            updated_at="",
            refresh_started_at=now_iso,
            refresh_finished_at=None,
            refresh_error=None,
        )
    else:
        row.refresh_started_at = now_iso
        row.refresh_error = None

    db.add(row)
    db.commit()
    db.refresh(row)

    normalized = _normalize_cache_row(row)

    with _memory_lock:
        _memory_cache[cache_key] = dict(normalized)

    return normalized


def mark_cache_refresh_failed(db: Session, cache_key: str, error_text: str) -> dict[str, Any]:
    row = db.get(AppCache, cache_key)
    now_iso = utc_now_iso()

    if row is None:
        row = AppCache(
            cache_key=cache_key,
            payload_json="{}",
            updated_at="",
            refresh_started_at=None,
            refresh_finished_at=now_iso,
            refresh_error=error_text,
        )
    else:
        row.refresh_finished_at = now_iso
        row.refresh_error = error_text

    db.add(row)
    db.commit()
    db.refresh(row)

    normalized = _normalize_cache_row(row)

    with _memory_lock:
        _memory_cache[cache_key] = dict(normalized)

    return normalized