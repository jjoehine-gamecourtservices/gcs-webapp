from __future__ import annotations

import json
import re
import threading
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks

from app.api.deps import get_current_user
from app.core.config import settings
from app.integrations.monday_client import MondayAPIError, MondayClient
from app.storage.job_store import JobStore

router = APIRouter()

MASTER_BOARD_ID = 7534384198
CONTACT_CELL_COLUMN_ID = "cell__1"

COLUMN_MAP: Dict[str, str] = {
    "item_name": "name",
    "job_number": "job_____1",
    "job_site_address": "location__1",
    "pss_install_date": "lookup_mktsdhsc",
    "gc": "gc__1",
    "gc_office_phone": "phone__1",
    "gc_address": "location_1__1",
    "architect": "text__1",
    "architect_address": "location2__1",
    "architect_phone": "phone5__1",
    "super": "connect_boards7__1",
    "super_phone": "mirror13__1",
    "gc_pm": "connect_boards19__1",
    "gc_pm_phone": "mirror8__1",
    "asst_gc_pm": "connect_boards17__1",
    "asst_gc_pm_phone": "mirror82__1",
    "pm": "people__1",
    "total_contract": "formula__1",
    "safety_checks": "badging_bkgrd_checks6__1",
    "retainage": "numbers02__1",
    "tax_exempt": "dropdown_mksn5mrb",
    "pm_mgmt_software": "dropdown1__1",
    "eom": "check1__1",
    "orientation": "check7__1",
    "safety_doc": "checkbox__1",
    "bg_check_type": "dropdown_Mjj5k7Iu",
    "safety": "text0__1",
    "safety_contact": "phone_mm191ag3",
    "ccip_ocip": "color_mknsadts",
    "bond": "color_mknsab9e",
    "certified_payroll": "status_mkn21ht5",
    "billing_software": "dropdown__1",
    "billing_date": "billing_date___1",
    "contract_log_item": "connect_boards2__1",
}

_COPY_SUFFIX_RE = re.compile(r"\s*\(copy.*?\)\s*$", re.IGNORECASE)
_WS_RE = re.compile(r"\s+")
_INVALID_FILENAME_CHARS_RE = re.compile(r'[\\/:*?"<>|]')
_MULTI_DASH_RE = re.compile(r"-{2,}")

_SYNC_LOCK = threading.Lock()
_SYNC_STATE: Dict[str, Any] = {
    "running": False,
    "started_at": None,
    "finished_at": None,
    "last_limit": None,
    "last_result": None,
    "last_error": None,
}


def _require_cron_token(x_gcs_cron_token: Optional[str]) -> None:
    expected = (settings.CRON_TOKEN or "").strip()
    if not expected:
        raise HTTPException(status_code=500, detail="Missing GCS_CRON_TOKEN (settings.CRON_TOKEN)")

    provided = (x_gcs_cron_token or "").strip()
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Invalid cron token")


def _normalize_limit(limit: int) -> int:
    if limit < 1:
        raise HTTPException(status_code=400, detail="limit must be >= 1")
    if limit > 500:
        return 500
    return limit


def normalize_item_name(name: str) -> str:
    if not name:
        return ""
    return _COPY_SUFFIX_RE.sub("", name).strip()


