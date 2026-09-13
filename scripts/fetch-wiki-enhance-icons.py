"""Fetch the character Enhance stat icons from the Slayer Legend Wiki.

Usage: python scripts/fetch-wiki-enhance-icons.py

The Master Optimizer workbook has no Enhance icons, so they come from the
wiki's Stats page (slayerlegend.wiki, art hosted in its CDN repository). Saves public/art/enhance-icons/<stat>.png;
run extract-optimizer.py afterwards to attach them to character.json.
"""

import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "art" / "enhance-icons"
# The wiki (slayerlegend.wiki) serves its game art from this CDN repository.
SITE = "https://raw.githubusercontent.com/BenDol/SlayerLegendCDN/main/game-assets"

# Stat name slug ("%" spelled "percent", as extract-optimizer.py matches it) -> icon URL on the wiki.
ICONS = {
    "atk": f"{SITE}/images/icons/icon_growth01_powerup%202_1.png",
    "hp": f"{SITE}/images/icons/icon_growth02_hpup_1.png",
    "hp-recovery": f"{SITE}/images/icons/icon_growth03_1.png",
    "crit-dmg": f"{SITE}/images/icons/icon_growth04_1.png",
    "crit-percent": f"{SITE}/images/icons/icon_growth05_1.png",
    "death-strike": f"{SITE}/images/icons/icon_growth06_1.png",
    "death-strike-percent": "https://raw.githubusercontent.com/BenDol/SlayerLegendCDN/main/user-content/images/characters/2025/12/29f69bf1c244423387a3a4ddcbec2947.png",
}


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "slayer-legends-analyzer"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def main():
    downloaded = {}
    for stem, url in ICONS.items():
        data = fetch(url)
        if not data.startswith(b"\x89PNG"):
            print(f"{stem}: {url} did not return a PNG", file=sys.stderr)
            return 1
        downloaded[stem] = data
    OUT.mkdir(parents=True, exist_ok=True)
    for stem, data in downloaded.items():
        (OUT / f"{stem}.png").write_bytes(data)
        print(f"saved {stem}.png ({len(data)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
