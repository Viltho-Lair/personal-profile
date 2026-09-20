"""Fetch the prime familiar weapon sprites from the Slayer Legend Wiki's art CDN.

Usage: python scripts/fetch-wiki-prime-familiar-weapons.py

Three equipped familiars show up in game as one prime familiar: the battle
familiar's body, coloured by the attribute familiar's element, holding the
weapon familiar's weapon. The bodies are already in public/art/familiars (the
Master Optimizer's own art); only the weapon layer is missing, and it comes
from the CDN as one sprite per weapon type, element and tier.

Saves public/art/familiars/prime/<weapon>-<element>-<tier>.png. Nothing else
reads these through the data files, so there's no extractor step afterwards:
src/lib/game/prime-familiar.ts builds the paths from the same names.

The CDN also carries a `_1` copy of every sprite (the wiki's builder picks it
for a 6-star battle familiar). Every copy is byte for byte the original, so
this only mirrors the 64 distinct sprites.
"""

import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "art" / "familiars" / "prime"
# The wiki (slayerlegend.wiki) serves its game art from this CDN repository.
CDN = "https://raw.githubusercontent.com/BenDol/SlayerLegendCDN/main/game-assets/images/familiars"

# Weapon familiar -> the weapon it brings, and attribute familiar -> its element id in the sprite names.
WEAPONS = {"Spear": "spear", "Sword": "sword", "Scythe": "scythe", "Wand": "wand"}
ELEMENTS = {1: "fire", 2: "water", 3: "wind", 4: "earth"}
# One tier per art band of the weapon familiar, as prime-familiar.ts bands them.
TIERS = (1, 2, 3, 4)


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "slayer-legends-analyzer"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    written = 0
    for weapon, slug in WEAPONS.items():
        for element_id, element in ELEMENTS.items():
            for tier in TIERS:
                url = f"{CDN}/Demon{weapon}_{element_id}_{tier:02d}.png"
                try:
                    data = fetch(url)
                except Exception as error:  # noqa: BLE001 - report and carry on
                    print(f"{url}: {error}", file=sys.stderr)
                    return 1
                (OUT / f"{slug}-{element}-{tier}.png").write_bytes(data)
                written += 1
    print(f"Wrote {written} weapon sprites to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
