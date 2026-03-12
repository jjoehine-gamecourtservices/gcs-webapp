import React from "react";

type Props = {
  onOpenRentals: () => void;
  onResetTasks: () => void;
};

export default function TasksHomePage({
  onOpenRentals,
}: Props) {
  return (
    <section className="tasksWorkspace">
      <button
        type="button"
        className="tasksTile"
        onClick={onOpenRentals}
      >
        <div className="tasksTileIconArea">
          <div className="tasksTileIcon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 8.25C4 7.007 5.007 6 6.25 6h11.5C18.993 6 20 7.007 20 8.25v6.5C20 15.993 18.993 17 17.75 17H6.25C5.007 17 4 15.993 4 14.75v-6.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M7 11h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M7 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="tasksTileTitle">Rentals</div>
        </div>
      </button>
    </section>
  );
}