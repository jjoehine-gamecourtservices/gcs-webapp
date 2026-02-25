from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


class MondayAPIError(Exception):
    pass


@dataclass(frozen=True)
class MondayJob:
    id: str
    name: str
    job_number: str


class MondayClient:
    """
    Minimal Monday GraphQL client using Python stdlib only (no httpx/requests).
    """

    def __init__(self, token: str, api_url: str = "https://api.monday.com/v2", timeout_seconds: int = 30):
        self.token = (token or "").strip()
        self.api_url = (api_url or "").strip() or "https://api.monday.com/v2"
        self.timeout_seconds = int(timeout_seconds or 30)

        if not self.token:
            raise MondayAPIError("Missing Monday API token (empty).")

    def graphql(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload = {"query": query, "variables": variables or {}}
        body = json.dumps(payload).encode("utf-8")

        req = Request(
            self.api_url,
            data=body,
            headers={
                "Authorization": self.token,
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(req, timeout=self.timeout_seconds) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
        except HTTPError as e:
            msg = ""
            try:
                msg = e.read().decode("utf-8", errors="replace")
            except Exception:
                msg = str(e)
            raise MondayAPIError(f"Monday HTTP {getattr(e, 'code', '?')}: {msg}") from e
        except URLError as e:
            raise MondayAPIError(f"Monday network error: {e}") from e
        except Exception as e:
            raise MondayAPIError(f"Monday request failed: {e}") from e

        try:
            data = json.loads(raw)
        except Exception as e:
            raise MondayAPIError(f"Monday response not JSON: {e}. Body: {raw[:200]}") from e

        if isinstance(data, dict) and data.get("errors"):
            msgs: List[str] = []
            for err in data.get("errors", []):
                if isinstance(err, dict):
                    msgs.append(err.get("message") or str(err))
                else:
                    msgs.append(str(err))
            raise MondayAPIError("Monday GraphQL error: " + " | ".join(msgs))

        return data

    def list_board_jobs_basic(self, board_id: int, job_column_id: str, limit: int = 50) -> List[MondayJob]:
        board_id = int(board_id)
        job_column_id = (job_column_id or "").strip()
        limit = int(limit or 50)

        if not job_column_id:
            return []

        query = """
        query ($board_id: [ID!], $limit: Int!, $job_col: [String!]) {
          boards(ids: $board_id) {
            items_page(limit: $limit) {
              items {
                id
                name
                column_values(ids: $job_col) {
                  id
                  text
                  value
                }
              }
            }
          }
        }
        """

        data = self.graphql(
            query,
            {
                "board_id": [board_id],
                "limit": limit,
                "job_col": [job_column_id],
            },
        )

        items: List[Dict[str, Any]] = []
        try:
            boards = data.get("data", {}).get("boards") or []
            if boards:
                items = (boards[0].get("items_page") or {}).get("items") or []
        except Exception:
            items = []

        out: List[MondayJob] = []
        for it in items:
            if not isinstance(it, dict):
                continue
            item_id = str(it.get("id") or "").strip()
            name = str(it.get("name") or "").strip()

            job_number = ""
            cols = it.get("column_values") or []
            if isinstance(cols, list) and cols:
                c0 = cols[0]
                if isinstance(c0, dict):
                    job_number = str(c0.get("text") or "").strip()

            if not item_id:
                continue

            out.append(MondayJob(id=item_id, name=name, job_number=job_number))

        return out