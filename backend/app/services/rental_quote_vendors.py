from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.integrations.monday_client import MondayAPIError, MondayClient


VENDOR_BOARD_ID = 7099018002
VENDOR_GROUP_ID = "group_mkyp2mq1"
VENDOR_EMAIL_COLUMN_ID = "email__1"


def _monday_client() -> MondayClient:
    return MondayClient(
        token=settings.MONDAY_API_TOKEN,
        api_url=settings.MONDAY_API_URL,
        timeout_seconds=settings.MONDAY_TIMEOUT_SECONDS,
    )


def _escape_graphql_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def _extract_email_text(column: dict[str, Any]) -> str:
    raw = str(column.get("text") or "").strip()
    if raw:
        return raw

    email = str(column.get("email") or "").strip()
    if email:
        return email

    value = column.get("value")
    if isinstance(value, str) and value.strip():
        return value.strip()

    return ""


def list_rental_quote_vendors() -> list[dict[str, str]]:
    client = _monday_client()

    query = f"""
    query {{
      boards(ids: {VENDOR_BOARD_ID}) {{
        groups(ids: ["{_escape_graphql_string(VENDOR_GROUP_ID)}"]) {{
          items_page(limit: 500) {{
            items {{
              id
              name
              column_values(ids: ["{_escape_graphql_string(VENDOR_EMAIL_COLUMN_ID)}"]) {{
                id
                text
                value

                ... on EmailValue {{
                  email
                  label
                }}
              }}
            }}
          }}
        }}
      }}
    }}
    """

    data = client._post_graphql(query)

    boards = data.get("boards") or []
    if not boards:
        return []

    groups = (boards[0] or {}).get("groups") or []
    if not groups:
        return []

    items_page = (groups[0] or {}).get("items_page") or {}
    items = items_page.get("items") or []

    vendors: list[dict[str, str]] = []

    for item in items:
        vendor_id = str(item.get("id") or "").strip()
        vendor_name = str(item.get("name") or "").strip()
        if not vendor_id or not vendor_name:
            continue

        columns = item.get("column_values") or []
        email_text = ""
        for column in columns:
            column_id = str(column.get("id") or "").strip()
            if column_id != VENDOR_EMAIL_COLUMN_ID:
                continue
            email_text = _extract_email_text(column).strip()
            break

        if not email_text:
            continue

        vendors.append(
            {
                "id": vendor_id,
                "name": vendor_name,
                "email": email_text,
            }
        )

    vendors.sort(key=lambda x: x["name"].lower())
    return vendors