def normalize_job_number(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return ""
    s = _INVALID_FILENAME_CHARS_RE.sub("", s)
    s = _WS_RE.sub("-", s)
    s = _MULTI_DASH_RE.sub("-", s)
    s = s.strip("-")
    return s


def format_phone(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return ""

    digits = re.sub(r"\D", "", s)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]

    if len(digits) != 10:
        return ""

    return f"({digits[0:3]}) {digits[3:6]}-{digits[6:10]}"


def format_currency(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return ""

    cleaned = s.replace("$", "").replace(",", "").strip()
    if not cleaned:
        return ""

    try:
        amount = float(cleaned)
    except Exception:
        return ""

    return f"${amount:,.0f}"


def _safe_parse_json(raw: str) -> Any:
    s = (raw or "").strip()
    if not s:
        return None
    try:
        return json.loads(s)
    except Exception as e:
        return {"__parse_error__": str(e)}


def _safe_parse_json_nullable(raw: Any) -> Any:
    if raw is None:
        return None
    if isinstance(raw, (dict, list)):
        return raw
    return _safe_parse_json(str(raw))


def _write_job_json(job_number: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    safe_job_number = normalize_job_number(job_number)
    if not safe_job_number:
        raise HTTPException(status_code=400, detail="Missing/invalid job_number after normalization")

    try:
        return JobStore().write_job(safe_job_number, payload)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Job JSON write failed: {e}")


def _monday_client() -> MondayClient:
    return MondayClient(
        token=settings.MONDAY_API_TOKEN,
        api_url=settings.MONDAY_API_URL,
        timeout_seconds=settings.MONDAY_TIMEOUT_SECONDS,
    )


def _first_linked_item_id(board_relation_col: Optional[Dict[str, Any]]) -> str:
    if not board_relation_col:
        return ""
    ids = board_relation_col.get("linked_item_ids") or []
    if not isinstance(ids, list) or not ids:
        return ""
    first = ids[0]
    return str(first) if first is not None else ""


def _first_linked_item_name(board_relation_col: Optional[Dict[str, Any]]) -> str:
    if not board_relation_col:
        return ""
    items = board_relation_col.get("linked_items") or []
    if not isinstance(items, list) or not items:
        return ""
    first = items[0] or {}
    name = first.get("name")
    return str(name).strip() if name else ""


def _extract_contact_cell_raw(contact_cols: Dict[str, Any]) -> str:
    col = (contact_cols or {}).get(CONTACT_CELL_COLUMN_ID) or {}
    text = (col.get("text") or "").strip()
    if text:
        return text

    value_raw = col.get("value")
    parsed = _safe_parse_json_nullable(value_raw)

    if isinstance(parsed, dict):
        phone = (parsed.get("phone") or "").strip()
        if phone:
            return phone

    return ""


def _get_contact_cell_phone_formatted(client: MondayClient, contact_item_id: str) -> str:
    if not contact_item_id:
        return ""
    try:
        contact_cols = client.get_item_all_column_values(item_id=str(contact_item_id))
    except MondayAPIError:
        return ""
    raw = _extract_contact_cell_raw(contact_cols)
    return format_phone(raw)


def _get_display_value(all_cols: Dict[str, Any], column_id: str) -> str:
    col = (all_cols or {}).get(column_id) or {}
    return str(col.get("display_value") or "").strip()


def _build_master_payload_from_item_columns_text(
    *,
    item_name: str,
    item_cols_text: Dict[str, str],
) -> Dict[str, str]:
    normalized_name = normalize_item_name(item_name)
    out: Dict[str, str] = {}

    scalar_phone_fields = {"gc_office_phone", "architect_phone", "safety_contact"}

    for field_name, column_id in COLUMN_MAP.items():
        if field_name == "item_name":
            out[field_name] = normalized_name
            continue

        val = (item_cols_text.get(column_id) or "").strip()

        if field_name in scalar_phone_fields:
            val = format_phone(val)

        out[field_name] = val

    raw_job_number = (out.get("job_number") or "").strip()
    out["job_number"] = normalize_job_number(raw_job_number)

    return out


def _apply_display_value_overrides(payload: Dict[str, str], all_cols: Dict[str, Any]) -> None:
    pss_install_display = _get_display_value(all_cols, COLUMN_MAP["pss_install_date"])
    if pss_install_display:
        payload["pss_install_date"] = pss_install_display

    total_contract_display = _get_display_value(all_cols, COLUMN_MAP["total_contract"])
    if total_contract_display:
        payload["total_contract"] = format_currency(total_contract_display)


def _sync_master_json_internal(*, limit: int) -> Dict[str, Any]:
    limit = _normalize_limit(limit)

    client = _monday_client()

    column_ids: List[str] = []
    for _, cid in COLUMN_MAP.items():
        if cid and cid != "name":
            column_ids.append(cid)

    try:
        items = client.list_board_items_columns(
            board_id=MASTER_BOARD_ID,
            column_ids=column_ids,
            limit=limit,
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    relation_name_fields: Dict[str, str] = {
        "connect_boards7__1": "super",
        "connect_boards19__1": "gc_pm",
        "connect_boards17__1": "asst_gc_pm",
        "connect_boards2__1": "contract_log_item",
    }

    relation_phone_fields: Dict[str, str] = {
        "connect_boards7__1": "super_phone",
        "connect_boards19__1": "gc_pm_phone",
        "connect_boards17__1": "asst_gc_pm_phone",
    }

    results: List[Dict[str, Any]] = []

    for item in items:
        payload = _build_master_payload_from_item_columns_text(
            item_name=item.name,
            item_cols_text={cid: (item.columns.get(cid).text if item.columns.get(cid) else "") for cid in column_ids},
        )

        safe_job_number = (payload.get("job_number") or "").strip()
        if not safe_job_number:
            continue

        try:
            all_cols = client.get_item_all_column_values(item_id=str(item.id))
        except MondayAPIError:
            all_cols = {}

        _apply_display_value_overrides(payload, all_cols)

        for relation_col_id, name_field in relation_name_fields.items():
            relation_col = all_cols.get(relation_col_id) if all_cols else None
            payload[name_field] = _first_linked_item_name(relation_col)

        for relation_col_id, phone_field in relation_phone_fields.items():
            relation_col = all_cols.get(relation_col_id) if all_cols else None
            contact_id = _first_linked_item_id(relation_col)
            payload[phone_field] = _get_contact_cell_phone_formatted(client, contact_id) if contact_id else ""

        write_resp = _write_job_json(safe_job_number, payload)

        results.append(
            {
                "item_id": item.id,
                "job_number_raw": safe_job_number,
                "job_number": safe_job_number,
                "storage": write_resp,
            }
        )

    return {"synced_count": len(results), "jobs": results}


def _run_sync_in_background(limit: int) -> None:
    started = time.time()
    try:
        result = _sync_master_json_internal(limit=limit)
        _SYNC_STATE["last_result"] = {"synced_count": result.get("synced_count")}
        _SYNC_STATE["last_error"] = None
    except Exception as e:
        _SYNC_STATE["last_result"] = None
        _SYNC_STATE["last_error"] = str(e)
    finally:
        _SYNC_STATE["running"] = False
        _SYNC_STATE["finished_at"] = time.time()
        _SYNC_STATE["last_limit"] = limit
        _SYNC_STATE["started_at"] = started
        _SYNC_LOCK.release()


@router.post("/master-json/trigger-sync")
def trigger_sync_master_json(
    background_tasks: BackgroundTasks,
    limit: int = 35,
    x_gcs_cron_token: Optional[str] = Header(default=None, alias="X-GCS-CRON-TOKEN"),
):
    _require_cron_token(x_gcs_cron_token)

    limit = _normalize_limit(limit)

    acquired = _SYNC_LOCK.acquire(blocking=False)
    if not acquired:
        raise HTTPException(status_code=409, detail="Sync already running")

    _SYNC_STATE["running"] = True
    _SYNC_STATE["started_at"] = time.time()
    _SYNC_STATE["finished_at"] = None
    _SYNC_STATE["last_limit"] = limit
    _SYNC_STATE["last_result"] = None
    _SYNC_STATE["last_error"] = None

    background_tasks.add_task(_run_sync_in_background, limit)

    return {
        "status": "accepted",
        "running": True,
        "limit": limit,
    }


@router.post("/master-json/sync")
def sync_master_json(limit: int = 500, _current_user=Depends(get_current_user)):
    return _sync_master_json_internal(limit=limit)


@router.post("/master-json/sync-item/{item_id}")
def sync_master_json_item(item_id: str, _current_user=Depends(get_current_user)):
    client = _monday_client()

    try:
        basic = client.get_item_basic(str(item_id))
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    item_board_id = str(basic.get("board_id") or "").strip()
    if item_board_id != str(MASTER_BOARD_ID):
        raise HTTPException(
            status_code=400,
            detail=f"Item is not on master board. item_board_id={item_board_id} expected={MASTER_BOARD_ID}",
        )

    item_name = basic.get("name", "") or ""

    try:
        all_cols = client.get_item_all_column_values(item_id=str(item_id))
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    item_cols_text: Dict[str, str] = {}
    for _, cid in COLUMN_MAP.items():
        if cid and cid != "name":
            item_cols_text[cid] = (all_cols.get(cid, {}) or {}).get("text", "") or ""

    payload = _build_master_payload_from_item_columns_text(
        item_name=item_name,
        item_cols_text=item_cols_text,
    )

    _apply_display_value_overrides(payload, all_cols)

    relation_name_fields: Dict[str, str] = {
        "connect_boards7__1": "super",
        "connect_boards19__1": "gc_pm",
        "connect_boards17__1": "asst_gc_pm",
        "connect_boards2__1": "contract_log_item",
    }

    relation_phone_fields: Dict[str, str] = {
        "connect_boards7__1": "super_phone",
        "connect_boards19__1": "gc_pm_phone",
        "connect_boards17__1": "asst_gc_pm_phone",
    }

    for relation_col_id, name_field in relation_name_fields.items():
        relation_col = all_cols.get(relation_col_id)
        payload[name_field] = _first_linked_item_name(relation_col)

    for relation_col_id, phone_field in relation_phone_fields.items():
        relation_col = all_cols.get(relation_col_id)
        contact_id = _first_linked_item_id(relation_col)
        payload[phone_field] = _get_contact_cell_phone_formatted(client, contact_id) if contact_id else ""

    safe_job_number = (payload.get("job_number") or "").strip()
    if not safe_job_number:
        raise HTTPException(status_code=400, detail="Item missing/invalid job_number after normalization")

    write_resp = _write_job_json(safe_job_number, payload)

    return {
        "item_id": str(item_id),
        "job_number": safe_job_number,
        "payload": payload,
        "storage": write_resp,
    }


@router.get("/master-json/debug-item/{item_id}")
def debug_master_json_item(item_id: str, _current_user=Depends(get_current_user)):
    client = _monday_client()

    try:
        basic = client.get_item_basic(item_id)
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    debug_cols: Dict[str, str] = {
        "pss_install_date": "lookup_mktsdhsc",
        "total_contract": "formula__1",
        "contract_log_item": "connect_boards2__1",
        "super": "connect_boards7__1",
        "super_cell": "mirror13__1",
        "gc_pm": "connect_boards19__1",
        "gc_pm_cell": "mirror8__1",
        "asst_pm": "connect_boards17__1",
        "asst_pm_cell": "mirror82__1",
    }

    try:
        all_cols = client.get_item_all_column_values(item_id=item_id)
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    out_cols: Dict[str, Any] = {}

    for label, cid in debug_cols.items():
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
            "type": raw.get("type", ""),
            "text": raw.get("text", ""),
            "value_raw": raw.get("value", ""),
            "value_parsed": _safe_parse_json_nullable(raw.get("value")),
        }

        if "display_value" in raw:
            entry["display_value"] = raw.get("display_value", "")

        if raw.get("type") == "board_relation":
            entry["linked_item_ids"] = raw.get("linked_item_ids") or []
            entry["linked_items"] = raw.get("linked_items") or []

        out_cols[label] = entry

    item_board_id = str(basic.get("board_id") or "").strip()

    return {
        "expected_master_board_id": MASTER_BOARD_ID,
        "item_id": str(item_id),
        "item_name": basic.get("name", ""),
        "item_board_id": item_board_id,
        "item_on_master_board": item_board_id == str(MASTER_BOARD_ID),
        "debug_uses_all_columns": True,
        "columns": out_cols,
    }
