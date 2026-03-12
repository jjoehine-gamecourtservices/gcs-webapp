from __future__ import annotations

import json
import re
import threading
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from app.api.deps import get_current_user
from app.core.config import settings
from app.integrations.monday_client import MondayAPIError, MondayClient

router = APIRouter()

# Master board where jobs live
MASTER_BOARD_ID = 7534384198

# Contact board "Cell" phone column ID (VERIFIED)
CONTACT_CELL_COLUMN_ID = "cell__1"

# -----------------------------
# Column Mapping (EASY TO EXTEND)
# -----------------------------
# NOTE: keys are your JSON field names, values are Monday column IDs.
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
    "asst_gc_pm_phone": "mirror82__1",  # mirror is NOT trusted in sync; overridden via contact lookup
    "pm": "people__1",  # GCS internal PM (People column; uses .text which is the display name)
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

# -----------------------------
# Helpers
# -----------------------------
_COPY_SUFFIX_RE = re.compile(r"\s*\(copy.*?\)\s*$", re.IGNORECASE)
_WS_RE = re.compile(r"\s+")
_INVALID_FILENAME_CHARS_RE = re.compile(r'[\\/:*?"<>|]')
_MULTI_DASH_RE = re.compile(r"-{2,}")

# -----------------------------
# Background sync guard/state
# -----------------------------
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
    """
    Auth for scheduler calls. This avoids relying on session cookies in Windows Task Scheduler.
    """
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
    """
    Produce a safe, stable filename stem and URL path segment.

    Rules:
    - Trim ends
    - Remove Windows-invalid filename characters: \\/:*?"<>|
    - Convert whitespace runs to '-'
    - Collapse repeated '-' to a single '-'
    - Strip leading/trailing '-'
    """
    s = (raw or "").strip()
    if not s:
        return ""

    s = _INVALID_FILENAME_CHARS_RE.sub("", s)
    s = _WS_RE.sub("-", s)
    s = _MULTI_DASH_RE.sub("-", s)
    s = s.strip("-")

    return s


def format_phone(raw: str) -> str:
    """
    Normalize phone to (###) ###-#### when possible.
    - Accepts raw digits, or formatted strings.
    - If 11 digits starting with '1', trims the leading '1'.
    - Returns "" if not a clean 10-digit US number.
    """
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
    """
    Normalize numeric values to whole-dollar currency formatting.
    Examples:
    - "303283" -> "$303,283"
    - "303283.00" -> "$303,283"
    - "$303,283" -> "$303,283"
    Returns "" if value is blank or not parseable as a number.
    """
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
    """
    Like _safe_parse_json, but accepts None and non-str safely.
    Monday often returns None for value/value_raw.
    """
    if raw is None:
        return None
    if isinstance(raw, (dict, list)):
        return raw
    return _safe_parse_json(str(raw))


def write_job_json_to_gateway(job_number: str, payload: Any) -> Dict[str, Any]:
    base = (settings.FILE_GATEWAY_URL or "").strip()
    token = (settings.FILE_GATEWAY_TOKEN or "").strip()

    if not base:
        raise HTTPException(status_code=500, detail="Missing GCS_FILE_GATEWAY_URL (settings.FILE_GATEWAY_URL)")
    if not token:
        raise HTTPException(status_code=500, detail="Missing GCS_FILE_GATEWAY_TOKEN (settings.FILE_GATEWAY_TOKEN)")

    job_number = normalize_job_number(job_number)
    if not job_number:
        raise HTTPException(status_code=400, detail="Missing/invalid job_number after normalization")

    url = base.rstrip("/") + f"/jobs/{job_number}"
    body = json.dumps(payload, indent=2, ensure_ascii=False).encode("utf-8")

    req = Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-GCS-Gateway-Token": token,
        },
        method="PUT",
    )

    try:
        with urlopen(req, timeout=30) as resp:
            raw_resp = resp.read().decode("utf-8", errors="replace")
    except HTTPError as e:
        try:
            msg = e.read().decode("utf-8", errors="replace")
        except Exception:
            msg = str(e)
        raise HTTPException(status_code=502, detail=f"Gateway HTTP {getattr(e, 'code', '?')}: {msg}")
    except URLError as e:
        raise HTTPException(status_code=502, detail=f"Gateway network error: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gateway request failed: {e}")

    try:
        return json.loads(raw_resp) if raw_resp else {"ok": True}
    except Exception:
        return {"ok": True, "raw": raw_resp}


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
    """
    For board_relation columns, monday reliably provides the linked item names
    via linked_items (from BoardRelationValue fragment).
    """
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
    """
    Build payload using the same COLUMN_MAP keys, sourcing values from:
    - item_cols_text[column_id] (already .text)
    - item_name for item_name

    NOTE:
    - board_relation name fields are overridden later using linked_items.
    - board_relation fields that should store linked item names are overridden later.
    - mirror/formula columns that need display_value are overridden later using all_cols.
    """
    normalized_name = normalize_item_name(item_name)
    out: Dict[str, str] = {}

    SCALAR_PHONE_FIELDS = {"gc_office_phone", "architect_phone", "safety_contact"}

    for field_name, column_id in COLUMN_MAP.items():
        if field_name == "item_name":
            out[field_name] = normalized_name
            continue

        val = (item_cols_text.get(column_id) or "").strip()

        if field_name in SCALAR_PHONE_FIELDS:
            val = format_phone(val)

        out[field_name] = val

    raw_job_number = (out.get("job_number") or "").strip()
    out["job_number"] = normalize_job_number(raw_job_number)

    return out


