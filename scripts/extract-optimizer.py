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

from optimizer.art import find_existing_art  # noqa: E402
from optimizer.companions import extract_companions  # noqa: E402
from optimizer.familiars import extract_familiars  # noqa: E402
from optimizer.gear import (  # noqa: E402
    extract_awakening,
    extract_gear,
    extract_gear_icons,
    extract_immortal_art,
    extract_level_factors,
)
from optimizer.mastery import extract_mastery  # noqa: E402
from optimizer.proficiency import extract_proficiency  # noqa: E402
from optimizer.relics import extract_relics  # noqa: E402
from optimizer.skills import extract_skills  # noqa: E402
from optimizer.soul_weapons import extract_soul_weapons  # noqa: E402
from optimizer.spirits import extract_spirit_factors, extract_spirits  # noqa: E402
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
    "skills": ROOT / "public" / "skills",
    "weapons": ROOT / "public" / "weapons",
    "accessories": ROOT / "public" / "accessories",
    "relics": ROOT / "public" / "relics",
    "spirits": ROOT / "public" / "spirits",
    "soul-weapons": ROOT / "public" / "soul-weapons",
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
    return find_existing_art([ART / area, LEGACY_ART.get(area)], file_slug)


def publish_art(area, items, icons, name_of):
    """Write art for each item, set icon and iconSize, return names with none.

    Every item's output (filename, bytes, native width) is computed first, so
    a decode failure raises before the old art folder is deleted or anything
    new is written - never leaving a half-written folder on disk.
    """
    art = {}
    for item in items:
        name = name_of(item)
        data = icons.get(name) or existing_art(area, slug(name))
        if data is not None:
            art[name] = data

    prepared = {}
    gaps = []
    for item in items:
        name = name_of(item)
        data = art.get(name)
        if data is None:
            gaps.append(name)
            continue
        filename = f"{slug(name)}{suffix_for(data)}"
        prepared[name] = (filename, data, image_size(data)[0])

    folder = ART / area
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)

    for item in items:
        name = name_of(item)
        output = prepared.get(name)
        if output is None:
            item["icon"], item["iconSize"] = None, None
            continue
        filename, data, width = output
        (folder / filename).write_bytes(data)
        item["icon"] = f"/art/{area}/{filename}"
        item["iconSize"] = width
    return gaps


def publish_files(area, files):
    """Replace public/art/<area>/ with {stem: bytes}; return {stem: (url, width)}.

    Like publish_art, every file is decoded before the folder is touched.
    """
    prepared = {stem: (f"{stem}{suffix_for(data)}", data, image_size(data)[0]) for stem, data in files.items()}
    folder = ART / area
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True)
    published = {}
    for stem, (filename, data, width) in prepared.items():
        (folder / filename).write_bytes(data)
        published[stem] = (f"/art/{area}/{filename}", width)
    return published


def attach(published, stem):
    """(url, width) for a published stem, or (None, None)."""
    return published.get(stem, (None, None)) if stem else (None, None)


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


