from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Set

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

router = APIRouter()

RENTALS_BOARD_ID = 7173069739
RENTALS_GROUP_ID = "rental_equipment__1"
RENTALS_STATUS_COL_ID = "status__1"
RENTALS_CACHE_KEY = "rentals"

DEBUG_COLUMN_IDS: Dict[str, str] = {
    "timeline": "timeline__1",
    "location": "location__1",
    "address_lookup": "lookup_mm1d2jf",
    "job_name": "connect_boards9__1",
    "job_number": "mirror0__1",
    "notes": "long_text2__1",
    "status": "status__1",
    "equipment_type": "text4__1",
    "size": "dropdown2__1",
    "company": "board_relation_mm1afdwj",
    "company_cell_contact": "lookup_mm1af12d",
    "drivetrain": "dropdown7__1",
    "delivery_time": "dropdown3__1",
    "delivery_contact": "connect_boards5qmdoa",
    "delivery_cell_contact": "lookup_mm1awbwt",
    "budget": "numbers4__1",
    "accessories": "dropdown82__1",
}

RENTALS_BULK_COLUMN_IDS: List[str] = [
    DEBUG_COLUMN_IDS["timeline"],
    DEBUG_COLUMN_IDS["location"],
    DEBUG_COLUMN_IDS["address_lookup"],
    DEBUG_COLUMN_IDS["job_name"],
    DEBUG_COLUMN_IDS["job_number"],
    DEBUG_COLUMN_IDS["notes"],
    DEBUG_COLUMN_IDS["status"],
    DEBUG_COLUMN_IDS["equipment_type"],
    DEBUG_COLUMN_IDS["size"],
    DEBUG_COLUMN_IDS["company"],
    DEBUG_COLUMN_IDS["company_cell_contact"],
    DEBUG_COLUMN_IDS["drivetrain"],
    DEBUG_COLUMN_IDS["delivery_time"],
    DEBUG_COLUMN_IDS["delivery_contact"],
    DEBUG_COLUMN_IDS["delivery_cell_contact"],
    DEBUG_COLUMN_IDS["budget"],
    DEBUG_COLUMN_IDS["accessories"],
]

RENTALS_ACTION_READ_COLUMN_IDS: List[str] = [
    DEBUG_COLUMN_IDS["job_name"],
    DEBUG_COLUMN_IDS["status"],
]


class RentalActionRequest(BaseModel):
    action: str


class RentalActionResponse(BaseModel):
    ok: bool
    itemId: str
    action: str
    previousStatus: str
    newStatus: str
    itemName: str


class RentalsResponse(BaseModel):
    rentals: List[Dict[str, Any]]
    count: int


class RentalsCacheMetaResponse(BaseModel):
    cacheKey: str
    updatedAt: str
    refreshStartedAt: str | None = None
    refreshFinishedAt: str | None = None
    refreshError: str | None = None
    count: int


_ALLOWED_TRANSITIONS: Dict[str, Dict[str, Any]] = {
    "reserved_from_not_yet_reserved": {
        "from_statuses": {"not yet reserved"},
        "to_status": "Reserved",
    },
    "reserved_from_cancelled": {
        "from_statuses": {"cancelled"},
        "to_status": "Reserved",
    },
    "cancel": {
        "from_statuses": {"reserved"},
        "to_status": "Cancelled",
    },
    "on_rent": {
        "from_statuses": {"reserved"},
        "to_status": "ON Rent",
    },
    "off_rent": {
        "from_statuses": {"on rent"},
        "to_status": "OFF Rent",
    },
}


def _monday_client() -> MondayClient:
    return MondayClient(
        token=settings.MONDAY_API_TOKEN,
        api_url=settings.MONDAY_API_URL,
        timeout_seconds=settings.MONDAY_TIMEOUT_SECONDS,
    )


def _safe_parse_json_nullable(raw: Any) -> Any:
    if raw is None:
        return None
    if isinstance(raw, (dict, list)):
        return raw
    s = str(raw).strip()
    if not s:
        return None
    try:
        return json.loads(s)
    except Exception as e:
        return {"__parse_error__": str(e), "__raw__": s}


