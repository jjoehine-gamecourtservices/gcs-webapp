from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import db_dependency
from app.integrations.file_gateway_jobs_client import FileGatewayJobsClient
from app.integrations.monday_client import MondayAPIError, MondayClient
from app.services.app_cache import (
    get_cache_record,
    mark_cache_refresh_failed,
    mark_cache_refresh_started,
    upsert_cache_record,
    utc_now_iso,
)
from app.services.rental_quote_vendors import list_rental_quote_vendors

router = APIRouter()

MAIN_BOARD_ID = 7173069739
TIMELINE_COL_ID = "timeline__1"
JOB_NUMBER_COL_ID = "mirror0__1"
STATUS_COL_ID = "status"
INSTALLER_COL_ID = "Installer"

EMPLOYEE_BOARD_ID = 7099018002
EMPLOYEE_PHONE_COL_ID = "cell__1"

ALL_JOBS_CACHE_KEY = "all_jobs"
UPCOMING_JOBS_CACHE_KEY = "upcoming_jobs"

_VALID_EVENT_RE = re.compile(r"^\s*[^@]+@\s*.+$")
EXCLUDED_STATUS_TEXT = "Game Court Emp."

UPCOMING_JOBS_BULK_COLUMN_IDS: List[str] = [
    INSTALLER_COL_ID,
    TIMELINE_COL_ID,
    JOB_NUMBER_COL_ID,
    STATUS_COL_ID,
]


class UpcomingJob(BaseModel):
    id: str
    jobName: str
    jobNumber: str = ""
    address: Optional[str] = None
    generalContractor: Optional[str] = None
    gcpm: Optional[str] = None
    gcpmContact: Optional[str] = None
    super: Optional[str] = None
    superContact: Optional[str] = None
    pm: Optional[str] = None
    installer: str = "None"
    installerContact: str = "None"
    startDate: Optional[str] = None
    endDate: Optional[str] = None


class UpcomingJobsResponse(BaseModel):
    jobs: List[UpcomingJob]


class UpcomingJobsCacheMetaResponse(BaseModel):
    cacheKey: str
    updatedAt: str
    refreshStartedAt: str | None = None
    refreshFinishedAt: str | None = None
    refreshError: str | None = None
    count: int


class RentalQuoteVendor(BaseModel):
    id: str
    name: str
    email: str


class RentalQuoteVendorsResponse(BaseModel):
    vendors: List[RentalQuoteVendor]


def parse_timeline_column(text: str) -> Tuple[Optional[date], Optional[date]]:
    if not text:
        return None, None

    raw = str(text).strip()
    if not raw:
        return None, None

    try:
        if "," in raw:
            parts = raw.split(",", 1)
        else:
            parts = raw.split(" - ", 1)

        start_str = parts[0].strip()
        end_str = parts[1].strip() if len(parts) > 1 else start_str

        start = datetime.strptime(start_str, "%Y-%m-%d").date()
        end = datetime.strptime(end_str, "%Y-%m-%d").date()
        return start, end
    except Exception:
        return None, None


def is_valid_event_name(item_name: str) -> bool:
    if not item_name:
        return False
    return bool(_VALID_EVENT_RE.match(item_name))


def parse_installer_names_left_of_at(item_name: str) -> str:
    if not item_name or "@" not in item_name:
        return ""
    left, _ = item_name.split("@", 1)
    return left.strip()


def parse_job_name_right_of_at(item_name: str) -> str:
    if not item_name or "@" not in item_name:
        return ""
    _, right = item_name.split("@", 1)
    job_part = right.strip()
    if not job_part:
        return ""

    if " - " in job_part:
        job_part = job_part.split(" - ", 1)[0].strip()

    return job_part


def first_name_from_installer_list(names_left: str) -> str:
    if not names_left:
        return ""
    return names_left.split("&", 1)[0].strip()


def format_phone(text: str) -> str:
    if not text:
        return "None"

    digits = re.sub(r"\D", "", text)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]

    if len(digits) == 10:
        return f"({digits[0:3]}) {digits[3:6]}-{digits[6:10]}"

    trimmed = str(text).strip()
    return trimmed if trimmed else "None"


def build_employee_phone_map(employee_items_basic) -> Dict[str, str]:
    out: Dict[str, str] = {}

    for it in employee_items_basic:
        full_name = (it.name or "").strip()
        if not full_name:
            continue

        first = full_name.split(" ", 1)[0].strip().lower()
        if not first:
            continue

        phone_raw = (it.job_number or "").strip()
        if first not in out:
            out[first] = format_phone(phone_raw)

    return out


