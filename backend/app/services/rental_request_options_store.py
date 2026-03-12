from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List


_DEFAULT_DATA = {
    "equipmentTypes": [],
    "accessories": [],
}


class RentalRequestOptionsStore:
    def __init__(self, file_path: Path | None = None) -> None:
        if file_path is None:
            file_path = Path(__file__).resolve().parents[2] / "data" / "rental_request_options.json"
        self._file_path = file_path

    def _ensure_file(self) -> None:
        self._file_path.parent.mkdir(parents=True, exist_ok=True)

        if not self._file_path.exists():
            self._write_data(_DEFAULT_DATA)

    def _read_data(self) -> Dict[str, List[str]]:
        self._ensure_file()

        try:
            raw = self._file_path.read_text(encoding="utf-8")
            parsed = json.loads(raw)
        except Exception:
            parsed = dict(_DEFAULT_DATA)

        if not isinstance(parsed, dict):
            parsed = dict(_DEFAULT_DATA)

        equipment = parsed.get("equipmentTypes")
        accessories = parsed.get("accessories")

        if not isinstance(equipment, list):
            equipment = []
        if not isinstance(accessories, list):
            accessories = []

        return {
            "equipmentTypes": self._normalize_list(equipment),
            "accessories": self._normalize_list(accessories),
        }

    def _write_data(self, data: Dict[str, List[str]]) -> None:
        normalized = {
            "equipmentTypes": self._normalize_list(data.get("equipmentTypes", [])),
            "accessories": self._normalize_list(data.get("accessories", [])),
        }

        self._file_path.parent.mkdir(parents=True, exist_ok=True)
        self._file_path.write_text(
            json.dumps(normalized, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    @staticmethod
    def _normalize_value(value: object) -> str:
        return str(value or "").strip()

    @classmethod
    def _normalize_list(cls, values: List[object]) -> List[str]:
        seen = set()
        out: List[str] = []

        for value in values:
            text = cls._normalize_value(value)
            if not text:
                continue

            lowered = text.lower()
            if lowered in seen:
                continue

            seen.add(lowered)
            out.append(text)

        out.sort(key=lambda x: x.lower())
        return out

    def get_all(self) -> Dict[str, List[str]]:
        return self._read_data()

    def list_equipment_types(self) -> List[str]:
        return self._read_data()["equipmentTypes"]

    def list_accessories(self) -> List[str]:
        return self._read_data()["accessories"]

    def add_equipment_type(self, value: str) -> List[str]:
        text = self._normalize_value(value)
        data = self._read_data()

        if text:
            data["equipmentTypes"] = self._normalize_list([*data["equipmentTypes"], text])
            self._write_data(data)

        return data["equipmentTypes"]

    def add_accessory(self, value: str) -> List[str]:
        text = self._normalize_value(value)
        data = self._read_data()

        if text:
            data["accessories"] = self._normalize_list([*data["accessories"], text])
            self._write_data(data)

        return data["accessories"]

    def update_equipment_type(self, old_value: str, new_value: str) -> List[str]:
        old_text = self._normalize_value(old_value)
        new_text = self._normalize_value(new_value)
        data = self._read_data()

        if not old_text or not new_text:
            return data["equipmentTypes"]

        next_values: List[str] = []
        for value in data["equipmentTypes"]:
            if value.strip().lower() == old_text.lower():
                next_values.append(new_text)
            else:
                next_values.append(value)

        data["equipmentTypes"] = self._normalize_list(next_values)
        self._write_data(data)
        return data["equipmentTypes"]

    def update_accessory(self, old_value: str, new_value: str) -> List[str]:
        old_text = self._normalize_value(old_value)
        new_text = self._normalize_value(new_value)
        data = self._read_data()

        if not old_text or not new_text:
            return data["accessories"]

        next_values: List[str] = []
        for value in data["accessories"]:
            if value.strip().lower() == old_text.lower():
                next_values.append(new_text)
            else:
                next_values.append(value)

        data["accessories"] = self._normalize_list(next_values)
        self._write_data(data)
        return data["accessories"]

    def delete_equipment_type(self, value: str) -> List[str]:
        text = self._normalize_value(value)
        data = self._read_data()

        if not text:
            return data["equipmentTypes"]

        data["equipmentTypes"] = [
            item for item in data["equipmentTypes"]
            if item.strip().lower() != text.lower()
        ]
        data["equipmentTypes"] = self._normalize_list(data["equipmentTypes"])
        self._write_data(data)
        return data["equipmentTypes"]

    def delete_accessory(self, value: str) -> List[str]:
        text = self._normalize_value(value)
        data = self._read_data()

        if not text:
            return data["accessories"]

        data["accessories"] = [
            item for item in data["accessories"]
            if item.strip().lower() != text.lower()
        ]
        data["accessories"] = self._normalize_list(data["accessories"])
        self._write_data(data)
        return data["accessories"]