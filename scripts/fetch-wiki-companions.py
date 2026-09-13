"""Fetch companion data from Slayer Legend Wiki.

Usage: python scripts/fetch-wiki-companions.py

Same sources as fetch-wiki-equipment.py:

  data  https://github.com/BenDol/SlayerLegendWiki  (public/data/*.json and
        the companion guide pages under public/content/companions)
  art   https://github.com/BenDol/SlayerLegendCDN   (served via jsDelivr)

companion-characters.json holds the four companions, their skills and
passives. Its skill values are all "+0" placeholders, so they are left out.
The specialty line and the promotion option table only exist in the guide
pages, so those are read from the markdown. The wiki's companions.json is a
level table of zeros and is not used.

Portraits are the first idle frame of each companion's sprite sheet, cropped
onto a 128 px square so they render at a clean ratio.
"""

import io
import json
import re
import shutil
import sys
import urllib.request
from datetime import date
from pathlib import Path

from PIL import Image

WIKI_BASE = "https://raw.githubusercontent.com/BenDol/SlayerLegendWiki/main/public"
CDN_BASE = "https://cdn.jsdelivr.net/gh/BenDol/SlayerLegendCDN@main/game-assets/images/companions"

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "src" / "data" / "companions.json"
PUBLIC = ROOT / "public" / "companions"

PORTRAIT_SIZE = 128

# Sprite sheet folder and file stem per companion, as the CDN names them.
SPRITES = {
    "Ellie": ("ellie", "archer"),
    "Zeke": ("zeke", "warrior"),
    "Miho": ("miho", "ninja"),
    "Luna": ("luna", "mage"),
}

# Colour names the promotion option page uses, lowest to highest. The page
# notes they follow the same Common-through-Mythic ladder as other rolls.
ROLL_TIERS = ["Gray", "Green", "Orange", "Purple", "Red", "Blue"]
ROLL_RARITIES = ["Common", "Great", "Rare", "Epic", "Legendary", "Mythic"]


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def fetch_art(cdn_path):
    try:
        return fetch(f"{CDN_BASE}/{cdn_path}")
    except OSError as error:
        print(f"  missing art: {cdn_path} ({error})", file=sys.stderr)
        return None


def parse_count(value):
    return int(value.replace(",", "")) if value else None


