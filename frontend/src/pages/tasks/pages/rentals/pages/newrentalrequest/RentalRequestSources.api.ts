import type { RentalRequestOption } from "../../rentalrequest.types";

export type RentalRequestSourcesResponse = {
  jobs: RentalRequestOption[];
  people: RentalRequestOption[];
  deliveryOptions: RentalRequestOption[];
  equipmentTypes: RentalRequestOption[];
  sizeOptions: RentalRequestOption[];
  drivetrainOptions: RentalRequestOption[];
  accessories: RentalRequestOption[];
  contacts: RentalRequestOption[];
  companies: RentalRequestOption[];
};

type ManagedOptionsResponse = {
  options: RentalRequestOption[];
};

export async function fetchRentalRequestSources(): Promise<RentalRequestSourcesResponse> {
  const r = await fetch("/api/rental-request-sources", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status}${text ? `: ${text}` : ""}`);
  }

  return (await r.json()) as RentalRequestSourcesResponse;
}

async function managedOptionsRequest(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: object
): Promise<RentalRequestOption[]> {
  const r = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status}${text ? `: ${text}` : ""}`);
  }

  const data = (await r.json()) as ManagedOptionsResponse;
  return Array.isArray(data.options) ? data.options : [];
}

export async function addEquipmentType(label: string): Promise<RentalRequestOption[]> {
  return managedOptionsRequest("/api/rental-request-sources/equipment-types", "POST", { label });
}

export async function updateEquipmentType(oldLabel: string, newLabel: string): Promise<RentalRequestOption[]> {
  return managedOptionsRequest("/api/rental-request-sources/equipment-types", "PUT", { oldLabel, newLabel });
}

export async function deleteEquipmentType(label: string): Promise<RentalRequestOption[]> {
  return managedOptionsRequest("/api/rental-request-sources/equipment-types", "DELETE", { label });
}

export async function addAccessory(label: string): Promise<RentalRequestOption[]> {
  return managedOptionsRequest("/api/rental-request-sources/accessories", "POST", { label });
}

export async function updateAccessory(oldLabel: string, newLabel: string): Promise<RentalRequestOption[]> {
  return managedOptionsRequest("/api/rental-request-sources/accessories", "PUT", { oldLabel, newLabel });
}

export async function deleteAccessory(label: string): Promise<RentalRequestOption[]> {
  return managedOptionsRequest("/api/rental-request-sources/accessories", "DELETE", { label });
}