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
from app.integrations.file_gateway_client import safe_fetch_job_card_fields
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

EMPLOYEE_BOARD_ID = 7099018002
EMPLOYEE_PHONE_COL_ID = "cell__1"

_VALID_EVENT_RE = re.compile(r"^\s*[^@]+@\s*.+$")

MAX_UNIQUE_GATEWAY_FETCHES = 50
EXCLUDED_STATUS_TEXT = "Game Court Emp."

UPCOMING_JOBS_CACHE_KEY = "upcoming_jobs"


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
    try:
        parts = text.split(",") if "," in text else text.split(" - ")
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
    trimmed = text.strip()
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


def _has_gateway_job_card_data(fields: Dict[str, Optional[str]]) -> bool:
    return any(
        (fields.get(key) or "").strip()
        for key in (
            "jobName",
            "address",
            "generalContractor",
            "gcpm",
            "gcpmContact",
            "super",
            "superContact",
            "pm",
        )
    )


def _build_upcoming_jobs_payload(client: MondayClient) -> UpcomingJobsResponse:
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
        installer_items = client.list_board_jobs_basic(
            board_id=MAIN_BOARD_ID,
            job_column_id="Installer",
            limit=200,
        )

        timeline_items = client.list_board_jobs_basic(
            board_id=MAIN_BOARD_ID,
            job_column_id=TIMELINE_COL_ID,
            limit=200,
        )

        job_number_items = client.list_board_jobs_basic(
            board_id=MAIN_BOARD_ID,
            job_column_id=JOB_NUMBER_COL_ID,
            limit=200,
        )

        status_items = client.list_board_jobs_basic(
            board_id=MAIN_BOARD_ID,
            job_column_id=STATUS_COL_ID,
            limit=200,
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    timeline_map: Dict[str, str] = {t.id: (t.job_number or "").strip() for t in timeline_items}
    job_number_map: Dict[str, str] = {j.id: (j.job_number or "").strip() for j in job_number_items}
    status_map: Dict[str, str] = {s.id: (s.job_number or "").strip() for s in status_items}

    gateway_cache: Dict[str, Dict[str, Optional[str]]] = {}
    gateway_fetches = 0

    jobs_out: List[UpcomingJob] = []

    for inst in installer_items:
        item_name = inst.name or ""
        if not is_valid_event_name(item_name):
            continue

        status_text = status_map.get(inst.id, "").strip()
        if status_text == EXCLUDED_STATUS_TEXT:
            continue

        timeline_text = timeline_map.get(inst.id, "")
        start_d, end_d = parse_timeline_column(timeline_text)
        if not start_d or not end_d or end_d < today:
            continue

        installer_names = parse_installer_names_left_of_at(item_name)
        if not installer_names:
            continue

        parsed_job_name = parse_job_name_right_of_at(item_name)
        if not parsed_job_name:
            continue

        first = first_name_from_installer_list(installer_names).lower()
        contact = employee_phone_by_first.get(first, "None")

        job_number = job_number_map.get(inst.id, "").strip()
        if not job_number:
            continue

        cached = gateway_cache.get(job_number)
        if cached is None:
            if gateway_fetches < MAX_UNIQUE_GATEWAY_FETCHES:
                gateway_fetches += 1
                cached = safe_fetch_job_card_fields(job_number)
            else:
                cached = {
                    "jobName": None,
                    "address": None,
                    "generalContractor": None,
                    "gcpm": None,
                    "gcpmContact": None,
                    "super": None,
                    "superContact": None,
                    "pm": None,
                }
            gateway_cache[job_number] = cached

        if not _has_gateway_job_card_data(cached):
            continue

        card_job_name = parsed_job_name
        if cached.get("jobName"):
            card_job_name = str(cached["jobName"])

        address = cached.get("address")
        gc = cached.get("generalContractor")
        gcpm = cached.get("gcpm")
        gcpm_contact = cached.get("gcpmContact")
        job_super = cached.get("super")
        super_contact = cached.get("superContact")
        pm = cached.get("pm")

        jobs_out.append(
            UpcomingJob(
                id=inst.id,
                jobName=card_job_name,
                jobNumber=job_number,
                address=address,
                generalContractor=gc,
                gcpm=gcpm,
                gcpmContact=gcpm_contact,
                super=job_super,
                superContact=super_contact,
                pm=pm,
                installer=installer_names,
                installerContact=contact,
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
        response = _build_upcoming_jobs_payload(client)
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