def _clean_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _first_linked_item_name(col: Optional[Dict[str, Any]]) -> str:
    if not col:
        return ""
    items = col.get("linked_items") or []
    if not isinstance(items, list) or not items:
        return ""
    first = items[0] or {}
    return _clean_str(first.get("name"))


def _display_value(col: Optional[Dict[str, Any]]) -> str:
    if not col:
        return ""
    return _clean_str(col.get("display_value"))


def _text_value(col: Optional[Dict[str, Any]]) -> str:
    if not col:
        return ""
    return _clean_str(col.get("text"))


def _timeline_range_text(col: Optional[Dict[str, Any]]) -> str:
    if not col:
        return ""

    parsed = _safe_parse_json_nullable(col.get("value"))
    if isinstance(parsed, dict):
        start = _clean_str(parsed.get("from"))
        end = _clean_str(parsed.get("to"))
        if start and end:
            return f"{start} - {end}"
        if start:
            return start
        if end:
            return end

    return _text_value(col)


def _location_address(col: Optional[Dict[str, Any]]) -> str:
    if not col:
        return ""

    parsed = _safe_parse_json_nullable(col.get("value"))
    if isinstance(parsed, dict):
        address = _clean_str(parsed.get("address"))
        if address:
            return address

    return _text_value(col)


def _rental_address(address_lookup_col: Optional[Dict[str, Any]], location_col: Optional[Dict[str, Any]]) -> str:
    lookup_address = _display_value(address_lookup_col)
    if lookup_address:
        return lookup_address

    lookup_text = _text_value(address_lookup_col)
    if lookup_text:
        return lookup_text

    return _location_address(location_col)


def _extract_long_text(col: Optional[Dict[str, Any]]) -> str:
    if not col:
        return ""

    parsed = _safe_parse_json_nullable(col.get("value"))
    if isinstance(parsed, dict):
        text = _clean_str(parsed.get("text"))
        if text:
            return text

    return _text_value(col)


def _normalize_status(text: str) -> str:
    raw = _clean_str(text)
    if not raw:
        return ""

    lowered = raw.lower()
    if lowered == "not yet on rent":
        return "Not Yet Reserved"

    return raw


def _canonical_status(text: str) -> str:
    return _normalize_status(text).strip().lower()


def _build_job_pm_map() -> Dict[str, str]:
    try:
        jobs = FileGatewayJobsClient().fetch_all_jobs()
    except Exception:
        return {}

    out: Dict[str, str] = {}
    for job in jobs:
        job_number = _clean_str(job.get("jobNumber"))
        pm = _clean_str(job.get("pm"))
        if job_number and job_number not in out:
            out[job_number] = pm
    return out


def _derive_job_name_for_rename(item_name: str, linked_job_name: str) -> str:
    linked = _clean_str(linked_job_name)
    if linked:
        return linked

    raw = _clean_str(item_name)
    prefix = "Rental - "
    if raw.startswith(prefix):
        remainder = raw[len(prefix):]
        if " - " in remainder:
            return remainder.rsplit(" - ", 1)[0].strip()

    return ""


def _build_rental_item_name(job_name: str, status_text: str) -> str:
    return f"Rental - {_clean_str(job_name)} - {_clean_str(status_text)}"


def _serialize_rentals_payload(rentals: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "rentals": rentals,
        "count": len(rentals),
    }


def _deserialize_rentals_payload(payload: Any) -> RentalsResponse:
    if not isinstance(payload, dict):
        return RentalsResponse(rentals=[], count=0)

    raw_rentals = payload.get("rentals")
    if not isinstance(raw_rentals, list):
        raw_rentals = []

    rentals: List[Dict[str, Any]] = []
    for item in raw_rentals:
        if isinstance(item, dict):
            rentals.append(item)

    count = payload.get("count")
    if not isinstance(count, int):
        count = len(rentals)

    return RentalsResponse(rentals=rentals, count=count)


