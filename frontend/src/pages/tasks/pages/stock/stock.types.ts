// frontend/src/pages/tasks/pages/stock/stock.types.ts
export type StockVendor = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  sortOrder: number;
};

export type StockItem = {
  id: number;
  name: string;
  size: string | null;
  modelNumber: string | null;
  price: number | null;
  picturePath: string | null;
  vendors: StockVendor[];
};

export type StockVendorCreate = {
  name: string;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
};

export type StockItemCreate = {
  name: string;
  size?: string | null;
  modelNumber?: string | null;
  price?: string | number | null;
  picturePath?: string | null;
  vendors: StockVendorCreate[];
};