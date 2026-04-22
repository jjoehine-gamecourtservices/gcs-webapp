// frontend/src/pages/tasks/stock/components/StockDetailsPane.tsx
import React from "react";
import type { StockItem } from "../stock.types";

type Props = {
  item: StockItem | null;
};

function formatPrice(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(2)}`;
}

export default function StockDetailsPane({ item }: Props) {
  if (!item) {
    return (
      <div className="stockDetailsPane">
        <div className="dashMuted">Select an item card to view details.</div>
      </div>
    );
  }

  return (
    <div className="stockDetailsPane">
      <div className="stockDetailsHeader">
        <div className="stockDetailsTitle">{item.name}</div>
        <div className="stockDetailsType">{item.size || item.modelNumber || "No size/model listed"}</div>
      </div>

      <div className="stockDetailsPreview" />

      <div className="stockDetailsSection">
        <div className="stockDetailsLabel">Size</div>
        <div className="stockDetailsValue">{item.size || "—"}</div>
      </div>

      <div className="stockDetailsSection">
        <div className="stockDetailsLabel">Model Number</div>
        <div className="stockDetailsValue">{item.modelNumber || "—"}</div>
      </div>

      <div className="stockDetailsSection">
        <div className="stockDetailsLabel">Price</div>
        <div className="stockDetailsValue">{formatPrice(item.price)}</div>
      </div>

      <div className="stockDetailsSection">
        <div className="stockDetailsLabel">Picture Path</div>
        <div className="stockDetailsValue">{item.picturePath || "—"}</div>
      </div>

      <div className="stockDetailsSection">
        <div className="stockDetailsLabel">Available Vendors</div>
        <div className="stockDetailsVendorList">
          {item.vendors.length > 0 ? (
            item.vendors.map((vendor) => (
              <div key={vendor.id} className="stockDetailsVendorPill">
                {vendor.name}
              </div>
            ))
          ) : (
            <div className="dashMuted">No vendors listed.</div>
          )}
        </div>
      </div>

      <div className="stockDetailsSection">
        <div className="stockDetailsLabel">Vendor Details</div>
        <div className="stockDetailsValue">
          {item.vendors.length > 0
            ? item.vendors
                .map((vendor) => {
                  const parts = [vendor.name, vendor.phone, vendor.email, vendor.location].filter(Boolean);
                  return parts.join(" — ");
                })
                .join("\n")
            : "—"}
        </div>
      </div>
    </div>
  );
}