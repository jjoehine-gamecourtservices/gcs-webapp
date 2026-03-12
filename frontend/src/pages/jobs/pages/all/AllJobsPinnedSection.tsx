import React from "react";
import type { JobListItem } from "../../state/useJobsAll";
import AllJobsPinnedList from "./AllJobsPinnedList";

type Props = {
  pinnedJobs: JobListItem[];
  prefsLoading: boolean;
  bottomBufferPx: number;
  onOpen: (jobNumber: string) => void;
  onUnpin: (jobNumber: string) => void;
  onMoveUp: (jobNumber: string) => void;
  onMoveDown: (jobNumber: string) => void;
};

export default function AllJobsPinnedSection({
  pinnedJobs,
  prefsLoading,
  bottomBufferPx,
  onOpen,
  onUnpin,
  onMoveUp,
  onMoveDown,
}: Props) {
  return (
    <section
      className="dashCard dashCardFlex jobsPinnedSection"
      aria-label="Pinned Jobs"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        padding: 0,
      }}
    >
      <div
        className="dashCardHead jobsPanelHead"
        style={{
          flex: "0 0 auto",
          position: "relative",
          zIndex: 10,
          background: "rgba(16, 26, 51, 0.72)",
          backdropFilter: "blur(10px)",
          padding: 12,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <div className="dashCardTitle">Pinned Jobs</div>
        </div>
      </div>

      <AllJobsPinnedList
        pinnedJobs={pinnedJobs}
        prefsLoading={prefsLoading}
        bottomBufferPx={bottomBufferPx}
        onOpen={onOpen}
        onUnpin={onUnpin}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </section>
  );
}