def bucket_date(start_d: date, today: date) -> date:
    return today if start_d < today else start_d


def _clean_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _monday_client() -> MondayClient:
    return MondayClient(
        token=settings.MONDAY_API_TOKEN,
        api_url=settings.MONDAY_API_URL,
        timeout_seconds=settings.MONDAY_TIMEOUT_SECONDS,
    )


def _serialize_jobs(jobs: List[UpcomingJob]) -> dict[str, Any]:
    return {
        "jobs": [job.model_dump() for job in jobs],
    }


def _deserialize_jobs_payload(payload: Any) -> UpcomingJobsResponse:
    if not isinstance(payload, dict):
        return UpcomingJobsResponse(jobs=[])

    raw_jobs = payload.get("jobs")
    if not isinstance(raw_jobs, list):
        return UpcomingJobsResponse(jobs=[])

    jobs: List[UpcomingJob] = []
    for item in raw_jobs:
        if not isinstance(item, dict):
            continue
        try:
            jobs.append(UpcomingJob(**item))
        except Exception:
            continue

    return UpcomingJobsResponse(jobs=jobs)


def _build_all_jobs_map_from_payload(payload: Any) -> Dict[str, Dict[str, Any]]:
    if not isinstance(payload, dict):
        return {}

    raw_jobs = payload.get("jobs")
    if not isinstance(raw_jobs, list):
        return {}

    out: Dict[str, Dict[str, Any]] = {}

    for item in raw_jobs:
        if not isinstance(item, dict):
            continue

        job_number = _clean_str(item.get("jobNumber"))
        if not job_number:
            continue

        if job_number not in out:
            out[job_number] = item

    return out


def _build_gateway_job_map_from_all_jobs_cache(db: Session) -> Dict[str, Dict[str, Any]]:
    cached = get_cache_record(db, ALL_JOBS_CACHE_KEY)
    if cached is None:
        return {}

    return _build_all_jobs_map_from_payload(cached.get("payload"))


def _build_gateway_job_map_with_fallback(db: Session) -> Dict[str, Dict[str, Any]]:
    cached_map = _build_gateway_job_map_from_all_jobs_cache(db)
    if cached_map:
        return cached_map

    try:
        return FileGatewayJobsClient().fetch_all_jobs_map()
    except Exception:
        return {}


