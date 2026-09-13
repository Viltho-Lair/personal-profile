"""Fetch soul weapon engraving grids and soul gem art from the Slayer Legend Wiki.

Usage: python scripts/fetch-wiki-soul-engraving.py

The Master Optimizer workbook has soul weapon completion effects but not the
engraving plates or the soul gem pieces. The wiki (slayerlegend.wiki) mapped
the plates from in-game screenshots; its art lives in its CDN repository.

Writes:
  src/data/optimizer/soul-weapon-grids.json  plate layouts keyed by soul weapon id
  public/art/soul-gems/gem-<rarity>-<shape>.png, type-<shape>.png
"""

import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "public" / "art" / "soul-gems"
DATA = ROOT / "src" / "data" / "optimizer"
WIKI = "https://raw.githubusercontent.com/BenDol/SlayerLegendWiki/main/public/data/soul-weapon-grids.json"
CDN = "https://raw.githubusercontent.com/BenDol/SlayerLegendCDN/main/game-assets/images/equipment/soul-weapons"
RARITIES = 6
SHAPES = 7


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "slayer-legends-analyzer"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def squash(name):
    return "".join(name.lower().split())


def main():
    soul_weapons = json.loads((DATA / "soul-weapons.json").read_text(encoding="utf-8"))["soulWeapons"]
    by_id = {weapon["id"]: weapon for weapon in soul_weapons}

    grids = {}
    for weapon in json.loads(fetch(WIKI))["weapons"]:
        slots = weapon.get("activeSlots") or []
        if not slots:
            continue  # the wiki's placeholders have no layout yet
        ours = by_id.get(weapon["id"])
        if ours is None or squash(ours["name"]) != squash(weapon["name"]):
            print(f"wiki weapon {weapon['id']} {weapon['name']!r} doesn't match the workbook's", file=sys.stderr)
            return 1
        size = int(weapon["gridType"].split("x")[0])
        rows = [["."] * size for _ in range(size)]
        for slot in slots:
            rows[slot["row"]][slot["col"]] = "#"
        grids[str(weapon["id"])] = {"name": ours["name"], "rows": ["".join(row) for row in rows]}

    art = {}
    for rarity in range(RARITIES):
        for shape in range(1, SHAPES + 1):
            art[f"gem-{rarity}-{shape}"] = f"{CDN}/SoulGem_{rarity}_{shape}.png"
    for shape in range(1, SHAPES + 1):
        art[f"type-{shape}"] = f"{CDN}/SoulGem_TypeIcon_{shape}.png"
    downloaded = {}
    for stem, url in art.items():
        data = fetch(url)
        if not data.startswith(b"\x89PNG"):
            print(f"{stem}: {url} did not return a PNG", file=sys.stderr)
            return 1
        downloaded[stem] = data

    ART.mkdir(parents=True, exist_ok=True)
    for stem, data in downloaded.items():
        (ART / f"{stem}.png").write_bytes(data)
    (DATA / "soul-weapon-grids.json").write_text(
        json.dumps({
            "source": {"site": "slayerlegend.wiki", "file": WIKI, "fetchedOn": date.today().isoformat()},
            "grids": grids,
        }, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"soul weapon grids: {len(grids)}; soul gem art: {len(downloaded)} images")
    return 0


if __name__ == "__main__":
    sys.exit(main())
