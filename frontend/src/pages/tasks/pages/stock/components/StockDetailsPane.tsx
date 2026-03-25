import React from "react";

type StockItem = {
  id: string;
  name: string;
  type: string;
  description: string;
  vendorOptions: string[];
};

type Props = {
  item: StockItem | null;
};

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
        <div className="stockDetailsType">{item.type}</div>
      </div>

      <div className="stockDetailsPreview" />

      <div className="stockDetailsSection">
        <div className="stockDetailsLabel">Description</div>
        <div className="stockDetailsValue">{item.description}</div>
      </div>

      <div className="stockDetailsSection">
        <div className="stockDetailsLabel">Available Vendors</div>
        <div className="stockDetailsVendorList">
          {item.vendorOptions.map((vendor) => (
            <div key={vendor} className="stockDetailsVendorPill">
              {vendor}
            </div>
          ))}
        </div>
      </div>

      <div className="stockDetailsSection">
        <div className="stockDetailsLabel">Order Panel</div>
        <div className="dashMuted">Quantity, vendor select, and create order button go here next.</div>
      </div>
    </div>
  );
}