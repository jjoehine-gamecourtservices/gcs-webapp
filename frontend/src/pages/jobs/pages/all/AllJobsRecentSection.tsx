import React, { useEffect, useRef } from "react";
import type { JobListItem } from "../../state/useJobsAll";
import AllJobsRecentList from "./AllJobsRecentList";

type Props = {
  recentJobs: JobListItem[];
  prefsLoading: boolean;
  onOpen: (jobNumber: string) => void;
  onRemove: (jobNumber: string) => void;
  onPin: (jobNumber: string) => void;
};

export default function AllJobsRecentSection({
  recentJobs,
  prefsLoading,
  onOpen,
  onRemove,
  onPin,
}: Props) {
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef<"top" | "body" | null>(null);

  const cardWidth = 280;
  const gap = 12;

  const contentWidth = Math.max(
    cardWidth,
    recentJobs.length * cardWidth + Math.max(0, recentJobs.length - 1) * gap
  );

  function syncFromTop() {
    if (syncingRef.current === "body") return;
    syncingRef.current = "top";

    const top = topScrollRef.current;
    const body = bodyScrollRef.current;

    if (top && body) {
      body.scrollLeft = top.scrollLeft;
    }

    syncingRef.current = null;
  }

  function syncFromBody() {
    if (syncingRef.current === "top") return;
    syncingRef.current = "body";

    const top = topScrollRef.current;
    const body = bodyScrollRef.current;

    if (top && body) {
      top.scrollLeft = body.scrollLeft;
    }

    syncingRef.current = null;
  }

  useEffect(() => {
    const top = topScrollRef.current;
    const body = bodyScrollRef.current;

    if (!top || !body) return;

    top.addEventListener("scroll", syncFromTop);
    body.addEventListener("scroll", syncFromBody);

    return () => {
      top.removeEventListener("scroll", syncFromTop);
      body.removeEventListener("scroll", syncFromBody);
    };
  }, []);

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    const body = bodyScrollRef.current;
    const top = topScrollRef.current;

    if (!body || !top) return;

    const delta =
      Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

    if (delta === 0) return;

    e.preventDefault();

    const next = body.scrollLeft + delta;

    body.scrollLeft = next;
    top.scrollLeft = next;
  }

  return (
    <section className="dashCard jobsRecentSection" aria-label="Recent Jobs">
      <div
        ref={topScrollRef}
        className="jobsRecentTopScrollbar"
        aria-hidden="true"
        onWheel={handleWheel}
        style={{
          overflowX: "scroll",
          overflowY: "hidden",
        }}
      >
        <div
          className="jobsRecentTopScrollbarInner"
          style={{ width: `${contentWidth}px` }}
        />
      </div>

      <div
        ref={bodyScrollRef}
        className="jobsRecentScroll"
        role="region"
        aria-label="Recent Jobs Scroller"
        onWheel={handleWheel}
        style={{
          overflowX: "scroll",
          overflowY: "hidden",
        }}
      >
        <div
          className="jobsRecentInner"
          style={{
            width: contentWidth,
          }}
        >
          <AllJobsRecentList
            recentJobs={recentJobs}
            prefsLoading={prefsLoading}
            onOpen={onOpen}
            onRemove={onRemove}
            onPin={onPin}
          />
        </div>
      </div>
    </section>
  );
}