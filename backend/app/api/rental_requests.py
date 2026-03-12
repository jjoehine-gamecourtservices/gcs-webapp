from __future__ import annotations

import re
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.config import settings
from app.integrations.monday_client import MondayAPIError, MondayClient

router = APIRouter()

RENTALS_BOARD_ID = 7173069739
RENTALS_GROUP_ID = "rental_equipment__1"

JOB_RELATION_COL_ID = "connect_boards9__1"
TIMELINE_COL_ID = "timeline__1"
STATUS_COL_ID = "status__1"
EQUIPMENT_TYPE_COL_ID = "text4__1"
SIZE_COL_ID = "dropdown2__1"
COMPANY_COL_ID = "board_relation_mm1afdwj"
DRIVETRAIN_COL_ID = "dropdown7__1"
DELIVERY_TIME_COL_ID = "dropdown3__1"
DELIVERY_CONTACT_COL_ID = "connect_boards5qmdoa"
BUDGET_COL_ID = "numbers4__1"
ACCESSORIES_COL_ID = "dropdown82__1"

DEFAULT_STATUS = "Not Yet Reserved"


class RentalRequestCreateRequest(BaseModel):
    jobId: str
    jobName: str
    address: str = ""
    peopleIds: List[str]
    dateStart: str
    dateEnd: str
    delivery: str
    equipmentType: str
    size: str | None = None
    drivetrain: str | None = None
    accessories: List[str] = []
    contactId: str
    companyId: str | None = None
    budget: str = ""


class RentalRequestCreateResponse(BaseModel):
    ok: bool
    itemId: str
    itemName: str


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


def _require_nonempty(value: str, label: str) -> str:
    text = _clean_str(value)
    if not text:
        raise HTTPException(status_code=400, detail=f"{label} is required")
    return text


def _to_int_id(value: str, label: str) -> int:
    text = _clean_str(value)
    if not text.isdigit():
        raise HTTPException(status_code=400, detail=f"{label} is invalid")
    return int(text)


def _optional_label(value: str | None) -> str:
    return _clean_str(value)


def _clean_budget(value: str) -> str:
    raw = _clean_str(value)
    if not raw:
        return ""
    return re.sub(r"[^0-9.\-]", "", raw)


def _build_item_name(job_name: str) -> str:
    return f"Rental - {_clean_str(job_name)} - {DEFAULT_STATUS}"


@router.post("", response_model=RentalRequestCreateResponse)
def create_rental_request(payload: RentalRequestCreateRequest, _current_user=Depends(get_current_user)):
    client = _monday_client()

    job_id = _to_int_id(payload.jobId, "Job")
    job_name = _require_nonempty(payload.jobName, "Job")
    contact_id = _to_int_id(payload.contactId, "Contact")

    if not payload.peopleIds:
        raise HTTPException(status_code=400, detail="At least one person is required")

    date_start = _require_nonempty(payload.dateStart, "Date Start")
    date_end = _require_nonempty(payload.dateEnd, "Date End")
    delivery = _require_nonempty(payload.delivery, "Delivery")
    equipment_type = _require_nonempty(payload.equipmentType, "Equipment Type")

    company_id: int | None = None
    if _clean_str(payload.companyId):
        company_id = _to_int_id(str(payload.companyId), "Company")

    item_name = _build_item_name(job_name)

    column_values: Dict[str, Any] = {
        STATUS_COL_ID: {"label": DEFAULT_STATUS},
        JOB_RELATION_COL_ID: {"item_ids": [job_id]},
        TIMELINE_COL_ID: {
            "from": date_start,
            "to": date_end,
        },
        DELIVERY_TIME_COL_ID: {"labels": [delivery]},
        EQUIPMENT_TYPE_COL_ID: equipment_type,
        DELIVERY_CONTACT_COL_ID: {"item_ids": [contact_id]},
    }

    size = _optional_label(payload.size)
    if size:
        column_values[SIZE_COL_ID] = {"labels": [size]}

    drivetrain = _optional_label(payload.drivetrain)
    if drivetrain:
        column_values[DRIVETRAIN_COL_ID] = {"labels": [drivetrain]}

    accessories = [_clean_str(x) for x in (payload.accessories or []) if _clean_str(x)]
    if accessories:
        column_values[ACCESSORIES_COL_ID] = {"labels": accessories}

    if company_id is not None:
        column_values[COMPANY_COL_ID] = {"item_ids": [company_id]}

    budget = _clean_budget(payload.budget)
    if budget:
        column_values[BUDGET_COL_ID] = budget

    try:
        created_id = client.create_item(
            board_id=RENTALS_BOARD_ID,
            group_id=RENTALS_GROUP_ID,
            item_name=item_name,
            column_values=column_values,
            create_labels_if_missing=True,
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return RentalRequestCreateResponse(
        ok=True,
        itemId=created_id,
        itemName=item_name,
    )