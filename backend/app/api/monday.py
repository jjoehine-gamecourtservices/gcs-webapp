from __future__ import annotations

import re
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.config import settings
from app.integrations.file_gateway_client import safe_fetch_job_card_fields
from app.integrations.monday_client import MondayAPIError, MondayClient

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


class UpcomingJob(BaseModel):
    id: str

    # Card fields
    jobName: str
    jobNumber: str = ""
    address: Optional[str] = None
    generalContractor: Optional[str] = None
    gcpm: Optional[str] = None
    gcpmContact: Optional[str] = None
    pm: Optional[str] = None

    # Existing fields (do not touch behavior)
    installer: str = "None"
    installerContact: str = "None"
    startDate: Optional[str] = None
    endDate: Optional[str] = None


class UpcomingJobsResponse(BaseModel):
    jobs: List[UpcomingJob]


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


@router.get("/upcoming-jobs", response_model=UpcomingJobsResponse)
def upcoming_jobs(_current_user=Depends(get_current_user)):
    client = MondayClient(
        token=settings.MONDAY_API_TOKEN,
        api_url=settings.MONDAY_API_URL,
        timeout_seconds=settings.MONDAY_TIMEOUT_SECONDS,
    )

    today = date.today()

    # Employee lookup (best-effort; never fail the endpoint)
    try:
        employee_items = client.list_board_jobs_basic(
            board_id=EMPLOYEE_BOARD_ID,
            job_column_id=EMPLOYEE_PHONE_COL_ID,
            limit=500,
        )
        employee_phone_by_first = build_employee_phone_map(employee_items)
    except MondayAPIError:
        employee_phone_by_first = {}

    # Core Monday pulls (fail the endpoint if these die)
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

    # Per-request cache to avoid N+1 duplicate gateway calls
    gateway_cache: Dict[str, Dict[str, Optional[str]]] = {}
    gateway_fetches = 0

    jobs_out: List[UpcomingJob] = []

    for inst in installer_items:
        item_name = inst.name or ""
        if not is_valid_event_name(item_name):
            continue

        # Exclude internal employee items by Monday status
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

        first = first_name_from_installer_list(installer_names).lower()
        contact = employee_phone_by_first.get(first, "None")

        job_number = job_number_map.get(inst.id, "")

        # Default card fields (fallbacks)
        card_job_name = item_name
        address = None
        gc = None
        gcpm = None
        gcpm_contact = None
        pm = None

        # Enrich from gateway only when we have a job number
        if job_number:
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
                        "pm": None,
                    }
                gateway_cache[job_number] = cached

            # Apply whitelist fields (never crash)
            if cached.get("jobName"):
                card_job_name = str(cached["jobName"])
            address = cached.get("address")
            gc = cached.get("generalContractor")
            gcpm = cached.get("gcpm")
            gcpm_contact = cached.get("gcpmContact")
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