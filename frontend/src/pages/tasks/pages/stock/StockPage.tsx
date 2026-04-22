// frontend/src/pages/tasks/stock/StockPage.tsx
import React, { useMemo, useState } from "react";
import TileGrid from "../../../../components/tiles/TileGrid";
import StockListPage from "./pages/stock/StockListPage";
import OrderStockPage from "./pages/orderstock/OrderStockPage";

type ViewState =
  | { id: "home" }
  | { id: "stock-list" }
  | { id: "order-stock" };

function StockListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6.5C4 5.672 4.672 5 5.5 5h13C19.328 5 20 5.672 20 6.5v11c0 .828-.672 1.5-1.5 1.5h-13C4.672 19 4 18.328 4 17.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8 10h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 14h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function OrderStockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.25 5h8.5L19 9.25v9.5C19 19.44 18.44 20 17.75 20h-11.5C5.56 20 5 19.44 5 18.75V6.25C5 5.56 5.56 5 6.25 5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M14.75 5v4.25H19" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.5 13.5H14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function StockPage() {
  const [view, setView] = useState<ViewState>({ id: "home" });

  const tiles = useMemo(() => {
    return [
      {
        id: "stock-list",
        title: "Stock",
        description: "View stock items and available products.",
        icon: <StockListIcon />,
        onClick: () => setView({ id: "stock-list" }),
      },
      {
        id: "order-stock",
        title: "Order Stock",
        description: "Start a new stock order workflow.",
        icon: <OrderStockIcon />,
        onClick: () => setView({ id: "order-stock" }),
      },
    ];
  }, []);

  if (view.id === "stock-list") {
    return <StockListPage onBack={() => setView({ id: "home" })} />;
  }

  if (view.id === "order-stock") {
    return <OrderStockPage onBack={() => setView({ id: "home" })} />;
  }

  return (
    <section className="tasksWorkspace">
      <TileGrid tiles={tiles} />
    </section>
  );
}