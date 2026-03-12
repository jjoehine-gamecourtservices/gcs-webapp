export type CreateRentalRequestPayload = {
  jobId: string;
  jobName: string;
  address: string;
  peopleIds: string[];
  dateStart: string;
  dateEnd: string;
  delivery: string;
  equipmentType: string;
  size?: string;
  drivetrain?: string;
  accessories: string[];
  contactId: string;
  companyId?: string;
  budget: string;
};

export type CreateRentalRequestResponse = {
  ok: boolean;
  itemId: string;
  itemName: string;
};

export async function createRentalRequest(
  payload: CreateRentalRequestPayload
): Promise<CreateRentalRequestResponse> {
  const r = await fetch("/api/rental-requests", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status}${text ? `: ${text}` : ""}`);
  }

  return (await r.json()) as CreateRentalRequestResponse;
}

export function invalidateRentalsCache(): void {
  try {
    localStorage.removeItem("gcs_rentals_cache_v1");
    localStorage.removeItem("gcs_rentals_cache_date_v1");
  } catch {
    // ignore
  }
}