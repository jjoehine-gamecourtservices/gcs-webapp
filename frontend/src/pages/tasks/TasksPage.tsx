import React, { useEffect, useMemo, useState } from "react";

import TasksHomePage from "./pages/home/TasksHomePage";
import RentalsPage from "./pages/rentals/RentalsPage";
import StockPage from "./pages/stock/StockPage";
import type { PermissionKey } from "../admin/permissions/permissions.types";

type Props = {
  perms: Set<PermissionKey>;
};

type TasksView = { id: "home" } | { id: "rentals" } | { id: "stock" };

export default function TasksPage({ perms }: Props) {
  const canOpenRentals = useMemo(() => perms.has("tasks.rentals"), [perms]);
  const canOpenStock = useMemo(() => perms.has("tasks.stock"), [perms]);

  const [view, setView] = useState<TasksView>({ id: "home" });

  useEffect(() => {
    if (view.id === "rentals" && !canOpenRentals) {
      setView({ id: "home" });
      return;
    }

    if (view.id === "stock" && !canOpenStock) {
      setView({ id: "home" });
    }
  }, [view, canOpenRentals, canOpenStock]);

  function goHome() {
    setView({ id: "home" });
  }

  function openRentals() {
    if (!canOpenRentals) return;
    setView({ id: "rentals" });
  }

  function openStock() {
    if (!canOpenStock) return;
    setView({ id: "stock" });
  }

  if (view.id === "rentals") {
    return <RentalsPage />;
  }

  if (view.id === "stock") {
    return <StockPage />;
  }

  return (
    <TasksHomePage
      onOpenRentals={openRentals}
      onOpenStock={openStock}
      onResetTasks={goHome}
      canOpenRentals={canOpenRentals}
      canOpenStock={canOpenStock}
    />
  );
}