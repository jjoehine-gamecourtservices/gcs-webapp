from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.integrations.file_gateway_jobs_client import FileGatewayJobsClient

router = APIRouter()


@router.get("")
def list_all_jobs(_current_user=Depends(get_current_user)):
    jobs = FileGatewayJobsClient().fetch_all_jobs()
    return {
        "jobs": jobs,
        "count": len(jobs),
    }