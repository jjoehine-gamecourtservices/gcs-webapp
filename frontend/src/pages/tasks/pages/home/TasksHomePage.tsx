import React, { useMemo } from "react";
import TileGrid from "../../../../components/tiles/TileGrid";

type Props = {
  onOpenRentals: () => void;
  onOpenStock: () => void;
  onResetTasks: () => void;
  canOpenRentals: boolean;
  canOpenStock: boolean;
};

function RentalsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.25C4 7.007 5.007 6 6.25 6h11.5C18.993 6 20 7.007 20 8.25v6.5C20 15.993 18.993 17 17.75 17H6.25C5.007 17 4 15.993 4 14.75v-6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M7 11h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function StockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7.5C3 6.67 3.67 6 4.5 6h15c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-15C3.67 18 3 17.33 3 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M7 10h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function TasksHomePage({
  onOpenRentals,
  onOpenStock,
  canOpenRentals,
  canOpenStock,
}: Props) {
  const tiles = useMemo(() => {
    const nextTiles = [];

    if (canOpenRentals) {
      nextTiles.push({
        id: "rentals",
        title: "Rentals",
        description: "View rentals and create rental requests.",
        icon: <RentalsIcon />,
        onClick: () => onOpenRentals(),
      });
    }

    if (canOpenStock) {
      nextTiles.push({
        id: "stock",
        title: "Stock",
        description: "View stock and start stock orders.",
        icon: <StockIcon />,
        onClick: () => onOpenStock(),
      });
    }

    return nextTiles;
  }, [onOpenRentals, onOpenStock, canOpenRentals, canOpenStock]);

  return (
    <section className="tasksWorkspace">
      <TileGrid tiles={tiles} />
    </section>
  );
}