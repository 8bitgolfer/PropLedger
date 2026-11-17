#!/usr/bin/env python3
"""PropLedger NBA schedule and historical box-score archiver.

Data source: unofficial ESPN site API. Games are archived by Eastern game date;
already published historical files remain available permanently unless deleted
from the repository. Never invent missing statistics.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import pathlib
import time
import urllib.request
from zoneinfo import ZoneInfo

ROOT = pathlib.Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/"
EASTERN = ZoneInfo("America/New_York")
HEADERS = {"Accept": "application/json", "User-Agent": "PropLedger/2.0"}

def fetch(url: str) -> dict | None:
    try:
        request = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(request, timeout=18) as response:
            return json.load(response)
    except Exception as exc:
        print(f"Fetch failed: {url}: {exc}")
        return None

def eastern_date(iso: str) -> str:
    return dt.datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(EASTERN).date().isoformat()

def persist(folder: str, day: str, payload: dict) -> None:
    path = PUBLIC / folder / f"{day}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"
    if not path.exists() or path.read_text(encoding="utf-8") != serialized:
        path.write_text(serialized, encoding="utf-8")

def extract_stats(summary: dict) -> list[dict]:
    players: list[dict] = []
    for team in (summary.get("boxscore") or {}).get("players", []):
        team_data = team.get("team") or {}
        team_id = str(team_data.get("id") or "")
        abbreviation = team_data.get("abbreviation") or ""
        for group in team.get("statistics", []):
            labels = group.get("labels") or []
            for row in group.get("athletes", []):
                athlete = row.get("athlete") or {}
                values = dict(zip(labels, row.get("stats") or []))
                def integer(*keys: str) -> int | None:
                    for key in keys:
                        try:
                            if key in values:
                                return int(float(values[key]))
                        except (ValueError, TypeError):
                            return None
                    return None
                points = integer("PTS")
                rebounds = integer("REB")
                assists = integer("AST")
                steals = integer("STL")
                blocks = integer("BLK")
                threes = integer("3PM")
                if threes is None:
                    try:
                        threes = int(str(values["3PT"]).split("-")[0])
                    except (ValueError, TypeError, KeyError):
                        pass
                # No zeroes for DNP; partial or bad statistical rows are skipped.
                if not athlete.get("id") or any(n is None for n in (points, rebounds, assists, threes)):
                    continue
                players.append({
                    "id": str(athlete["id"]),
                    "name": athlete.get("displayName") or athlete.get("fullName") or "",
                    "teamId": team_id, "team": abbreviation,
                    "points": points, "rebounds": rebounds, "assists": assists,
                    "threes": threes, "steals": steals, "blocks": blocks,
                    "pra": points + rebounds + assists,
                    "pa": points + assists, "pr": points + rebounds, "ra": rebounds + assists,
                })
    return players

def process(day: dt.date) -> bool:
    key = day.strftime("%Y%m%d")
    date = day.isoformat()
    scoreboard = fetch(BASE + "scoreboard?dates=" + key)
    if not scoreboard:
        return False
    schedule = []
    results = []
    for event in scoreboard.get("events", []):
        event_id = str(event.get("id") or "")
        kickoff = event.get("date")
        comps = (event.get("competitions") or [{}])[0]
        competitors = comps.get("competitors") or []
        teams = [c.get("team") or {} for c in competitors]
        if not event_id or not kickoff or len(teams) != 2:
            continue
        game = {
            "id": event_id, "date": eastern_date(kickoff), "tipoff": kickoff,
            "teams": [{"id": str(t.get("id") or ""), "abbreviation": t.get("abbreviation") or "",
                       "name": t.get("displayName") or ""} for t in teams],
            "completed": bool(((comps.get("status") or event.get("status") or {}).get("type") or {}).get("completed")),
        }
        schedule.append(game)
        if not game["completed"]:
            continue
        summary = fetch(BASE + "summary?event=" + event_id)
        if not summary:
            continue
        players = extract_stats(summary)
        if players:
            results.append({**game, "players": players})
        time.sleep(0.08)
    if schedule:
        persist("schedule", date, {"date": date, "games": schedule})
    # Preserve already archived finals if an upstream request is temporarily incomplete.
    archive = PUBLIC / "results" / f"{date}.json"
    existing = []
    if archive.exists():
        try:
            existing = json.loads(archive.read_text(encoding="utf-8")).get("games", [])
        except (ValueError, OSError):
            pass
    merged = {g["id"]: g for g in existing}
    merged.update({g["id"]: g for g in results})
    if merged:
        persist("results", date, {"date": date, "games": list(merged.values())})
    print(f"{date}: {len(schedule)} scheduled / {len(results)} newly retrieved finals / {len(merged)} archived finals")
    return True

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", help="YYYY-MM-DD (optional historical backfill)")
    parser.add_argument("--end", help="YYYY-MM-DD (optional historical backfill)")
    args = parser.parse_args()
    today = dt.datetime.now(EASTERN).date()
    if args.start:
        start = dt.date.fromisoformat(args.start)
        end = dt.date.fromisoformat(args.end or args.start)
    else:
        start, end = today - dt.timedelta(days=12), today + dt.timedelta(days=4)
    if start > end or (end - start).days > 90:
        parser.error("Backfill must span 0–90 days with start <= end.")
    processed = 0
    day = start
    while day <= end:
        if process(day):
            processed += 1
        day += dt.timedelta(days=1)
        time.sleep(0.08)
    if not processed:
        raise SystemExit("No date returned valid NBA schedule data; archive preserved.")
    print(f"Finished {processed} scoreboard dates.")

if __name__ == "__main__":
    main()
