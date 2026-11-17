#!/usr/bin/env python3
"""Build source-backed PropLedger chart data from permanently archived final games.

All model charts filter events to before a saved prediction's scheduled game.
Only real box-score numbers from archived games are included.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
archive = ROOT / "public" / "results"
dest = ROOT / "public" / "insights.json"

def main():
    games = {}
    if archive.exists():
        for file in sorted(archive.glob("????-??-??.json")):
            try:
                raw = json.loads(file.read_text(encoding="utf-8"))
            except (ValueError, OSError):
                continue
            for game in raw.get("games", []):
                gid = str(game.get("id", ""))
                players = game.get("players") or []
                if not gid or len(game.get("teams") or []) != 2 or not players:
                    continue
                games[gid] = {
                    "id": gid, "date": game.get("date", ""),
                    "teams": game["teams"],
                    "players": [
                        {k: p.get(k) for k in (
                            "id", "name", "teamId", "team", "points", "rebounds",
                            "assists", "threes", "steals", "blocks", "pra", "pa", "pr", "ra"
                        )} for p in players if p.get("id")
                    ],
                }
    output = {"schemaVersion": 1, "provider": "ESPN public site API (unofficial)",
              "games": sorted(games.values(), key=lambda g: (g["date"], g["id"]))}
    payload = json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n"
    if not dest.exists() or dest.read_text(encoding="utf-8") != payload:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(payload, encoding="utf-8")
    print(f"Indexed {len(games)} archived NBA games for historical charts")

if __name__ == "__main__":
    main()