def _build_upcoming_jobs_payload(db: Session, client: MondayClient) -> UpcomingJobsResponse:
    today = date.today()

    try:
        employee_items = client.list_board_jobs_basic(
            board_id=EMPLOYEE_BOARD_ID,
            job_column_id=EMPLOYEE_PHONE_COL_ID,
            limit=500,
        )
        employee_phone_by_first = build_employee_phone_map(employee_items)
    except MondayAPIError:
        employee_phone_by_first = {}

    try:
        items = client.list_board_items_columns(
            board_id=MAIN_BOARD_ID,
            column_ids=UPCOMING_JOBS_BULK_COLUMN_IDS,
            limit=200,
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    gateway_jobs_by_number = _build_gateway_job_map_with_fallback(db)
    jobs_out: List[UpcomingJob] = []

    for item in items:
        item_name = _clean_str(item.name)
        if not is_valid_event_name(item_name):
            continue

        cols = item.columns or {}

        installer_text = _clean_str(cols.get(INSTALLER_COL_ID).text if cols.get(INSTALLER_COL_ID) else "")
        timeline_text = _clean_str(cols.get(TIMELINE_COL_ID).text if cols.get(TIMELINE_COL_ID) else "")
        job_number = _clean_str(cols.get(JOB_NUMBER_COL_ID).text if cols.get(JOB_NUMBER_COL_ID) else "")
        status_text = _clean_str(cols.get(STATUS_COL_ID).text if cols.get(STATUS_COL_ID) else "")

        if status_text == EXCLUDED_STATUS_TEXT:
            continue

        start_d, end_d = parse_timeline_column(timeline_text)
        if not start_d or not end_d or end_d < today:
            continue

        installer_names = installer_text or parse_installer_names_left_of_at(item_name)
        if not installer_names:
            continue

        if not job_number:
            continue

        gateway_job = gateway_jobs_by_number.get(job_number)
        if not gateway_job:
            continue

        card_job_name = _clean_str(gateway_job.get("jobName")) or parse_job_name_right_of_at(item_name)
        if not card_job_name:
            continue

        first = first_name_from_installer_list(installer_names).lower()
        installer_contact = employee_phone_by_first.get(first, "None")

        jobs_out.append(
            UpcomingJob(
                id=_clean_str(item.id),
                jobName=card_job_name,
                jobNumber=job_number,
                address=_clean_str(gateway_job.get("address")) or None,
                generalContractor=_clean_str(gateway_job.get("generalContractor")) or None,
                gcpm=_clean_str(gateway_job.get("gcpm")) or None,
                gcpmContact=_clean_str(gateway_job.get("gcpmContact")) or None,
                super=_clean_str(gateway_job.get("super")) or None,
                superContact=_clean_str(gateway_job.get("superContact")) or None,
                pm=_clean_str(gateway_job.get("pm")) or None,
                installer=installer_names,
                installerContact=installer_contact,
                startDate=start_d.isoformat(),
                endDate=end_d.isoformat(),
            )
        )

    def sort_key(j: UpcomingJob):
        s = datetime.strptime(j.startDate, "%Y-%m-%d").date() if j.startDate else date.max
        e = datetime.strptime(j.endDate, "%Y-%m-%d").date() if j.endDate else date.max
        b = bucket_date(s, today)
        return (b, s, e, j.jobName or "")

    jobs_out.sort(key=sort_key)
    return UpcomingJobsResponse(jobs=jobs_out)


def _refresh_upcoming_jobs_cache(db: Session) -> UpcomingJobsResponse:
    client = _monday_client()
    started = utc_now_iso()
    mark_cache_refresh_started(db, UPCOMING_JOBS_CACHE_KEY)

    try:
        response = _build_upcoming_jobs_payload(db, client)
        upsert_cache_record(
            db,
            cache_key=UPCOMING_JOBS_CACHE_KEY,
            payload=_serialize_jobs(response.jobs),
            refresh_error=None,
            refresh_started_at=started,
            refresh_finished_at=utc_now_iso(),
        )
        return response
    except HTTPException as e:
        mark_cache_refresh_failed(db, UPCOMING_JOBS_CACHE_KEY, str(e.detail))
        raise
    except Exception as e:
        mark_cache_refresh_failed(db, UPCOMING_JOBS_CACHE_KEY, str(e))
        raise HTTPException(status_code=502, detail=f"Failed to refresh upcoming jobs cache: {e}")


@router.get("/upcoming-jobs", response_model=UpcomingJobsResponse)
def upcoming_jobs(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    cached = get_cache_record(db, UPCOMING_JOBS_CACHE_KEY)
    if cached is not None:
        return _deserialize_jobs_payload(cached.get("payload"))

    return _refresh_upcoming_jobs_cache(db)


@router.post("/upcoming-jobs/refresh", response_model=UpcomingJobsResponse)
def refresh_upcoming_jobs(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    return _refresh_upcoming_jobs_cache(db)


@router.get("/upcoming-jobs/meta", response_model=UpcomingJobsCacheMetaResponse)
def upcoming_jobs_meta(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    cached = get_cache_record(db, UPCOMING_JOBS_CACHE_KEY)
    if cached is None:
        return UpcomingJobsCacheMetaResponse(
            cacheKey=UPCOMING_JOBS_CACHE_KEY,
            updatedAt="",
            refreshStartedAt=None,
            refreshFinishedAt=None,
            refreshError=None,
            count=0,
        )

    payload = _deserialize_jobs_payload(cached.get("payload"))
    return UpcomingJobsCacheMetaResponse(
        cacheKey=UPCOMING_JOBS_CACHE_KEY,
        updatedAt=str(cached.get("updatedAt") or ""),
        refreshStartedAt=cached.get("refreshStartedAt"),
        refreshFinishedAt=cached.get("refreshFinishedAt"),
        refreshError=cached.get("refreshError"),
        count=len(payload.jobs),
    )


@router.get("/rental-quote-vendors", response_model=RentalQuoteVendorsResponse)
def rental_quote_vendors(
    _current_user=Depends(get_current_user),
):
    try:
        vendors = list_rental_quote_vendors()
        return RentalQuoteVendorsResponse(
            vendors=[RentalQuoteVendor(**vendor) for vendor in vendors]
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))