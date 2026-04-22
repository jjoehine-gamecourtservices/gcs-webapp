// frontend/src/pages/tasks/pages/stock/pages/orderstock/OrderStockPage.tsx
import React from "react";
import "../../../../../../styles/stock.css";

type Props = {
  onBack?: () => void;
};

export default function OrderStockPage({ onBack }: Props) {
  return (
    <section className="tasksWorkspace orderStockPage">
      <div className="dashCard orderStockToolbar">
        <div className="orderStockToolbarLeft">
          <button
            type="button"
            className="dashMiniPill"
            onClick={() => {
              if (onBack) onBack();
            }}
            style={{ cursor: "pointer" }}
            title="Back"
          >
            Back
          </button>
        </div>
      </div>

      <section className="orderStockContent">
        <div className="dashMuted">Order Stock page (placeholder)</div>
      </section>
    </section>
  );
}