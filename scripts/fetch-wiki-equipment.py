"""Fetch equipment, spirit and soul weapon data from Slayer Legend Wiki.

Usage: python scripts/fetch-wiki-equipment.py

The master document has no weapons, accessories or spirits, so those come
from the community wiki, which publishes its reference data as JSON and its
game art through a public CDN:

  data  https://github.com/BenDol/SlayerLegendWiki  (public/data/*.json)
  art   https://github.com/BenDol/SlayerLegendCDN   (served via jsDelivr)

Both belong to their authors; this only reads what they publish openly, and
the app credits the wiki wherever the data is shown.

Relic icons still come from the master document (extract-equipment.py),
because those are already matched to the right relic.
"""

import json
import re
import shutil
import sys
import urllib.request
from datetime import date
from pathlib import Path

DATA_BASE = "https://raw.githubusercontent.com/BenDol/SlayerLegendWiki/main/public/data"
CDN_BASE = "https://cdn.jsdelivr.net/gh/BenDol/SlayerLegendCDN@main/game-assets/images"

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "src" / "data" / "equipment.json"
PUBLIC = ROOT / "public"

RARITY_ORDER = ["Common", "Great", "Rare", "Epic", "Legendary", "Mythic", "Immortal"]

# Relic level bands, labelled as the master document labels them.
RELIC_BANDS = [
    "1-9",
    "10-19",
    "20-29",
    "30-39",
    "40-49",
    "50-59",
    "60-69",
    "70-89",
    "80-99",
    "100",
]


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def fetch_json(name):
    with urllib.request.urlopen(f"{DATA_BASE}/{name}.json", timeout=60) as response:
        return json.load(response)


def fetch_image(cdn_path, destination):
    try:
        with urllib.request.urlopen(f"{CDN_BASE}/{cdn_path}", timeout=60) as response:
            destination.write_bytes(response.read())
        return True
    except OSError as error:
        print(f"  missing art: {cdn_path} ({error})", file=sys.stderr)
        return False


def reset(folder):
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)
    return folder


def split_rarity(rarity):
    """Common 4 is tier Common, grade 4. Grade 4 is the lowest of a tier."""
    match = re.match(r"^([A-Za-z]+)\s*(\d+)?$", rarity.strip())
    if not match:
        return rarity, None
    return match.group(1), int(match.group(2)) if match.group(2) else None


def read_drops(drops, wanted_type, folder, url_prefix):
    items = []
    for entry in drops:
        if entry["type"] != wanted_type:
            continue

        tier, grade = split_rarity(entry["rarity"])
        icon = None
        source = entry.get("image")
        if source:
            filename = f"{slug(entry['rarity'])}{Path(source).suffix}"
            if fetch_image(source, folder / filename):
                icon = f"{url_prefix}/{filename}"

        items.append(
            {
                "id": entry["id"],
                "rarity": entry["rarity"],
                "tier": tier,
                "grade": grade,
                "tierRank": RARITY_ORDER.index(tier) if tier in RARITY_ORDER else None,
                "dropProbability": float(entry["probability"]),
                "icon": icon,
            }
        )

    # Highest tier first, and within a tier grade 1 outranks grade 4.
    items.sort(key=lambda i: (i["tierRank"] if i["tierRank"] is not None else 99, i["grade"] or 0))
    return items


def read_spirits(payload, folder):
    spirits = []
    for spirit in payload["spirits"]:
        icon = None
        source = spirit.get("image")
        if source:
            filename = f"{spirit['id']:02d}-{slug(spirit['name'])}{Path(source).suffix}"
            if fetch_image(source, folder / filename):
                icon = f"/spirits/{filename}"

        skill = spirit.get("skill") or {}
        spirits.append(
            {
                "id": spirit["id"],
                "name": spirit["name"],
                "element": spirit.get("element"),
                "icon": icon,
                "skill": {
                    "name": skill.get("name"),
                    "description": skill.get("description"),
                    "type": skill.get("type"),
                    "cooldown": skill.get("cooldown"),
                    "levels": skill.get("levels", []),
                },
            }
        )
    return spirits


def read_soul_weapons(payload, folder):
    weapons = []
    for weapon in payload:
        icon = None
        source = weapon.get("image")
        if source:
            filename = f"{weapon['id']:02d}-{slug(weapon['name'])}{Path(source).suffix}"
            if fetch_image(source, folder / filename):
                icon = f"/soul-weapons/{filename}"

        weapons.append(
            {
                "id": weapon["id"],
                "name": weapon["name"],
                "icon": icon,
                "attack": weapon.get("attack"),
                "requirements": weapon.get("requirements"),
                "disassemblyReward": weapon.get("disassemblyReward"),
                "soulColor": weapon.get("soulColor"),
                "chaosSoulGain": weapon.get("chaosSoulGain"),
                "stageRequirement": weapon.get("stageRequirement"),
            }
        )
    return weapons


def read_relics(payload):
    relics = []
    for relic in payload:
        icons = sorted((PUBLIC / "relics").glob(f"{relic['id']:02d}-*.png"))
        relics.append(
            {
                "id": relic["id"],
                "name": relic["name"],
                "icon": f"/relics/{icons[0].name}" if icons else None,
                "buff": relic.get("buff"),
                # The wiki calls this maxLevel, but it holds the buff before
                # any level band applies, exactly as the master document does.
                "baseValue": relic.get("maxLevel"),
                "factors": [
                    {"band": band, "value": value}
                    for band, value in zip(RELIC_BANDS, relic.get("scalingFactors", []))
                ],
            }
        )
    return relics


def main():
    print("Fetching wiki data...")
    drops = fetch_json("equipment-drops")["equipmentDrops"]
    spirit_payload = fetch_json("spirit-characters")
    soul_payload = fetch_json("soul-weapons")
    relic_payload = fetch_json("relics")

    print("Fetching art...")
    weapons = read_drops(drops, "Weapon", reset(PUBLIC / "weapons"), "/weapons")
    accessories = read_drops(drops, "Accessory", reset(PUBLIC / "accessories"), "/accessories")
    spirits = read_spirits(spirit_payload, reset(PUBLIC / "spirits"))
    soul_weapons = read_soul_weapons(soul_payload, reset(PUBLIC / "soul-weapons"))
    relics = read_relics(relic_payload)

    data = {
        "source": {
            "data": "Slayer Legend Wiki (github.com/BenDol/SlayerLegendWiki)",
            "art": "Slayer Legend CDN (github.com/BenDol/SlayerLegendCDN)",
            "url": "https://slayerlegend.wiki/",
            "relicIcons": "Slayer Legend Master Document",
            "fetchedOn": date.today().isoformat(),
        },
        "types": ["Weapons", "Accessories", "Relics", "Spirits"],
        "weapons": weapons,
        "accessories": accessories,
        "relics": relics,
        "spirits": spirits,
        "soulWeapons": soul_weapons,
    }

    OUTPUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"Wrote {len(weapons)} weapons, {len(accessories)} accessories, "
        f"{len(relics)} relics, {len(spirits)} spirits, {len(soul_weapons)} soul weapons"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
