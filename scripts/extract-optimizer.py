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
from optimizer.character import extract_character  # noqa: E402
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
from optimizer.navigation import extract_navigation_icons  # noqa: E402
from optimizer.memory_tree import extract_memory_tree  # noqa: E402
from optimizer.constellation import extract_constellation  # noqa: E402
from optimizer.proficiency import extract_proficiency  # noqa: E402
from optimizer.relics import extract_relics  # noqa: E402
from optimizer.skills import extract_skills  # noqa: E402
from optimizer.skill_mechanics import extract_skill_mechanics  # noqa: E402
from optimizer.refinement import extract_refinement  # noqa: E402
from optimizer.shrine import extract_shrine  # noqa: E402
from optimizer.appearance import extract_appearance  # noqa: E402
from optimizer.beasts import extract_beasts  # noqa: E402
from optimizer.black_orb import extract_black_orb  # noqa: E402
from optimizer.soul_weapons import extract_soul_weapons  # noqa: E402
from optimizer.spirits import extract_spirit_factors, extract_spirits  # noqa: E402
from optimizer.stages import extract_promotion_stages, extract_stage_bosses, extract_stage_farms  # noqa: E402
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


def attach_skill_mechanics(skills, mechanics, mastery_pages):
    """Each skill's fight mechanics, with Skill Mastery checkbox cells turned into node ids.

    A node's checkbox sits two rows under its anchor, and node ids are
    "<page>-<anchor cell>".
    """
    nodes = {}
    for page in mastery_pages:
        for node in page["nodes"]:
            anchor = node["id"].split("-", 1)[1]
            column = anchor.rstrip("0123456789")
            nodes[f"{column}{int(anchor[len(column):]) + 2}"] = node["id"]

    def node_for(cell, skill):
        if cell not in nodes:
            raise ValueError(f"Skills Data: {skill} reads SKILL MASTERY {cell}, which isn't a mastery node checkbox")
        return nodes[cell]

    for skill in skills:
        found = mechanics.get(skill["name"])
        if found is None:
            skill["mechanics"] = None
            continue
        hits = found["hits"]
        if hits and hits["mastery"]:
            hits = {"base": hits["base"], "mastery": {"node": node_for(hits["mastery"]["cell"], skill["name"]), "hits": hits["mastery"]["hits"]}}
        skill["mechanics"] = {
            **found,
            "hits": hits,
            "masteryDamage": [
                {"node": node_for(amp["cell"], skill["name"]), "multiplier": amp["multiplier"]} for amp in found["masteryDamage"]
            ],
        }


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
        skill_mechanics = extract_skill_mechanics(values["Skills Data"], formulas["Skills Data"])
        refinement = extract_refinement(formulas["SKILLS"], {s["name"]: s for s in skills})
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
        navigation_icons = extract_navigation_icons(formulas["HOME"])
        character, character_art = extract_character(
            formulas["CHARACTER"], values["CHARACTER"], values["Character Data"], values["Equipment Data"]
        )
        memory_tree, memory_tree_icons = extract_memory_tree(values["Tree Data"])
        constellation, constellation_art = extract_constellation(values["Constellation Data"])
        stage_bosses = extract_stage_bosses(values["Stage Data"])
        stage_farms = extract_stage_farms(values["Stage Data"])
        shrine, shrine_art = extract_shrine(values["Equipment Data"], formulas["EQUIPMENT"])
        clothing, guild_outfits, appearance_art = extract_appearance(formulas["APPEARANCE"], formulas["CHARACTER"])
        beasts, beast_art = extract_beasts(values["Companions Data"])
        black_orb = extract_black_orb(values["Black Orb Data"])
        promotion_stages = extract_promotion_stages(values["STAT TRACKER"])
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

    attach_skill_mechanics(skills, skill_mechanics, mastery_pages)

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

    published = publish_files("navigation", navigation_icons)
    write_json(DATA / "navigation.json", {
        "source": {"file": source.name, "sheet": "HOME", "extractedOn": today},
        "icons": {tab: {"icon": url, "iconSize": width} for tab, (url, width) in published.items()},
    })

    published = publish_files("character", character_art)
    for group in ("promotions", "classes", "growth"):
        for item in character[group]:
            item["icon"], item["iconSize"] = attach(published, item.get("icon"))
    # Enhance icons aren't in the workbook; scripts/fetch-wiki-enhance-icons.py saves them.
    for stat in character["enhance"]:
        found = next(iter(sorted((ART / "enhance-icons").glob(f"{slug(stat['name'].replace('%', ' percent'))}.*"))), None) if (ART / "enhance-icons").exists() else None
        stat["icon"] = f"/art/enhance-icons/{found.name}" if found else None
        stat["iconSize"] = image_size(found.read_bytes())[0] if found else None
    write_json(DATA / "character.json", {
        "source": {"file": source.name, "sheet": "CHARACTER, Character Data, Equipment Data", "extractedOn": today},
        **character,
    })
    print(f"character: {len(character['enhance'])} enhance stats, {len(character['growth'])} growth stats, "
          f"{len(character['promotions'])} promotions, {len(character['classes'])} classes")

    published = publish_files("memory-tree", memory_tree_icons)
    write_json(DATA / "memory-tree.json", {
        "source": {"file": source.name, "sheet": "Tree Data", "extractedOn": today},
        **memory_tree,
        "icons": {stem: {"icon": url, "iconSize": width} for stem, (url, width) in published.items()},
    })
    print(f"memory tree: {len(memory_tree['mainNodes'])} main nodes, "
          f"{sum(len(n['subNodes']) for n in memory_tree['mainNodes'])} sub nodes, {len(memory_tree['levels'])} level rows")

    published = publish_files("constellation", constellation_art)
    write_json(DATA / "constellation.json", {
        "source": {"file": source.name, "sheet": "Constellation Data", "extractedOn": today},
        **constellation,
        "art": {stem: {"icon": url, "iconSize": width} for stem, (url, width) in published.items()},
    })
    print(f"constellation: {len(constellation['signs'])} signs, "
          f"{sum(len(s['nodes']) for s in constellation['signs'])} nodes, {len(constellation['levels'])} levels")

    write_json(DATA / "promotion-bosses.json", {
        "source": {"file": source.name, "sheet": "Stage Data, STAT TRACKER", "extractedOn": today},
        "promotions": promotion_stages,
        "bossHp": stage_bosses,
    }, compact=True)  # boss HP for every stage
    print(f"promotion bosses: {len(promotion_stages)} promotions, boss HP for stages 1-{len(stage_bosses)}")

    write_json(DATA / "stages.json", {
        "source": {"file": source.name, "sheet": "Stage Data", "extractedOn": today},
        "stages": stage_farms,
    }, compact=True)  # monsters per wave and HP for every stage
    print(f"stages: {len(stage_farms)} with monsters per wave and HP")

    published = publish_files("sealed-shrine", shrine_art)
    for statue in shrine:
        statue["icon"], statue["iconSize"] = attach(published, statue["key"])
    write_json(DATA / "sealed-shrine.json", {
        "source": {"file": source.name, "sheet": "Equipment Data, EQUIPMENT", "extractedOn": today},
        "statues": shrine,
    })
    print("sealed shrine: " + ", ".join(f"{s['name']} 1-{len(s['levels'])}" for s in shrine))

    published = publish_files("appearance", appearance_art)
    for item in clothing + guild_outfits:
        item["icon"], item["iconSize"] = attach(published, item["key"])
    write_json(DATA / "appearance.json", {
        "source": {"file": source.name, "sheet": "APPEARANCE, CHARACTER", "extractedOn": today},
        "clothing": clothing,
        "guild": guild_outfits,
    })
    print(f"appearance: {len(clothing)} clothing, {len(guild_outfits)} guild shop outfits")

    published = publish_files("beasts", beast_art)
    for beast in beasts["beasts"]:
        beast["art"] = {key: attach(published, stem)[0] for key, stem in beast["art"].items()}
    beasts["awakenIcons"] = [attach(published, stem)[0] for stem in beasts["awakenIcons"]]
    write_json(DATA / "beasts.json", {
        "source": {"file": source.name, "sheet": "Companions Data (beasts and the affection table)", "extractedOn": today},
        **beasts,
    }, compact=True)
    print(f"beasts: {len(beasts['beasts'])} beasts, tiers {', '.join(beasts['tables'])}")

    write_json(DATA / "black-orb.json", {
        "source": {"file": source.name, "sheet": "Black Orb Data", "extractedOn": today},
        **black_orb,
    }, compact=True)
    print(f"black orb: {len(black_orb['buffs'])} level buffs, resonance to {black_orb['resonance'][-1]['levels']} levels")

    write_json(DATA / "skill-refinement.json", {
        "source": {"file": source.name, "sheet": "SKILLS (option ranges from the game's Refinement Effect screen)", "extractedOn": today},
        **refinement,
    })
    print(f"skill refinement: {len(refinement['skills'])} refinable skills")

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
