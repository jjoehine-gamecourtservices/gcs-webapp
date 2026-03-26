import React, { useEffect, useMemo, useRef, useState } from "react";
import LoadingProgressOverlay from "../../../../../../components/LoadingProgressOverlay";
import type { RentalListItem, RentalQuoteVendor } from "../../rentals.types";
import { fetchRentalQuoteVendors, runRentalAction } from "../../rentals.api";
import useRentals from "../../state/useRentals";
import RentalsListSection from "./RentalsListSection";

type QuoteModalMode = "request-quote" | "reschedule";

type QuoteVendorRow = RentalQuoteVendor & {
  checked: boolean;
};

type QuoteModalState =
  | { open: false }
  | { open: true; mode: QuoteModalMode; rental: RentalListItem };

type Props = {
  onBack: () => void;
};

function normalizeText(value?: string): string {
  return (value ?? "").trim();
}

function escapeMailtoValue(value: string): string {
  return encodeURIComponent(value);
}

function parseAddress(address?: string): { street: string; cityStateCountry: string } {
  const raw = normalizeText(address);
  if (!raw) {
    return { street: "", cityStateCountry: "" };
  }

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return {
      street: raw,
      cityStateCountry: "",
    };
  }

  return {
    street: parts[0] ?? "",
    cityStateCountry: parts.slice(1).join(", "),
  };
}

function formatDateMmDdYyyy(value?: string): string {
  const raw = normalizeText(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return raw;

  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

function parseDateRange(dateRange?: string): { start: string; end: string } {
  const raw = normalizeText(dateRange);
  if (!raw) return { start: "", end: "" };

  const parts = raw.split(" - ").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      start: formatDateMmDdYyyy(parts[0]),
      end: formatDateMmDdYyyy(parts[1]),
    };
  }

  const formatted = formatDateMmDdYyyy(raw);
  return {
    start: formatted,
    end: formatted,
  };
}

function formatPhoneNumber(value?: string): string {
  const raw = normalizeText(value);
  if (!raw) return "-";

  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return raw;
}

function vendorFirstName(name?: string): string {
  const raw = normalizeText(name);
  if (!raw) return "";
  return raw.split(/\s+/)[0] ?? raw;
}

function accessoriesPhrase(accessories?: string): string {
  const raw = normalizeText(accessories);
  return raw ? ` with ${raw}` : "";
}

function buildEmailSubject(mode: QuoteModalMode, rental: RentalListItem): string {
  const projectName = normalizeText(rental.jobName) || "Project";
  const size = normalizeText(rental.size);
  const equipmentType = normalizeText(rental.equipmentType);
  const equipmentLabel = [size, equipmentType].filter(Boolean).join(" ").trim();

  if (mode === "request-quote") {
    return `Rental Quote Request - ${projectName}${equipmentLabel ? ` - ${equipmentLabel}` : ""}`;
  }

  return `Rental Reschedule Request - ${projectName}${equipmentLabel ? ` - ${equipmentLabel}` : ""}`;
}

function buildEmailBody(mode: QuoteModalMode, rental: RentalListItem, vendor: RentalQuoteVendor): string {
  const firstName = vendorFirstName(vendor.name) || vendor.name;
  const projectName = normalizeText(rental.jobName) || "-";
  const size = normalizeText(rental.size);
  const equipmentType = normalizeText(rental.equipmentType) || "-";
  const accessoryText = accessoriesPhrase(rental.accessories);
  const equipmentLabel = [size, equipmentType].filter(Boolean).join(" ").trim() || equipmentType;

  const { street, cityStateCountry } = parseAddress(rental.address);
  const { start, end } = parseDateRange(rental.dateRange);

  const delivery = normalizeText(rental.deliveryTime) || "-";
  const contactName = normalizeText(rental.deliveryContact) || "-";
  const contactPhone = formatPhoneNumber(rental.deliveryCellContact);

  const intro =
    mode === "request-quote"
      ? `I need to request a rental quote and confirm availability for a ${equipmentLabel}${accessoryText} for the ${projectName} project.`
      : `I need to reschedule the rental for the ${equipmentLabel}${accessoryText} at the ${projectName} project.`;

  const lines = [
    `Hey, ${firstName}`,
    "",
    intro,
    "",
    "Job:",
    projectName,
    "",
    "Job site address:",
    street || "-",
    cityStateCountry || "-",
    "",
    "Requested delivery:",
    `${delivery} on ${start}${end && end !== start ? ` - ${end}` : ""}`,
    "",
    "On-site contact:",
    contactName,
    contactPhone,
    "",
    "Please provide a quote, confirm availability, and confirm the delivery time.",
    "I appreciate it,",
  ];

  return lines.join("\n");
}

function namesMatch(a?: string, b?: string): boolean {
  return normalizeText(a).toLowerCase() === normalizeText(b).toLowerCase();
}

