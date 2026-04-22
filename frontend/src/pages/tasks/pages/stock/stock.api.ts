// frontend/src/pages/tasks/pages/stock/stock.api.ts
import { apiJson } from "../../../../api/api";
import type { StockItem, StockItemCreate } from "./stock.types";

export async function fetchStockItems(): Promise<StockItem[]> {
  const res = await apiJson<StockItem[]>("/api/stock");

  if (!res.ok || !res.data) {
    throw new Error(res.text || "Failed to load stock items.");
  }

  return res.data;
}

export async function createStockItem(payload: StockItemCreate): Promise<StockItem> {
  const res = await apiJson<StockItem>("/api/stock", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.data) {
    throw new Error(res.text || "Failed to create stock item.");
  }

  return res.data;
}