// frontend/src/pages/dashboard/upcoming-jobs/UpcomingPlanningNoteModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { UpcomingPlanningJob } from "../../jobs/jobs.types";
import { fetchUpcomingPlanningNote, saveUpcomingPlanningNote } from "../../jobs/jobs.api";

type Props = {
  job: UpcomingPlanningJob;
  onClose: () => void;
  onSaved: (itemId: string) => void;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatCurrentStamp(): string {
  const now = new Date();

  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());
  const year = now.getFullYear();

  let hours = now.getHours();
  const minutes = pad2(now.getMinutes());
  const ampm = hours >= 12 ? "pm" : "am";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${month}/${day}/${year} - ${pad2(hours)}:${minutes} ${ampm}`;
}

export default function UpcomingPlanningNoteModal({ job, onClose, onSaved }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const note = await fetchUpcomingPlanningNote(job.itemId);
        if (cancelled) return;
        setText(note.noteText ?? "");
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ? String(e.message) : "Failed to load note");
      } finally {
        if (!cancelled) {
          setLoading(false);
          window.setTimeout(() => textareaRef.current?.focus(), 0);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [job.itemId]);

  const helperText = useMemo(() => "Press Tab to insert current date and time", []);

  function handleTabStamp() {
    const stamp = formatCurrentStamp();
    const current = text ?? "";
    const next = current.length > 0 ? `${current}\n${stamp}\n` : `${stamp}\n`;
    setText(next);

    window.setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const pos = next.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      await saveUpcomingPlanningNote(job.itemId, text);
      onSaved(job.itemId);
      onClose();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Notes for ${job.itemName}`}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.58)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(900px, 100%)",
          minHeight: 520,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 18,
          overflow: "hidden",
          background: "rgba(16, 26, 51, 0.98)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Job Notes</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
              {job.itemName}
              {job.jobNumber ? ` - ${job.jobNumber}` : ""}
            </div>
          </div>

          <button
            type="button"
            className="dashMiniPill"
            onClick={onClose}
            disabled={saving}
            style={{ cursor: saving ? "wait" : "pointer" }}
          >
            Close
          </button>
        </div>

        <div
          style={{
            padding: "12px 18px 0 18px",
            fontSize: 13,
            color: "rgba(255,255,255,0.68)",
          }}
        >
          {helperText}
        </div>

        <div style={{ flex: "1 1 auto", minHeight: 0, padding: 18, display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div className="dashEmpty" style={{ margin: "auto 0" }}>
              Loading note…
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  handleTabStamp();
                }
              }}
              spellCheck={false}
              style={{
                flex: "1 1 auto",
                width: "100%",
                minHeight: 320,
                resize: "none",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(7, 15, 35, 0.92)",
                color: "#fff",
                padding: 16,
                fontSize: 14,
                lineHeight: 1.55,
                outline: "none",
              }}
            />
          )}

          {error ? (
            <div style={{ marginTop: 12, color: "#ffb3b3", fontSize: 13 }}>
              {error}
            </div>
          ) : null}
        </div>

        <div
          style={{
            padding: "14px 18px 18px 18px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            className="dashMiniPill"
            onClick={onClose}
            disabled={saving}
            style={{ cursor: saving ? "wait" : "pointer" }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="dashMiniPill jobsActionButton"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving || loading}
            style={{ cursor: saving ? "wait" : "pointer" }}
          >
            <span>{saving ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}