def write_json(path, payload, compact=False):
    if compact:
        text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    else:
        text = json.dumps(payload, indent=2, ensure_ascii=False)
    path.write_text(text + "\n", encoding="utf-8")


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
        proficiency = extract_proficiency(values["Skills Data"])
        weapons = extract_gear(values["Equipment Data"], "WEAPONS")
        accessories = extract_gear(values["Equipment Data"], "ACCESSORIES")
        level_factors = extract_level_factors(values["Equipment Data"])
        weapon_icons = extract_gear_icons(values["EQUIPMENT"], "WEAPON")
        accessory_icons = extract_gear_icons(values["EQUIPMENT"], "ACCESSORY")
        relics, relic_icons = extract_relics(values["EQUIPMENT"], formulas["Equipment Data"])
        spirits, spirit_art = extract_spirits(values["Equipment Data"])
        spirit_factors = extract_spirit_factors(values["Equipment Data"], spirits[0]["maxLevel"] if spirits else 0)
        awakening = extract_awakening(values["Equipment Data"])
        immortal_art = extract_immortal_art(values["Sprites"])
        soul_weapons, soul_icons = extract_soul_weapons(values["Equipment Data"])
        mastery_pages, mastery_icons = extract_mastery(formulas["SKILL MASTERY"])
        familiars, mana_altar, familiar_art = extract_familiars(formulas["Familiar Data"])
        companions, promotion, companion_art = extract_companions(
            formulas["COMPANIONS"], values["Companions Data"], formulas["Sprites"]
        )
    except (MissingHeader, ValueError, KeyError) as error:
        print(f"Extraction stopped, nothing was written: {error}", file=sys.stderr)
        return 1

    merge_spirit_skills(spirits)
    spirit_icons = {s["name"]: spirit_art[f"{s['name']}|Common"] for s in spirits if f"{s['name']}|Common" in spirit_art}
    for kind, icons in (("weapons", weapon_icons), ("accessories", accessory_icons)):
        if "Immortal" not in icons and 0 in immortal_art[kind]:
            icons["Immortal"] = immortal_art[kind][0]
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

    published = publish_files("immortal-gear", {
        f"{kind}-{start}": data for kind, art in immortal_art.items() for start, data in art.items()
    })
    immortal = {
        kind: [
            {"from": start, "icon": published[f"{kind}-{start}"][0], "iconSize": published[f"{kind}-{start}"][1]}
            for start in sorted(art)
        ]
        for kind, art in immortal_art.items()
    }
    write_json(DATA / "gear-levels.json", {
        "source": {"file": source.name, "sheet": "Equipment Data, Sprites", "extractedOn": today},
        "factors": level_factors,
        "awakening": awakening,
        "immortalArt": immortal,
    })
    print(f"gear-levels: enhance levels 0-{gear_max_level}")

    write_json(DATA / "skill-proficiency.json", {
        "source": {"file": source.name, "sheet": "Skills Data", "extractedOn": today},
        "bonuses": proficiency,
    })
    print(f"skill-proficiency: levels 0-{len(proficiency) - 1}")
    print(f"awakening: 0-{len(awakening) - 1}, immortal art {', '.join(f'{k} {sorted(v)}' for k, v in immortal_art.items())}")

    published = publish_files("spirit-awakening", {key.replace("|", "-").lower(): data for key, data in spirit_art.items()})
    for spirit in spirits:
        spirit["art"] = {}
        for group in ("Common", "Great", "Rare", "Epic", "Legendary", "Mythic", "Immortal", "Ancient"):
            url, width = attach(published, f"{spirit['name']}-{group}".lower())
            if url:
                spirit["art"][group] = {"icon": url, "iconSize": width}
    write_json(DATA / "spirits.json", {
        "source": {"file": source.name, "sheet": "Equipment Data", "extractedOn": today},
        "tiers": spirit_factors["tiers"],
        "spirits": spirits,
    })
    write_json(DATA / "spirit-factors.json", {
        "source": {"file": source.name, "sheet": "Equipment Data", "extractedOn": today},
        **spirit_factors,
    }, compact=True)  # 23 tiers x 1001 levels x 2 matrices; indentation would triple it
    print(f"spirit-factors: {len(spirit_factors['tiers'])} tiers x levels 0-{len(spirit_factors['atkHp']['Common']) - 1}")

    published = publish_files("skill-mastery", mastery_icons)
    for page in mastery_pages:
        for node in page["nodes"]:
            node["icon"], node["iconSize"] = attach(published, node["icon"])
            node["badge"], node["badgeSize"] = attach(published, node["badge"])
    write_json(DATA / "skill-mastery.json", {
        "source": {"file": source.name, "sheet": "SKILL MASTERY", "extractedOn": today},
        "pages": mastery_pages,
    })
    print(f"skill-mastery: {len(mastery_pages)} pages, {sum(len(p['nodes']) for p in mastery_pages)} nodes")

    published = publish_files("familiars", familiar_art)
    for familiar in familiars:
        for band in familiar["art"]:
            band["icon"], band["iconSize"] = attach(published, band["icon"])
        familiar["symbol"], familiar["symbolSize"] = attach(published, familiar["symbol"])
    write_json(DATA / "familiars.json", {
        "source": {"file": source.name, "sheet": "Familiar Data", "extractedOn": today},
        "familiars": familiars,
        "manaAltar": mana_altar,
    })
    print(f"familiars: {len(familiars)} familiars, mana altar levels 1-{len(mana_altar)}")

    published = publish_files("companion-skins", companion_art)
    for companion in companions:
        for skin in companion["skins"]:
            skin["icon"], skin["iconSize"] = attach(published, skin["icon"])
    write_json(DATA / "companions.json", {
        "source": {"file": source.name, "sheet": "COMPANIONS, Companions Data, Sprites", "extractedOn": today},
        "companions": companions,
        "promotion": promotion,
    }, compact=True)  # per-level cost tables for 36 skills
    print(f"companions: {', '.join(c['name'] for c in companions)}; {len(promotion['slotsByAdvancement'])} advancements")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
