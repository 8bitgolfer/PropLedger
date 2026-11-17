#!/usr/bin/env python3
"""Incrementally backfill NBA regular seasons for career head-to-head graphs.

A career H2H view needs multiple seasons. This job covers the 2025-26 season
and successively earlier regular seasons through 2019-20. Each workflow run
fetches a bounded number of days. Progress is saved to public/history-progress.json.
"""
from __future__ import annotations
import datetime as dt
import json
import os
import time
from zoneinfo import ZoneInfo
from update_nba_results import process, PUBLIC

PROGRESS = PUBLIC / "history-progress.json"
BATCH_DAYS = 35
MAX_BATCHES_PER_RUN = 4
EARLIEST_START_YEAR = 2019

def season_range(year: int) -> tuple[dt.date, dt.date]:
    return dt.date(year,10,1),dt.date(year+1,4,15)

def main() -> None:
    today = dt.datetime.now(ZoneInfo("America/New_York")).date()
    current_year = today.year if today.month >= 10 else today.year-1
    latest_finished = current_year-1
    if latest_finished < EARLIEST_START_YEAR:
        return
    previous = {}
    if PROGRESS.exists():
        try:
            previous = json.loads(PROGRESS.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            previous = {}
    # Compatibility: earlier versions archived a single previous season.
    if previous.get("complete") and previous.get("targetStart") == season_range(latest_finished)[0].isoformat():
        starting_year = latest_finished-1
        cursor = season_range(starting_year)[1]
    elif previous.get("seasonYear") is not None:
        starting_year = int(previous["seasonYear"])
        cursor = dt.date.fromisoformat(previous["nextDate"]) if previous.get("nextDate") else season_range(starting_year)[1]
    elif previous.get("targetStart") == season_range(latest_finished)[0].isoformat() and previous.get("nextDate"):
        starting_year = latest_finished
        cursor = dt.date.fromisoformat(previous["nextDate"])
    else:
        starting_year = latest_finished
        cursor = season_range(starting_year)[1]
    work_remaining = MAX_BATCHES_PER_RUN
    year = starting_year
    while year >= EARLIEST_START_YEAR and work_remaining > 0:
        start,end = season_range(year)
        last = min(cursor,end)
        if last < start:
            year -= 1
            if year >= EARLIEST_START_YEAR:
                cursor = season_range(year)[1]
            continue
        first = max(start,last-dt.timedelta(days=BATCH_DAYS-1))
        good = 0
        for index in range((last-first).days+1):
            date = first+dt.timedelta(days=index)
            if process(date):
                good += 1
            time.sleep(0.08)
        if not good:
            raise SystemExit(f"No NBA scoreboards returned for {first} .. {last}; archive progress unchanged.")
        next_cursor=first-dt.timedelta(days=1)
        done_this_season=first==start
        next_year=year-1 if done_this_season else year
        next_day=season_range(next_year)[1] if done_this_season and next_year>=EARLIEST_START_YEAR else next_cursor
        completed=done_this_season and next_year<EARLIEST_START_YEAR
        payload={
            "schemaVersion":2,"seasonYear":next_year if not completed else year,
            "targetStart":start.isoformat(),"targetEnd":end.isoformat(),
            "lastBatchStart":first.isoformat(),"lastBatchEnd":last.isoformat(),
            "validDates":good,
            "nextDate":next_day.isoformat() if not completed else None,
            "complete":completed,"earliestSeason":str(EARLIEST_START_YEAR)+"-"+str(EARLIEST_START_YEAR+1)
        }
        PROGRESS.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8")
        print(f"Career H2H backfill: season {year}-{year+1} {first}..{last}; {good} scoreboard dates, complete={completed}")
        work_remaining-=1
        if completed:
            return
        year = next_year
        cursor = next_day

if __name__ == "__main__":
    main()
