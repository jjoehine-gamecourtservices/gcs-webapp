from __future__ import annotations

import json
import urllib.request
from typing import Any, Dict, List

from app.core.config import settings


class FileGatewayJobsClient:
    def __init__(self) -> None:
        if not settings.FILE_GATEWAY_URL:
            raise RuntimeError("FILE_GATEWAY_URL not configured")
        if not settings.FILE_GATEWAY_TOKEN:
            raise RuntimeError("FILE_GATEWAY_TOKEN not configured")

        self.base_url = settings.FILE_GATEWAY_URL.rstrip("/")
        self.token = settings.FILE_GATEWAY_TOKEN

    def _get_json(self, path: str, *, timeout: float = 5.0) -> Any:
        url = f"{self.base_url}{path}"

        req = urllib.request.Request(
            url,
            method="GET",
            headers={
                "Accept": "application/json",
                "X-GCS-Gateway-Token": self.token,
            },
        )

        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()

        return json.loads(raw.decode("utf-8"))

    def list_job_numbers(self) -> List[str]:
        data = self._get_json("/jobs")

        if not isinstance(data, dict):
            return []

        jobs = data.get("jobs")
        if not isinstance(jobs, list):
            return []

        out: List[str] = []
        for item in jobs:
            job_number = str(item).strip()
            if job_number:
                out.append(job_number)

        return out

    def fetch_job(self, job_number: str) -> Dict[str, Any]:
        job = (job_number or "").strip()
        if not job:
            return {}

        data = self._get_json(f"/jobs/{job}")
        if not isinstance(data, dict):
            return {}

        return data

    def fetch_all_jobs(self) -> List[Dict[str, Any]]:
        job_numbers = self.list_job_numbers()

        out: List[Dict[str, Any]] = []

        for job_number in job_numbers:
            try:
                data = self.fetch_job(job_number)
            except Exception:
                data = {}

            out.append(
                {
                    "jobNumber": job_number,
                    "jobName": data.get("item_name", ""),
                    "address": data.get("job_site_address", ""),
                    "generalContractor": data.get("gc", ""),
                    "gcpm": data.get("gc_pm", ""),
                    "gcpmContact": data.get("gc_pm_phone", ""),
                    "super": data.get("super", ""),
                    "superContact": data.get("super_phone", ""),
                    "pm": data.get("pm", ""),
                    "startDate": data.get("pss_install_date", ""),
                    "contractAmount": data.get("total_contract", ""),
                }
            )

        return out

    def fetch_all_jobs_map(self) -> Dict[str, Dict[str, Any]]:
        jobs = self.fetch_all_jobs()
        out: Dict[str, Dict[str, Any]] = {}

        for item in jobs:
            if not isinstance(item, dict):
                continue

            job_number = str(item.get("jobNumber") or "").strip()
            if not job_number:
                continue

            if job_number not in out:
                out[job_number] = item

        return out