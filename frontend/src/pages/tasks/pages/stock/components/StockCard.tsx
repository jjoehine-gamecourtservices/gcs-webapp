// frontend/src/pages/tasks/stock/components/StockCard.tsx
import React from "react";

type Props = {
  title: string;
  type: string;
  selected?: boolean;
  onClick?: () => void;
};

export default function StockCard({ title, type, selected = false, onClick }: Props) {
  return (
    <button
      type="button"
      className={`stockCard${selected ? " stockCardSelected" : ""}`}
      onClick={onClick}
    >
      <div className="stockCardPreview" />
      <div className="stockCardTitle">{title}</div>
      <div className="stockCardMeta">{type}</div>
    </button>
  );
}