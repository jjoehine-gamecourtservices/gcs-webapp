from __future__ import annotations

import json
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Optional

from app.core.config import settings


DEFAULT_TIMEOUT_SECONDS = 2.5


@dataclass(frozen=True)
class GatewayJobCardFields:
    jobName: Optional[str] = None
    address: Optional[str] = None
    generalContractor: Optional[str] = None
    gcpm: Optional[str] = None
    gcpmContact: Optional[str] = None
    super: Optional[str] = None
    superContact: Optional[str] = None
    pm: Optional[str] = None


class FileGatewayClient:
    def __init__(self, timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS) -> None:
        if not settings.FILE_GATEWAY_URL:
            raise RuntimeError("FILE_GATEWAY_URL not configured")
        if not settings.FILE_GATEWAY_TOKEN:
            raise RuntimeError("FILE_GATEWAY_TOKEN not configured")

        self.base_url = settings.FILE_GATEWAY_URL.rstrip("/")
        self.token = settings.FILE_GATEWAY_TOKEN
        self.timeout_seconds = float(timeout_seconds)

    def _get_json(self, path: str) -> Any:
        url = f"{self.base_url}{path}"
        req = urllib.request.Request(
            url,
            method="GET",
            headers={
                "Accept": "application/json",
                "X-GCS-Gateway-Token": self.token,
            },
        )

        with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
            raw = resp.read()

        try:
            return json.loads(raw.decode("utf-8"))
        except Exception as e:
            raise ValueError(f"Invalid JSON from gateway: {e}") from e

    def fetch_job_card_fields(self, job_number: str) -> GatewayJobCardFields:
        job = (job_number or "").strip()
        if not job:
            return GatewayJobCardFields()

        data = self._get_json(f"/jobs/{job}")
        if not isinstance(data, dict):
            return GatewayJobCardFields()

        job_name = _clean_str(data.get("item_name"))
        address = _clean_str(data.get("job_site_address"))
        gc = _clean_str(data.get("gc"))
        gcpm = _clean_str(data.get("gc_pm"))
        gcpm_phone = _clean_str(data.get("gc_pm_phone"))
        job_super = _clean_str(data.get("super"))
        super_phone = _clean_str(data.get("super_phone"))
        pm = _clean_str(data.get("pm"))

        return GatewayJobCardFields(
            jobName=job_name,
            address=address,
            generalContractor=gc,
            gcpm=gcpm,
            gcpmContact=gcpm_phone,
            super=job_super,
            superContact=super_phone,
            pm=pm,
        )


def safe_fetch_job_card_fields(job_number: Optional[str]) -> Dict[str, Optional[str]]:
    empty = GatewayJobCardFields()
    if not job_number:
        return empty.__dict__

    try:
        fields = FileGatewayClient().fetch_job_card_fields(job_number)
        return fields.__dict__
    except Exception:
        return empty.__dict__


def _clean_str(v: Any) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return s or None