from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import db_dependency
from app.models.user import User
from app.models.user_job_prefs import UserJobPrefs

router = APIRouter()


class JobPrefsOut(BaseModel):
    recent_job_numbers: list[str] = Field(default_factory=list)
    pinned_job_numbers: list[str] = Field(default_factory=list)


class JobPrefsIn(BaseModel):
    recent_job_numbers: list[str] = Field(default_factory=list)
    pinned_job_numbers: list[str] = Field(default_factory=list)


def _ensure_list_of_strings(value: Any, field_name: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise HTTPException(status_code=400, detail=f"{field_name} must be a list")
    out: list[str] = []
    for v in value:
        if v is None:
            continue
        if not isinstance(v, str):
            raise HTTPException(status_code=400, detail=f"{field_name} entries must be strings")
        s = v.strip()
        if not s:
            continue
        out.append(s)
    return out


def _parse_json_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except Exception:
        return []
    return _ensure_list_of_strings(data, "stored_list")


def _dump_json_list(values: list[str]) -> str:
    # compact, stable
    return json.dumps(values, separators=(",", ":"))


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for v in values:
        if v in seen:
            continue
        seen.add(v)
        out.append(v)
    return out


@router.get("", response_model=JobPrefsOut)
def get_job_prefs(
    db: Session = Depends(db_dependency),
    current_user: User = Depends(get_current_user),
):
    prefs = db.scalar(select(UserJobPrefs).where(UserJobPrefs.user_id == current_user.id))
    if not prefs:
        return JobPrefsOut(recent_job_numbers=[], pinned_job_numbers=[])

    return JobPrefsOut(
        recent_job_numbers=_parse_json_list(prefs.recent_job_numbers),
        pinned_job_numbers=_parse_json_list(prefs.pinned_job_numbers),
    )


@router.put("", response_model=JobPrefsOut)
def put_job_prefs(
    payload: JobPrefsIn,
    db: Session = Depends(db_dependency),
    current_user: User = Depends(get_current_user),
):
    # Sanitize input
    recent = _ensure_list_of_strings(payload.recent_job_numbers, "recent_job_numbers")
    pinned = _ensure_list_of_strings(payload.pinned_job_numbers, "pinned_job_numbers")

    # Enforce invariants server-side (so multiple clients stay consistent)
    recent = _dedupe_preserve_order(recent)[:10]
    pinned = _dedupe_preserve_order(pinned)

    prefs = db.scalar(select(UserJobPrefs).where(UserJobPrefs.user_id == current_user.id))

    if not prefs:
        prefs = UserJobPrefs(
            user_id=current_user.id,
            recent_job_numbers=_dump_json_list(recent),
            pinned_job_numbers=_dump_json_list(pinned),
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    else:
        prefs.recent_job_numbers = _dump_json_list(recent)
        prefs.pinned_job_numbers = _dump_json_list(pinned)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    return JobPrefsOut(
        recent_job_numbers=_parse_json_list(prefs.recent_job_numbers),
        pinned_job_numbers=_parse_json_list(prefs.pinned_job_numbers),
    )