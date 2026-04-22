# backend/app/api/stock.py
from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import db_dependency
from app.models.stock_item import StockItem
from app.models.stock_item_vendor import StockItemVendor

router = APIRouter()


class StockVendorResponse(BaseModel):
    id: int
    name: str
    phone: str | None = None
    email: str | None = None
    location: str | None = None
    sortOrder: int

    class Config:
        from_attributes = True


class StockItemResponse(BaseModel):
    id: int
    name: str
    size: str | None = None
    modelNumber: str | None = None
    price: float | None = None
    picturePath: str | None = None
    vendors: List[StockVendorResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class StockVendorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=64)
    email: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)


class StockItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    size: str | None = Field(default=None, max_length=255)
    modelNumber: str | None = Field(default=None, max_length=255)
    price: str | float | int | None = None
    picturePath: str | None = None
    vendors: List[StockVendorCreate] = Field(default_factory=list)


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _parse_price(value: str | float | int | None) -> Decimal | None:
    if value is None:
        return None

    if isinstance(value, (int, float)):
        try:
            return Decimal(str(value)).quantize(Decimal("0.01"))
        except (InvalidOperation, ValueError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid price value.",
            )

    cleaned = str(value).strip()
    if not cleaned:
        return None

    cleaned = cleaned.replace("$", "").replace(",", "")
    try:
        return Decimal(cleaned).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid price value.",
        )


def _to_vendor_response(vendor: StockItemVendor) -> StockVendorResponse:
    return StockVendorResponse(
        id=vendor.id,
        name=vendor.name,
        phone=vendor.phone,
        email=vendor.email,
        location=vendor.location,
        sortOrder=vendor.sort_order,
    )


def _to_item_response(item: StockItem) -> StockItemResponse:
    price_value = float(item.price) if item.price is not None else None
    return StockItemResponse(
        id=item.id,
        name=item.name,
        size=item.size,
        modelNumber=item.model_number,
        price=price_value,
        picturePath=item.picture_path,
        vendors=[_to_vendor_response(v) for v in item.vendors],
    )


@router.get("", response_model=list[StockItemResponse])
def list_stock_items(
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    stmt = (
        select(StockItem)
        .options(selectinload(StockItem.vendors))
        .order_by(StockItem.name.asc(), StockItem.id.asc())
    )
    items = list(db.scalars(stmt).unique().all())
    return [_to_item_response(item) for item in items]


@router.post("", response_model=StockItemResponse, status_code=status.HTTP_201_CREATED)
def create_stock_item(
    payload: StockItemCreate,
    db: Session = Depends(db_dependency),
    _current_user=Depends(get_current_user),
):
    name = _clean_text(payload.name)
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Name is required.",
        )

    item = StockItem(
        name=name,
        size=_clean_text(payload.size),
        model_number=_clean_text(payload.modelNumber),
        price=_parse_price(payload.price),
        picture_path=_clean_text(payload.picturePath),
    )

    cleaned_vendors: list[StockItemVendor] = []
    for index, vendor in enumerate(payload.vendors):
        vendor_name = _clean_text(vendor.name)
        if not vendor_name:
            continue

        cleaned_vendors.append(
            StockItemVendor(
                name=vendor_name,
                phone=_clean_text(vendor.phone),
                email=_clean_text(vendor.email),
                location=_clean_text(vendor.location),
                sort_order=index,
            )
        )

    item.vendors = cleaned_vendors

    db.add(item)
    db.commit()
    db.refresh(item)
    db.refresh(item, attribute_names=["vendors"])

    return _to_item_response(item)