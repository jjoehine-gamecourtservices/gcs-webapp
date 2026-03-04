from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.integrations.file_gateway_client import safe_fetch_job_card_fields

router = APIRouter()


class GatewayDebugResponse(BaseModel):
    jobName: str | None = None
    address: str | None = None
    generalContractor: str | None = None
    gcpm: str | None = None
    gcpmContact: str | None = None
    pm: str | None = None


@router.get("/debug-gateway-job/{job_number}", response_model=GatewayDebugResponse)
def debug_gateway_job(job_number: str, _current_user=Depends(get_current_user)):
    return safe_fetch_job_card_fields(job_number)