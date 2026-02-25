import React from "react";

export type NavKey = "dashboard" | "admin" | "jobs" | "tasks";

export type NavItem = {
  key: NavKey;
  label: string;
};

type Props = {
  items: NavItem[];
  activeKey: NavKey;
  onSelect: (key: NavKey) => void;
};

export default function NavPanel({ items, activeKey, onSelect }: Props) {
  return (
    <aside className="dashSidebar" aria-label="Navigation">
      {items.map((it) => (
        <button
          key={it.key}
          className={activeKey === it.key ? "dashNavBtn dashNavBtnActive" : "dashNavBtn"}
          onClick={() => onSelect(it.key)}
          type="button"
        >
          {it.label}
        </button>
      ))}

      <div className="dashSidebarNote">
        Modules shown here are based on permissions (managed in Admin).
      </div>
    </aside>
  );
}