def save_portrait(name, folder):
    directory, stem = SPRITES[name]
    data = fetch_art(f"{directory}/{stem}_01_0.png")
    if data is None:
        return None

    frame = Image.open(io.BytesIO(data)).convert("RGBA")
    sprite = frame.crop(frame.getbbox())
    if sprite.width > PORTRAIT_SIZE or sprite.height > PORTRAIT_SIZE:
        raise SystemExit(f"{name}'s idle frame no longer fits {PORTRAIT_SIZE} px")

    canvas = Image.new("RGBA", (PORTRAIT_SIZE, PORTRAIT_SIZE))
    canvas.paste(
        sprite,
        ((PORTRAIT_SIZE - sprite.width) // 2, (PORTRAIT_SIZE - sprite.height) // 2),
    )
    filename = f"{slug(name)}.png"
    canvas.save(folder / filename)
    return f"/companions/{filename}"


def save_skill_icon(companion_id, index, folder):
    """The CDN names skill icons <companion>_<skill>, some with a _1 suffix."""
    for candidate in (f"{companion_id}_{index}.png", f"{companion_id}_{index}_1.png"):
        try:
            data = fetch(f"{CDN_BASE}/skills/{candidate}")
        except OSError:
            continue
        filename = f"{companion_id}-{index}.png"
        (folder / filename).write_bytes(data)
        return f"/companions/skills/{filename}"
    print(f"  missing art: skill icon {companion_id}_{index}", file=sys.stderr)
    return None


def read_specialties(markdown):
    """The overview page's table: | **[Ellie](/companions/ellie)** | Wind | ... |"""
    specialties = {}
    for match in re.finditer(r"^\|\s*\*\*\[(\w+)\]\([^)]*\)\*\*\s*\|[^|]*\|\s*(.+?)\s*\|\s*$", markdown, re.M):
        specialties[match.group(1)] = re.sub(r"\*\*(.+?)\*\*", r"\1", match.group(2))
    return specialties


def strip_tags(value):
    return re.sub(r"<[^>]+>", "", value)


def read_promotion(markdown):
    options = []
    for line in markdown.splitlines():
        match = re.match(r"^\*\s*(.+?)\s*:\s*(.+)$", strip_tags(line).strip())
        if not match:
            continue
        values = [float(v) for v in re.findall(r"\d+(?:\.\d+)?", match.group(2))]
        if len(values) != len(ROLL_TIERS):
            continue
        label = match.group(1)
        percent = label.endswith("(%)")
        options.append(
            {
                "name": label.removesuffix("(%)").strip(),
                "percent": percent,
                "values": [int(v) if v.is_integer() else v for v in values],
            }
        )

    text = strip_tags(markdown)
    probabilities = {
        tier: int(value)
        for tier, value in re.findall(r"(Gray|Green|Orange|Purple|Red|Blue) is (\d+)%", text)
    }
    missing = [tier for tier in ROLL_TIERS if tier not in probabilities]
    if len(options) < 10 or missing:
        raise SystemExit(f"Promotion option page changed shape: {len(options)} options, missing {missing}")

    page_two = re.search(r"page 2 at ([\d.]+)x", text) or re.search(r"page 2 count at ([\d.]+)x", text)
    page_three = re.search(r"page 3 counts? at ([\d.]+)x", text)
    dice = re.search(r"maximum possible for ([\d,]+) dice", text)

    return {
        "tiers": [
            {"color": tier, "rarity": rarity, "probability": probabilities[tier]}
            for tier, rarity in zip(ROLL_TIERS, ROLL_RARITIES)
        ],
        "options": options,
        "pages": [
            {"page": 1, "multiplier": 1},
            {"page": 2, "multiplier": float(page_two.group(1)) if page_two else 1.5},
            {"page": 3, "multiplier": float(page_three.group(1)) if page_three else 2},
        ],
        "maxRollDice": parse_count(dice.group(1)) if dice else None,
    }


def read_companions(payload, specialties, folder):
    skill_folder = folder / "skills"
    skill_folder.mkdir()

    companions = []
    for companion in payload:
        name = companion["name"]
        skills, locked = [], []
        for skill in companion["skills"]:
            if skill.get("unlocked"):
                index = len(skills) + 1
                skills.append(
                    {
                        "name": skill["name"],
                        "effect": skill["effect"],
                        "maxLevel": skill["maxLevel"],
                        "icon": save_skill_icon(companion["id"], index, skill_folder),
                    }
                )
            else:
                locked.append({"name": skill["name"], "maxLevel": skill["maxLevel"]})

        passive = (companion.get("passives") or [{}])[0]
        companions.append(
            {
                "id": companion["id"],
                "name": name,
                # "Elf 000": the digits are the sheet's promotion counter, not the class.
                "className": re.sub(r"\s*\d+$", "", companion.get("type", "")),
                "element": companion.get("element"),
                "specialty": specialties.get(name),
                "portrait": save_portrait(name, folder),
                "skills": skills,
                "lockedSkills": locked,
                "passive": {
                    "name": passive.get("name"),
                    "maxLevel": passive.get("maxLevel"),
                    "stoneCost": parse_count(passive.get("stoneCost")),
                    "emeraldCost": parse_count(passive.get("emeraldCost")),
                },
                "promotionSlots": len(companion.get("promotionOptions", [])),
            }
        )
    return companions


def main():
    print("Fetching wiki data...")
    payload = json.loads(fetch(f"{WIKI_BASE}/data/companion-characters.json"))
    overview = fetch(f"{WIKI_BASE}/content/companions/index.md").decode("utf-8")
    promotion_page = fetch(f"{WIKI_BASE}/content/companions/promotion-option.md").decode("utf-8")

    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    PUBLIC.mkdir(parents=True)

    print("Fetching art...")
    companions = read_companions(payload, read_specialties(overview), PUBLIC)
    promotion = read_promotion(promotion_page)

    data = {
        "source": {
            "data": "Slayer Legend Wiki (github.com/BenDol/SlayerLegendWiki)",
            "art": "Slayer Legend CDN (github.com/BenDol/SlayerLegendCDN)",
            "url": "https://slayerlegend.wiki/companions",
            "fetchedOn": date.today().isoformat(),
        },
        "companions": companions,
        "promotion": promotion,
    }

    OUTPUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"Wrote {len(companions)} companions and "
        f"{len(promotion['options'])} promotion options"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
