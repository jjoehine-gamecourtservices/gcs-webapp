from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.core.config import settings
from app.integrations.monday_client import MondayClient, MondayAPIError

router = APIRouter()


class UpcomingJob(BaseModel):
    id: str = Field(..., description="Monday item id")
    name: str = Field(..., description="Monday item name (Item column)")
    job_number: str = Field("", description="Value from job number column (job_____1)")


class UpcomingJobsResponse(BaseModel):
    jobs: list[UpcomingJob]


@router.get("/upcoming-jobs", response_model=UpcomingJobsResponse)
def upcoming_jobs(_current_user=Depends(get_current_user)):
    # Hard-fail with clear messages instead of a vague 500
    if not settings.MONDAY_API_TOKEN:
        raise HTTPException(status_code=500, detail="Missing GCS_MONDAY_API_TOKEN")
    if not settings.MONDAY_BOARD_ID:
        raise HTTPException(status_code=500, detail="Missing GCS_MONDAY_BOARD_ID")
    if not settings.MONDAY_JOB_COLUMN_ID:
        raise HTTPException(status_code=500, detail="Missing GCS_MONDAY_JOB_COLUMN_ID")

    client = MondayClient(
        token=settings.MONDAY_API_TOKEN,
        api_url=settings.MONDAY_API_URL,
        timeout_seconds=settings.MONDAY_TIMEOUT_SECONDS,
    )

    try:
        jobs = client.list_board_jobs_basic(
            board_id=settings.MONDAY_BOARD_ID,
            job_column_id=settings.MONDAY_JOB_COLUMN_ID,
            limit=settings.MONDAY_UPCOMING_LIMIT,
        )
    except MondayAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return UpcomingJobsResponse(
        jobs=[UpcomingJob(id=j.id, name=j.name, job_number=j.job_number) for j in jobs]
    )