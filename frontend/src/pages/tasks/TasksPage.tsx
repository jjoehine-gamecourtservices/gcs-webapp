import React, { useState } from "react";

import TasksHomePage from "./pages/home/TasksHomePage";
import RentalsPage from "./pages/rentals/RentalsPage";

type TasksView =
  | { id: "home" }
  | { id: "rentals" };

export default function TasksPage() {
  const [view, setView] = useState<TasksView>({ id: "home" });

  function goHome() {
    setView({ id: "home" });
  }

  function openRentals() {
    setView({ id: "rentals" });
  }

  if (view.id === "rentals") {
    return <RentalsPage />;
  }

  return (
    <TasksHomePage
      onOpenRentals={openRentals}
      onResetTasks={goHome}
    />
  );
}