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
MAX_BATCHES_PER_RUN = 6

def main() -> None:
    today = dt.datetime.now(ZoneInfo("America/New_York")).date()
    current_start_year = today.year if today.month >= 10 else today.year-1
    prev_start = dt.date(current_start_year-1, 10, 1)
    prev_end = dt.date(current_start_year, 4, 15)
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

    # Continue from the last saved cursor. Several bounded batches in a
    # single run cover the full prior regular season without waiting for
    # multiple hourly workflow executions.
    for batch in range(MAX_BATCHES_PER_RUN):
        if last < prev_start:
            break
        first = max(prev_start, last - dt.timedelta(days=BATCH_DAYS - 1))
        valid = 0
        day = first
        while day <= last:
            if process(day):
                valid += 1
            day += dt.timedelta(days=1)
            time.sleep(0.12)
        # Preserve already collected results if one section is unavailable.
        if not valid:
            print(f"Could not fetch any valid dates in {first} through {last}. Preserving progress.")
            break
        completed = first == prev_start
        next_date = (first - dt.timedelta(days=1)).isoformat() if not completed else None
        PROGRESS.write_text(json.dumps({
            "targetStart": prev_start.isoformat(),
            "targetEnd": prev_end.isoformat(),
            "lastBatchStart": first.isoformat(),
            "lastBatchEnd": last.isoformat(),
            "validDates": valid,
            "nextDate": next_date,
            "complete": completed
        }, indent=2) + "\\n", encoding="utf-8")
        print(f"H2H archive batch {batch + 1}: {first} to {last}, {valid} valid dates, complete={completed}")
        if completed:
            break
        last = first - dt.timedelta(days=1)

if __name__ == "__main__":
    main()
