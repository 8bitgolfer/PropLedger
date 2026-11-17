#!/usr/bin/env python3
"""Incrementally archive the previous NBA season for head-to-head insights.

Runs in bounded batches, newest first. Progress lives in public/history-progress.json
and is committed by the existing hourly workflow. Never synthesizes missing games.
"""
from __future__ import annotations
import datetime as dt
import json
import pathlib
import time
from zoneinfo import ZoneInfo
from update_nba_results import process, PUBLIC

PROGRESS = PUBLIC / "history-progress.json"
BATCH_DAYS = 40

def main() -> None:
    today = dt.datetime.now(ZoneInfo("America/New_York")).date()
    current_start_year = today.year if today.month >= 10 else today.year-1
    prev_start = dt.date(current_start_year-1, 10, 1)
    prev_end = dt.date(current_start_year, 6, 30)
    # Keep a previous-season archive for the current 2026-27 schedule.
    last = prev_end
    if PROGRESS.exists():
        try:
            data = json.loads(PROGRESS.read_text(encoding="utf-8"))
            if data.get("targetStart") == prev_start.isoformat():
                if data.get("complete"):
                    print("Previous-season H2H archive already completed.")
                    return
                last = dt.date.fromisoformat(data["nextDate"])
        except (ValueError, KeyError, OSError):
            pass

    first = max(prev_start, last - dt.timedelta(days=BATCH_DAYS-1))
    good = 0
    day = first
    while day <= last:
        if process(day):
            good += 1
        day += dt.timedelta(days=1)
        time.sleep(0.2)
    if good == 0:
        raise SystemExit("Previous season returned zero valid scoreboards. Progress not advanced.")
    finished = first == prev_start
    next_day = (first - dt.timedelta(days=1)).isoformat() if not finished else None
    PROGRESS.write_text(json.dumps({
        "targetStart": prev_start.isoformat(),
        "targetEnd": prev_end.isoformat(),
        "lastBatchStart": first.isoformat(),
        "lastBatchEnd": last.isoformat(),
        "validDates": good,
        "nextDate": next_day,
        "complete": finished
    }, indent=2)+"\n", encoding="utf-8")
    print(f"Previous-season H2H backfill: {first} through {last}; {good} dates; complete={finished}")

if __name__ == "__main__":
    main()
