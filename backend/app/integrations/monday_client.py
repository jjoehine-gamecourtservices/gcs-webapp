# backend/app/integrations/monday_client.py
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, List

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
    job_number: str


class MondayClient:
    def __init__(self, token: str, api_url: str, timeout_seconds: int = 30):
        self._token = (token or "").strip()
        self._api_url = (api_url or "").strip()
        self._timeout = int(timeout_seconds or 30)

        if not self._token:
            raise MondayAPIError("Missing Monday token")
        if not self._api_url:
            raise MondayAPIError("Missing Monday API URL")

    def _post_graphql(self, query: str) -> Dict[str, Any]:
        payload = {"query": query}
        body = json.dumps(payload).encode("utf-8")

        req = Request(
            self._api_url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": self._token,
                "API-Version": "2025-01",
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

    def list_board_groups(
        self,
        *,
        board_id: int,
    ) -> List[Dict[str, str]]:
        query = f"""
        query {{
          boards(ids: {int(board_id)}) {{
            groups {{
              id
              title
            }}
          }}
        }}
        """

        data = self._post_graphql(query)

        boards = data.get("boards") or []
        if not boards:
            return []

        groups = (boards[0] or {}).get("groups") or []
        out: List[Dict[str, str]] = []

        for grp in groups:
            group_id = str(grp.get("id") or "").strip()
            title = str(grp.get("title") or "").strip()
            if not group_id:
                continue
            out.append({"id": group_id, "title": title})

        return out

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

                  ... on FormulaValue {{
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

                  ... on MirrorValue {{
                    display_value
                  }}

                  ... on FormulaValue {{
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
            cols: Dict[str, MondayColumn] = {}

            for c in cols_list:
                cid = str(c.get("id") or "")
                text = str(c.get("text") or "")
                display = str(c.get("display_value") or "")
                value = display if display else text
                cols[cid] = MondayColumn(id=cid, text=value)

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

    def list_board_items_basic(
        self,
        board_id: int,
        limit: int = 1000,
    ) -> List[Dict[str, str]]:
        query = f"""
        query {{
          boards(ids: {int(board_id)}) {{
            items_page(limit: {int(limit)}) {{
              items {{
                id
                name
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

        out: List[Dict[str, str]] = []

        for it in items:
            item_id = str(it.get("id") or "").strip()
            name = str(it.get("name") or "").strip()
            if not item_id or not name:
                continue
            out.append({"id": item_id, "name": name})

        return out

    def list_group_items_text_column_values(
        self,
        *,
        board_id: int,
        group_id: str,
        column_ids: List[str],
        limit: int = 500,
    ) -> List[Dict[str, Any]]:
        ids = [c.strip() for c in column_ids if c.strip()]
        ids_json = json.dumps(ids)
        group_json = json.dumps(str(group_id).strip())

        query = f"""
        query {{
          boards(ids: {int(board_id)}) {{
            groups(ids: [{group_json}]) {{
              id
              title
              items_page(limit: {int(limit)}) {{
                items {{
                  id
                  name
                  column_values(ids: {ids_json}) {{
                    id
                    type
                    text
                    value

                    ... on BoardRelationValue {{
                      display_value
                    }}

                    ... on MirrorValue {{
                      display_value
                    }}

                    ... on FormulaValue {{
                      display_value
                    }}
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

        groups = (boards[0] or {}).get("groups") or []
        if not groups:
            return []

        items_page = (groups[0] or {}).get("items_page") or {}
        items = items_page.get("items") or []

        out: List[Dict[str, Any]] = []

        for it in items:
            item_id = str(it.get("id") or "").strip()
            name = str(it.get("name") or "").strip()
            if not item_id:
                continue

            cols_out: Dict[str, Dict[str, Any]] = {}
            for c in it.get("column_values") or []:
                cid = str(c.get("id") or "").strip()
                if not cid:
                    continue

                entry: Dict[str, Any] = {
                    "id": cid,
                    "type": c.get("type") or "",
                    "text": str(c.get("text") or ""),
                    "value": str(c.get("value") or ""),
                }

                if "display_value" in c:
                    entry["display_value"] = str(c.get("display_value") or "")

                cols_out[cid] = entry

            out.append(
                {
                    "id": item_id,
                    "name": name,
                    "columns": cols_out,
                }
            )

        return out

    def list_group_items_column_values(
        self,
        *,
        board_id: int,
        group_id: str,
        column_ids: List[str],
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        ids = [c.strip() for c in column_ids if c.strip()]
        ids_json = json.dumps(ids)
        group_json = json.dumps(str(group_id).strip())

        query = f"""
        query {{
          boards(ids: {int(board_id)}) {{
            groups(ids: [{group_json}]) {{
              id
              title
              items_page(limit: {int(limit)}) {{
                items {{
                  id
                  name
                  column_values(ids: {ids_json}) {{
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
                      display_value
                    }}

                    ... on MirrorValue {{
                      display_value
                    }}

                    ... on FormulaValue {{
                      display_value
                    }}
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

        groups = (boards[0] or {}).get("groups") or []
        if not groups:
            return []

        items_page = (groups[0] or {}).get("items_page") or {}
        items = items_page.get("items") or []

        out: List[Dict[str, Any]] = []

        for it in items:
            item_id = str(it.get("id") or "").strip()
            name = str(it.get("name") or "").strip()
            if not item_id:
                continue

            cols_out: Dict[str, Dict[str, Any]] = {}
            for c in it.get("column_values") or []:
                cid = str(c.get("id") or "").strip()
                if not cid:
                    continue

                entry: Dict[str, Any] = {
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

                cols_out[cid] = entry

            out.append(
                {
                    "id": item_id,
                    "name": name,
                    "columns": cols_out,
                }
            )

        return out

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

    def get_item_columns(
        self,
        *,
        item_id: str,
        column_ids: List[str],
    ) -> Dict[str, Dict[str, Any]]:
        iid = str(item_id).strip()
        ids = [c.strip() for c in column_ids if c.strip()]
        ids_json = json.dumps(ids)

        query = f"""
        query {{
          items(ids: [{json.dumps(iid)}]) {{
            id
            name
            board {{ id }}
            column_values(ids: {ids_json}) {{
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
                display_value
              }}

              ... on MirrorValue {{
                display_value
              }}

              ... on FormulaValue {{
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
            entry: Dict[str, Any] = {
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
                display_value
              }}

              ... on MirrorValue {{
                display_value
              }}

              ... on FormulaValue {{
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

    def change_simple_column_value(
        self,
        *,
        board_id: int,
        item_id: str,
        column_id: str,
        value: str,
    ) -> str:
        iid = str(item_id).strip()
        cid = str(column_id).strip()
        val = str(value)

        query = f"""
        mutation {{
          change_simple_column_value(
            item_id: {json.dumps(iid)},
            board_id: {int(board_id)},
            column_id: {json.dumps(cid)},
            value: {json.dumps(val)}
          ) {{
            id
          }}
        }}
        """

        data = self._post_graphql(query)
        changed = data.get("change_simple_column_value") or {}
        changed_id = str(changed.get("id") or "")
        if not changed_id:
            raise MondayAPIError("Monday did not return an item id for change_simple_column_value")
        return changed_id

    def change_multiple_column_values(
        self,
        *,
        board_id: int,
        item_id: str,
        column_values: Dict[str, Any],
        create_labels_if_missing: bool = False,
    ) -> str:
        iid = str(item_id).strip()
        values_json = json.dumps(column_values or {}, ensure_ascii=False)

        query = f"""
        mutation {{
          change_multiple_column_values(
            item_id: {json.dumps(iid)},
            board_id: {int(board_id)},
            column_values: {json.dumps(values_json)},
            create_labels_if_missing: {"true" if create_labels_if_missing else "false"}
          ) {{
            id
          }}
        }}
        """

        data = self._post_graphql(query)
        changed = data.get("change_multiple_column_values") or {}
        changed_id = str(changed.get("id") or "")
        if not changed_id:
            raise MondayAPIError("Monday did not return an item id for change_multiple_column_values")
        return changed_id

    def change_item_name(
        self,
        *,
        board_id: int,
        item_id: str,
        new_name: str,
    ) -> str:
        return self.change_simple_column_value(
            board_id=board_id,
            item_id=item_id,
            column_id="name",
            value=new_name,
        )

    def create_item(
        self,
        *,
        board_id: int,
        group_id: str,
        item_name: str,
        column_values: Dict[str, Any] | None = None,
        create_labels_if_missing: bool = False,
    ) -> str:
        group = str(group_id).strip()
        name = str(item_name).strip()
        if not group:
            raise MondayAPIError("Missing group_id for create_item")
        if not name:
            raise MondayAPIError("Missing item_name for create_item")

        column_values_json = json.dumps(column_values or {}, ensure_ascii=False)

        query = f"""
        mutation {{
          create_item(
            board_id: {int(board_id)},
            group_id: {json.dumps(group)},
            item_name: {json.dumps(name)},
            column_values: {json.dumps(column_values_json)},
            create_labels_if_missing: {"true" if create_labels_if_missing else "false"}
          ) {{
            id
          }}
        }}
        """

        data = self._post_graphql(query)
        created = data.get("create_item") or {}
        created_id = str(created.get("id") or "")
        if not created_id:
            raise MondayAPIError("Monday did not return an item id for create_item")
        return created_id