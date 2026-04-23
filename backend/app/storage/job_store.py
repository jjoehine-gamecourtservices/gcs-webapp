from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from app.core.config import settings


class JobStore:
    def __init__(self, root: str | None = None) -> None:
        base = root or settings.ALL_JOBS_JSON_ROOT
        self.root = Path(base).resolve()

    def list_job_numbers(self) -> List[str]:
        if not self.root.exists():
            return []

        out: List[str] = []
        for path in self.root.glob("*.json"):
            if path.is_file():
                out.append(path.stem)

        out.sort()
        return out

    def fetch_job(self, job_number: str) -> Dict[str, Any]:
        safe_job = str(job_number or "").strip()
        if not safe_job:
            return {}

        path = self.root / f"{safe_job}.json"
        if not path.exists() or not path.is_file():
            return {}

        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def write_job(self, job_number: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        safe_job = str(job_number or "").strip()
        if not safe_job:
            raise ValueError("Missing job number")

        self.root.mkdir(parents=True, exist_ok=True)
        path = self.root / f"{safe_job}.json"
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

        return {
            "ok": True,
            "job_number": safe_job,
            "path": str(path),
        }

    def fetch_all_jobs(self) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []

        for job_number in self.list_job_numbers():
            data = self.fetch_job(job_number)
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
        out: Dict[str, Dict[str, Any]] = {}

        for item in self.fetch_all_jobs():
            job_number = str(item.get("jobNumber") or "").strip()
            if job_number and job_number not in out:
                out[job_number] = item

        return out
