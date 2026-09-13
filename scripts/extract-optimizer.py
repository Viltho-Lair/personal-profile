"""Extract game data and art from the Slayer Legend Master Optimizer.

Usage: python scripts/extract-optimizer.py [path-to-xlsx]

Writes src/data/optimizer/*.json and public/art/<area>/, then prints what
changed since the last run and which items have no art. Nothing is written
unless every area is read successfully. Run fetch-wiki-spirit-skills.py
first so spirits get their elements and skills.
"""

import json
import shutil
import sys
from datetime import date
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import openpyxl  # noqa: E402
from PIL import Image  # noqa: E402

from optimizer.gear import extract_gear, extract_gear_icons, extract_level_factors  # noqa: E402
from optimizer.relics import extract_relics  # noqa: E402
from optimizer.skills import extract_skills  # noqa: E402
from optimizer.soul_weapons import extract_soul_weapons  # noqa: E402
from optimizer.spirits import extract_spirits  # noqa: E402
from optimizer.summary import diff_items, format_diff  # noqa: E402
from optimizer.workbook import MissingHeader, image_size, slug  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "optimizer"
ART = ROOT / "public" / "art"
WIKI_SPIRITS = ROOT / "src" / "data" / "wiki" / "spirit-skills.json"
DEFAULT_SOURCE = Path.home() / "Downloads" / "Copy of Slayer Legend - Master Optimizer.xlsx"

# Art the workbook doesn't carry, from the previous pipelines. Once copied into
# public/art it is found there on later runs, so these folders can be deleted.
LEGACY_ART = {
    "weapons": ROOT / "public" / "weapons",
    "accessories": ROOT / "public" / "accessories",
}

# Previous data to compare against on the first run, before optimizer JSON exists.
LEGACY_DATA = {
    "skills": (ROOT / "src" / "data" / "skills.json", "skills"),
    "relics": (ROOT / "src" / "data" / "equipment.json", "relics"),
    "spirits": (ROOT / "src" / "data" / "equipment.json", "spirits"),
    "soul-weapons": (ROOT / "src" / "data" / "equipment.json", "soulWeapons"),
}


def suffix_for(data):
    with Image.open(BytesIO(data)) as picture:
        return "." + (picture.format or "png").lower().replace("jpeg", "jpg")


def existing_art(area, file_slug):
    for folder in (ART / area, LEGACY_ART.get(area)):
        if folder is not None and folder.exists():
            for candidate in sorted(folder.glob(f"{file_slug}.*")):
                return candidate.read_bytes()
    return None


def publish_art(area, items, icons, name_of):
    """Write art for each item, set icon and iconSize, return names with none."""
    art = {}
    for item in items:
        name = name_of(item)
        data = icons.get(name) or existing_art(area, slug(name))
        if data is not None:
            art[name] = data

    folder = ART / area
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)

    gaps = []
    for item in items:
        name = name_of(item)
        data = art.get(name)
        if data is None:
            item["icon"], item["iconSize"] = None, None
            gaps.append(name)
            continue
        filename = f"{slug(name)}{suffix_for(data)}"
        (folder / filename).write_bytes(data)
        item["icon"] = f"/art/{area}/{filename}"
        item["iconSize"] = image_size(data)[0]
    return gaps


def merge_spirit_skills(spirits):
    if not WIKI_SPIRITS.exists():
        print("warning: src/data/wiki/spirit-skills.json is missing; run scripts/fetch-wiki-spirit-skills.py")
        wiki = {}
    else:
        wiki = {s["name"]: s for s in json.loads(WIKI_SPIRITS.read_text(encoding="utf-8"))["spirits"]}

    for spirit in spirits:
        match = wiki.get(spirit["name"])
        if wiki and match is None:
            print(f"warning: the wiki has no skill for spirit {spirit['name']!r}")
        spirit["element"] = match["element"] if match else None
        spirit["skill"] = match["skill"] if match else None

    for name in sorted(wiki.keys() - {s["name"] for s in spirits}):
        print(f"warning: wiki spirit {name!r} is not in the workbook")


def previous_items(area, path, key):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8")).get(key, [])
    legacy = LEGACY_DATA.get(area)
    if legacy and legacy[0].exists():
        return json.loads(legacy[0].read_text(encoding="utf-8")).get(legacy[1], [])
    return []


def write_json(path, payload):
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    if not source.exists():
        print(f"Cannot find {source}", file=sys.stderr)
        return 1

    print(f"Reading {source.name} (this takes a little while)...")
    values = openpyxl.load_workbook(source, data_only=True)
    formulas = openpyxl.load_workbook(source, data_only=False)

    try:
        skills, skill_icons = extract_skills(values["Skills Data"])
        weapons = extract_gear(values["Equipment Data"], "WEAPONS")
        accessories = extract_gear(values["Equipment Data"], "ACCESSORIES")
        level_factors = extract_level_factors(values["Equipment Data"])
        weapon_icons = extract_gear_icons(values["EQUIPMENT"], "WEAPON")
        accessory_icons = extract_gear_icons(values["EQUIPMENT"], "ACCESSORY")
        relics, relic_icons = extract_relics(values["EQUIPMENT"], formulas["Equipment Data"])
        spirits, spirit_icons = extract_spirits(values["Equipment Data"])
        soul_weapons, soul_icons = extract_soul_weapons(values["Equipment Data"])
    except (MissingHeader, ValueError, KeyError) as error:
        print(f"Extraction stopped, nothing was written: {error}", file=sys.stderr)
        return 1

    merge_spirit_skills(spirits)
    gear_max_level = len(level_factors) - 1
    for grade in weapons + accessories:
        grade["maxLevel"] = gear_max_level

    today = date.today().isoformat()
    areas = [
        # area, JSON key, source sheet, items, icons by name, name field
        ("skills", "skills", "Skills Data", skills,
         {s["name"]: skill_icons[s["id"]] for s in skills if s["id"] in skill_icons}, "name"),
        ("weapons", "weapons", "Equipment Data, EQUIPMENT", weapons, weapon_icons, "grade"),
        ("accessories", "accessories", "Equipment Data, EQUIPMENT", accessories, accessory_icons, "grade"),
        ("relics", "relics", "EQUIPMENT, Equipment Data", relics, relic_icons, "name"),
        ("spirits", "spirits", "Equipment Data", spirits, spirit_icons, "name"),
        ("soul-weapons", "soulWeapons", "Equipment Data", soul_weapons, soul_icons, "name"),
    ]

    DATA.mkdir(parents=True, exist_ok=True)
    for area, key, sheet, items, icons, name_field in areas:
        path = DATA / f"{area}.json"
        previous = previous_items(area, path, key)
        gaps = publish_art(area, items, icons, lambda item, field=name_field: item[field])
        write_json(path, {"source": {"file": source.name, "sheet": sheet, "extractedOn": today}, key: items})
        print(format_diff(area, diff_items(previous, items, name_field)))
        if gaps:
            print(f"  no art ({len(gaps)}): {', '.join(str(g) for g in gaps)}")

    write_json(DATA / "gear-levels.json", {
        "source": {"file": source.name, "sheet": "Equipment Data", "extractedOn": today},
        "factors": level_factors,
    })
    print(f"gear-levels: enhance levels 0-{gear_max_level}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
