"""Fetch spirit elements and skills from Slayer Legend Wiki.

Usage: python scripts/fetch-wiki-spirit-skills.py

The Master Optimizer has no spirit elements or skill descriptions, so they
come from the wiki's published data (github.com/BenDol/SlayerLegendWiki).
extract-optimizer.py merges them into spirits.json by name. Run this first.
"""

import json
import urllib.request
from datetime import date
from pathlib import Path

URL = "https://raw.githubusercontent.com/BenDol/SlayerLegendWiki/main/public/data/spirit-characters.json"
OUTPUT = Path(__file__).resolve().parent.parent / "src" / "data" / "wiki" / "spirit-skills.json"


def main():
    with urllib.request.urlopen(URL, timeout=60) as response:
        payload = json.load(response)

    spirits = []
    for spirit in payload["spirits"]:
        skill = spirit.get("skill") or {}
        spirits.append({
            "name": spirit["name"],
            "element": spirit.get("element"),
            "skill": {
                "name": skill.get("name"),
                "description": skill.get("description"),
                "type": skill.get("type"),
                "cooldown": skill.get("cooldown"),
                "levels": skill.get("levels", []),
            },
        })

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(
            {"source": {"url": URL, "fetchedOn": date.today().isoformat()}, "spirits": spirits},
            indent=2,
            ensure_ascii=False,
        ) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(spirits)} spirits to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
