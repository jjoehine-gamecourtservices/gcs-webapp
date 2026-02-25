import React from "react";
import type { User } from "../../types/user";
import ProfileOverviewCard from "./profile/ProfileOverviewCard";
import UpcomingJobsSection from "./upcoming-jobs/UpcomingJobsSection";

type Props = {
  user: User;
};

export default function DashboardPage({ user }: Props) {
  return (
    <>
      <ProfileOverviewCard user={user} />
      <UpcomingJobsSection />
    </>
  );
}