def _build_rentals_payload() -> RentalsResponse:
    client = _monday_client()
    pm_by_job_number = _build_job_pm_map()

    try:
        items = client.list_group_items_column_values(
            board_id=RENTALS_BOARD_ID,
            group_id=RENTALS_GROUP_ID,
            column_ids=RENTALS_BULK_COLUMN_IDS,
            limit=100,
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    rentals_out: List[Dict[str, Any]] = []

    for item in items:
        item_id = _clean_str(item.get("id"))
        item_name = _clean_str(item.get("name"))
        all_cols = item.get("columns") if isinstance(item.get("columns"), dict) else {}

        if not item_id:
            continue

        timeline_col = all_cols.get(DEBUG_COLUMN_IDS["timeline"])
        location_col = all_cols.get(DEBUG_COLUMN_IDS["location"])
        address_lookup_col = all_cols.get(DEBUG_COLUMN_IDS["address_lookup"])
        job_name_col = all_cols.get(DEBUG_COLUMN_IDS["job_name"])
        job_number_col = all_cols.get(DEBUG_COLUMN_IDS["job_number"])
        notes_col = all_cols.get(DEBUG_COLUMN_IDS["notes"])
        status_col = all_cols.get(DEBUG_COLUMN_IDS["status"])
        equipment_type_col = all_cols.get(DEBUG_COLUMN_IDS["equipment_type"])
        size_col = all_cols.get(DEBUG_COLUMN_IDS["size"])
        company_col = all_cols.get(DEBUG_COLUMN_IDS["company"])
        company_cell_col = all_cols.get(DEBUG_COLUMN_IDS["company_cell_contact"])
        drivetrain_col = all_cols.get(DEBUG_COLUMN_IDS["drivetrain"])
        delivery_time_col = all_cols.get(DEBUG_COLUMN_IDS["delivery_time"])
        delivery_contact_col = all_cols.get(DEBUG_COLUMN_IDS["delivery_contact"])
        delivery_cell_col = all_cols.get(DEBUG_COLUMN_IDS["delivery_cell_contact"])
        budget_col = all_cols.get(DEBUG_COLUMN_IDS["budget"])
        accessories_col = all_cols.get(DEBUG_COLUMN_IDS["accessories"])

        job_name = _first_linked_item_name(job_name_col)
        job_number = _display_value(job_number_col)
        pm = pm_by_job_number.get(job_number, "") if job_number else ""

        rentals_out.append(
            {
                "id": item_id,
                "itemName": item_name,
                "jobName": job_name,
                "jobNumber": job_number,
                "address": _rental_address(address_lookup_col, location_col),
                "pm": pm,
                "dateRange": _timeline_range_text(timeline_col),
                "notes": _extract_long_text(notes_col),
                "status": _normalize_status(_text_value(status_col)),
                "equipmentType": _text_value(equipment_type_col),
                "size": _text_value(size_col),
                "company": _first_linked_item_name(company_col),
                "companyCellContact": _display_value(company_cell_col),
                "drivetrain": _text_value(drivetrain_col),
                "deliveryTime": _text_value(delivery_time_col),
                "deliveryContact": _first_linked_item_name(delivery_contact_col),
                "deliveryCellContact": _display_value(delivery_cell_col),
                "budget": _text_value(budget_col),
                "accessories": _text_value(accessories_col),
            }
        )

    rentals_out.sort(key=lambda r: ((_clean_str(r.get("dateRange")) or "9999-99-99"), _clean_str(r.get("jobName"))))
    return RentalsResponse(rentals=rentals_out, count=len(rentals_out))


def _refresh_rentals_cache(db: Session) -> RentalsResponse:
    started = utc_now_iso()
    mark_cache_refresh_started(db, RENTALS_CACHE_KEY)

    try:
        response = _build_rentals_payload()
        upsert_cache_record(
            db,
            cache_key=RENTALS_CACHE_KEY,
            payload=_serialize_rentals_payload(response.rentals),
            refresh_error=None,
            refresh_started_at=started,
            refresh_finished_at=utc_now_iso(),
        )
        return response
    except HTTPException as e:
        mark_cache_refresh_failed(db, RENTALS_CACHE_KEY, str(e.detail))
        raise
    except Exception as e:
        mark_cache_refresh_failed(db, RENTALS_CACHE_KEY, str(e))
        raise HTTPException(status_code=502, detail=f"Failed to refresh rentals cache: {e}")


def _patch_rentals_cache_after_action(
    db: Session,
    *,
    item_id: str,
    new_status: str,
    new_item_name: str,
) -> None:
    cached = get_cache_record(db, RENTALS_CACHE_KEY)
    if cached is None:
        return

    payload = cached.get("payload")
    normalized = _deserialize_rentals_payload(payload)
    changed = False

    for rental in normalized.rentals:
        if _clean_str(rental.get("id")) != _clean_str(item_id):
            continue
        rental["status"] = new_status
        rental["itemName"] = new_item_name
        changed = True
        break

    if not changed:
        return

    upsert_cache_record(
        db,
        cache_key=RENTALS_CACHE_KEY,
        payload=_serialize_rentals_payload(normalized.rentals),
        refresh_error=None,
        refresh_started_at=cached.get("refreshStartedAt"),
        refresh_finished_at=utc_now_iso(),
    )


@router.get("/debug-list")
def rentals_debug_list(limit: int = 25, _current_user=Depends(get_current_user)):
    client = _monday_client()

    if limit < 1:
        raise HTTPException(status_code=400, detail="limit must be >= 1")
    if limit > 100:
        limit = 100

    try:
        items = client.list_group_items_column_values(
            board_id=RENTALS_BOARD_ID,
            group_id=RENTALS_GROUP_ID,
            column_ids=RENTALS_BULK_COLUMN_IDS,
            limit=limit,
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "board_id": RENTALS_BOARD_ID,
        "group_id": RENTALS_GROUP_ID,
        "count": len(items),
        "items": [{"id": item.get("id", ""), "name": item.get("name", "")} for item in items],
    }


@router.get("/debug-item/{item_id}")
def rentals_debug_item(item_id: str, _current_user=Depends(get_current_user)):
    client = _monday_client()

    try:
        basic = client.get_item_basic(item_id)
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    item_board_id = str(basic.get("board_id") or "").strip()
    if item_board_id != str(RENTALS_BOARD_ID):
        raise HTTPException(
            status_code=400,
            detail=f"Item is not on rentals board. item_board_id={item_board_id} expected={RENTALS_BOARD_ID}",
        )

    try:
        all_cols = client.get_item_all_column_values(item_id=item_id)
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    out_cols: Dict[str, Any] = {}

    for label, cid in DEBUG_COLUMN_IDS.items():
        raw = all_cols.get(cid)

        if not raw:
            out_cols[label] = {
                "column_id": cid,
                "exists_on_item": False,
            }
            continue

        entry: Dict[str, Any] = {
            "column_id": cid,
            "exists_on_item": True,
            "type": (raw.get("type") or "").strip(),
            "text": raw.get("text", ""),
            "value_raw": raw.get("value", ""),
            "value_parsed": _safe_parse_json_nullable(raw.get("value")),
        }

        if "display_value" in raw:
            entry["display_value"] = raw.get("display_value", "")

        if "linked_item_ids" in raw:
            entry["linked_item_ids"] = raw.get("linked_item_ids") or []

        if "linked_items" in raw:
            entry["linked_items"] = raw.get("linked_items") or []

        out_cols[label] = entry

    return {
        "expected_rentals_board_id": RENTALS_BOARD_ID,
        "expected_group_id": RENTALS_GROUP_ID,
        "item_id": str(item_id),
        "item_name": basic.get("name", ""),
        "item_board_id": item_board_id,
        "item_on_rentals_board": item_board_id == str(RENTALS_BOARD_ID),
        "debug_uses_all_columns": True,
        "columns": out_cols,
    }


@router.post("/{item_id}/action", response_model=RentalActionResponse)
def rental_action(
    item_id: str,
    payload: RentalActionRequest,
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    client = _monday_client()

    action = _clean_str(payload.action).lower()
    if not action:
        raise HTTPException(status_code=400, detail="Missing action")

    try:
        cols = client.get_item_columns(
            item_id=item_id,
            column_ids=RENTALS_ACTION_READ_COLUMN_IDS,
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    status_col = cols.get(DEBUG_COLUMN_IDS["status"])
    job_name_col = cols.get(DEBUG_COLUMN_IDS["job_name"])

    current_status_text = _normalize_status(_text_value(status_col))
    current_status_key = _canonical_status(current_status_text)

    transition_key = action
    if action == "reserved":
        if current_status_key == "cancelled":
            transition_key = "reserved_from_cancelled"
        else:
            transition_key = "reserved_from_not_yet_reserved"

    transition = _ALLOWED_TRANSITIONS.get(transition_key)
    if not transition:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")

    allowed_from: Set[str] = set(transition["from_statuses"])
    target_status = _clean_str(transition["to_status"])

    if current_status_key not in allowed_from:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Invalid transition for action '{action}'. "
                f"Current status is '{current_status_text or '-'}'."
            ),
        )

    linked_job_name = _first_linked_item_name(job_name_col)
    cached = get_cache_record(db, RENTALS_CACHE_KEY)
    cached_payload = _deserialize_rentals_payload(cached.get("payload")) if cached is not None else RentalsResponse(rentals=[], count=0)

    cached_item_name = ""
    for rental in cached_payload.rentals:
        if _clean_str(rental.get("id")) == _clean_str(item_id):
            cached_item_name = _clean_str(rental.get("itemName"))
            break

    job_name_for_rename = _derive_job_name_for_rename(cached_item_name, linked_job_name)
    if not job_name_for_rename:
        raise HTTPException(
            status_code=400,
            detail="Could not determine job name needed to rename the Monday item.",
        )

    new_item_name = _build_rental_item_name(job_name_for_rename, target_status)

    try:
        client.change_simple_column_value(
            board_id=RENTALS_BOARD_ID,
            item_id=item_id,
            column_id=RENTALS_STATUS_COL_ID,
            value=target_status,
        )
        client.change_item_name(
            board_id=RENTALS_BOARD_ID,
            item_id=item_id,
            new_name=new_item_name,
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    try:
        _patch_rentals_cache_after_action(
            db,
            item_id=str(item_id),
            new_status=target_status,
            new_item_name=new_item_name,
        )
    except Exception:
        pass

    return RentalActionResponse(
        ok=True,
        itemId=str(item_id),
        action=action,
        previousStatus=current_status_text,
        newStatus=target_status,
        itemName=new_item_name,
    )


@router.get("", response_model=RentalsResponse)
def list_rentals(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    cached = get_cache_record(db, RENTALS_CACHE_KEY)
    if cached is not None:
        return _deserialize_rentals_payload(cached.get("payload"))

    return _refresh_rentals_cache(db)


@router.post("/refresh", response_model=RentalsResponse)
def refresh_rentals(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    return _refresh_rentals_cache(db)


@router.get("/meta", response_model=RentalsCacheMetaResponse)
def rentals_meta(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    cached = get_cache_record(db, RENTALS_CACHE_KEY)
    if cached is None:
        return RentalsCacheMetaResponse(
            cacheKey=RENTALS_CACHE_KEY,
            updatedAt="",
            refreshStartedAt=None,
            refreshFinishedAt=None,
            refreshError=None,
            count=0,
        )

    payload = _deserialize_rentals_payload(cached.get("payload"))
    return RentalsCacheMetaResponse(
        cacheKey=RENTALS_CACHE_KEY,
        updatedAt=str(cached.get("updatedAt") or ""),
        refreshStartedAt=cached.get("refreshStartedAt"),
        refreshFinishedAt=cached.get("refreshFinishedAt"),
        refreshError=cached.get("refreshError"),
        count=payload.count,
    )