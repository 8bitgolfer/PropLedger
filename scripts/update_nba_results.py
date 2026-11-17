#!/usr/bin/env python3
"""Refresh recent NBA player box scores for PropLedger.
Uses ESPN's publicly reachable scoreboard/summary endpoints (unofficial, availability not guaranteed).
Only finalized games are exported. Never guesses incomplete player stats.
"""
import datetime as dt
import json
import os
import pathlib
import urllib.request
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "nba-results.json"
BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/"
HEADERS = {"Accept":"application/json", "User-Agent":"PropLedger/1.0"}
def fetch(url):
    try:
        req=urllib.request.Request(url,headers=HEADERS)
        with urllib.request.urlopen(req,timeout=20) as response:
            return json.load(response)
    except Exception as ex:
        print(f"Fetch failed: {url}: {ex}")
        return None

def player_stats(data):
    result=[]
    for team in (data.get("boxscore") or {}).get("players",[]):
        abbreviation=(team.get("team") or {}).get("abbreviation","")
        for section in team.get("statistics",[]):
            labels=section.get("labels") or []
            for athlete in section.get("athletes",[]):
                person=athlete.get("athlete") or {}
                values=athlete.get("stats") or []
                mapping=dict(zip(labels,values))
                def stat(*names):
                    for name in names:
                        if name in mapping:
                            try:return int(float(mapping[name]))
                            except (TypeError,ValueError):return None
                    return None
                pts,reb,ast,threes=stat("PTS"),stat("REB"),stat("AST"),None
                made=mapping.get("3PT")
                if made is not None:
                    try:threes=int(str(made).split("-")[0])
                    except (ValueError,TypeError):pass
                if threes is None:threes=stat("3PM")
                # DNP entries must not be scored as a 0.
                if any(x is None for x in (pts,reb,ast,threes)):continue
                result.append({
                    "id":str(person.get("id") or ""), "name":person.get("displayName") or person.get("fullName") or "",
                    "team":abbreviation, "points":pts,"rebounds":reb,"assists":ast,"threes":threes,
                    "pra":pts+reb+ast,"pa":pts+ast,"pr":pts+reb,"ra":reb+ast,
                })
    return result

def main():
    now=dt.datetime.now(dt.timezone.utc)
    allgames=[]
    # The last 10 UTC dates cover recent final games even when clocks cross midnight.
    for days_ago in range(10):
        day=(now-dt.timedelta(days=days_ago)).strftime("%Y%m%d")
        scoreboard=fetch(BASE+"scoreboard?dates="+day)
        if not scoreboard:continue
        for event in scoreboard.get("events",[]):
            eventid=str(event.get("id") or "")
            competition=(event.get("competitions") or [{}])[0]
            status=(competition.get("status") or event.get("status") or {}).get("type") or {}
            if not status.get("completed"):continue
            detail=fetch(BASE+"summary?event="+eventid)
            if not detail:continue
            players=player_stats(detail)
            if not players:continue
            teams=[(t.get("team") or {}).get("abbreviation","") for t in competition.get("competitors",[])]
            allgames.append({
                "id":eventid, "date":str(event.get("date",""))[:10],
                "home":teams[0] if teams else "", "teams":teams,
                "players":players,
                "status":"final",
            })
            time.sleep(0.1)
    OUT.parent.mkdir(parents=True,exist_ok=True)
    output={"updatedAt":now.isoformat(),"provider":"ESPN public site API (unofficial)","games":allgames}
    if allgames:
        OUT.write_text(json.dumps(output,separators=(",",":"),ensure_ascii=False)+"\n",encoding="utf-8")
        print(f"Saved {len(allgames)} final games to {OUT}")
    else:
        print("No completed games fetched; previous cache preserved.")
if __name__=="__main__":
    main()
