from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class MondayAPIError(RuntimeError):
    pass


@dataclass(frozen=True)
class MondayColumn:
    id: str
    text: str


@dataclass(frozen=True)
class MondayItem:
    id: str
    name: str
    columns: Dict[str, MondayColumn]
    job_number: str  # REQUIRED by upcoming-jobs


class MondayClient:
    def __init__(self, token: str, api_url: str, timeout_seconds: int = 30):
        self._token = (token or "").strip()
        self._api_url = (api_url or "").strip()
        self._timeout = int(timeout_seconds or 30)

        if not self._token:
            raise MondayAPIError("Missing Monday token")
        if not self._api_url:
            raise MondayAPIError("Missing Monday API URL")

    # -------------------------------------------------
    # Core request
    # -------------------------------------------------
    def _post_graphql(self, query: str) -> Dict[str, Any]:
        payload = {"query": query}
        body = json.dumps(payload).encode("utf-8")

        req = Request(
            self._api_url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": self._token,
            },
            method="POST",
        )

        try:
            with urlopen(req, timeout=self._timeout) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
        except HTTPError as e:
            try:
                msg = e.read().decode("utf-8", errors="replace")
            except Exception:
                msg = str(e)
            raise MondayAPIError(f"Monday HTTP {getattr(e, 'code', '?')}: {msg}")
        except URLError as e:
            raise MondayAPIError(f"Monday network error: {e}")
        except Exception as e:
            raise MondayAPIError(f"Monday request failed: {e}")

        try:
            data = json.loads(raw) if raw else {}
        except Exception:
            raise MondayAPIError(f"Monday returned non-JSON response: {raw[:500]}")

        if data.get("errors"):
            raise MondayAPIError(f"Monday GraphQL error: {data['errors']}")

        return data.get("data") or {}

    # -------------------------------------------------
    # Used by upcoming-jobs
    # -------------------------------------------------
    def list_board_jobs_basic(
        self,
        board_id: int,
        job_column_id: str,
        limit: int = 200,
    ) -> List[MondayItem]:

        query = f"""
        query {{
          boards(ids: {int(board_id)}) {{
            items_page(limit: {int(limit)}) {{
              items {{
                id
                name
                column_values(ids: [{json.dumps(job_column_id)}]) {{
                  id
                  text

                  ... on MirrorValue {{
                    display_value
                  }}
                }}
              }}
            }}
          }}
        }}
        """

        data = self._post_graphql(query)

        boards = data.get("boards") or []
        if not boards:
            return []

        items_page = (boards[0] or {}).get("items_page") or {}
        items = items_page.get("items") or []

        out: List[MondayItem] = []

        for it in items:
            item_id = str(it.get("id") or "")
            name = str(it.get("name") or "")
            cols_list = it.get("column_values") or []

            job_number = ""
            cols: Dict[str, MondayColumn] = {}

            for c in cols_list:
                cid = str(c.get("id") or "")
                text = str(c.get("text") or "")
                display = str(c.get("display_value") or "")

                value = display if display else text

                cols[cid] = MondayColumn(id=cid, text=value)
                job_number = value

            if item_id:
                out.append(
                    MondayItem(
                        id=item_id,
                        name=name,
                        columns=cols,
                        job_number=job_number,
                    )
                )

        return out

    # -------------------------------------------------
    # Used by master-json bulk sync
    # -------------------------------------------------
    def list_board_items_columns(
        self,
        board_id: int,
        column_ids: List[str],
        limit: int = 500,
    ) -> List[MondayItem]:

        ids = [c.strip() for c in column_ids if c.strip()]
        ids_json = json.dumps(ids)

        query = f"""
        query {{
          boards(ids: {int(board_id)}) {{
            items_page(limit: {int(limit)}) {{
              items {{
                id
                name
                column_values(ids: {ids_json}) {{
                  id
                  text
                }}
              }}
            }}
          }}
        }}
        """

        data = self._post_graphql(query)

        boards = data.get("boards") or []
        if not boards:
            return []

        items_page = (boards[0] or {}).get("items_page") or {}
        items = items_page.get("items") or []

        out: List[MondayItem] = []

        for it in items:
            item_id = str(it.get("id") or "")
            name = str(it.get("name") or "")
            cols_list = it.get("column_values") or []
            cols: Dict[str, MondayColumn] = {}

            for c in cols_list:
                cid = str(c.get("id") or "")
                text = str(c.get("text") or "")
                cols[cid] = MondayColumn(id=cid, text=text)

            if item_id:
                out.append(
                    MondayItem(
                        id=item_id,
                        name=name,
                        columns=cols,
                        job_number="",
                    )
                )

        return out

    # -------------------------------------------------
    # Used by debug + master-json
    # -------------------------------------------------
    def get_item_basic(self, item_id: str) -> Dict[str, Any]:
        iid = str(item_id).strip()

        query = f"""
        query {{
          items(ids: [{json.dumps(iid)}]) {{
            id
            name
            board {{ id }}
          }}
        }}
        """

        data = self._post_graphql(query)
        items = data.get("items") or []
        if not items:
            raise MondayAPIError(f"Item not found: {iid}")

        it = items[0] or {}
        board = it.get("board") or {}

        return {
            "id": str(it.get("id") or ""),
            "name": it.get("name") or "",
            "board_id": str(board.get("id") or ""),
        }

    def get_item_all_column_values(self, item_id: str) -> Dict[str, Dict[str, Any]]:
        iid = str(item_id).strip()

        query = f"""
        query {{
          items(ids: [{json.dumps(iid)}]) {{
            id
            column_values {{
              id
              type
              text
              value

              ... on BoardRelationValue {{
                linked_item_ids
                linked_items {{
                  id
                  name
                  board {{ id }}
                }}
              }}

              ... on MirrorValue {{
                display_value
              }}
            }}
          }}
        }}
        """

        data = self._post_graphql(query)
        items = data.get("items") or []
        if not items:
            raise MondayAPIError(f"Item not found: {iid}")

        cols_list = (items[0] or {}).get("column_values") or []
        out: Dict[str, Dict[str, Any]] = {}

        for c in cols_list:
            cid = str(c.get("id") or "")
            entry = {
                "id": cid,
                "type": c.get("type") or "",
                "text": str(c.get("text") or ""),
                "value": str(c.get("value") or ""),
            }

            if "display_value" in c:
                entry["display_value"] = str(c.get("display_value") or "")

            if "linked_item_ids" in c:
                entry["linked_item_ids"] = c.get("linked_item_ids") or []

            if "linked_items" in c:
                entry["linked_items"] = c.get("linked_items") or []

            out[cid] = entry

        return out