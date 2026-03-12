import React, { useMemo } from "react";
import useJobsAll, { type JobListItem } from "../../state/useJobsAll";
import useJobPrefs from "../../state/useJobPrefs";
import AllJobsSection from "./AllJobsSection";
import AllJobsPinnedSection from "./AllJobsPinnedSection";
import AllJobsRecentSection from "./AllJobsRecentSection";

type Props = {
  onOpenOverview: (jobId: string) => void;
};

function isJobListItem(job: JobListItem | undefined): job is JobListItem {
  return Boolean(job);
}

export default function JobsAllPage({ onOpenOverview }: Props) {
  const { jobs, loading, refreshing, reload } = useJobsAll();

  const {
    loading: prefsLoading,
    recentJobNumbers,
    pinnedJobNumbers,
    addRecent,
    removeRecent,
    pinJob,
    unpinJob,
    movePinnedUp,
    movePinnedDown,
  } = useJobPrefs();

  const jobsByNumber = useMemo(() => {
    const map = new Map<string, JobListItem>();

    for (const job of jobs) {
      if (job?.jobNumber) {
        map.set(job.jobNumber, job);
      }
    }

    return map;
  }, [jobs]);

  const recentJobs = useMemo(() => {
    return recentJobNumbers
      .map((jobNumber) => jobsByNumber.get(jobNumber))
      .filter(isJobListItem);
  }, [recentJobNumbers, jobsByNumber]);

  const pinnedJobs = useMemo(() => {
    return pinnedJobNumbers
      .map((jobNumber) => jobsByNumber.get(jobNumber))
      .filter(isJobListItem);
  }, [pinnedJobNumbers, jobsByNumber]);

  const bottomBufferPx = 14;

  function openJob(jobNumber: string) {
    addRecent(jobNumber);
    onOpenOverview(jobNumber);
  }

  return (
    <div className="jobsPageRoot" aria-label="Jobs Page">
      <AllJobsRecentSection
        recentJobs={recentJobs}
        prefsLoading={prefsLoading}
        onOpen={openJob}
        onRemove={removeRecent}
        onPin={pinJob}
      />

      <div className="jobsGrid" aria-label="Pinned and Jobs List">
        <AllJobsPinnedSection
          pinnedJobs={pinnedJobs}
          prefsLoading={prefsLoading}
          bottomBufferPx={bottomBufferPx}
          onOpen={openJob}
          onUnpin={unpinJob}
          onMoveUp={movePinnedUp}
          onMoveDown={movePinnedDown}
        />

        <AllJobsSection
          jobs={jobs}
          loading={loading}
          refreshing={refreshing}
          reload={reload}
          bottomBufferPx={bottomBufferPx}
          onOpen={openJob}
          onPin={pinJob}
        />
      </div>
    </div>
  );
}