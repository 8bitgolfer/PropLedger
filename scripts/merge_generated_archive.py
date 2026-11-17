#!/usr/bin/env python3
"""Merge locally fetched PropLedger NBA archives onto the newest main branch.

The workflow first saves its freshly collected 'public' folder to a temporary
snapshot, resets to the latest remote HEAD, then runs this script. Game and
player records are unioned by stable ID, never replaced wholesale.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

def read(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return None

def write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    if not path.exists() or path.read_text(encoding="utf-8") != text:
        path.write_text(text, encoding="utf-8")

def merge_games(old, new):
    mapping = {str(g.get("id")): g for g in (old or []) if g.get("id")}
    for game in new or []:
        gid = str(game.get("id") or "")
        if not gid:
            continue
        if gid not in mapping:
            mapping[gid] = game
            continue
        previous = mapping[gid]
        merged = {**previous, **game}
        if "players" in previous or "players" in game:
            people = {str(p.get("id")): p for p in previous.get("players", []) if p.get("id")}
            for p in game.get("players", []):
                if p.get("id"):
                    people[str(p["id"])] = {**people.get(str(p["id"]), {}), **p}
            merged["players"] = list(people.values())
        mapping[gid] = merged
    return sorted(mapping.values(), key=lambda g: str(g.get("id", "")))

def progress_choice(old, new):
    if not isinstance(old, dict): return new
    if not isinstance(new, dict): return old
    # Schema v2 tracks career H2H across multiple seasons. The old v1
    # "complete" flag applied only to 2025-26 and must not block v2.
    old_ver = int(old.get("schemaVersion") or 1)
    new_ver = int(new.get("schemaVersion") or 1)
    if new_ver > old_ver: return new
    if old_ver > new_ver: return old
    if old.get("complete"): return old
    if new.get("complete"): return new
    # Earlier calendar cursor means more historical games have been archived.
    old_cursor = old.get("nextDate") or "9999-12-31"
    new_cursor = new.get("nextDate") or "9999-12-31"
    return new if new_cursor < old_cursor else old

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    args = parser.parse_args()
    source = Path(args.source)
    if not source.is_dir():
        raise SystemExit(f"Snapshot directory missing: {source}")
    merged = 0
    for folder in ("results", "schedule"):
        srcdir = source / folder
        if not srcdir.exists():continue
        for item in srcdir.glob("*.json"):
            dest = PUBLIC / folder / item.name
            incoming = read(item)
            existing = read(dest)
            if not isinstance(incoming, dict):continue
            if not isinstance(existing, dict):
                shutil.copy2(item, dest) if dest.parent.exists() else (dest.parent.mkdir(parents=True,exist_ok=True),shutil.copy2(item,dest))
            else:
                output = {**existing, **incoming}
                output["games"] = merge_games(existing.get("games"), incoming.get("games"))
                write(dest,output)
            merged += 1
    for name in ("nba-players.json",):
        incoming = read(source / name)
        existing = read(PUBLIC / name)
        if not isinstance(incoming,dict):continue
        items = {str(p["id"]):p for p in (existing or {}).get("players",[]) if p.get("id")}
        for p in incoming.get("players",[]):
            if p.get("id"):items[str(p["id"])]=p
        # Avoid changing updatedAt when player data did not change.
        if items != {str(p["id"]):p for p in (existing or {}).get("players",[]) if p.get("id")}:
            write(PUBLIC/name,{"updatedAt":incoming.get("updatedAt"),"players":list(items.values())})
    saved = progress_choice(read(PUBLIC/"history-progress.json"),read(source/"history-progress.json"))
    if saved: write(PUBLIC/"history-progress.json",saved)
    print(f"Merged {merged} date files against current main branch; archives preserved.")

if __name__ == "__main__":
    main()
