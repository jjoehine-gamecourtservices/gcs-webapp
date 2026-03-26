from __future__ import annotations

import threading

from app.api.jobs import _refresh_all_jobs_pipeline
from app.api.monday import _refresh_upcoming_jobs_cache
from app.api.rentals import _refresh_rentals_cache
from app.db.session import SessionLocal


_REFRESH_INTERVAL_SECONDS = 15 * 60

_lock = threading.Lock()
_stop_event = threading.Event()
_thread: threading.Thread | None = None


def _run_upcoming_jobs_refresh() -> None:
    db = SessionLocal()
    try:
        _refresh_upcoming_jobs_cache(db)
        print("[cache-scheduler] refreshed upcoming_jobs")
    except Exception as e:
        print(f"[cache-scheduler] upcoming_jobs refresh failed: {e}")
    finally:
        db.close()


def _run_all_jobs_refresh() -> None:
    db = SessionLocal()
    try:
        _refresh_all_jobs_pipeline(db)
        print("[cache-scheduler] refreshed all_jobs pipeline")
    except Exception as e:
        print(f"[cache-scheduler] all_jobs pipeline refresh failed: {e}")
    finally:
        db.close()


def _run_rentals_refresh() -> None:
    db = SessionLocal()
    try:
        _refresh_rentals_cache(db)
        print("[cache-scheduler] refreshed rentals")
    except Exception as e:
        print(f"[cache-scheduler] rentals refresh failed: {e}")
    finally:
        db.close()


def _run_all_refreshes() -> None:
    _run_upcoming_jobs_refresh()
    _run_all_jobs_refresh()
    _run_rentals_refresh()


def _worker() -> None:
    _run_all_refreshes()

    while not _stop_event.wait(_REFRESH_INTERVAL_SECONDS):
        _run_all_refreshes()


def start_cache_scheduler() -> None:
    global _thread

    with _lock:
        if _thread is not None and _thread.is_alive():
            return

        _stop_event.clear()
        _thread = threading.Thread(
            target=_worker,
            name="gcs-cache-scheduler",
            daemon=True,
        )
        _thread.start()


def stop_cache_scheduler() -> None:
    global _thread

    with _lock:
        _stop_event.set()
        _thread = None