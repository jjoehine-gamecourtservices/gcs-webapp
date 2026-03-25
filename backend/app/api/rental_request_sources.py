from __future__ import annotations

import json
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.config import settings
from app.integrations.file_gateway_jobs_client import FileGatewayJobsClient
from app.integrations.monday_client import MondayAPIError, MondayClient
from app.services.rental_request_options_store import RentalRequestOptionsStore

router = APIRouter()

EMPLOYEE_BOARD_ID = 7099018002
JOBS_BOARD_ID = 7534384198

CONTACT_GROUP_ID = "new_group34863__1"
COMPANY_GROUP_ID = "group_mkyp2mq1"

DELIVERY_OPTIONS = [
    "AM",
    "Early AM by 8",
    "PM",
    "PM First Run",
    "Pre-Delivery",
    "10AM",
    "None",
]

SIZE_OPTIONS = [
    "Wide",
    "Narrow",
    "No Preference",
]

DRIVETRAIN_OPTIONS = [
    "Drivable",
    "Towable",
    "Push Around",
    "No Preference",
]


class SourceOption(BaseModel):
    id: str
    label: str
    sublabel: str | None = None
    phone: str | None = None
    address: str | None = None


class RentalRequestSourcesResponse(BaseModel):
    jobs: List[SourceOption]
    people: List[SourceOption]
    deliveryOptions: List[SourceOption]
    equipmentTypes: List[SourceOption]
    sizeOptions: List[SourceOption]
    drivetrainOptions: List[SourceOption]
    accessories: List[SourceOption]
    contacts: List[SourceOption]
    companies: List[SourceOption]


class ManagedOptionCreateRequest(BaseModel):
    label: str


class ManagedOptionUpdateRequest(BaseModel):
    oldLabel: str
    newLabel: str


class ManagedOptionDeleteRequest(BaseModel):
    label: str


class ManagedOptionsResponse(BaseModel):
    options: List[SourceOption]


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


def _query_groups_items_basic(
    *,
    client: MondayClient,
    board_id: int,
    group_ids: List[str],
    limit: int = 500,
) -> List[Dict[str, str]]:
    ids_json = json.dumps(group_ids)

    query = f"""
    query {{
      boards(ids: {int(board_id)}) {{
        groups(ids: {ids_json}) {{
          id
          title
          items_page(limit: {int(limit)}) {{
            items {{
              id
              name
            }}
          }}
        }}
      }}
    }}
    """

    data = client._post_graphql(query)

    boards = data.get("boards") or []
    if not boards:
        return []

    groups = (boards[0] or {}).get("groups") or []
    if not groups:
        return []

    out: List[Dict[str, str]] = []

    for group in groups:
        items_page = (group or {}).get("items_page") or {}
        items = items_page.get("items") or []

        for item in items:
            out.append(
                {
                    "id": _clean_str(item.get("id")),
                    "name": _clean_str(item.get("name")),
                }
            )

    return out


def _query_account_users_basic(*, client: MondayClient, limit: int = 500) -> List[Dict[str, str]]:
    query = f"""
    query {{
      users(limit: {int(limit)}) {{
        id
        name
        email
      }}
    }}
    """

    data = client._post_graphql(query)
    users = data.get("users") or []

    out: List[Dict[str, str]] = []

    for user in users:
        user_id = _clean_str(user.get("id"))
        name = _clean_str(user.get("name"))
        email = _clean_str(user.get("email"))

        if not user_id or not name:
            continue

        out.append(
            {
                "id": user_id,
                "name": name,
                "email": email,
            }
        )

    return out


def _dedupe_options(options: List[SourceOption]) -> List[SourceOption]:
    seen = set()
    out: List[SourceOption] = []

    for option in options:
        key = (
            option.label.strip().lower(),
            (option.phone or "").strip().lower(),
            (option.sublabel or "").strip().lower(),
        )
        if not option.label.strip():
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(option)

    out.sort(key=lambda x: x.label.lower())
    return out


def _list_to_options(values: List[str], prefix: str) -> List[SourceOption]:
    out: List[SourceOption] = []

    for idx, value in enumerate(values, start=1):
        label = _clean_str(value)
        if not label:
            continue
        out.append(SourceOption(id=f"{prefix}-{idx}", label=label))

    return _dedupe_options(out)


def _load_jobs(client: MondayClient) -> List[SourceOption]:
    try:
        jobs = FileGatewayJobsClient().fetch_all_jobs()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to load jobs from gateway: {e}")

    try:
        monday_job_items = client.list_board_items_basic(board_id=JOBS_BOARD_ID, limit=500)
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    monday_item_id_by_name: Dict[str, str] = {}
    for item in monday_job_items:
        item_id = _clean_str(item.get("id"))
        item_name = _clean_str(item.get("name"))
        if not item_id or not item_name:
            continue
        lowered = item_name.lower()
        if lowered not in monday_item_id_by_name:
            monday_item_id_by_name[lowered] = item_id

    out: List[SourceOption] = []

    for job in jobs:
        job_number = _clean_str(job.get("jobNumber"))
        job_name = _clean_str(job.get("jobName"))
        address = _clean_str(job.get("address"))

        if not job_name:
            continue

        relation_item_id = monday_item_id_by_name.get(job_name.lower())
        option_id = relation_item_id or f"job-number:{job_number or job_name}"

        out.append(
            SourceOption(
                id=option_id,
                label=job_name,
                sublabel=job_number or None,
                address=address or None,
            )
        )

    return _dedupe_options(out)


