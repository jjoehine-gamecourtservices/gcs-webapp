import React, { useMemo } from "react";
import type { RentalListItem } from "../rentals.types";
import RentalStatusButtons from "../pages/rentalslist/RentalStatusButtons";

type Props = {
  rental: RentalListItem;
  isSelected?: boolean;
  isActionLoading?: boolean;
  onClick?: () => void;
  onRequestQuote?: () => void;
  onReschedule?: () => void;
  onReserved?: () => void;
  onCancel?: () => void;
  onOnRent?: () => void;
  onOffRent?: () => void;
};

function normalizeDisplay(value?: string): string {
  const v = (value ?? "").trim();
  return v || "-";
}

function formatPhone(value?: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function joinNamePhone(name?: string, phone?: string): string {
  const n = (name ?? "").trim();
  const p = formatPhone(phone);
  if (!n && !p) return "-";
  if (n && !p) return n;
  if (!n && p) return p;
  return `${n} - ${p}`;
}

function pillStyle(
  kind: "default" | "status-reserved" | "status-on-rent" | "status-off-rent" | "status-cancelled"
): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: 11,
    whiteSpace: "nowrap",
    padding: "3px 8px",
    borderRadius: 999,
    lineHeight: "11px",
    minHeight: 20,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 700,
    boxSizing: "border-box",
  };

  if (kind === "status-reserved") {
    return {
      ...base,
      border: "1px solid rgba(241, 196, 15, 0.50)",
      background: "rgba(241, 196, 15, 0.18)",
    };
  }

  if (kind === "status-on-rent") {
    return {
      ...base,
      border: "1px solid rgba(46, 204, 113, 0.55)",
      background: "rgba(46, 204, 113, 0.18)",
    };
  }

  if (kind === "status-off-rent") {
    return {
      ...base,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.08)",
    };
  }

  if (kind === "status-cancelled") {
    return {
      ...base,
      border: "1px solid rgba(231, 76, 60, 0.55)",
      background: "rgba(231, 76, 60, 0.18)",
    };
  }

  return base;
}

function getStatusPillStyle(status: string): React.CSSProperties {
  const normalized = (status ?? "").trim().toLowerCase();

  if (normalized === "reserved") return pillStyle("status-reserved");
  if (normalized === "on rent") return pillStyle("status-on-rent");
  if (normalized === "off rent") return pillStyle("status-off-rent");
  if (normalized === "cancelled") return pillStyle("status-cancelled");
  return pillStyle("default");
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "rgba(255,255,255,0.74)",
          lineHeight: "14px",
        }}
      >
        {label}:
      </div>

      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.94)",
          lineHeight: "17px",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function RentalCard({
  rental,
  isSelected = false,
  isActionLoading = false,
  onClick,
  onRequestQuote,
  onReschedule,
  onReserved,
  onCancel,
  onOnRent,
  onOffRent,
}: Props) {
  const titleLine = useMemo(() => {
    const name = (rental.jobName ?? "").trim();
    const num = (rental.jobNumber ?? "").trim();
    if (!name) return num || "-";
    if (!num) return name;
    return `${name} - ${num}`;
  }, [rental.jobName, rental.jobNumber]);

  const addressLine = useMemo(() => normalizeDisplay(rental.address), [rental.address]);
  const equipmentType = useMemo(() => normalizeDisplay(rental.equipmentType), [rental.equipmentType]);
  const accessories = useMemo(() => normalizeDisplay(rental.accessories), [rental.accessories]);
  const size = useMemo(() => normalizeDisplay(rental.size), [rental.size]);
  const companyLine = useMemo(
    () => joinNamePhone(rental.company, rental.companyCellContact),
    [rental.company, rental.companyCellContact]
  );
  const deliveryLine = useMemo(
    () => joinNamePhone(rental.deliveryContact, rental.deliveryCellContact),
    [rental.deliveryContact, rental.deliveryCellContact]
  );
  const dateRange = useMemo(() => normalizeDisplay(rental.dateRange), [rental.dateRange]);
  const status = useMemo(() => normalizeDisplay(rental.status), [rental.status]);

  const cardStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 18,
    padding: 14,
    border: isSelected ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.10)",
    background: isSelected ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)",
    cursor: "pointer",
    transition: "border-color 140ms ease, background 140ms ease",
    boxSizing: "border-box",
    opacity: isActionLoading ? 0.82 : 1,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "block",
        textAlign: "left",
        border: "none",
        padding: 0,
        background: "transparent",
      }}
      aria-label="Select rental"
    >
      <div style={cardStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 132px",
            gap: 12,
            alignItems: "start",
          }}
        >
          <div
            style={{
              minWidth: 0,
              display: "grid",
              gap: 8,
            }}
          >
            <div
              style={{
                fontWeight: 950,
                fontSize: 14,
                lineHeight: "18px",
                color: "rgba(255,255,255,0.96)",
                wordBreak: "break-word",
              }}
            >
              {titleLine}
            </div>

            <div
              style={{
                fontSize: 12,
                lineHeight: "16px",
                color: "rgba(255,255,255,0.76)",
                wordBreak: "break-word",
              }}
            >
              {addressLine}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              justifyItems: "stretch",
            }}
          >
            <div style={{ ...pillStyle("default"), width: "100%" }}>{dateRange}</div>
            <div style={{ ...getStatusPillStyle(status), width: "100%" }}>{status}</div>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 132px",
              gap: 14,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                minWidth: 0,
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 12,
                }}
              >
                <InfoRow label="Equipment Type" value={equipmentType} />
                <InfoRow label="Accessories" value={accessories} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 12,
                }}
              >
                <InfoRow label="Size" value={size} />
                <div />
              </div>

              <InfoRow label="Company" value={companyLine} />
              <InfoRow label="Contact" value={deliveryLine} />
            </div>

            <div
              style={{
                minWidth: 0,
                borderLeft: "1px solid rgba(255,255,255,0.10)",
                paddingLeft: 14,
                display: "grid",
                alignContent: "start",
                gap: 10,
              }}
            >
              <RentalStatusButtons
                status={rental.status}
                onRequestQuote={onRequestQuote}
                onReschedule={onReschedule}
                onReserved={onReserved}
                onCancel={onCancel}
                onOnRent={onOnRent}
                onOffRent={onOffRent}
              />

              {isActionLoading ? (
                <div
                  className="dashMuted"
                  style={{
                    fontSize: 11,
                    textAlign: "center",
                    color: "rgba(255,255,255,0.76)",
                  }}
                >
                  Updating...
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}