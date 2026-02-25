import React from "react";
import type { User } from "../../../types/user";

type Props = {
  user: User;
};

export default function ProfileOverviewCard({ user }: Props) {
  return (
    <div className="dashCard">
      <div className="dashCardHead">
        <div>
          <div className="dashCardTitle">Profile Overview</div>
          <div className="dashMuted">Signed in and ready.</div>
        </div>
        <div className="dashMiniPill">{user.is_master ? "Master" : "User"}</div>
      </div>

      <div className="dashStats">
        <div className="dashStat">
          <div className="dashStatLabel">Email</div>
          <div className="dashStatValue">{user.email}</div>
        </div>

        <div className="dashStat">
          <div className="dashStatLabel">Role</div>
          <div className="dashStatValue">{user.is_master ? "Master" : "User"}</div>
        </div>

        <div className="dashStat">
          <div className="dashStatLabel">Status</div>
          <div className="dashStatValue">{user.is_active ? "Active" : "Inactive"}</div>
        </div>
      </div>
    </div>
  );
}