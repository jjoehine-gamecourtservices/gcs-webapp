# backend/app/api/upcoming_planning.py
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import db_dependency
from app.integrations.monday_client import MondayAPIError, MondayClient
from app.models.upcoming_planning_note import UpcomingPlanningNote
from app.services.app_cache import (
    get_cache_record,
    mark_cache_refresh_failed,
    mark_cache_refresh_started,
    upsert_cache_record,
    utc_now_iso,
)

router = APIRouter()

MASTER_BOARD_ID = 7534384198
CENTRAL_TZ = ZoneInfo("America/Chicago")
UPCOMING_PLANNING_CACHE_KEY = "upcoming_planning"

MONTH_COLUMN_IDS: Dict[int, str] = {
    1: "_jan___1",
    2: "_feb___1",
    3: "_mar___1",
    4: "_apr___1",
    5: "_may___1",
    6: "_jun___1",
    7: "_jul___1",
    8: "_aug___1",
    9: "_sep___1",
    10: "_oct___1",
    11: "_nov___1",
    12: "_dec___1",
}

MONTH_LABELS: Dict[int, str] = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Aug",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
}

JOB_NUMBER_COL_ID = "job_____1"
ADDRESS_COL_ID = "location__1"
GC_COL_ID = "gc__1"
PM_COL_ID = "people__1"
SUPER_COL_ID = "connect_boards7__1"
SUPER_CELL_COL_ID = "mirror13__1"
GCPM_COL_ID = "connect_boards19__1"
GCPM_CELL_COL_ID = "mirror8__1"

DETAIL_COLUMN_IDS: List[str] = [
    JOB_NUMBER_COL_ID,
    ADDRESS_COL_ID,
    GC_COL_ID,
    PM_COL_ID,
    SUPER_COL_ID,
    SUPER_CELL_COL_ID,
    GCPM_COL_ID,
    GCPM_CELL_COL_ID,
]


class UpcomingPlanningJob(BaseModel):
    itemId: str
    itemName: str
    months: List[str]
    jobNumber: str | None = None
    address: str | None = None
    gc: str | None = None
    pm: str | None = None
    super: str | None = None
    superCell: str | None = None
    gcpm: str | None = None
    gcpmCell: str | None = None
    hasNote: bool = False


class UpcomingPlanningJobsResponse(BaseModel):
    jobs: List[UpcomingPlanningJob]


class UpcomingPlanningCacheMetaResponse(BaseModel):
    cacheKey: str
    updatedAt: str
    refreshStartedAt: str | None = None
    refreshFinishedAt: str | None = None
    refreshError: str | None = None
    count: int


class UpcomingPlanningNoteResponse(BaseModel):
    itemId: str
    noteText: str
    updatedAt: str | None = None


class UpcomingPlanningNoteUpsertRequest(BaseModel):
    noteText: str


def _monday_client() -> MondayClient:
    return MondayClient(
        token=settings.MONDAY_API_TOKEN,
        api_url=settings.MONDAY_API_URL,
        timeout_seconds=settings.MONDAY_TIMEOUT_SECONDS,
    )


def _clean_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _format_phone(value: Any) -> str:
    raw = _clean_str(value)
    if not raw:
        return ""

    digits = re.sub(r"\D", "", raw)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]

    if len(digits) == 10:
        return f"({digits[0:3]}) {digits[3:6]}-{digits[6:10]}"

    return raw


def _column_display(col: Dict[str, Any] | None) -> str:
    if not isinstance(col, dict):
        return ""

    display = _clean_str(col.get("display_value"))
    if display:
        return display

    text = _clean_str(col.get("text"))
    if text:
        return text

    value = _clean_str(col.get("value"))
    return value


def _column_has_value(col: Dict[str, Any] | None) -> bool:
    if not isinstance(col, dict):
        return False

    if _clean_str(col.get("display_value")):
        return True

    if _clean_str(col.get("text")):
        return True

    raw_value = _clean_str(col.get("value"))
    if raw_value and raw_value not in {"null", "{}", "[]"}:
        return True

    return False


