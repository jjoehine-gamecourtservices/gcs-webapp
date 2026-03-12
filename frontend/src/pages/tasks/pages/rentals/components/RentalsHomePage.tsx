import React, { useMemo } from "react";
import TileGrid from "../../../../../components/tiles/TileGrid";

type Props = {
  onNavigate: (to: { id: "list" } | { id: "new-request" }) => void;
};

function RentalsListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.25C4 7.007 5.007 6 6.25 6h11.5C18.993 6 20 7.007 20 8.25v7.5C20 17.993 18.993 19 17.75 19H6.25C5.007 19 4 17.993 4 16.75v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8 10h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 13h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function NewRentalRequestIcon() {
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

export default function RentalsHomePage({ onNavigate }: Props) {
  const tiles = useMemo(() => {
    return [
      {
        id: "rentals-list",
        title: "Rentals",
        description: "View all upcoming, active, and completed rentals.",
        icon: <RentalsListIcon />,
        onClick: () => onNavigate({ id: "list" }),
      },
      {
        id: "new-rental-request",
        title: "New Rental Request",
        description: "Start a new rental request workflow.",
        icon: <NewRentalRequestIcon />,
        onClick: () => onNavigate({ id: "new-request" }),
      },
    ];
  }, [onNavigate]);

  return <TileGrid tiles={tiles} />;
}