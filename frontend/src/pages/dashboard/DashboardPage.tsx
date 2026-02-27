import React from "react";
import type { User } from "../../types/user";
import ProfileOverviewCard from "./profile/ProfileOverviewCard";
import UpcomingJobsSection from "./upcoming-jobs/UpcomingJobsSection";

type Props = {
  user: User;
  onViewAllJobs: () => void;
  onOpenJobOverview: (jobId: string) => void;
};

export default function DashboardPage({ user, onViewAllJobs, onOpenJobOverview }: Props) {
  return (
    <div className="dashboard-grid">
      {/* Left column: Profile + reserved space for future modules */}
      <div className="dashboard-left">
        <div className="dashboard-profileSquare">
          <ProfileOverviewCard user={user} />
        </div>

        {/* Intentional empty space / placeholder for future module */}
        <div className="dashboard-leftSlot" aria-hidden="true" />
      </div>

      {/* Right column: Upcoming Jobs */}
      <div className="dashboard-right">
        <UpcomingJobsSection onViewAllJobs={onViewAllJobs} onOpenJobOverview={onOpenJobOverview} />
      </div>
    </div>
  );
}