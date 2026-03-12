import React from "react";
import Tile from "./Tile";

export type TileGridItem = {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

type Props = {
  tiles: TileGridItem[];
};

export default function TileGrid({ tiles }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        alignItems: "stretch",
      }}
    >
      {tiles.map((t) => (
        <Tile
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