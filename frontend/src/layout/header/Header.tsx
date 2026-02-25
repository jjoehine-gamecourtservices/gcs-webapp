import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gcsLogo from "../../assets/gcs-logo.png";

import OptionsPage from "./pages/OptionsPage";
import UserSettingsPage from "./pages/UserSettingsPage";
import NotificationsPage from "./pages/NotificationsPage";

type HeaderPageKey = "options" | "userSettings" | "notifications";

type Props = {
  userEmail: string;
  roleLabel: string;
  onLogout: () => void;
};

const DRAWER_ANIM_MS = 200;

export default function Header({ userEmail, roleLabel, onLogout }: Props) {
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState<HeaderPageKey>("options");

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const title = useMemo(() => {
    switch (page) {
      case "options":
        return "Account";
      case "userSettings":
        return "User Settings";
      case "notifications":
        return "Notifications";
      default:
        return "Account";
    }
  }, [page]);

  const openDrawer = () => {
    setPage("options");
    setDrawerMounted(true);

    // Next frame: allow CSS to animate from "closed" -> "open"
    requestAnimationFrame(() => {
      setDrawerOpen(true);
    });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);

    // Let the slide-out animation finish before unmounting.
    window.setTimeout(() => {
      setDrawerMounted(false);
    }, DRAWER_ANIM_MS);
  };

  // ESC closes, and lock body scroll while open/mounted.
  useEffect(() => {
    if (!drawerMounted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerMounted]);

  // Focus management: focus close when opened; restore to trigger when fully closed.
  useEffect(() => {
    if (!drawerOpen) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerMounted) return;
    triggerRef.current?.focus();
  }, [drawerMounted]);

  const renderDrawerBody = () => {
    switch (page) {
      case "options":
        return (
          <OptionsPage
            onUserSettings={() => setPage("userSettings")}
            onNotifications={() => setPage("notifications")}
          />
        );
      case "userSettings":
        return <UserSettingsPage onBack={() => setPage("options")} />;
      case "notifications":
        return <NotificationsPage onBack={() => setPage("options")} />;
      default:
        return (
          <OptionsPage
            onUserSettings={() => setPage("userSettings")}
            onNotifications={() => setPage("notifications")}
          />
        );
    }
  };

  const overlay = drawerMounted ? (
    <div
      className={`dashDrawerOverlay ${drawerOpen ? "dashDrawerOverlayOpen" : ""}`}
      role="presentation"
    >
      <button
        type="button"
        className="dashDrawerBackdrop"
        aria-label="Close account panel"
        onClick={closeDrawer}
      />

      <aside
        className="dashDrawer"
        role="dialog"
        aria-modal="true"
        aria-label="Account panel"
      >
        <div className="dashDrawerHeader">
          <div className="dashDrawerTitleBlock">
            <div className="dashDrawerTitle">{title}</div>
            <div className="dashDrawerSubtitle">{userEmail}</div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="dashIconBtn"
            onClick={closeDrawer}
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="dashDrawerBody">{renderDrawerBody()}</div>

        <div className="dashDrawerFooter">
          <button
            type="button"
            className="dashBtn dashBtnDanger"
            onClick={onLogout}
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <header className="dashTopbar">
        <div className="dashBrand">
          <img
            src={gcsLogo}
            alt="Game Court Services"
            className="dashLogoImage dashLogoImageLarge"
          />
        </div>

        <div className="dashUser">
          <button
            ref={triggerRef}
            type="button"
            className="dashUserTrigger"
            onClick={openDrawer}
            aria-label="Open account menu"
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
          >
            <div className="dashUserMeta dashUserMetaClickable">
              <div className="dashUserDisplay">{userEmail}</div>
              <div className="dashUserRole">{roleLabel}</div>
            </div>
          </button>
        </div>
      </header>

      {/* Render overlay at document.body to escape stacking contexts */}
      {typeof document !== "undefined" && overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}