def _rolling_months() -> List[tuple[int, int]]:
    now = datetime.now(CENTRAL_TZ)
    year = now.year
    month = now.month

    out: List[tuple[int, int]] = []
    for offset in range(6):
        raw_month = month + offset
        next_year = year + ((raw_month - 1) // 12)
        next_month = ((raw_month - 1) % 12) + 1
        out.append((next_year, next_month))

    return out


def _group_title_map(client: MondayClient) -> Dict[str, str]:
    groups = client.list_board_groups(board_id=MASTER_BOARD_ID)
    out: Dict[str, str] = {}

    for group in groups:
        group_id = _clean_str(group.get("id"))
        title = _clean_str(group.get("title"))
        if not group_id or not title:
            continue
        out[title] = group_id

    return out


def _list_jobs_for_group(
    client: MondayClient,
    *,
    group_id: str,
    month_numbers: List[int],
) -> List[Dict[str, Any]]:
    requested_column_ids = [MONTH_COLUMN_IDS[m] for m in month_numbers] + DETAIL_COLUMN_IDS
    return client.list_group_items_text_column_values(
        board_id=MASTER_BOARD_ID,
        group_id=group_id,
        column_ids=requested_column_ids,
        limit=500,
    )


def _note_item_ids(db: Session) -> set[str]:
    stmt = select(UpcomingPlanningNote.item_id)
    rows = db.execute(stmt).scalars().all()
    return {str(row).strip() for row in rows if str(row).strip()}


def _serialize_jobs(jobs: List[UpcomingPlanningJob]) -> dict[str, Any]:
    return {
        "jobs": [job.model_dump() for job in jobs],
    }


def _deserialize_jobs_payload(payload: Any) -> UpcomingPlanningJobsResponse:
    if not isinstance(payload, dict):
        return UpcomingPlanningJobsResponse(jobs=[])

    raw_jobs = payload.get("jobs")
    if not isinstance(raw_jobs, list):
        return UpcomingPlanningJobsResponse(jobs=[])

    jobs: List[UpcomingPlanningJob] = []
    for item in raw_jobs:
        if not isinstance(item, dict):
            continue
        try:
            jobs.append(UpcomingPlanningJob(**item))
        except Exception:
            continue

    return UpcomingPlanningJobsResponse(jobs=jobs)


def _build_jobs_payload(db: Session) -> UpcomingPlanningJobsResponse:
    client = _monday_client()
    target_months = _rolling_months()
    month_rank_map = {month_tuple: idx for idx, month_tuple in enumerate(target_months)}
    group_ids_by_title = _group_title_map(client)

    months_by_year: Dict[int, List[int]] = {}
    for year, month in target_months:
        months_by_year.setdefault(year, []).append(month)

    notes_item_ids = _note_item_ids(db)
    jobs_by_item_id: Dict[str, UpcomingPlanningJob] = {}
    sort_rank_by_item_id: Dict[str, int] = {}

    for year, months in months_by_year.items():
        group_id = group_ids_by_title.get(str(year))
        if not group_id:
            continue

        try:
            items = _list_jobs_for_group(client, group_id=group_id, month_numbers=months)
        except MondayAPIError as e:
            raise HTTPException(status_code=502, detail=str(e))

        for item in items:
            item_id = _clean_str(item.get("id"))
            item_name = _clean_str(item.get("name"))
            columns = item.get("columns") or {}

            if not item_id or not item_name or not isinstance(columns, dict):
                continue

            present_months: List[str] = []
            present_ranks: List[int] = []

            for month in months:
                column_id = MONTH_COLUMN_IDS[month]
                if _column_has_value(columns.get(column_id)):
                    present_months.append(MONTH_LABELS[month])
                    present_ranks.append(month_rank_map[(year, month)])

            if not present_months:
                continue

            current_rank = min(present_ranks)

            existing = jobs_by_item_id.get(item_id)
            if existing:
                merged_months = list(existing.months)
                for month_label in present_months:
                    if month_label not in merged_months:
                        merged_months.append(month_label)
                existing.months = merged_months
                sort_rank_by_item_id[item_id] = min(sort_rank_by_item_id.get(item_id, current_rank), current_rank)
                continue

            jobs_by_item_id[item_id] = UpcomingPlanningJob(
                itemId=item_id,
                itemName=item_name,
                months=present_months,
                jobNumber=_column_display(columns.get(JOB_NUMBER_COL_ID)) or None,
                address=_column_display(columns.get(ADDRESS_COL_ID)) or None,
                gc=_column_display(columns.get(GC_COL_ID)) or None,
                pm=_column_display(columns.get(PM_COL_ID)) or None,
                super=_column_display(columns.get(SUPER_COL_ID)) or None,
                superCell=_format_phone(_column_display(columns.get(SUPER_CELL_COL_ID))) or None,
                gcpm=_column_display(columns.get(GCPM_COL_ID)) or None,
                gcpmCell=_format_phone(_column_display(columns.get(GCPM_CELL_COL_ID))) or None,
                hasNote=item_id in notes_item_ids,
            )
            sort_rank_by_item_id[item_id] = current_rank

    jobs = list(jobs_by_item_id.values())
    jobs.sort(
        key=lambda job: (
            sort_rank_by_item_id.get(job.itemId, 999),
            (job.jobNumber or "").strip(),
            job.itemName.lower(),
            job.itemId,
        )
    )
    return UpcomingPlanningJobsResponse(jobs=jobs)


def _refresh_upcoming_planning_cache(db: Session) -> UpcomingPlanningJobsResponse:
    started = utc_now_iso()
    mark_cache_refresh_started(db, UPCOMING_PLANNING_CACHE_KEY)

    try:
        response = _build_jobs_payload(db)
        upsert_cache_record(
            db,
            cache_key=UPCOMING_PLANNING_CACHE_KEY,
            payload=_serialize_jobs(response.jobs),
            refresh_error=None,
            refresh_started_at=started,
            refresh_finished_at=utc_now_iso(),
        )
        return response
    except HTTPException as e:
        mark_cache_refresh_failed(db, UPCOMING_PLANNING_CACHE_KEY, str(e.detail))
        raise
    except Exception as e:
        mark_cache_refresh_failed(db, UPCOMING_PLANNING_CACHE_KEY, str(e))
        raise HTTPException(status_code=502, detail=f"Failed to refresh upcoming planning cache: {e}")


@router.get("/jobs", response_model=UpcomingPlanningJobsResponse)
def upcoming_planning_jobs(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    cached = get_cache_record(db, UPCOMING_PLANNING_CACHE_KEY)
    if cached is not None:
        return _deserialize_jobs_payload(cached.get("payload"))

    return _refresh_upcoming_planning_cache(db)


@router.post("/jobs/refresh", response_model=UpcomingPlanningJobsResponse)
def refresh_upcoming_planning_jobs(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    return _refresh_upcoming_planning_cache(db)


@router.get("/jobs/meta", response_model=UpcomingPlanningCacheMetaResponse)
def upcoming_planning_jobs_meta(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    cached = get_cache_record(db, UPCOMING_PLANNING_CACHE_KEY)
    if cached is None:
        return UpcomingPlanningCacheMetaResponse(
            cacheKey=UPCOMING_PLANNING_CACHE_KEY,
            updatedAt="",
            refreshStartedAt=None,
            refreshFinishedAt=None,
            refreshError=None,
            count=0,
        )

    payload = _deserialize_jobs_payload(cached.get("payload"))
    return UpcomingPlanningCacheMetaResponse(
        cacheKey=UPCOMING_PLANNING_CACHE_KEY,
        updatedAt=str(cached.get("updatedAt") or ""),
        refreshStartedAt=cached.get("refreshStartedAt"),
        refreshFinishedAt=cached.get("refreshFinishedAt"),
        refreshError=cached.get("refreshError"),
        count=len(payload.jobs),
    )


@router.get("/notes/{item_id}", response_model=UpcomingPlanningNoteResponse)
def get_upcoming_planning_note(
    item_id: str,
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    clean_item_id = str(item_id).strip()
    if not clean_item_id:
        raise HTTPException(status_code=400, detail="Missing item id")

    note = db.scalar(
        select(UpcomingPlanningNote).where(UpcomingPlanningNote.item_id == clean_item_id)
    )

    if note is None:
        return UpcomingPlanningNoteResponse(itemId=clean_item_id, noteText="", updatedAt=None)

    return UpcomingPlanningNoteResponse(
        itemId=note.item_id,
        noteText=note.note_text or "",
        updatedAt=note.updated_at.isoformat() if note.updated_at else None,
    )


@router.put("/notes/{item_id}", response_model=UpcomingPlanningNoteResponse)
def upsert_upcoming_planning_note(
    item_id: str,
    body: UpcomingPlanningNoteUpsertRequest,
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    clean_item_id = str(item_id).strip()
    if not clean_item_id:
        raise HTTPException(status_code=400, detail="Missing item id")

    note_text = body.noteText or ""

    note = db.scalar(
        select(UpcomingPlanningNote).where(UpcomingPlanningNote.item_id == clean_item_id)
    )

    now = datetime.now(timezone.utc)

    if note is None:
        note = UpcomingPlanningNote(
            item_id=clean_item_id,
            note_text=note_text,
            created_at=now,
            updated_at=now,
        )
    else:
        note.note_text = note_text
        note.updated_at = now

    db.add(note)
    db.commit()
    db.refresh(note)

    return UpcomingPlanningNoteResponse(
        itemId=note.item_id,
        noteText=note.note_text or "",
        updatedAt=note.updated_at.isoformat() if note.updated_at else None,
    )