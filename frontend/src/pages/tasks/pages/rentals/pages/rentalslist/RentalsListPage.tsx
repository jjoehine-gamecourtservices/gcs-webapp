import React, { useEffect, useMemo, useState } from "react";
import type { RentalListItem } from "../../rentals.types";
import { runRentalAction } from "../../rentals.api";
import useRentals from "../../state/useRentals";
import RentalsListSection from "./RentalsListSection";

type PlaceholderModalState =
  | { open: false }
  | { open: true; mode: "request-quote" | "reschedule"; rental: RentalListItem | null };

export default function RentalsListPage() {
  const { rentals, loading, reload } = useRentals();
  const [selectedRentalId, setSelectedRentalId] = useState<string>("");
  const [actionRentalId, setActionRentalId] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");
  const [modalState, setModalState] = useState<PlaceholderModalState>({ open: false });

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

  function openPlaceholderModal(mode: "request-quote" | "reschedule", rental: RentalListItem) {
    setActionError("");
    setModalState({
      open: true,
      mode,
      rental,
    });
  }

  function closePlaceholderModal() {
    setModalState({ open: false });
  }

  async function runAction(rental: RentalListItem, action: "reserved" | "cancel" | "on_rent" | "off_rent") {
    if (!rental?.id) return;

    setActionError("");
    setActionRentalId(rental.id);

    try {
      await runRentalAction(rental.id, action);
      await reload();
    } catch (e: any) {
      setActionError(e?.message ? String(e.message) : "Failed to update rental");
    } finally {
      setActionRentalId("");
    }
  }

  return (
    <>
      <RentalsListSection
        rentals={rentals}
        loading={loading}
        selectedRental={selectedRental}
        selectedRentalId={selectedRentalId}
        actionRentalId={actionRentalId}
        actionError={actionError}
        onSelectRental={setSelectedRentalId}
        onRequestQuote={(rental) => openPlaceholderModal("request-quote", rental)}
        onReschedule={(rental) => openPlaceholderModal("reschedule", rental)}
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
          onClick={closePlaceholderModal}
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
              width: "min(520px, 100%)",
              minHeight: 260,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(16, 26, 51, 0.96)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
              padding: 18,
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
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
                  {modalState.mode === "request-quote" ? "Request Quote" : "Reschedule"}
                </div>
                <div className="dashMuted" style={{ marginTop: 4 }}>
                  {modalState.rental
                    ? `${modalState.rental.jobName || "-"} - ${modalState.rental.jobNumber || "-"}`
                    : "Rental"}
                </div>
              </div>

              <button
                type="button"
                className="dashMiniPill"
                style={{ color: "rgba(255,255,255,0.92)", cursor: "pointer" }}
                onClick={closePlaceholderModal}
              >
                Close
              </button>
            </div>

            <div
              style={{
                border: "1px dashed rgba(255,255,255,0.18)",
                borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
              }}
            />

            <div className="dashMuted">
              Placeholder modal only. Form wiring comes later.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}