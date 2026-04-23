from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.monday_master_json import _sync_master_json_internal
from app.db.session import db_dependency
from app.services.app_cache import (
    get_cache_record,
    mark_cache_refresh_failed,
    mark_cache_refresh_started,
    upsert_cache_record,
    utc_now_iso,
)
from app.storage.job_store import JobStore

router = APIRouter()

ALL_JOBS_CACHE_KEY = "all_jobs"


class AllJobsResponse(BaseModel):
    jobs: list[dict[str, Any]]
    count: int


class AllJobsCacheMetaResponse(BaseModel):
    cacheKey: str
    updatedAt: str
    refreshStartedAt: str | None = None
    refreshFinishedAt: str | None = None
    refreshError: str | None = None
    count: int


def _serialize_jobs_payload(jobs: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "jobs": jobs,
        "count": len(jobs),
    }


def _deserialize_jobs_payload(payload: Any) -> AllJobsResponse:
    if not isinstance(payload, dict):
        return AllJobsResponse(jobs=[], count=0)

    raw_jobs = payload.get("jobs")
    if not isinstance(raw_jobs, list):
        raw_jobs = []

    out_jobs: list[dict[str, Any]] = []
    for item in raw_jobs:
        if isinstance(item, dict):
            out_jobs.append(item)

    count = payload.get("count")
    if not isinstance(count, int):
        count = len(out_jobs)

    return AllJobsResponse(jobs=out_jobs, count=count)


def _build_all_jobs_payload() -> AllJobsResponse:
    try:
        jobs = JobStore().fetch_all_jobs()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load all jobs: {e}")

    normalized: list[dict[str, Any]] = []
    for item in jobs:
        if isinstance(item, dict):
            normalized.append(item)

    return AllJobsResponse(jobs=normalized, count=len(normalized))


def _refresh_all_jobs_cache(db: Session) -> AllJobsResponse:
    started = utc_now_iso()
    mark_cache_refresh_started(db, ALL_JOBS_CACHE_KEY)

    try:
        response = _build_all_jobs_payload()
        upsert_cache_record(
            db,
            cache_key=ALL_JOBS_CACHE_KEY,
            payload=_serialize_jobs_payload(response.jobs),
            refresh_error=None,
            refresh_started_at=started,
            refresh_finished_at=utc_now_iso(),
        )
        return response
    except HTTPException as e:
        mark_cache_refresh_failed(db, ALL_JOBS_CACHE_KEY, str(e.detail))
        raise
    except Exception as e:
        mark_cache_refresh_failed(db, ALL_JOBS_CACHE_KEY, str(e))
        raise HTTPException(status_code=502, detail=f"Failed to refresh all jobs cache: {e}")


def _refresh_all_jobs_pipeline(db: Session, *, sync_limit: int = 500) -> AllJobsResponse:
    try:
        _sync_master_json_internal(limit=sync_limit)
    except HTTPException as e:
        mark_cache_refresh_failed(db, ALL_JOBS_CACHE_KEY, f"Master JSON sync failed: {e.detail}")
        raise
    except Exception as e:
        mark_cache_refresh_failed(db, ALL_JOBS_CACHE_KEY, f"Master JSON sync failed: {e}")
        raise HTTPException(status_code=502, detail=f"Master JSON sync failed: {e}")

    return _refresh_all_jobs_cache(db)


@router.get("", response_model=AllJobsResponse)
def list_all_jobs(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    cached = get_cache_record(db, ALL_JOBS_CACHE_KEY)
    if cached is not None:
        return _deserialize_jobs_payload(cached.get("payload"))

    return _refresh_all_jobs_pipeline(db)


@router.post("/refresh", response_model=AllJobsResponse)
def refresh_all_jobs(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    return _refresh_all_jobs_pipeline(db)


@router.get("/meta", response_model=AllJobsCacheMetaResponse)
def all_jobs_meta(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    cached = get_cache_record(db, ALL_JOBS_CACHE_KEY)
    if cached is None:
        return AllJobsCacheMetaResponse(
            cacheKey=ALL_JOBS_CACHE_KEY,
            updatedAt="",
            refreshStartedAt=None,
            refreshFinishedAt=None,
            refreshError=None,
            count=0,
        )

    payload = _deserialize_jobs_payload(cached.get("payload"))
    return AllJobsCacheMetaResponse(
        cacheKey=ALL_JOBS_CACHE_KEY,
        updatedAt=str(cached.get("updatedAt") or ""),
        refreshStartedAt=cached.get("refreshStartedAt"),
        refreshFinishedAt=cached.get("refreshFinishedAt"),
        refreshError=cached.get("refreshError"),
        count=payload.count,
    )