def _load_people(client: MondayClient) -> List[SourceOption]:
    try:
        users = _query_account_users_basic(client=client, limit=500)
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    out = [
        SourceOption(
            id=_clean_str(user.get("id")),
            label=_clean_str(user.get("name")),
            sublabel=_clean_str(user.get("email")) or None,
        )
        for user in users
        if _clean_str(user.get("id")) and _clean_str(user.get("name"))
    ]

    return _dedupe_options(out)


def _load_contacts(client: MondayClient) -> List[SourceOption]:
    try:
        items = _query_groups_items_basic(
            client=client,
            board_id=EMPLOYEE_BOARD_ID,
            group_ids=[CONTACT_GROUP_ID],
            limit=500,
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    out = [
        SourceOption(
            id=_clean_str(item.get("id")),
            label=_clean_str(item.get("name")),
        )
        for item in items
        if _clean_str(item.get("name"))
    ]

    return _dedupe_options(out)


def _load_companies(client: MondayClient) -> List[SourceOption]:
    try:
        items = _query_groups_items_basic(
            client=client,
            board_id=EMPLOYEE_BOARD_ID,
            group_ids=[COMPANY_GROUP_ID],
            limit=500,
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    out = [
        SourceOption(
            id=_clean_str(item.get("id")),
            label=_clean_str(item.get("name")),
        )
        for item in items
        if _clean_str(item.get("name"))
    ]

    return _dedupe_options(out)


@router.get("", response_model=RentalRequestSourcesResponse)
def rental_request_sources(_current_user=Depends(get_current_user)):
    client = _monday_client()
    store = RentalRequestOptionsStore()

    return RentalRequestSourcesResponse(
        jobs=_load_jobs(client),
        people=_load_people(client),
        deliveryOptions=_list_to_options(DELIVERY_OPTIONS, "delivery"),
        equipmentTypes=_list_to_options(store.list_equipment_types(), "equipment"),
        sizeOptions=_list_to_options(SIZE_OPTIONS, "size"),
        drivetrainOptions=_list_to_options(DRIVETRAIN_OPTIONS, "drivetrain"),
        accessories=_list_to_options(store.list_accessories(), "accessory"),
        contacts=_load_contacts(client),
        companies=_load_companies(client),
    )


@router.get("/equipment-types", response_model=ManagedOptionsResponse)
def list_equipment_types(_current_user=Depends(get_current_user)):
    store = RentalRequestOptionsStore()
    return ManagedOptionsResponse(options=_list_to_options(store.list_equipment_types(), "equipment"))


@router.post("/equipment-types", response_model=ManagedOptionsResponse)
def add_equipment_type(payload: ManagedOptionCreateRequest, _current_user=Depends(get_current_user)):
    label = _clean_str(payload.label)
    if not label:
        raise HTTPException(status_code=400, detail="Label is required")

    store = RentalRequestOptionsStore()
    options = _list_to_options(store.add_equipment_type(label), "equipment")
    return ManagedOptionsResponse(options=options)


@router.put("/equipment-types", response_model=ManagedOptionsResponse)
def update_equipment_type(payload: ManagedOptionUpdateRequest, _current_user=Depends(get_current_user)):
    old_label = _clean_str(payload.oldLabel)
    new_label = _clean_str(payload.newLabel)

    if not old_label or not new_label:
        raise HTTPException(status_code=400, detail="oldLabel and newLabel are required")

    store = RentalRequestOptionsStore()
    options = _list_to_options(store.update_equipment_type(old_label, new_label), "equipment")
    return ManagedOptionsResponse(options=options)


@router.delete("/equipment-types", response_model=ManagedOptionsResponse)
def delete_equipment_type(payload: ManagedOptionDeleteRequest, _current_user=Depends(get_current_user)):
    label = _clean_str(payload.label)
    if not label:
        raise HTTPException(status_code=400, detail="Label is required")

    store = RentalRequestOptionsStore()
    options = _list_to_options(store.delete_equipment_type(label), "equipment")
    return ManagedOptionsResponse(options=options)


@router.get("/accessories", response_model=ManagedOptionsResponse)
def list_accessories(_current_user=Depends(get_current_user)):
    store = RentalRequestOptionsStore()
    return ManagedOptionsResponse(options=_list_to_options(store.list_accessories(), "accessory"))


@router.post("/accessories", response_model=ManagedOptionsResponse)
def add_accessory(payload: ManagedOptionCreateRequest, _current_user=Depends(get_current_user)):
    label = _clean_str(payload.label)
    if not label:
        raise HTTPException(status_code=400, detail="Label is required")

    store = RentalRequestOptionsStore()
    options = _list_to_options(store.add_accessory(label), "accessory")
    return ManagedOptionsResponse(options=options)


@router.put("/accessories", response_model=ManagedOptionsResponse)
def update_accessory(payload: ManagedOptionUpdateRequest, _current_user=Depends(get_current_user)):
    old_label = _clean_str(payload.oldLabel)
    new_label = _clean_str(payload.newLabel)

    if not old_label or not new_label:
        raise HTTPException(status_code=400, detail="oldLabel and newLabel are required")

    store = RentalRequestOptionsStore()
    options = _list_to_options(store.update_accessory(old_label, new_label), "accessory")
    return ManagedOptionsResponse(options=options)


@router.delete("/accessories", response_model=ManagedOptionsResponse)
def delete_accessory(payload: ManagedOptionDeleteRequest, _current_user=Depends(get_current_user)):
    label = _clean_str(payload.label)
    if not label:
        raise HTTPException(status_code=400, detail="Label is required")

    store = RentalRequestOptionsStore()
    options = _list_to_options(store.delete_accessory(label), "accessory")
    return ManagedOptionsResponse(options=options)