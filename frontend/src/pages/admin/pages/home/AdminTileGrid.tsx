import React from "react";
import AdminTile from "./AdminTile";

type Tile = {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

type Props = {
  tiles: Tile[];
};

export default function AdminTileGrid({ tiles }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        // Bigger, more “template card” layout:
        // - min width makes cards larger
        // - auto-fit keeps it responsive
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        alignItems: "stretch",
      }}
    >
      {tiles.map((t) => (
        <AdminTile
          key={t.id}
          title={t.title}
          description={t.description}
          icon={t.icon}
          disabled={t.disabled}
          onClick={t.onClick}
        />
      ))}
    </div>
  );
}