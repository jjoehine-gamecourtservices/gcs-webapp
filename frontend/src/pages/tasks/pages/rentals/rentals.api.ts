import type {
  RentalListItem,
  RentalsResponse,
  RentalQuoteVendor,
  RentalQuoteVendorsResponse,
} from "./rentals.types";

type RentalAction =
  | "reserved"
  | "cancel"
  | "on_rent"
  | "off_rent";

type RentalActionResponse = {
  ok: boolean;
  itemId: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  itemName: string;
};

async function readError(r: Response): Promise<string> {
  let detail = "";
  try {
    const data = await r.json();
    detail = typeof data?.detail === "string" ? data.detail : JSON.stringify(data);
  } catch {
    detail = await r.text().catch(() => "");
  }
  return `HTTP ${r.status}${detail ? `: ${detail}` : ""}`;
}

export async function fetchRentals(): Promise<RentalListItem[]> {
  const r = await fetch("/api/rentals", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!r.ok) {
    throw new Error(await readError(r));
  }

  const data = (await r.json()) as RentalsResponse;
  return Array.isArray(data.rentals) ? data.rentals : [];
}

export async function refreshRentals(): Promise<RentalListItem[]> {
  const r = await fetch("/api/rentals/refresh", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!r.ok) {
    throw new Error(await readError(r));
  }

  const data = (await r.json()) as RentalsResponse;
  return Array.isArray(data.rentals) ? data.rentals : [];
}

export async function runRentalAction(itemId: string, action: RentalAction): Promise<RentalActionResponse> {
  const r = await fetch(`/api/rentals/${encodeURIComponent(itemId)}/action`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
  });

  if (!r.ok) {
    throw new Error(await readError(r));
  }

  return (await r.json()) as RentalActionResponse;
}

export async function fetchRentalQuoteVendors(): Promise<RentalQuoteVendor[]> {
  const r = await fetch("/api/monday/rental-quote-vendors", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!r.ok) {
    throw new Error(await readError(r));
  }

  const data = (await r.json()) as RentalQuoteVendorsResponse;
  return Array.isArray(data.vendors) ? data.vendors : [];
}