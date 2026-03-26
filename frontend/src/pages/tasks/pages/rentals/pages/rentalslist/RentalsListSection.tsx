import React from "react";
import RentalsList from "./RentalsList";
import RentalDetailsPane from "./RentalDetailsPane";
import type { RentalListItem } from "../../rentals.types";

type Props = {
  rentals: RentalListItem[];
  loading: boolean;
  refreshing?: boolean;
  selectedRental: RentalListItem | null;
  selectedRentalId: string;
  actionRentalId: string;
  actionError: string;
  onBack: () => void;
  onSelectRental: (rentalId: string) => void;
  onRefresh: () => void;
  onRequestQuote: (rental: RentalListItem) => void;
  onReschedule: (rental: RentalListItem) => void;
  onReserved: (rental: RentalListItem) => void;
  onCancel: (rental: RentalListItem) => void;
  onOnRent: (rental: RentalListItem) => void;
  onOffRent: (rental: RentalListItem) => void;
};

export default function RentalsListSection({
  rentals,
  loading,
  refreshing = false,
  selectedRental,
  selectedRentalId,
  actionRentalId,
  actionError,
  onBack,
  onSelectRental,
  onRefresh,
  onRequestQuote,
  onReschedule,
  onReserved,
  onCancel,
  onOnRent,
  onOffRent,
}: Props) {
  return (
    <section
      className="dashCard dashCardFlex"
      aria-label="Rentals List"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
        padding: 0,
      }}
    >
      <div
        className="dashCardHead"
        style={{
          flex: "0 0 auto",
          position: "relative",
          zIndex: 10,
          background: "rgba(16, 26, 51, 0.72)",
          backdropFilter: "blur(10px)",
          padding: 14,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <button
            type="button"
            className="dashMiniPill"
            style={{
              color: "rgba(255,255,255,0.92)",
              cursor: "pointer",
              width: "fit-content",
              display: "inline-flex",
              alignItems: "center",
              flex: "0 0 auto",
            }}
            onClick={onBack}
          >
            Back
          </button>

          <div style={{ paddingTop: 2 }}>
            <div className="dashCardTitle">Rentals</div>
            <div className="dashMuted">All upcoming, active, and completed rentals.</div>
            {actionError ? (
              <div style={{ marginTop: 8, color: "rgba(255,160,160,0.95)", fontSize: 12, fontWeight: 700 }}>
                {actionError}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="dashMiniPill"
          style={{ color: "rgba(255,255,255,0.92)", cursor: refreshing ? "default" : "pointer" }}
          onClick={onRefresh}
          disabled={refreshing}
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.25fr) minmax(280px, 0.75fr)",
          gap: 0,
          minHeight: 0,
          flex: "1 1 auto",
          height: 0,
        }}
      >
        <div
          style={{
            minWidth: 0,
            minHeight: 0,
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <RentalsList
            rentals={rentals}
            loading={loading}
            refreshing={refreshing}
            selectedRentalId={selectedRentalId}
            actionRentalId={actionRentalId}
            onSelectRental={onSelectRental}
            onRequestQuote={onRequestQuote}
            onReschedule={onReschedule}
            onReserved={onReserved}
            onCancel={onCancel}
            onOnRent={onOnRent}
            onOffRent={onOffRent}
          />
        </div>

        <div
          style={{
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <RentalDetailsPane rental={selectedRental} />
        </div>
      </div>
    </section>
  );
}