def _apply_display_value_overrides(payload: Dict[str, str], all_cols: Dict[str, Any]) -> None:
    """
    Some Monday column types expose the usable value in display_value rather than text.
    Apply those overrides here after all_cols has been fetched.
    """
    pss_install_display = _get_display_value(all_cols, COLUMN_MAP["pss_install_date"])
    if pss_install_display:
        payload["pss_install_date"] = pss_install_display

    total_contract_display = _get_display_value(all_cols, COLUMN_MAP["total_contract"])
    if total_contract_display:
        payload["total_contract"] = format_currency(total_contract_display)


def _sync_master_json_internal(*, limit: int) -> Dict[str, Any]:
    """
    Internal sync implementation used by:
    - /master-json/sync (interactive)
    - /master-json/trigger-sync (background)
    """
    limit = _normalize_limit(limit)

    client = _monday_client()

    # We do NOT include "name" in column_ids; item.name comes separately.
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

    RELATION_NAME_FIELDS: Dict[str, str] = {
        "connect_boards7__1": "super",
        "connect_boards19__1": "gc_pm",
        "connect_boards17__1": "asst_gc_pm",
        "connect_boards2__1": "contract_log_item",
    }

    RELATION_PHONE_FIELDS: Dict[str, str] = {
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

        for relation_col_id, name_field in RELATION_NAME_FIELDS.items():
            relation_col = all_cols.get(relation_col_id) if all_cols else None
            payload[name_field] = _first_linked_item_name(relation_col)

        for relation_col_id, phone_field in RELATION_PHONE_FIELDS.items():
            relation_col = all_cols.get(relation_col_id) if all_cols else None
            contact_id = _first_linked_item_id(relation_col)
            payload[phone_field] = _get_contact_cell_phone_formatted(client, contact_id) if contact_id else ""

        gateway_resp = write_job_json_to_gateway(safe_job_number, payload)

        results.append(
            {
                "item_id": item.id,
                "job_number_raw": safe_job_number,
                "job_number": safe_job_number,
                "gateway": gateway_resp,
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
    """
    Scheduler-safe endpoint:
    - Auth via X-GCS-CRON-TOKEN (matches GCS_CRON_TOKEN env var)
    - Returns immediately (202-like semantics via response body)
    - Runs sync in a background task
    - Prevents overlap with a lock (returns 409 if already running)
    """
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
    """
    Full-board sync.

    Scalars:
    - list_board_items_columns() and .text values.

    Relation names + phones:
    - No mirror dependency.
    - Uses get_item_all_column_values() per item:
      - names from board_relation linked_items[0].name
      - phones from contact cell__1 via linked_item_ids[0]

    Mirror/display fields:
    - Uses display_value where Monday does not populate text.

    limit:
    - Optional query param to batch the run: /master-json/sync?limit=25
    - Defaults to 500 (existing behavior).
    """
    return _sync_master_json_internal(limit=limit)


@router.post("/master-json/sync-item/{item_id}")
def sync_master_json_item(item_id: str, _current_user=Depends(get_current_user)):
    """
    Single-item sync harness (correctness-first).

    Uses:
    - get_item_basic() for item name + board_id validation
    - get_item_all_column_values() for per-column .text/display_value and board_relation linked_item_ids/linked_items
    - relation names from linked_items[0].name
    - phones from contact cell__1 (NO mirror dependency)
    - gateway write
    """
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

    RELATION_NAME_FIELDS: Dict[str, str] = {
        "connect_boards7__1": "super",
        "connect_boards19__1": "gc_pm",
        "connect_boards17__1": "asst_gc_pm",
        "connect_boards2__1": "contract_log_item",
    }

    RELATION_PHONE_FIELDS: Dict[str, str] = {
        "connect_boards7__1": "super_phone",
        "connect_boards19__1": "gc_pm_phone",
        "connect_boards17__1": "asst_gc_pm_phone",
    }

    for relation_col_id, name_field in RELATION_NAME_FIELDS.items():
        relation_col = all_cols.get(relation_col_id)
        payload[name_field] = _first_linked_item_name(relation_col)

    for relation_col_id, phone_field in RELATION_PHONE_FIELDS.items():
        relation_col = all_cols.get(relation_col_id)
        contact_id = _first_linked_item_id(relation_col)
        payload[phone_field] = _get_contact_cell_phone_formatted(client, contact_id) if contact_id else ""

    safe_job_number = (payload.get("job_number") or "").strip()
    if not safe_job_number:
        raise HTTPException(status_code=400, detail="Item missing/invalid job_number after normalization")

    gateway_resp = write_job_json_to_gateway(safe_job_number, payload)

    return {
        "item_id": str(item_id),
        "job_number": safe_job_number,
        "payload": payload,
        "gateway": gateway_resp,
    }


@router.get("/master-json/debug-item/{item_id}")
def debug_master_json_item(item_id: str, _current_user=Depends(get_current_user)):
    """
    Inspection-only endpoint.

    This endpoint is intentionally verbose and shows:
    - board_relation: linked_item_ids + linked_items
    - mirror/formula: display_value

    This is the proper way to inspect connected/mirror/formula columns in monday.com.
    """
    client = _monday_client()

    try:
        basic = client.get_item_basic(item_id)
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    DEBUG_COLS: Dict[str, str] = {
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

    for label, cid in DEBUG_COLS.items():
        raw = all_cols.get(cid)

        if not raw:
            out_cols[label] = {
                "column_id": cid,
                "exists_on_item": False,
            }
            continue

        col_type = (raw.get("type") or "").strip()

        entry: Dict[str, Any] = {
            "column_id": cid,
            "exists_on_item": True,
            "type": col_type,
            "text": raw.get("text", ""),
            "value_raw": raw.get("value", ""),
            "value_parsed": _safe_parse_json_nullable(raw.get("value")),
        }

        if "display_value" in raw:
            entry["display_value"] = raw.get("display_value", "")

        if col_type == "board_relation":
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