function launchMailto(href: string) {
  const popup = window.open(href, "_blank", "noopener,noreferrer");
  if (popup) return;

  const link = document.createElement("a");
  link.href = href;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function openMailtoDraftsSequentially(
  drafts: Array<{ email: string; subject: string; body: string }>
): Promise<void> {
  for (let i = 0; i < drafts.length; i += 1) {
    const draft = drafts[i];
    const href =
      `mailto:${escapeMailtoValue(draft.email)}` +
      `?subject=${escapeMailtoValue(draft.subject)}` +
      `&body=${escapeMailtoValue(draft.body)}`;

    launchMailto(href);

    if (i < drafts.length - 1) {
      await wait(900);
    }
  }
}

export default function RentalsListPage({ onBack }: Props) {
  const { rentals, loading, refreshing, reload, error, patchRental } = useRentals();
  const [selectedRentalId, setSelectedRentalId] = useState<string>("");
  const [actionRentalId, setActionRentalId] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");
  const [modalState, setModalState] = useState<QuoteModalState>({ open: false });

  const [quoteVendors, setQuoteVendors] = useState<QuoteVendorRow[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsError, setVendorsError] = useState("");
  const [vendorsLoaded, setVendorsLoaded] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const [progressOpen, setProgressOpen] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressValue, setProgressValue] = useState(0);

  const progressTimerRef = useRef<number | null>(null);

  const selectedRental = useMemo(() => {
    return rentals.find((r) => r.id === selectedRentalId) ?? null;
  }, [rentals, selectedRentalId]);

  useEffect(() => {
    if (rentals.length === 0) {
      if (selectedRentalId) setSelectedRentalId("");
      return;
    }

    const stillExists = rentals.some((r) => r.id === selectedRentalId);
    if (!stillExists) {
      setSelectedRentalId(rentals[0].id);
    }
  }, [rentals, selectedRentalId]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  function stopProgressAnimation() {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function startProgressAnimation(maxValue: number) {
    stopProgressAnimation();

    progressTimerRef.current = window.setInterval(() => {
      setProgressValue((current) => {
        if (current >= maxValue) return current;
        const remaining = maxValue - current;
        const step = Math.max(0.45, remaining * 0.055);
        const next = current + step;
        return next > maxValue ? maxValue : next;
      });
    }, 80);
  }

  function openProgress(label: string) {
    setProgressLabel(label);
    setProgressValue(5);
    setProgressOpen(true);
    startProgressAnimation(52);
  }

  function advanceProgress(target: number) {
    setProgressValue((current) => (current < target ? target : current));
    startProgressAnimation(target);
  }

  function closeProgress() {
    stopProgressAnimation();
    setProgressValue(100);

    window.setTimeout(() => {
      setProgressOpen(false);
      setProgressLabel("");
      setProgressValue(0);
    }, 180);
  }

  function applyVendorSelection(vendors: RentalQuoteVendor[], rental: RentalListItem): QuoteVendorRow[] {
    return vendors.map((vendor) => ({
      ...vendor,
      checked: namesMatch(vendor.name, rental.company),
    }));
  }

  async function loadQuoteVendors(rental: RentalListItem, forceRefresh = false) {
    if (!forceRefresh && vendorsLoaded) {
      setQuoteVendors((current) =>
        current.map((vendor) => ({
          ...vendor,
          checked: namesMatch(vendor.name, rental.company),
        }))
      );
      return;
    }

    setVendorsLoading(true);
    setVendorsError("");

    try {
      const vendors = await fetchRentalQuoteVendors();
      setQuoteVendors(applyVendorSelection(vendors, rental));
      setVendorsLoaded(true);
    } catch (e: any) {
      setVendorsError(e?.message ? String(e.message) : "Failed to load vendors");
    } finally {
      setVendorsLoading(false);
    }
  }

  function openQuoteModal(mode: QuoteModalMode, rental: RentalListItem) {
    setActionError("");
    setModalState({
      open: true,
      mode,
      rental,
    });
    void loadQuoteVendors(rental, false);
  }

  function closeQuoteModal() {
    setModalState({ open: false });
    setVendorsError("");
  }

  function toggleVendor(vendorId: string) {
    setQuoteVendors((current) =>
      current.map((vendor) =>
        vendor.id === vendorId
          ? {
              ...vendor,
              checked: !vendor.checked,
            }
          : vendor
      )
    );
  }

  async function refreshQuoteVendors() {
    if (!modalState.open) return;
    await loadQuoteVendors(modalState.rental, true);
  }

  async function openDraftsForSelectedVendors() {
    if (!modalState.open || drafting) return;

    const selectedVendors = quoteVendors.filter((vendor) => vendor.checked);
    if (selectedVendors.length === 0) {
      setVendorsError("Select at least one vendor.");
      return;
    }

    const currentModal = modalState;
    const drafts = selectedVendors.map((vendor) => ({
      email: vendor.email,
      subject: buildEmailSubject(currentModal.mode, currentModal.rental),
      body: buildEmailBody(currentModal.mode, currentModal.rental, vendor),
    }));

    setDrafting(true);
    setVendorsError("");

    try {
      closeQuoteModal();
      await wait(150);
      await openMailtoDraftsSequentially(drafts);
    } finally {
      setDrafting(false);
    }
  }

  async function runAction(rental: RentalListItem, action: "reserved" | "cancel" | "on_rent" | "off_rent") {
    if (!rental?.id) return;

    setActionError("");
    setActionRentalId(rental.id);
    openProgress("Updating rental...");

    try {
      const result = await runRentalAction(rental.id, action);
      advanceProgress(82);

      patchRental(rental.id, {
        status: result.newStatus,
        itemName: result.itemName,
      });

      closeProgress();
    } catch (e: any) {
      closeProgress();
      setActionError(e?.message ? String(e.message) : "Failed to update rental");
    } finally {
      setActionRentalId("");
    }
  }

  async function runRefresh() {
    setActionError("");
    openProgress("Refreshing rentals...");

    try {
      await reload();
      advanceProgress(88);
      closeProgress();
    } catch (e: any) {
      closeProgress();
      setActionError(e?.message ? String(e.message) : "Failed to refresh rentals");
    }
  }

  const visibleError = actionError || error || "";
  const selectedVendorCount = quoteVendors.filter((vendor) => vendor.checked).length;

  return (
    <>
      <RentalsListSection
        rentals={rentals}
        loading={loading}
        refreshing={refreshing}
        selectedRental={selectedRental}
        selectedRentalId={selectedRentalId}
        actionRentalId={actionRentalId}
        actionError={visibleError}
        onBack={onBack}
        onSelectRental={setSelectedRentalId}
        onRefresh={() => {
          void runRefresh();
        }}
        onRequestQuote={(rental) => openQuoteModal("request-quote", rental)}
        onReschedule={(rental) => openQuoteModal("reschedule", rental)}
        onReserved={(rental) => {
          void runAction(rental, "reserved");
        }}
        onCancel={(rental) => {
          void runAction(rental, "cancel");
        }}
        onOnRent={(rental) => {
          void runAction(rental, "on_rent");
        }}
        onOffRent={(rental) => {
          void runAction(rental, "off_rent");
        }}
      />

      {modalState.open ? (
        <div
          onClick={closeQuoteModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(780px, 100%)",
              minHeight: 520,
              maxHeight: "85vh",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(16, 26, 51, 0.96)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
              padding: 18,
              display: "grid",
              gridTemplateRows: "auto auto minmax(0, 1fr) auto",
              gap: 14,
              color: "rgba(255,255,255,0.94)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 950, fontSize: 16 }}>
                  {modalState.mode === "request-quote" ? "Request Quote" : "Reschedule Rental"}
                </div>
                <div className="dashMuted" style={{ marginTop: 4 }}>
                  {`${modalState.rental.jobName || "-"} - ${modalState.rental.jobNumber || "-"}`}
                </div>
              </div>

              <button
                type="button"
                className="dashMiniPill"
                style={{ color: "rgba(255,255,255,0.92)", cursor: "pointer" }}
                onClick={closeQuoteModal}
              >
                Close
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 12px",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div className="dashMuted">
                Select vendors to open draft emails. Matching company is auto-selected when found.
              </div>

              <button
                type="button"
                className="dashMiniPill"
                style={{ color: "rgba(255,255,255,0.92)", cursor: vendorsLoading ? "default" : "pointer" }}
                onClick={() => {
                  void refreshQuoteVendors();
                }}
                disabled={vendorsLoading}
              >
                {vendorsLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div
              style={{
                minHeight: 0,
                overflow: "auto",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                padding: 12,
              }}
            >
              {vendorsLoading && quoteVendors.length === 0 ? (
                <div className="dashEmpty">Loading vendors...</div>
              ) : vendorsError ? (
                <div className="dashEmpty">{vendorsError}</div>
              ) : quoteVendors.length === 0 ? (
                <div className="dashEmpty">No vendors found.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {quoteVendors.map((vendor) => (
                    <label
                      key={vendor.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "18px minmax(0, 1fr)",
                        gap: 12,
                        alignItems: "start",
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: vendor.checked ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={vendor.checked}
                        onChange={() => toggleVendor(vendor.id)}
                        style={{ marginTop: 2 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800 }}>{vendor.name}</div>
                        <div className="dashMuted" style={{ marginTop: 4 }}>
                          {vendor.email}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div className="dashMuted">
                {selectedVendorCount} vendor{selectedVendorCount === 1 ? "" : "s"} selected
              </div>

              <button
                type="button"
                className="dashMiniPill"
                style={{ color: "rgba(255,255,255,0.92)", cursor: drafting ? "default" : "pointer" }}
                onClick={() => {
                  void openDraftsForSelectedVendors();
                }}
                disabled={drafting || vendorsLoading || quoteVendors.length === 0}
              >
                {drafting
                  ? "Opening Drafts..."
                  : modalState.mode === "request-quote"
                    ? "Request Quote"
                    : "Reschedule"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <LoadingProgressOverlay
        open={progressOpen}
        label={progressLabel}
        progress={progressValue}
      />
    </>
  );
}