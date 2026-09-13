# Optimizer Data and Player Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the analyzer's two data pipelines with one extractor over the Master Optimizer workbook, and let players save their levels, ownership and equipped items in the browser on the existing Skill and Equips screens.

**Architecture:** A Python package (`scripts/optimizer/`) finds tables in the workbook by header text and writes JSON plus art into the repo. A framework-free TypeScript profile module (`src/lib/profile/`) holds pure rules, storage and migration, tested with Vitest, and is exposed to React through one `useProfile()` hook. The existing analyzer components switch to the new data and the hook.

**Tech Stack:** Python 3.13 with openpyxl and Pillow (stdlib `unittest` for tests), Next.js 16, React 19, TypeScript, Tailwind v4, shadcn (Base UI), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-13-optimizer-data-and-player-profile-design.md`

## Global Constraints

- Workbook input defaults to `~/Downloads/Copy of Slayer Legend - Master Optimizer.xlsx`; the CLI accepts another path as its first argument.
- Player-state columns are never extracted: `OWNED`, `CURRENT LEVEL`, `EQUIPPED`, `CURRENT EQUIP EFFECT`, relic `LEVEL`/`BONUS`/`SUCCESS RATE`, spirit `RARITY`/`LEVEL`.
- Tables are located by header text. A missing header raises `MissingHeader` naming it, and no output is written for that area.
- JSON goes to `src/data/optimizer/`, art to `public/art/<area>/`. Every JSON file has a `source` block: `file`, `sheet`, `extractedOn`.
- Profile storage key `slayer-analyzer.profile`; unreadable backup key `slayer-analyzer.profile.unreadable`; legacy keys `analyzer.skillLevels` and `analyzer.relicLevels`.
- Profile entries are keyed by name (the grade name for weapons and accessories).
- Python tests use stdlib `unittest` only. TypeScript tests use Vitest, for `src/lib/profile/` only.
- Reuse existing UI pieces: `Sprite`, `TIER_TEXT`/`TIER_BORDER`/`ELEMENT_TEXT`/`ELEMENT_BORDER` from `tiers.ts`, tokens such as `text-dim`, `text-ink`, `border-ink/15`.
- A task is done when its tests pass and `npx tsc --noEmit` and `npx eslint .` are clean. The final task also runs `npx next build`.
- Each task ends with a commit step. Run it only after the user has approved committing for this execution.
- Do not modify another session's companion work: `src/components/analyzer/companion-panel.tsx`, `src/components/analyzer/companions.ts`, `src/data/companions.json`, `public/companions/`, `scripts/fetch-wiki-companions.py`. Edits to `analyzer-shell.tsx` must keep its `CompanionPanel` branch.

## Workbook map

Recorded during planning, as the spec's first implementation step requires. Rows and columns are 1-based as shown in Excel.

**Skills Data** — header row 1. Row 2 is a `Locked` placeholder; skills run from row 3 to 66 (64 skills).

| Header | Column | Field |
|---|---|---|
| `SKILL` | A | name |
| `SKILL BASIC DESCRIPTION` | E | description.basic |
| `SKILL SPECIFIC DESCRIPTION` | F | description.specific |
| `Tier` | G | grade (Common … Immortal) |
| `Id` | H | id |
| `dmgType` | J | element: 0 none, 1 Fire, 2 Water, 3 Wind, 4 Earth (checked against all 44 elemental skills already in the app) |
| `MaxLevel` | M | maxLevel |
| `MpCost` | T | mpCost |
| `InitValue` | U | baseValue |
| `upgradeValue` | V | upgradeValue |
| `ActiveNeedValue` | W | cooldown (Fire Slash 12, matching the old data) |
| `Range` | X | range |
| `Duration` | Y | duration |

Excluded: `CURRENT LEVEL` (D). Icons: 128 px images anchored in column C of each skill row; column B holds 64 px secondary icons. Take the largest image on the row between the name column and the `CURRENT LEVEL` column.

**Equipment Data — WEAPONS** — title `WEAPONS` at A1, header row 2, grades in rows 3–27 (25).

| Header | Column | Field |
|---|---|---|
| `TYPE` | A | grade, e.g. `Common 4`, `Immortal` |
| `MULTIPLIER` | C | multiplier |
| `MAX LVL` | E | baseMaxLevel (200) |
| `CRIT HIT WHEN 0` | F | secondary.critHitAt0 |
| `GOLD BONUS` | G | secondary.goldBonus |
| `CRIT HIT INCREASE AT 0` | H | secondary.critHitIncreaseAt0 |

Excluded: `OWNED` (B), `CURRENT LEVEL` (D), `CURRENT EQUIP EFFECT` (I). No art in the workbook.

**Equipment Data — ACCESSORIES** — title `ACCESSORIES` at A29, header row 30, grades in rows 31–55 (25). Same as weapons except the secondary headers: `MAX MANA AT 0` (F) → maxManaAt0, `EXP Bonus` (G) → expBonus, `MANA RECOVERY AT 0` (H) → manaRecoveryAt0.

**Equipment Data — Equip ATK factor** — title `Equip ATK factor` at L1, header row 2 (`Stage` in L is the level, `Factor` in M), rows 3–1703: levels 0–1700.

- Equip effect % = `MULTIPLIER × factor(level)` (formula in I3).
- Owned effect % = equip effect % × 0.3 (F149 is `I/1000*3` against E149's `I/100`).
- Checked against the game: a Common 4 accessory at level 297 gives 109.9% and 33.0%, matching the in-game Rusty Bracelet (110%, +33%).
- The Immortal weapon also multiplies by a weapon awakening factor (I27); awakening is not modelled in this milestone.

**Equipment Data — SOUL WEAPONS** — title `SOUL WEAPONS` at X1, header row 2. Row 3 is a `None` placeholder; 89 soul weapons in rows 4–92.

| Header | Column | Field |
|---|---|---|
| `NAME` | X | name |
| `ICON` | Y | art anchored on each row |
| `SOUL COLOR` | Z | soulColor |
| `REQUIREMENTS` | AA | cost; the next column (AB) holds the required weapon text, e.g. `Steel Sword Grade 1` |
| `ATTACK` | AC | attack |
| `STAGE REQUIREMENT` | AD | stage.number; the next column (AE) holds stage.name |
| `Engraving ATK` | AF | engraving.atk |
| `Engraving HP` | AG | engraving.hp |

Disassembly reward is not stored anywhere in the workbook (all 33 sheets searched). It is derived as `cost / 2`, which holds for all 81 soul weapons in the wiki data.

**Equipment Data — RELICS** — title `RELICS` at W136, header row 137 (`RELIC` W, `MULTIPLIER` AA), relics in rows 138–149 (12). Names here are misspelled (`Strength Glove`, `Emporer Ring`), so display names come from the EQUIPMENT sheet. Each `MULTIPLIER` cell is a formula encoding level bands:

```
=IF(EQUIPMENT!E73<10,0.05, IF(EQUIPMENT!E73<20,0.055, IF(EQUIPMENT!E73<30,0.06, IF(EQUIPMENT!E73<40,0.065, IF(EQUIPMENT!E73<50,0.07, IF(EQUIPMENT!E73<60,0.08, IF(EQUIPMENT!E73<70,0.1, IF(EQUIPMENT!E73<80,0.12, IF(EQUIPMENT!E73<90,0.15, IF(EQUIPMENT!E73<100,0.18,0.22))))))))))
```

That gives bands 0–9, 10–19, … 90–99 and 100+. Buff % at level L = `L × factor × 100`, so Strength Gloves at 100 is 2,200% and at 50 is 400%.

**EQUIPMENT — relic block** — header row 72 (`ICON` C, `RELIC` D, `BONUS` F). Relic rows 73, 75, … 95. Column D reads `Strength Gloves Max Level 100`; column F reads `Extra Dmg +0%`. Same order as Equipment Data rows 138–149.

**Equipment Data — SPIRITS BASE** — title `SPIRITS BASE` at CJ1, header row 2 (`NAME` CJ, then rarity columns starting `Common` CK), spirits in rows 3–14: Ark, Bo, Herh, Kart, Loar, Luga, Mum, Noah, Radon, Sala, Todd, Zappy. Art is anchored per rarity column; use the `Common` column.

**Equipment Data — SPIRIT COST** — title `SPIRIT COST` at CG1, header row 2 (`Level` CG), rows 3–1003: spirit max level 1000.

**Not in the workbook:** spirit elements and spirit skills. They come from the wiki's `spirit-characters.json`, whose 12 names match exactly.

## Decisions made while mapping

1. Gear detail panels show equip and owned effect at the player's enhance level, using the formula above.
2. Gear level input runs 0–1700, the range of the factor table, since awakening lifts the base cap of 200. `baseMaxLevel` is kept for display.
3. Soul weapon `disassemblyReward` is derived as `cost / 2`.
4. Spirit `maxLevel` is 1000.
5. The skill grid lays 64 skills out as element columns sorted by grade rank then Id; element-less skills (Rave, Mantra) get their own final row.
6. Relic bands come from the workbook formulas, which fixes the current app's values below level 100.
7. The workbook has no gear art, so existing wiki art in `public/weapons/` and `public/accessories/` is copied into `public/art/`; grades without art are listed as gaps.

## File structure

**Create — extractor**

| File | Responsibility |
|---|---|
| `scripts/optimizer/__init__.py` | Package marker |
| `scripts/optimizer/workbook.py` | Finding tables, reading values, reading anchored images |
| `scripts/optimizer/skills.py` | Skills Data → skill records and icons |
| `scripts/optimizer/gear.py` | Weapons, accessories and the level factor table |
| `scripts/optimizer/relics.py` | Relic names, buffs and parsed level bands |
| `scripts/optimizer/spirits.py` | Spirit names, max level and art |
| `scripts/optimizer/soul_weapons.py` | Soul weapon records and art |
| `scripts/optimizer/summary.py` | Change summary against the previous JSON |
| `scripts/optimizer/tests/__init__.py` | Test package marker |
| `scripts/optimizer/tests/test_*.py` | One test module per extractor module, plus `test_output.py` for the real output |
| `scripts/extract-optimizer.py` | CLI: loads the workbook, runs extractors, writes JSON and art, prints summary and gaps |
| `scripts/fetch-wiki-spirit-skills.py` | Fetches spirit elements and skills from the wiki (replaces `fetch-wiki-equipment.py`) |

**Create — profile**

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Vitest with the `@` path alias |
| `src/lib/profile/types.ts` | `ProfileV1`, kinds, `EMPTY_PROFILE` |
| `src/lib/profile/rules.ts` | Pure actions and selectors enforcing the spec's rules |
| `src/lib/profile/storage.ts` | Parse, load, save, unreadable backup |
| `src/lib/profile/migration.ts` | Frozen legacy id → name tables and legacy import |
| `src/lib/profile/use-profile.ts` | External store and the `useProfile()` hook |
| `src/lib/profile/*.test.ts` | Vitest suites for rules, storage and migration |

**Create — UI**

| File | Responsibility |
|---|---|
| `src/components/analyzer/data.ts` | Typed access to `src/data/optimizer/*.json` and derived values |
| `src/components/analyzer/profile-controls.tsx` | Owned toggle, Equip button, E badge, Reset profile |

**Create — game formulas**

| File | Responsibility |
|---|---|
| `src/lib/game/formulas.ts` | Skill power, gear equip/owned effect, relic bands and buff |
| `src/lib/game/formulas.test.ts` | Formula tests against values confirmed in game |

**Modify:** `skill-grid.tsx`, `gear-grid.tsx`, `relic-list.tsx`, `spirit-grid.tsx`, `equipment-panel.tsx`, `analyzer-shell.tsx`, `sprite.tsx`, `package.json`.

**Reduce in the final task:** `src/components/analyzer/equipment.ts` becomes a re-export of `formatValue`, because the companion panel imports it. `src/components/analyzer/use-levels.ts` stays for the same reason.

**Delete in the final task:** `scripts/extract-skills.py`, `scripts/extract-relic-icons.py`, `scripts/fetch-wiki-equipment.py`, `src/components/analyzer/skills.ts`, `src/data/skills.json`, `src/data/equipment.json`, and whichever of `public/skills/`, `public/elements/`, `public/weapons/`, `public/accessories/`, `public/relics/`, `public/spirits/`, `public/soul-weapons/` nothing still references.

---

### Task 1: Pre-flight check and workbook helpers

**Files:**
- Create: `scripts/optimizer/__init__.py`
- Create: `scripts/optimizer/workbook.py`
- Create: `scripts/optimizer/tests/__init__.py`
- Test: `scripts/optimizer/tests/test_workbook.py`

**Interfaces:**
- Consumes: nothing.
- Produces (`optimizer.workbook`):
  - `class MissingHeader(Exception)`
  - `normalise(value) -> str`
  - `find_cell(sheet, wanted: str, *, min_row=1, max_row=None, min_col=1, max_col=None) -> tuple[int, int]`
  - `header_columns(sheet, header_row: int, names: list[str], *, min_col=1, max_col=None) -> dict[str, int]`
  - `rows_until_blank(sheet, first_row: int, key_col: int) -> Iterator[int]`
  - `number(value) -> int | float | bool | None`
  - `text(value) -> str | None`
  - `slug(value) -> str`
  - `split_grade(value: str) -> tuple[str, int | None]`
  - `images_by_cell(sheet) -> dict[tuple[int, int], bytes]`
  - `image_size(data: bytes) -> tuple[int, int]`
  - `largest_image_on_row(images, row: int, first_col: int, last_col: int) -> bytes | None`

- [ ] **Step 1: Confirm the working tree is clean**

Run: `git status --short`

Expected: nothing listed except `.claude/`, `docs/` and this plan. If any other file is modified or untracked — for example another session's companion work or uncommitted art changes — stop and ask the user to commit or set that work aside before continuing.

- [ ] **Step 2: Write the failing tests**

Create empty `scripts/optimizer/__init__.py` and `scripts/optimizer/tests/__init__.py`, then `scripts/optimizer/tests/test_workbook.py`:

```python
import unittest

from openpyxl import Workbook

from optimizer.workbook import (
    MissingHeader,
    find_cell,
    header_columns,
    number,
    rows_until_blank,
    slug,
    split_grade,
    text,
)


def sheet_with(rows, title="Data"):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = title
    for r, row in enumerate(rows, 1):
        for c, value in enumerate(row, 1):
            if value is not None:
                sheet.cell(r, c, value)
    return sheet


class FindCell(unittest.TestCase):
    def test_matches_ignoring_case_and_whitespace(self):
        sheet = sheet_with([[None, "Equip  ATK\nfactor"]])
        self.assertEqual(find_cell(sheet, "equip atk factor"), (1, 2))

    def test_missing_text_is_named_in_the_error(self):
        sheet = sheet_with([["WEAPONS"]])
        with self.assertRaisesRegex(MissingHeader, "ACCESSORIES"):
            find_cell(sheet, "ACCESSORIES")

    def test_search_can_be_limited_to_columns(self):
        sheet = sheet_with([[None, "SPIRITS"], [None, None, "SPIRITS"]])
        self.assertEqual(find_cell(sheet, "SPIRITS", min_col=3), (2, 3))


class HeaderColumns(unittest.TestCase):
    def test_maps_each_name_to_its_column(self):
        sheet = sheet_with([["TYPE", "OWNED", "MULTIPLIER"]])
        self.assertEqual(
            header_columns(sheet, 1, ["TYPE", "MULTIPLIER"]),
            {"TYPE": 1, "MULTIPLIER": 3},
        )

    def test_reports_every_missing_header(self):
        sheet = sheet_with([["TYPE"]])
        with self.assertRaisesRegex(MissingHeader, r"MULTIPLIER.*MAX LVL"):
            header_columns(sheet, 1, ["TYPE", "MULTIPLIER", "MAX LVL"])


class RowsUntilBlank(unittest.TestCase):
    def test_stops_at_the_first_row_without_text(self):
        sheet = sheet_with([["a"], ["b"], [None], ["c"]])
        self.assertEqual(list(rows_until_blank(sheet, 1, 1)), [1, 2])


class Values(unittest.TestCase):
    def test_split_grade(self):
        self.assertEqual(split_grade("Common 4"), ("Common", 4))
        self.assertEqual(split_grade("Immortal"), ("Immortal", None))

    def test_number_turns_whole_floats_into_ints(self):
        self.assertEqual(number(250.0), 250)
        self.assertEqual(number(0.055), 0.055)
        self.assertIsNone(number(None))

    def test_number_reads_numeric_text(self):
        self.assertEqual(number("200"), 200)
        self.assertIsNone(number("Locked"))

    def test_text_collapses_whitespace_and_blanks_become_none(self):
        self.assertEqual(text("  Steel Sword\nGrade 1 "), "Steel Sword Grade 1")
        self.assertIsNone(text("   "))

    def test_slug(self):
        self.assertEqual(slug("Hunter's Eye"), "hunter-s-eye")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'optimizer.workbook'`.

- [ ] **Step 4: Write the implementation**

Create `scripts/optimizer/workbook.py`:

```python
"""Reading helpers for the Slayer Legend Master Optimizer workbook.

Tables are located by header text rather than fixed column numbers: the
sheets hold several tables side by side, and columns get inserted between
copies of the workbook.
"""

from __future__ import annotations

import re
from io import BytesIO

from PIL import Image


class MissingHeader(Exception):
    """An expected title or header was not found where the extractor looked."""


def normalise(value) -> str:
    return re.sub(r"\s+", " ", str(value)).strip().casefold()


def find_cell(sheet, wanted, *, min_row=1, max_row=None, min_col=1, max_col=None):
    """Return (row, column) of the first cell whose text equals `wanted`."""
    target = normalise(wanted)
    for row in sheet.iter_rows(
        min_row=min_row,
        max_row=max_row or sheet.max_row,
        min_col=min_col,
        max_col=max_col or sheet.max_column,
    ):
        for cell in row:
            if cell.value is not None and normalise(cell.value) == target:
                return cell.row, cell.column
    raise MissingHeader(f"{sheet.title}: no cell reading {wanted!r}")


def header_columns(sheet, header_row, names, *, min_col=1, max_col=None):
    """Map each header name to its column on `header_row`."""
    wanted = {normalise(name): name for name in names}
    found = {}
    for col in range(min_col, (max_col or sheet.max_column) + 1):
        value = sheet.cell(header_row, col).value
        if value is None:
            continue
        name = wanted.get(normalise(value))
        if name is not None and name not in found:
            found[name] = col
    missing = [name for name in names if name not in found]
    if missing:
        raise MissingHeader(
            f"{sheet.title} row {header_row}: missing headers {missing}"
        )
    return found


def number(value):
    """Whole floats become ints; numeric text is read; anything else is None."""
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        try:
            value = float(value.replace(",", ""))
        except ValueError:
            return None
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def text(value):
    if value is None:
        return None
    cleaned = " ".join(str(value).split())
    return cleaned or None


def rows_until_blank(sheet, first_row, key_col):
    """Row numbers from `first_row` while the key column holds text."""
    row = first_row
    while text(sheet.cell(row, key_col).value) is not None:
        yield row
        row += 1


def slug(value) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(value).lower()).strip("-")


def split_grade(value):
    """'Common 4' -> ('Common', 4); 'Immortal' -> ('Immortal', None)."""
    match = re.fullmatch(r"([A-Za-z]+)\s*(\d+)?", value.strip())
    if not match:
        return value.strip(), None
    return match.group(1), int(match.group(2)) if match.group(2) else None


def images_by_cell(sheet):
    """{(row, column): image bytes} for every image anchored to a cell."""
    found = {}
    for image in getattr(sheet, "_images", []):
        anchor = getattr(image.anchor, "_from", None)
        if anchor is not None:
            found[(anchor.row + 1, anchor.col + 1)] = image._data()
    return found


def image_size(data):
    with Image.open(BytesIO(data)) as picture:
        return picture.size


def largest_image_on_row(images, row, first_col, last_col):
    """The biggest image anchored on `row` between two columns, if any."""
    candidates = [
        data
        for (r, c), data in images.items()
        if r == row and first_col <= c <= last_col
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda data: image_size(data)[0] * image_size(data)[1])
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: all 11 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/optimizer/__init__.py scripts/optimizer/workbook.py scripts/optimizer/tests/__init__.py scripts/optimizer/tests/test_workbook.py
git commit -m "Add workbook helpers for the optimizer extractor"
```

### Task 2: Skill extraction

**Files:**
- Create: `scripts/optimizer/tests/support.py`
- Create: `scripts/optimizer/skills.py`
- Test: `scripts/optimizer/tests/test_skills.py`

**Interfaces:**
- Consumes: `header_columns`, `images_by_cell`, `largest_image_on_row`, `number`, `rows_until_blank`, `text`, `MissingHeader` from Task 1.
- Produces:
  - `optimizer.tests.support.build_sheet(cells: dict[str, object], *, title="Data", images=()) -> Worksheet` — `images` is a list of `(cell_ref, pixel_size)`; the sheet is saved and reloaded so image anchors are real.
  - `optimizer.skills.extract_skills(sheet) -> tuple[list[dict], dict[int, bytes]]` — skill records, and icon bytes keyed by skill id. Record keys: `id, name, element, grade, maxLevel, mpCost, baseValue, upgradeValue, cooldown, range, duration, description{basic, specific}`.

- [ ] **Step 1: Write the shared test support**

Create `scripts/optimizer/tests/support.py`:

```python
"""Builds small in-memory sheets shaped like the optimizer's tables."""

from io import BytesIO

from openpyxl import Workbook, load_workbook
from openpyxl.drawing.image import Image as SheetImage
from PIL import Image


def png(size):
    buffer = BytesIO()
    Image.new("RGBA", (size, size), (200, 40, 40, 255)).save(buffer, "PNG")
    buffer.seek(0)
    return buffer


def build_sheet(cells, *, title="Data", images=()):
    """Write `cells` ({"A1": value}) and square images ([("C3", 128)]).

    The workbook is saved and reloaded, because openpyxl only turns image
    anchors into row/column objects when it reads a file.
    """
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = title
    for ref, value in cells.items():
        sheet[ref] = value
    for ref, size in images:
        sheet.add_image(SheetImage(png(size)), ref)
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return load_workbook(buffer)[title]
```

- [ ] **Step 2: Write the failing tests**

Create `scripts/optimizer/tests/test_skills.py`:

```python
import unittest

from optimizer.skills import extract_skills
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader, image_size

HEADERS = {
    "A1": "SKILL", "D1": "CURRENT LEVEL", "E1": "SKILL BASIC DESCRIPTION",
    "F1": "SKILL SPECIFIC DESCRIPTION", "G1": "Tier", "H1": "Id", "J1": "dmgType",
    "M1": "MaxLevel", "T1": "MpCost", "U1": "InitValue", "V1": "upgradeValue",
    "W1": "ActiveNeedValue", "X1": "Range", "Y1": "Duration",
}
LOCKED = {"A2": "Locked", "H2": "Locked"}
FIRE_SLASH = {
    "A3": "Fire Slash", "D3": 99, "E3": "Wrap fire around the sword",
    "F3": "Attack with X% of ATK", "G3": "Common", "H3": 1.0, "J3": 1.0,
    "M3": 250.0, "T3": 25.0, "U3": 400.0, "V3": 40.0, "W3": 12.0, "X3": 3.0, "Y3": 0.0,
}
RAVE = {
    "A4": "Rave", "D4": 0, "E4": "Additional damage", "F4": "Deals X%",
    "G4": "Immortal", "H4": 45.0, "J4": 0.0, "M4": 5.0, "T4": 50.0,
    "U4": 70.0, "V4": 10.0, "W4": 60.0, "X4": 6.0, "Y4": 0.0,
}


def skills_sheet(**overrides):
    cells = {**HEADERS, **LOCKED, **FIRE_SLASH, **RAVE, **overrides}
    return build_sheet({k: v for k, v in cells.items() if v is not None}, title="Skills Data",
                       images=[("B3", 64), ("C3", 128)])


class ExtractSkills(unittest.TestCase):
    def test_reads_game_fields(self):
        skills, _ = extract_skills(skills_sheet())
        self.assertEqual(skills[0], {
            "id": 1, "name": "Fire Slash", "element": "Fire", "grade": "Common",
            "maxLevel": 250, "mpCost": 25, "baseValue": 400, "upgradeValue": 40,
            "cooldown": 12, "range": 3, "duration": 0,
            "description": {"basic": "Wrap fire around the sword", "specific": "Attack with X% of ATK"},
        })

    def test_skips_the_locked_row_and_stops_at_a_blank_row(self):
        skills, _ = extract_skills(skills_sheet())
        self.assertEqual([s["name"] for s in skills], ["Fire Slash", "Rave"])

    def test_element_code_zero_means_no_element(self):
        skills, _ = extract_skills(skills_sheet())
        self.assertIsNone(skills[1]["element"])

    def test_never_reads_the_players_current_level(self):
        skills, _ = extract_skills(skills_sheet())
        self.assertNotIn(99, skills[0].values())

    def test_missing_header_is_named(self):
        with self.assertRaisesRegex(MissingHeader, "ActiveNeedValue"):
            extract_skills(skills_sheet(W1=None))

    def test_icon_is_the_largest_image_on_the_row(self):
        _, icons = extract_skills(skills_sheet())
        self.assertEqual(image_size(icons[1]), (128, 128))
        self.assertNotIn(45, icons)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'optimizer.skills'`.

- [ ] **Step 4: Write the implementation**

Create `scripts/optimizer/skills.py`:

```python
"""Skills Data -> skill records and icons."""

from optimizer.workbook import (
    MissingHeader,
    header_columns,
    images_by_cell,
    largest_image_on_row,
    number,
    rows_until_blank,
    text,
)

ELEMENTS = {1: "Fire", 2: "Water", 3: "Wind", 4: "Earth"}

# CURRENT LEVEL is located only to bound the icon search; its values are the
# workbook owner's account and are never read.
HEADERS = [
    "SKILL", "CURRENT LEVEL", "SKILL BASIC DESCRIPTION", "SKILL SPECIFIC DESCRIPTION",
    "Tier", "Id", "dmgType", "MaxLevel", "MpCost", "InitValue", "upgradeValue",
    "ActiveNeedValue", "Range", "Duration",
]
PLACEHOLDER = "Locked"


def extract_skills(sheet):
    """Return (skills, icons); icons maps skill id to image bytes."""
    col = header_columns(sheet, 1, HEADERS)
    images = images_by_cell(sheet)
    skills, icons = [], {}

    for row in rows_until_blank(sheet, 2, col["SKILL"]):
        name = text(sheet.cell(row, col["SKILL"]).value)
        if name == PLACEHOLDER:
            continue

        def value(header, row=row):
            return number(sheet.cell(row, col[header]).value)

        skill_id = value("Id")
        max_level = value("MaxLevel")
        if skill_id is None or max_level is None:
            raise MissingHeader(f"{sheet.title} row {row}: {name!r} has no Id or MaxLevel")

        skills.append({
            "id": skill_id,
            "name": name,
            "element": ELEMENTS.get(value("dmgType") or 0),
            "grade": text(sheet.cell(row, col["Tier"]).value),
            "maxLevel": max_level,
            "mpCost": value("MpCost"),
            "baseValue": value("InitValue"),
            "upgradeValue": value("upgradeValue"),
            "cooldown": value("ActiveNeedValue"),
            "range": value("Range"),
            "duration": value("Duration"),
            "description": {
                "basic": text(sheet.cell(row, col["SKILL BASIC DESCRIPTION"]).value),
                "specific": text(sheet.cell(row, col["SKILL SPECIFIC DESCRIPTION"]).value),
            },
        })

        icon = largest_image_on_row(images, row, col["SKILL"], col["CURRENT LEVEL"] - 1)
        if icon is not None:
            icons[skill_id] = icon

    return skills, icons
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: all tests PASS (11 from Task 1, 6 new).

- [ ] **Step 6: Commit**

```bash
git add scripts/optimizer/skills.py scripts/optimizer/tests/support.py scripts/optimizer/tests/test_skills.py
git commit -m "Extract skills from the optimizer's Skills Data sheet"
```

---

### Task 3: Weapon, accessory and level factor extraction

**Files:**
- Create: `scripts/optimizer/gear.py`
- Test: `scripts/optimizer/tests/test_gear.py`

**Interfaces:**
- Consumes: `find_cell`, `header_columns`, `number`, `rows_until_blank`, `split_grade`, `text`, `MissingHeader` (Task 1); `build_sheet` (Task 2).
- Produces:
  - `optimizer.gear.TIER_ORDER: list[str]` = `["Common", "Great", "Rare", "Epic", "Legendary", "Mythic", "Immortal"]`
  - `optimizer.gear.extract_gear(sheet, title: str) -> list[dict]` — `title` is `"WEAPONS"` or `"ACCESSORIES"`. Record keys: `grade, tier, gradeNumber, tierRank, multiplier, baseMaxLevel, secondary{...}`.
  - `optimizer.gear.extract_level_factors(sheet) -> list[float]` — index is the enhance level.

- [ ] **Step 1: Write the failing tests**

Create `scripts/optimizer/tests/test_gear.py`:

```python
import unittest

from optimizer.gear import extract_gear, extract_level_factors
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader

CELLS = {
    "A1": "WEAPONS",
    "A2": "TYPE", "B2": "OWNED", "C2": "MULTIPLIER", "D2": "CURRENT LEVEL", "E2": "MAX LVL",
    "F2": "CRIT HIT WHEN 0", "G2": "GOLD BONUS", "H2": "CRIT HIT INCREASE AT 0",
    "I2": "CURRENT EQUIP EFFECT",
    "A3": "Common 4", "B3": True, "C3": 7.0, "D3": 150, "E3": 200, "F3": 0.0, "G3": 0.0, "H3": 0.0, "I3": 7,
    "A4": "Immortal", "B4": False, "C4": 10000000.0, "D4": 0, "E4": 200, "F4": 0, "G4": 0, "H4": 0.15, "I4": 0,
    "A6": "ACCESSORIES",
    "A7": "TYPE", "B7": "OWNED", "C7": "MULTIPLIER", "D7": "CURRENT LEVEL", "E7": "MAX LVL",
    "F7": "MAX MANA AT 0", "G7": "EXP Bonus", "H7": "MANA RECOVERY AT 0", "I7": "CURRENT EQUIP EFFECT",
    "A8": "Common 4", "C8": 7.0, "E8": 200, "F8": 0.0, "G8": 0.0, "H8": 0.0,
    "L1": "Equip ATK factor", "L2": "Stage", "M2": "Factor",
    "L3": 0, "M3": 1.0, "L4": 1, "M4": 1.375, "L5": 2, "M5": 1.5,
}


def equipment_sheet(**overrides):
    cells = {**CELLS, **overrides}
    return build_sheet({k: v for k, v in cells.items() if v is not None}, title="Equipment Data")


class ExtractGear(unittest.TestCase):
    def test_reads_a_graded_weapon(self):
        weapons = extract_gear(equipment_sheet(), "WEAPONS")
        self.assertEqual(weapons[0], {
            "grade": "Common 4", "tier": "Common", "gradeNumber": 4, "tierRank": 0,
            "multiplier": 7, "baseMaxLevel": 200,
            "secondary": {"critHitAt0": 0, "goldBonus": 0, "critHitIncreaseAt0": 0},
        })

    def test_immortal_has_no_grade_number(self):
        immortal = extract_gear(equipment_sheet(), "WEAPONS")[1]
        self.assertEqual((immortal["tier"], immortal["gradeNumber"], immortal["tierRank"]), ("Immortal", None, 6))
        self.assertEqual(immortal["secondary"]["critHitIncreaseAt0"], 0.15)

    def test_each_table_stops_at_its_blank_row(self):
        self.assertEqual(len(extract_gear(equipment_sheet(), "WEAPONS")), 2)
        accessories = extract_gear(equipment_sheet(), "ACCESSORIES")
        self.assertEqual(len(accessories), 1)
        self.assertEqual(set(accessories[0]["secondary"]), {"maxManaAt0", "expBonus", "manaRecoveryAt0"})

    def test_player_columns_are_not_extracted(self):
        weapon = extract_gear(equipment_sheet(), "WEAPONS")[0]
        self.assertNotIn(150, weapon.values())
        self.assertFalse({"owned", "currentLevel", "currentEquipEffect"} & set(weapon))

    def test_missing_header_is_named(self):
        with self.assertRaisesRegex(MissingHeader, "MULTIPLIER"):
            extract_gear(equipment_sheet(C2=None), "WEAPONS")


class ExtractLevelFactors(unittest.TestCase):
    def test_factor_index_is_the_level(self):
        self.assertEqual(extract_level_factors(equipment_sheet()), [1, 1.375, 1.5])

    def test_a_gap_in_levels_is_an_error(self):
        with self.assertRaisesRegex(MissingHeader, "expected level 2"):
            extract_level_factors(equipment_sheet(L5=3))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'optimizer.gear'`.

- [ ] **Step 3: Write the implementation**

Create `scripts/optimizer/gear.py`:

```python
"""Weapons, accessories and the enhance level factor table (Equipment Data)."""

from optimizer.workbook import (
    MissingHeader,
    find_cell,
    header_columns,
    number,
    rows_until_blank,
    split_grade,
    text,
)

TIER_ORDER = ["Common", "Great", "Rare", "Epic", "Legendary", "Mythic", "Immortal"]

# Each table's secondary stats, by sheet header -> JSON key.
SECONDARY = {
    "WEAPONS": {
        "CRIT HIT WHEN 0": "critHitAt0",
        "GOLD BONUS": "goldBonus",
        "CRIT HIT INCREASE AT 0": "critHitIncreaseAt0",
    },
    "ACCESSORIES": {
        "MAX MANA AT 0": "maxManaAt0",
        "EXP Bonus": "expBonus",
        "MANA RECOVERY AT 0": "manaRecoveryAt0",
    },
}


def extract_gear(sheet, title):
    """Grades from the WEAPONS or ACCESSORIES table, lowest grade first."""
    secondary = SECONDARY[title]
    title_row, _ = find_cell(sheet, title, max_col=1)
    header_row = title_row + 1
    col = header_columns(sheet, header_row, ["TYPE", "MULTIPLIER", "MAX LVL", *secondary])

    grades = []
    for row in rows_until_blank(sheet, header_row + 1, col["TYPE"]):
        grade = text(sheet.cell(row, col["TYPE"]).value)
        tier, grade_number = split_grade(grade)
        grades.append({
            "grade": grade,
            "tier": tier,
            "gradeNumber": grade_number,
            "tierRank": TIER_ORDER.index(tier) if tier in TIER_ORDER else None,
            "multiplier": number(sheet.cell(row, col["MULTIPLIER"]).value),
            "baseMaxLevel": number(sheet.cell(row, col["MAX LVL"]).value),
            "secondary": {
                key: number(sheet.cell(row, col[header]).value)
                for header, key in secondary.items()
            },
        })
    return grades


def extract_level_factors(sheet):
    """Equip effect factor per enhance level; list index is the level.

    Equip effect % = grade multiplier x factor[level]; owned effect is 30% of it.
    """
    title_row, title_col = find_cell(sheet, "Equip ATK factor", max_row=1)
    header_row = title_row + 1
    col = header_columns(sheet, header_row, ["Stage", "Factor"], min_col=title_col, max_col=title_col + 1)

    factors = []
    row = header_row + 1
    while (level := number(sheet.cell(row, col["Stage"]).value)) is not None:
        if level != len(factors):
            raise MissingHeader(
                f"{sheet.title} row {row}: expected level {len(factors)}, found {level}"
            )
        factors.append(number(sheet.cell(row, col["Factor"]).value))
        row += 1

    if not factors:
        raise MissingHeader(f"{sheet.title}: 'Equip ATK factor' table has no levels")
    return factors
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: all tests PASS (7 new).

- [ ] **Step 5: Commit**

```bash
git add scripts/optimizer/gear.py scripts/optimizer/tests/test_gear.py
git commit -m "Extract weapon and accessory grades and level factors"
```

---

### Task 4: Relic extraction

**Files:**
- Modify: `scripts/optimizer/workbook.py` (add `find_header_row`)
- Modify: `scripts/optimizer/tests/test_workbook.py` (add its test)
- Create: `scripts/optimizer/relics.py`
- Test: `scripts/optimizer/tests/test_relics.py`

**Interfaces:**
- Consumes: Task 1 helpers; `build_sheet` (Task 2).
- Produces:
  - `optimizer.workbook.find_header_row(sheet, names: list[str]) -> tuple[int, dict[str, int]]` — the first row holding every header, and its column map.
  - `optimizer.relics.parse_bands(formula: str) -> list[dict]` — `[{"from": int, "to": int | None, "factor": float}]`.
  - `optimizer.relics.extract_relics(equipment_sheet, data_formula_sheet) -> tuple[list[dict], dict[str, bytes]]` — records with keys `id, name, buff, maxLevel, bands`; icons keyed by relic name. `equipment_sheet` is the EQUIPMENT sheet (any mode); `data_formula_sheet` is Equipment Data loaded with `data_only=False`.

- [ ] **Step 1: Add the failing `find_header_row` test**

Append to the `HeaderColumns` class in `scripts/optimizer/tests/test_workbook.py`, and add `find_header_row` to its import list:

```python
    def test_find_header_row_returns_the_first_row_with_every_header(self):
        sheet = sheet_with([["ICON"], [None], ["ICON", "RELIC", "BONUS"]])
        self.assertEqual(
            find_header_row(sheet, ["ICON", "RELIC"]),
            (3, {"ICON": 1, "RELIC": 2}),
        )

    def test_find_header_row_names_the_headers_when_absent(self):
        sheet = sheet_with([["ICON"]])
        with self.assertRaisesRegex(MissingHeader, "RELIC"):
            find_header_row(sheet, ["ICON", "RELIC"])
```

- [ ] **Step 2: Write the failing relic tests**

Create `scripts/optimizer/tests/test_relics.py`:

```python
import unittest

from optimizer.relics import extract_relics, parse_bands
from optimizer.tests.support import build_sheet
from optimizer.workbook import image_size

FORMULA = (
    "=IF(EQUIPMENT!E73<10,0.05, IF(EQUIPMENT!E73<20,0.055, IF(EQUIPMENT!E73<30,0.06, "
    "IF(EQUIPMENT!E73<40,0.065, IF(EQUIPMENT!E73<50,0.07, IF(EQUIPMENT!E73<60,0.08, "
    "IF(EQUIPMENT!E73<70,0.1, IF(EQUIPMENT!E73<80,0.12, IF(EQUIPMENT!E73<90,0.15, "
    "IF(EQUIPMENT!E73<100,0.18,0.22))))))))))"
)
SHORT = "=IF(EQUIPMENT!E75<10,0.005,0.04)"


def equipment(**overrides):
    cells = {
        "C72": "ICON", "D72": "RELIC", "E72": "LEVEL", "F72": "BONUS",
        "D73": "Strength Gloves Max Level 100", "E73": 55, "F73": "Extra Dmg +0%",
        "D75": "Emperor Ring Max Level 100", "E75": 0, "F75": "Earth Dmg +0%",
        "M76": "Unrelated block",
        **overrides,
    }
    return build_sheet({k: v for k, v in cells.items() if v is not None},
                       title="EQUIPMENT", images=[("C73", 64)])


def equipment_data(**overrides):
    cells = {
        "W136": "RELICS", "W137": "RELIC", "X137": "LEVEL", "AA137": "MULTIPLIER",
        "W138": "Strength Glove", "AA138": FORMULA,
        "W139": "Emporer Ring", "AA139": SHORT,
        **overrides,
    }
    return build_sheet({k: v for k, v in cells.items() if v is not None}, title="Equipment Data")


class ParseBands(unittest.TestCase):
    def test_reads_every_band_from_the_formula(self):
        bands = parse_bands(FORMULA)
        self.assertEqual(len(bands), 11)
        self.assertEqual(bands[0], {"from": 0, "to": 9, "factor": 0.05})
        self.assertEqual(bands[7], {"from": 70, "to": 79, "factor": 0.12})
        self.assertEqual(bands[-1], {"from": 100, "to": None, "factor": 0.22})

    def test_rejects_a_formula_that_is_not_a_band_chain(self):
        with self.assertRaises(ValueError):
            parse_bands("=X138*2")


class ExtractRelics(unittest.TestCase):
    def test_names_and_buffs_come_from_the_equipment_sheet(self):
        relics, _ = extract_relics(equipment(), equipment_data())
        self.assertEqual(
            [(r["id"], r["name"], r["buff"], r["maxLevel"]) for r in relics],
            [(0, "Strength Gloves", "Extra Dmg", 100), (1, "Emperor Ring", "Earth Dmg", 100)],
        )

    def test_bands_are_attached_in_order(self):
        relics, _ = extract_relics(equipment(), equipment_data())
        self.assertEqual(relics[0]["bands"][-1]["factor"], 0.22)
        self.assertEqual(relics[1]["bands"], [
            {"from": 0, "to": 9, "factor": 0.005},
            {"from": 10, "to": None, "factor": 0.04},
        ])

    def test_player_level_is_not_extracted(self):
        relics, _ = extract_relics(equipment(), equipment_data())
        self.assertNotIn(55, relics[0].values())

    def test_mismatched_relic_order_is_an_error(self):
        with self.assertRaisesRegex(ValueError, "Focus Ring"):
            extract_relics(equipment(), equipment_data(W138="Focus Ring"))

    def test_icons_come_from_the_icon_column(self):
        _, icons = extract_relics(equipment(), equipment_data())
        self.assertEqual(image_size(icons["Strength Gloves"]), (64, 64))
        self.assertNotIn("Emperor Ring", icons)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: FAIL with `ImportError: cannot import name 'find_header_row'` and `ModuleNotFoundError: No module named 'optimizer.relics'`.

- [ ] **Step 4: Add `find_header_row` to `scripts/optimizer/workbook.py`**

Insert after `header_columns`:

```python
def find_header_row(sheet, names):
    """The first row that holds every header in `names`, with its column map."""
    for row in range(1, sheet.max_row + 1):
        try:
            return row, header_columns(sheet, row, names)
        except MissingHeader:
            continue
    raise MissingHeader(f"{sheet.title}: no row holds all of {names}")
```

- [ ] **Step 5: Write the relic implementation**

Create `scripts/optimizer/relics.py`:

```python
"""Relics: names and buffs from EQUIPMENT, level bands from Equipment Data.

Equipment Data misspells some names ("Strength Glove", "Emporer Ring"), so
display names come from the EQUIPMENT sheet. The two lists share an order,
which is checked by name similarity before bands are attached.
"""

import re
from difflib import SequenceMatcher

from optimizer.workbook import (
    find_cell,
    find_header_row,
    header_columns,
    images_by_cell,
    normalise,
    rows_until_blank,
    text,
)

BAND = re.compile(r"<\s*(\d+)\s*,\s*([\d.]+)")
FINAL = re.compile(r",\s*([\d.]+)\s*\)+\s*$")
MAX_LEVEL = re.compile(r"\s*Max\s*Level\s*(\d+)\s*$", re.IGNORECASE)
BUFF_VALUE = re.compile(r"\s*\+\s*[\d.,]*\s*%?\s*$")
MIN_NAME_SIMILARITY = 0.8


def parse_bands(formula):
    """Turn a nested IF(level<N, factor, ...) formula into level bands."""
    source = formula or ""
    thresholds = [(int(limit), float(factor)) for limit, factor in BAND.findall(source)]
    final = FINAL.search(source)
    if not thresholds or final is None:
        raise ValueError(f"relic multiplier is not a level band formula: {formula!r}")

    bands, start = [], 0
    for limit, factor in thresholds:
        bands.append({"from": start, "to": limit - 1, "factor": factor})
        start = limit
    bands.append({"from": start, "to": None, "factor": float(final.group(1))})
    return bands


def _relic_block(sheet):
    """Rows of the EQUIPMENT relic block, which skips a row between relics."""
    header_row, col = find_header_row(sheet, ["ICON", "RELIC", "BONUS"])
    entries, blanks, row = [], 0, header_row + 1
    while blanks <= 2:
        raw = text(sheet.cell(row, col["RELIC"]).value)
        if raw is None:
            blanks += 1
        else:
            blanks = 0
            match = MAX_LEVEL.search(raw)
            if match is None:
                break
            bonus = text(sheet.cell(row, col["BONUS"]).value) or ""
            entries.append({
                "row": row,
                "name": MAX_LEVEL.sub("", raw),
                "maxLevel": int(match.group(1)),
                "buff": BUFF_VALUE.sub("", bonus) or None,
            })
        row += 1
    return entries, col["ICON"]


def extract_relics(equipment_sheet, data_formula_sheet):
    entries, icon_col = _relic_block(equipment_sheet)

    title_row, title_col = find_cell(data_formula_sheet, "RELICS")
    col = header_columns(data_formula_sheet, title_row + 1, ["RELIC", "MULTIPLIER"], min_col=title_col)
    data_rows = list(rows_until_blank(data_formula_sheet, title_row + 2, col["RELIC"]))

    if len(data_rows) != len(entries):
        raise ValueError(
            f"EQUIPMENT lists {len(entries)} relics but Equipment Data lists {len(data_rows)}"
        )

    images = images_by_cell(equipment_sheet)
    relics, icons = [], {}
    for index, (entry, data_row) in enumerate(zip(entries, data_rows)):
        data_name = text(data_formula_sheet.cell(data_row, col["RELIC"]).value)
        similarity = SequenceMatcher(None, normalise(entry["name"]), normalise(data_name)).ratio()
        if similarity < MIN_NAME_SIMILARITY:
            raise ValueError(
                f"relic {index}: EQUIPMENT says {entry['name']!r} but Equipment Data says {data_name!r}"
            )

        relics.append({
            "id": index,
            "name": entry["name"],
            "buff": entry["buff"],
            "maxLevel": entry["maxLevel"],
            "bands": parse_bands(data_formula_sheet.cell(data_row, col["MULTIPLIER"]).value),
        })
        icon = images.get((entry["row"], icon_col))
        if icon is not None:
            icons[entry["name"]] = icon

    return relics, icons
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: all tests PASS (2 new in `test_workbook.py`, 7 in `test_relics.py`).

- [ ] **Step 7: Commit**

```bash
git add scripts/optimizer/workbook.py scripts/optimizer/relics.py scripts/optimizer/tests/test_workbook.py scripts/optimizer/tests/test_relics.py
git commit -m "Extract relics with level bands parsed from the workbook formulas"
```

### Task 5: Spirit and soul weapon extraction

**Files:**
- Create: `scripts/optimizer/spirits.py`
- Create: `scripts/optimizer/soul_weapons.py`
- Test: `scripts/optimizer/tests/test_spirits.py`
- Test: `scripts/optimizer/tests/test_soul_weapons.py`

**Interfaces:**
- Consumes: Task 1 helpers; `build_sheet` (Task 2).
- Produces:
  - `optimizer.spirits.extract_spirits(sheet) -> tuple[list[dict], dict[str, bytes]]` — records `{id, name, maxLevel}`, icons keyed by name. `sheet` is Equipment Data.
  - `optimizer.spirits.extract_spirit_max_level(sheet) -> int`
  - `optimizer.soul_weapons.split_requirement(value) -> tuple[str | None, str | None]`
  - `optimizer.soul_weapons.extract_soul_weapons(sheet) -> tuple[list[dict], dict[str, bytes]]` — records `{id, name, soulColor, attack, cost, disassemblyReward, requirement{item, grade}, stage{number, name}, engraving{atk, hp}}`, icons keyed by name.

- [ ] **Step 1: Write the failing spirit tests**

Create `scripts/optimizer/tests/test_spirits.py`:

```python
import unittest

from optimizer.spirits import extract_spirits
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader, image_size


def equipment_data(**overrides):
    cells = {
        "CG1": "SPIRIT COST", "CG2": "Level", "CH2": "Crystal",
        "CG3": 0, "CH3": 300, "CG4": 1, "CH4": 315, "CG5": 2, "CH5": 331,
        "CJ1": "SPIRITS BASE", "CJ2": "NAME", "CK2": "Common", "CL2": "Great",
        "CJ3": "Ark", "CJ4": "Bo",
        **overrides,
    }
    return build_sheet({k: v for k, v in cells.items() if v is not None},
                       title="Equipment Data", images=[("CK3", 128), ("CL3", 64)])


class ExtractSpirits(unittest.TestCase):
    def test_names_in_order_with_the_shared_max_level(self):
        spirits, _ = extract_spirits(equipment_data())
        self.assertEqual(spirits, [
            {"id": 0, "name": "Ark", "maxLevel": 2},
            {"id": 1, "name": "Bo", "maxLevel": 2},
        ])

    def test_art_comes_from_the_common_rarity_column(self):
        _, icons = extract_spirits(equipment_data())
        self.assertEqual(image_size(icons["Ark"]), (128, 128))
        self.assertNotIn("Bo", icons)

    def test_missing_cost_table_is_named(self):
        with self.assertRaisesRegex(MissingHeader, "SPIRIT COST"):
            extract_spirits(equipment_data(CG1=None))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Write the failing soul weapon tests**

Create `scripts/optimizer/tests/test_soul_weapons.py`:

```python
import unittest

from optimizer.soul_weapons import extract_soul_weapons, split_requirement
from optimizer.tests.support import build_sheet
from optimizer.workbook import MissingHeader, image_size


def equipment_data(**overrides):
    cells = {
        "X1": "SOUL WEAPONS",
        "X2": "NAME", "Y2": "ICON", "Z2": "SOUL COLOR", "AA2": "REQUIREMENTS",
        "AC2": "ATTACK", "AD2": "STAGE REQUIREMENT", "AF2": "Engraving ATK", "AG2": "Engraving HP",
        "X3": "None", "AA3": 0.0, "AC3": 0.0,
        "X4": "Innocence", "Z4": "GREEN", "AA4": 2000.0, "AB4": "Steel Sword\nGrade 1",
        "AC4": 6300.0, "AD4": 80.0, "AE4": "Black Forest", "AF4": 1.0, "AG4": 1.0,
        "X5": "Silence 1840", "Z5": "RED", "AA5": 3000.0, "AC5": 9000.0, "AD5": 1200.0,
        **overrides,
    }
    return build_sheet({k: v for k, v in cells.items() if v is not None},
                       title="Equipment Data", images=[("Y4", 128)])


class SplitRequirement(unittest.TestCase):
    def test_grade_on_its_own_line_or_appended(self):
        self.assertEqual(split_requirement("Steel Sword\nGrade 1"), ("Steel Sword", "Grade 1"))
        self.assertEqual(split_requirement("Cold Blade Grade 4"), ("Cold Blade", "Grade 4"))
        self.assertEqual(split_requirement(None), (None, None))


class ExtractSoulWeapons(unittest.TestCase):
    def test_reads_a_soul_weapon(self):
        weapons, _ = extract_soul_weapons(equipment_data())
        self.assertEqual(weapons[0], {
            "id": 1, "name": "Innocence", "soulColor": "GREEN", "attack": 6300,
            "cost": 2000, "disassemblyReward": 1000,
            "requirement": {"item": "Steel Sword", "grade": "Grade 1"},
            "stage": {"number": 80, "name": "Black Forest"},
            "engraving": {"atk": 1, "hp": 1},
        })

    def test_skips_the_none_placeholder(self):
        weapons, _ = extract_soul_weapons(equipment_data())
        self.assertEqual([(w["id"], w["name"]) for w in weapons], [(1, "Innocence"), (2, "Silence 1840")])

    def test_missing_requirement_and_stage_name_become_none(self):
        silence = extract_soul_weapons(equipment_data())[0][1]
        self.assertEqual(silence["requirement"], {"item": None, "grade": None})
        self.assertEqual(silence["stage"], {"number": 1200, "name": None})

    def test_icons_come_from_the_icon_column(self):
        _, icons = extract_soul_weapons(equipment_data())
        self.assertEqual(image_size(icons["Innocence"]), (128, 128))

    def test_missing_header_is_named(self):
        with self.assertRaisesRegex(MissingHeader, "Engraving HP"):
            extract_soul_weapons(equipment_data(AG2=None))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: FAIL with `ModuleNotFoundError` for `optimizer.spirits` and `optimizer.soul_weapons`.

- [ ] **Step 4: Write the spirit implementation**

Create `scripts/optimizer/spirits.py`:

```python
"""Spirits: names and art from SPIRITS BASE, max level from SPIRIT COST.

Both tables live in Equipment Data. Elements and skills are not in the
workbook; extract-optimizer.py merges them in from the wiki by name.
"""

from optimizer.workbook import (
    MissingHeader,
    find_cell,
    header_columns,
    images_by_cell,
    number,
    rows_until_blank,
    text,
)

# SPIRITS BASE has one art column per rarity; Common is the base look.
ART_COLUMN = "Common"


def extract_spirit_max_level(sheet):
    """The last level listed in the SPIRIT COST table."""
    title_row, title_col = find_cell(sheet, "SPIRIT COST", max_row=1)
    col = header_columns(sheet, title_row + 1, ["Level"], min_col=title_col, max_col=title_col + 1)
    row, last = title_row + 2, None
    while (level := number(sheet.cell(row, col["Level"]).value)) is not None:
        last = level
        row += 1
    if last is None:
        raise MissingHeader(f"{sheet.title}: 'SPIRIT COST' table has no levels")
    return last


def extract_spirits(sheet):
    max_level = extract_spirit_max_level(sheet)
    title_row, title_col = find_cell(sheet, "SPIRITS BASE", max_row=1)
    col = header_columns(sheet, title_row + 1, ["NAME", ART_COLUMN], min_col=title_col)
    images = images_by_cell(sheet)

    spirits, icons = [], {}
    for index, row in enumerate(rows_until_blank(sheet, title_row + 2, col["NAME"])):
        name = text(sheet.cell(row, col["NAME"]).value)
        spirits.append({"id": index, "name": name, "maxLevel": max_level})
        icon = images.get((row, col[ART_COLUMN]))
        if icon is not None:
            icons[name] = icon
    return spirits, icons
```

- [ ] **Step 5: Write the soul weapon implementation**

Create `scripts/optimizer/soul_weapons.py`:

```python
"""Soul weapons from the Equipment Data SOUL WEAPONS table."""

import re

from optimizer.workbook import (
    find_cell,
    header_columns,
    images_by_cell,
    number,
    rows_until_blank,
    text,
)

HEADERS = [
    "NAME", "ICON", "SOUL COLOR", "REQUIREMENTS", "ATTACK",
    "STAGE REQUIREMENT", "Engraving ATK", "Engraving HP",
]
PLACEHOLDER = "None"
GRADE_SUFFIX = re.compile(r"^(.*?)\s*(Grade\s*\d+)$", re.IGNORECASE)


def split_requirement(value):
    """'Steel Sword Grade 1' -> ('Steel Sword', 'Grade 1')."""
    raw = text(value)
    if raw is None:
        return None, None
    match = GRADE_SUFFIX.match(raw)
    return (match.group(1), match.group(2)) if match else (raw, None)


def extract_soul_weapons(sheet):
    title_row, title_col = find_cell(sheet, "SOUL WEAPONS", max_row=1)
    col = header_columns(sheet, title_row + 1, HEADERS, min_col=title_col)
    images = images_by_cell(sheet)

    weapons, icons = [], {}
    for row in rows_until_blank(sheet, title_row + 2, col["NAME"]):
        name = text(sheet.cell(row, col["NAME"]).value)
        if name == PLACEHOLDER:
            continue

        def value(header, row=row):
            return number(sheet.cell(row, col[header]).value)

        cost = value("REQUIREMENTS")
        # REQUIREMENTS and STAGE REQUIREMENT are merged two-column headers: the
        # unlabelled column to the right holds the weapon text and stage name.
        item, grade = split_requirement(sheet.cell(row, col["REQUIREMENTS"] + 1).value)

        weapons.append({
            "id": len(weapons) + 1,
            "name": name,
            "soulColor": text(sheet.cell(row, col["SOUL COLOR"]).value),
            "attack": value("ATTACK"),
            "cost": cost,
            # Not stored in the workbook; it is half the cost for all 81
            # soul weapons the wiki lists.
            "disassemblyReward": number(cost / 2) if cost is not None else None,
            "requirement": {"item": item, "grade": grade},
            "stage": {
                "number": value("STAGE REQUIREMENT"),
                "name": text(sheet.cell(row, col["STAGE REQUIREMENT"] + 1).value),
            },
            "engraving": {"atk": value("Engraving ATK"), "hp": value("Engraving HP")},
        })

        icon = images.get((row, col["ICON"]))
        if icon is not None:
            icons[name] = icon

    return weapons, icons
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: all tests PASS (3 spirit, 6 soul weapon).

- [ ] **Step 7: Commit**

```bash
git add scripts/optimizer/spirits.py scripts/optimizer/soul_weapons.py scripts/optimizer/tests/test_spirits.py scripts/optimizer/tests/test_soul_weapons.py
git commit -m "Extract spirits and soul weapons from Equipment Data"
```

---

### Task 6: Change summary, CLI and wiki spirit skills

**Files:**
- Create: `scripts/optimizer/summary.py`
- Test: `scripts/optimizer/tests/test_summary.py`
- Create: `scripts/extract-optimizer.py`
- Create: `scripts/fetch-wiki-spirit-skills.py`

**Interfaces:**
- Consumes: every extractor from Tasks 2–5; `image_size`, `slug`, `MissingHeader` (Task 1).
- Produces:
  - `optimizer.summary.diff_items(old_items: list[dict], new_items: list[dict], key: str) -> dict` — `{"added": [...], "removed": [...], "changed": {name: {field: (before, after)}}}`, ignoring `icon` and `iconSize`.
  - `optimizer.summary.format_diff(area: str, diff: dict) -> str`
  - Files for later tasks: `src/data/optimizer/{skills,weapons,accessories,relics,spirits,soul-weapons,gear-levels}.json`, `src/data/wiki/spirit-skills.json`, `public/art/{skills,weapons,accessories,relics,spirits,soul-weapons}/`.
  - JSON top-level list keys: `skills`, `weapons`, `accessories`, `relics`, `spirits`, `soulWeapons`; `gear-levels.json` has `factors: number[]`. Every item gains `icon: string | null` and `iconSize: number | null`; weapons and accessories gain `maxLevel`; spirits gain `element` and `skill`.

- [ ] **Step 1: Write the failing summary tests**

Create `scripts/optimizer/tests/test_summary.py`:

```python
import unittest

from optimizer.summary import diff_items, format_diff

OLD = [
    {"name": "Fire Slash", "maxLevel": 130, "icon": "/skills/a.png"},
    {"name": "Retired", "maxLevel": 1},
]
NEW = [
    {"name": "Fire Slash", "maxLevel": 250, "icon": "/art/skills/b.png"},
    {"name": "Rekindle", "maxLevel": 250},
]


class DiffItems(unittest.TestCase):
    def test_added_removed_and_changed(self):
        self.assertEqual(diff_items(OLD, NEW, "name"), {
            "added": ["Rekindle"],
            "removed": ["Retired"],
            "changed": {"Fire Slash": {"maxLevel": (130, 250)}},
        })

    def test_icon_changes_are_not_reported(self):
        same = [{"name": "Fire Slash", "maxLevel": 130, "icon": "/elsewhere.png"}]
        self.assertEqual(diff_items(OLD[:1], same, "name")["changed"], {})


class FormatDiff(unittest.TestCase):
    def test_lists_each_change_on_its_own_line(self):
        lines = format_diff("skills", diff_items(OLD, NEW, "name")).splitlines()
        self.assertEqual(lines, [
            "skills: 1 added, 1 removed, 1 changed",
            "  + Rekindle",
            "  - Retired",
            "  ~ Fire Slash maxLevel: 130 -> 250",
        ])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'optimizer.summary'`.

- [ ] **Step 3: Write the summary implementation**

Create `scripts/optimizer/summary.py`:

```python
"""Compares new extractor output with the JSON already in the repo."""

IGNORED_FIELDS = {"icon", "iconSize"}


def diff_items(old_items, new_items, key):
    old = {item[key]: item for item in old_items}
    new = {item[key]: item for item in new_items}

    changed = {}
    for name in sorted(old.keys() & new.keys(), key=str):
        fields = {
            field: (old[name].get(field), new[name].get(field))
            for field in sorted(old[name].keys() | new[name].keys())
            if field not in IGNORED_FIELDS and old[name].get(field) != new[name].get(field)
        }
        if fields:
            changed[name] = fields

    return {
        "added": sorted(new.keys() - old.keys(), key=str),
        "removed": sorted(old.keys() - new.keys(), key=str),
        "changed": changed,
    }


def format_diff(area, diff):
    lines = [
        f"{area}: {len(diff['added'])} added, {len(diff['removed'])} removed, "
        f"{len(diff['changed'])} changed"
    ]
    lines += [f"  + {name}" for name in diff["added"]]
    lines += [f"  - {name}" for name in diff["removed"]]
    for name, fields in diff["changed"].items():
        for field, (before, after) in fields.items():
            lines.append(f"  ~ {name} {field}: {before!r} -> {after!r}")
    return "\n".join(lines)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: all tests PASS (3 new).

- [ ] **Step 5: Write the wiki spirit skills fetcher**

Create `scripts/fetch-wiki-spirit-skills.py`:

```python
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
```

- [ ] **Step 6: Write the extractor CLI**

Create `scripts/extract-optimizer.py`:

```python
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

from optimizer.gear import extract_gear, extract_level_factors  # noqa: E402
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
        ("weapons", "weapons", "Equipment Data", weapons, {}, "grade"),
        ("accessories", "accessories", "Equipment Data", accessories, {}, "grade"),
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
```

- [ ] **Step 7: Commit**

```bash
git add scripts/optimizer/summary.py scripts/optimizer/tests/test_summary.py scripts/extract-optimizer.py scripts/fetch-wiki-spirit-skills.py
git commit -m "Add the optimizer extractor CLI and wiki spirit skill fetch"
```

---

### Task 7: First real extraction and output checks

**Files:**
- Test: `scripts/optimizer/tests/test_output.py`
- Create (generated): `src/data/wiki/spirit-skills.json`, `src/data/optimizer/*.json`, `public/art/*/`

**Interfaces:**
- Consumes: the CLI and fetcher from Task 6.
- Produces: the committed data and art that every later task imports.

- [ ] **Step 1: Write the output tests**

Create `scripts/optimizer/tests/test_output.py`:

```python
"""Checks the committed extractor output against values confirmed in game."""

import json
import unittest
from pathlib import Path

DATA = Path(__file__).resolve().parents[3] / "src" / "data" / "optimizer"

KNOWN_SKILLS = [
    "Fire Slash", "Ice Stone", "Lightning Slash", "Stone Strike", "Fire Sword",
    "Mana's Blessing", "Lightning Stroke", "Ground's Blessing", "Hot Blast", "Ice Shower",
    "Agile", "Power Strike", "Flame Slash", "Water Slash", "Thunder Slash", "Power Impact",
    "Burning Sword", "Flowing Blade", "Speed Sword", "Earth's Will", "Flame Wave",
    "Curved Blade", "Fulgurous", "Iron Will", "Hellfire Slash", "Dancing Waves",
    "Wind Sword", "Life Mana", "Fire Blast", "Ice Time", "Thunderbolt Slash", "Giga Strike",
    "Rage", "Meditation", "Red Lightning", "Giga Impact", "Pillar of Fire", "Blizzard",
    "Supersonic", "Demon Hunt", "Warrior Burn", "Strong Current", "Lightning Body",
    "Wrath of Gods", "Rave", "Mantra",
]
FILES = {
    "skills.json": "skills", "weapons.json": "weapons", "accessories.json": "accessories",
    "relics.json": "relics", "spirits.json": "spirits", "soul-weapons.json": "soulWeapons",
}
PLAYER_FIELDS = {"owned", "currentLevel", "equipped", "level", "currentEquipEffect", "rarity", "bonus", "successRate"}


def load(filename):
    return json.loads((DATA / filename).read_text(encoding="utf-8"))


def items(filename):
    return load(filename)[FILES[filename]]


def buff_at(relic, level):
    band = next(b for b in relic["bands"] if b["from"] <= level and (b["to"] is None or level <= b["to"]))
    return level * band["factor"] * 100


@unittest.skipUnless((DATA / "skills.json").exists(), "run scripts/extract-optimizer.py first")
class ExtractedOutput(unittest.TestCase):
    def test_counts(self):
        counts = {name: len(items(name)) for name in FILES}
        self.assertEqual(counts, {
            "skills.json": 64, "weapons.json": 25, "accessories.json": 25,
            "relics.json": 12, "spirits.json": 12, "soul-weapons.json": 89,
        })

    def test_every_known_skill_is_present(self):
        names = {s["name"] for s in items("skills.json")}
        self.assertEqual(set(KNOWN_SKILLS) - names, set())

    def test_skill_values(self):
        fire = next(s for s in items("skills.json") if s["name"] == "Fire Slash")
        self.assertEqual((fire["maxLevel"], fire["cooldown"], fire["baseValue"]), (250, 12, 400))

    def test_gear_effect_matches_the_game(self):
        factors = load("gear-levels.json")["factors"]
        accessory = next(g for g in items("accessories.json") if g["grade"] == "Common 4")
        equip = accessory["multiplier"] * factors[297]
        self.assertAlmostEqual(equip, 109.9, delta=0.1)
        self.assertAlmostEqual(equip * 0.3, 33.0, delta=0.1)
        self.assertEqual(accessory["maxLevel"], len(factors) - 1)

    def test_relic_buffs_match_the_game(self):
        relics = {r["name"]: r for r in items("relics.json")}
        self.assertAlmostEqual(buff_at(relics["Strength Gloves"], 100), 2200)
        self.assertAlmostEqual(buff_at(relics["Hunter's Eye"], 100), 400)
        self.assertAlmostEqual(buff_at(relics["HP Ring"], 100), 1400)
        self.assertAlmostEqual(buff_at(relics["Strength Gloves"], 50), 400)

    def test_spirits_have_max_level_element_and_skill(self):
        for spirit in items("spirits.json"):
            self.assertEqual(spirit["maxLevel"], 1000)
            self.assertIsNotNone(spirit["element"], spirit["name"])
            self.assertIsNotNone(spirit["skill"], spirit["name"])

    def test_soul_weapon_disassembly_is_half_the_cost(self):
        innocence = next(w for w in items("soul-weapons.json") if w["name"] == "Innocence")
        self.assertEqual((innocence["cost"], innocence["disassemblyReward"]), (2000, 1000))

    def test_no_player_state_is_extracted(self):
        for filename in FILES:
            for item in items(filename):
                self.assertEqual(PLAYER_FIELDS & set(item), set(), f"{filename}: {item.get('name') or item.get('grade')}")

    def test_every_file_names_its_source(self):
        for filename in [*FILES, "gear-levels.json"]:
            source = load(filename)["source"]
            self.assertEqual(set(source), {"file", "sheet", "extractedOn"}, filename)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests to see them skip**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: earlier tests PASS; `ExtractedOutput` tests report `skipped 'run scripts/extract-optimizer.py first'`.

- [ ] **Step 3: Fetch spirit skills from the wiki**

Run: `python scripts/fetch-wiki-spirit-skills.py`

Expected: `Wrote 12 spirits to ...src\data\wiki\spirit-skills.json`.

- [ ] **Step 4: Run the extractor on the real workbook**

Run: `python scripts/extract-optimizer.py`

Expected:
- no `Extraction stopped` line and no `warning:` lines;
- `skills: 18 added, 0 removed, ...`, including `~ Fire Slash maxLevel: 130 -> 250`. Changed-field lines for `row`, `types`, `elementIcon` and `atkDistance` are expected: the old file had those fields and the new one does not;
- `relics:` shows `+ Lucky Pendant` and `- Lucky Pendent` (the wiki's spelling), plus band changes for every relic;
- `soul-weapons:` shows additions bringing the total to 89. Any `-` lines mean a name differs between the wiki and the workbook — list them for the user in Step 5;
- `no art` listed only for weapon and accessory grades the wiki had no art for;
- `gear-levels: enhance levels 0-1700`.

If an `Extraction stopped` or `warning:` line appears, stop and report the output before continuing.

- [ ] **Step 5: Show the change summary to the user**

Paste the full output of Step 4 to the user and wait for them to confirm the changes look right. This is the spec's review of the first run.

- [ ] **Step 6: Run the output tests**

Run: `python -m unittest discover -s scripts/optimizer/tests -t scripts -v`

Expected: every test PASS, none skipped.

- [ ] **Step 7: Commit**

```bash
git add scripts/optimizer/tests/test_output.py src/data/wiki src/data/optimizer public/art
git commit -m "Extract game data and art from the Master Optimizer"
```

### Task 8: Profile types and rules

**Files:**
- Modify: `package.json` (add `vitest`, add `test` script)
- Create: `vitest.config.ts`
- Create: `src/lib/profile/types.ts`
- Create: `src/lib/profile/rules.ts`
- Test: `src/lib/profile/rules.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (`@/lib/profile/types`):
  - `type GearKind = "weapons" | "accessories"`
  - `type OwnableKind = GearKind | "spirits" | "soulWeapons"`
  - `type EquippableKind = GearKind | "soulWeapons"`
  - `type GearState = { owned: boolean; level: number }`
  - `type ProfileV1` (exactly as in the spec)
  - `type KnownNames = Record<"skills" | "weapons" | "accessories" | "relics" | "spirits" | "soulWeapons", string[]>`
  - `emptyProfile(): ProfileV1`
- Produces (`@/lib/profile/rules`), all pure, never mutating their input:
  - `clampLevel(level: number, maxLevel: number | null): number`
  - `setSkillLevel(p, name, level, maxLevel): ProfileV1`
  - `setGearLevel(p, kind: GearKind, grade, level, maxLevel): ProfileV1`
  - `setOwned(p, kind: OwnableKind, key, owned: boolean): ProfileV1`
  - `equip(p, kind: EquippableKind, key: string | null): ProfileV1`
  - `setRelicLevel(p, name, level, maxLevel): ProfileV1`
  - `setSpiritLevel(p, name, level, maxLevel): ProfileV1`
  - `skillLevel(p, name, maxLevel): number`
  - `gearState(p, kind: GearKind, grade, maxLevel): GearState`
  - `relicLevel(p, name, maxLevel): number`
  - `spiritState(p, name, maxLevel: number | null): { owned: boolean; level: number }`
  - `soulWeaponOwned(p, name): boolean`
  - `equippedKey(p, kind: EquippableKind): string | null`
  - `unknownEntries(p, known: KnownNames): string[]` — `"<kind>: <name>"` entries

- [ ] **Step 1: Install Vitest and add the test script**

Run: `npm install --save-dev vitest`

Then add to the `"scripts"` block of `package.json`:

```json
    "test": "vitest run"
```

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/lib/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/profile/rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  clampLevel,
  equip,
  equippedKey,
  gearState,
  relicLevel,
  setGearLevel,
  setOwned,
  setRelicLevel,
  setSkillLevel,
  setSpiritLevel,
  skillLevel,
  soulWeaponOwned,
  spiritState,
  unknownEntries,
} from "./rules";
import { emptyProfile } from "./types";

describe("clampLevel", () => {
  it("keeps whole levels within range", () => {
    expect(clampLevel(36, 250)).toBe(36);
  });
  it("rounds fractions down", () => {
    expect(clampLevel(36.9, 250)).toBe(36);
  });
  it("caps at the max level", () => {
    expect(clampLevel(300, 250)).toBe(250);
  });
  it("turns negative and invalid input into 0", () => {
    expect(clampLevel(-3, 250)).toBe(0);
    expect(clampLevel(Number.NaN, 250)).toBe(0);
  });
  it("has no upper bound when the max is null", () => {
    expect(clampLevel(5000, null)).toBe(5000);
  });
});

describe("defaults", () => {
  it("untouched items read as not owned at level 0", () => {
    const p = emptyProfile();
    expect(skillLevel(p, "Fire Slash", 250)).toBe(0);
    expect(gearState(p, "weapons", "Common 4", 1700)).toEqual({ owned: false, level: 0 });
    expect(relicLevel(p, "HP Ring", 100)).toBe(0);
    expect(spiritState(p, "Sala", 1000)).toEqual({ owned: false, level: 0 });
    expect(soulWeaponOwned(p, "Innocence")).toBe(false);
    expect(equippedKey(p, "weapons")).toBeNull();
  });
});

describe("rule 1: equipping marks an item owned", () => {
  it("applies to gear", () => {
    const p = equip(emptyProfile(), "accessories", "Rare 2");
    expect(equippedKey(p, "accessories")).toBe("Rare 2");
    expect(gearState(p, "accessories", "Rare 2", 1700).owned).toBe(true);
  });
  it("applies to soul weapons", () => {
    const p = equip(emptyProfile(), "soulWeapons", "Innocence");
    expect(soulWeaponOwned(p, "Innocence")).toBe(true);
  });
  it("equipping another item replaces the first", () => {
    let p = equip(emptyProfile(), "weapons", "Common 4");
    p = equip(p, "weapons", "Epic 1");
    expect(equippedKey(p, "weapons")).toBe("Epic 1");
    expect(gearState(p, "weapons", "Common 4", 1700).owned).toBe(true);
  });
  it("equipping null unequips", () => {
    const p = equip(equip(emptyProfile(), "weapons", "Common 4"), "weapons", null);
    expect(equippedKey(p, "weapons")).toBeNull();
  });
});

describe("rule 2: removing ownership unequips and keeps the level", () => {
  it("applies to gear", () => {
    let p = setGearLevel(emptyProfile(), "weapons", "Epic 1", 120, 1700);
    p = equip(p, "weapons", "Epic 1");
    p = setOwned(p, "weapons", "Epic 1", false);
    expect(equippedKey(p, "weapons")).toBeNull();
    expect(gearState(p, "weapons", "Epic 1", 1700)).toEqual({ owned: false, level: 120 });
    const restored = setOwned(p, "weapons", "Epic 1", true);
    expect(gearState(restored, "weapons", "Epic 1", 1700).level).toBe(120);
  });
  it("only unequips the item being removed", () => {
    let p = equip(emptyProfile(), "weapons", "Epic 1");
    p = setOwned(p, "weapons", "Common 4", false);
    expect(equippedKey(p, "weapons")).toBe("Epic 1");
  });
  it("applies to soul weapons", () => {
    let p = equip(emptyProfile(), "soulWeapons", "Innocence");
    p = setOwned(p, "soulWeapons", "Innocence", false);
    expect(equippedKey(p, "soulWeapons")).toBeNull();
  });
});

describe("rule 3: a level above 0 marks gear and spirits owned", () => {
  it("applies to gear", () => {
    const p = setGearLevel(emptyProfile(), "weapons", "Rare 3", 10, 1700);
    expect(gearState(p, "weapons", "Rare 3", 1700)).toEqual({ owned: true, level: 10 });
  });
  it("level 0 does not mark ownership", () => {
    const p = setGearLevel(emptyProfile(), "weapons", "Rare 3", 0, 1700);
    expect(gearState(p, "weapons", "Rare 3", 1700).owned).toBe(false);
  });
  it("applies to spirits", () => {
    const p = setSpiritLevel(emptyProfile(), "Sala", 395, 1000);
    expect(spiritState(p, "Sala", 1000)).toEqual({ owned: true, level: 395 });
  });
});

describe("rule 4: a relic's level is its ownership", () => {
  it("stores only a level", () => {
    const p = setRelicLevel(emptyProfile(), "HP Ring", 100, 100);
    expect(p.relics["HP Ring"]).toEqual({ level: 100 });
    expect(relicLevel(p, "HP Ring", 100)).toBe(100);
  });
});

describe("rule 5: levels are clamped", () => {
  it("when set", () => {
    const p = setSkillLevel(emptyProfile(), "Fire Slash", 999, 250);
    expect(skillLevel(p, "Fire Slash", 250)).toBe(250);
  });
  it("when read against a lower max from newer data", () => {
    const p = setSkillLevel(emptyProfile(), "Fire Slash", 200, 250);
    expect(skillLevel(p, "Fire Slash", 130)).toBe(130);
  });
  it("a raised max keeps the stored level", () => {
    const p = setSkillLevel(emptyProfile(), "Fire Slash", 130, 130);
    expect(skillLevel(p, "Fire Slash", 250)).toBe(130);
  });
});

describe("rule 6: unknown entries", () => {
  it("are listed without being removed", () => {
    let p = setSkillLevel(emptyProfile(), "Fire Slash", 5, 250);
    p = setSkillLevel(p, "Old Skill", 9, 250);
    p = equip(p, "soulWeapons", "Retired Blade");
    const known = {
      skills: ["Fire Slash"], weapons: [], accessories: [],
      relics: [], spirits: [], soulWeapons: [],
    };
    expect(unknownEntries(p, known)).toEqual(["skills: Old Skill", "soulWeapons: Retired Blade"]);
    expect(p.skills["Old Skill"]).toEqual({ level: 9 });
  });
});

describe("actions", () => {
  it("return a new profile and leave the old one untouched", () => {
    const before = emptyProfile();
    const after = setSkillLevel(before, "Fire Slash", 3, 250);
    expect(before.skills).toEqual({});
    expect(after).not.toBe(before);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL with `Failed to resolve import "./rules"`.

- [ ] **Step 4: Write the types**

Create `src/lib/profile/types.ts`:

```ts
/** Weapons and accessories are graded, and keyed by grade name ("Common 4"). */
export type GearKind = "weapons" | "accessories";
export type OwnableKind = GearKind | "spirits" | "soulWeapons";
export type EquippableKind = GearKind | "soulWeapons";

export type GearState = { owned: boolean; level: number };

/**
 * A player's account as entered in the analyzer. Stored sparsely: only items
 * the player has changed appear, everything else reads as the default.
 */
export type ProfileV1 = {
  version: 1;
  skills: Record<string, { level: number }>;
  weapons: Record<string, GearState>;
  accessories: Record<string, GearState>;
  equippedWeapon: string | null;
  equippedAccessory: string | null;
  relics: Record<string, { level: number }>;
  spirits: Record<string, { owned: boolean; level: number }>;
  soulWeapons: Record<string, { owned: boolean }>;
  equippedSoulWeapon: string | null;
};

export type KnownNames = Record<
  "skills" | "weapons" | "accessories" | "relics" | "spirits" | "soulWeapons",
  string[]
>;

export function emptyProfile(): ProfileV1 {
  return {
    version: 1,
    skills: {},
    weapons: {},
    accessories: {},
    equippedWeapon: null,
    equippedAccessory: null,
    relics: {},
    spirits: {},
    soulWeapons: {},
    equippedSoulWeapon: null,
  };
}
```

- [ ] **Step 5: Write the rules**

Create `src/lib/profile/rules.ts`:

```ts
import type {
  EquippableKind,
  GearKind,
  GearState,
  KnownNames,
  OwnableKind,
  ProfileV1,
} from "./types";

const NO_GEAR: GearState = { owned: false, level: 0 };

/** Rule 5: whole levels between 0 and the item's current max. */
export function clampLevel(level: number, maxLevel: number | null): number {
  if (!Number.isFinite(level) || level < 0) return 0;
  const whole = Math.floor(level);
  return maxLevel === null ? whole : Math.min(whole, maxLevel);
}

function withGear(
  profile: ProfileV1,
  kind: GearKind,
  grade: string,
  state: GearState,
): ProfileV1 {
  return kind === "weapons"
    ? { ...profile, weapons: { ...profile.weapons, [grade]: state } }
    : { ...profile, accessories: { ...profile.accessories, [grade]: state } };
}

function withEquipped(
  profile: ProfileV1,
  kind: EquippableKind,
  key: string | null,
): ProfileV1 {
  switch (kind) {
    case "weapons":
      return { ...profile, equippedWeapon: key };
    case "accessories":
      return { ...profile, equippedAccessory: key };
    case "soulWeapons":
      return { ...profile, equippedSoulWeapon: key };
  }
}

export function equippedKey(
  profile: ProfileV1,
  kind: EquippableKind,
): string | null {
  switch (kind) {
    case "weapons":
      return profile.equippedWeapon;
    case "accessories":
      return profile.equippedAccessory;
    case "soulWeapons":
      return profile.equippedSoulWeapon;
  }
}

export function setSkillLevel(
  profile: ProfileV1,
  name: string,
  level: number,
  maxLevel: number,
): ProfileV1 {
  return {
    ...profile,
    skills: { ...profile.skills, [name]: { level: clampLevel(level, maxLevel) } },
  };
}

/** Rule 3: a level above 0 marks the gear owned. */
export function setGearLevel(
  profile: ProfileV1,
  kind: GearKind,
  grade: string,
  level: number,
  maxLevel: number,
): ProfileV1 {
  const clamped = clampLevel(level, maxLevel);
  const current = profile[kind][grade] ?? NO_GEAR;
  return withGear(profile, kind, grade, {
    owned: current.owned || clamped > 0,
    level: clamped,
  });
}

/** Rule 2: removing ownership unequips the item but keeps its level. */
export function setOwned(
  profile: ProfileV1,
  kind: OwnableKind,
  key: string,
  owned: boolean,
): ProfileV1 {
  if (kind === "spirits") {
    const current = profile.spirits[key] ?? NO_GEAR;
    return { ...profile, spirits: { ...profile.spirits, [key]: { ...current, owned } } };
  }

  const next =
    kind === "soulWeapons"
      ? { ...profile, soulWeapons: { ...profile.soulWeapons, [key]: { owned } } }
      : withGear(profile, kind, key, { ...(profile[kind][key] ?? NO_GEAR), owned });

  return !owned && equippedKey(next, kind) === key
    ? withEquipped(next, kind, null)
    : next;
}

/** Rule 1: equipping marks the item owned. `null` unequips. */
export function equip(
  profile: ProfileV1,
  kind: EquippableKind,
  key: string | null,
): ProfileV1 {
  if (key === null) return withEquipped(profile, kind, null);
  return withEquipped(setOwned(profile, kind, key, true), kind, key);
}

/** Rule 4: a relic has no owned flag; level 0 means not owned. */
export function setRelicLevel(
  profile: ProfileV1,
  name: string,
  level: number,
  maxLevel: number,
): ProfileV1 {
  return {
    ...profile,
    relics: { ...profile.relics, [name]: { level: clampLevel(level, maxLevel) } },
  };
}

/** Rule 3 also applies to spirits. */
export function setSpiritLevel(
  profile: ProfileV1,
  name: string,
  level: number,
  maxLevel: number | null,
): ProfileV1 {
  const clamped = clampLevel(level, maxLevel);
  const current = profile.spirits[name] ?? NO_GEAR;
  return {
    ...profile,
    spirits: {
      ...profile.spirits,
      [name]: { owned: current.owned || clamped > 0, level: clamped },
    },
  };
}

export function skillLevel(profile: ProfileV1, name: string, maxLevel: number): number {
  return clampLevel(profile.skills[name]?.level ?? 0, maxLevel);
}

export function gearState(
  profile: ProfileV1,
  kind: GearKind,
  grade: string,
  maxLevel: number,
): GearState {
  const state = profile[kind][grade] ?? NO_GEAR;
  return { owned: state.owned, level: clampLevel(state.level, maxLevel) };
}

export function relicLevel(profile: ProfileV1, name: string, maxLevel: number): number {
  return clampLevel(profile.relics[name]?.level ?? 0, maxLevel);
}

export function spiritState(
  profile: ProfileV1,
  name: string,
  maxLevel: number | null,
): { owned: boolean; level: number } {
  const state = profile.spirits[name] ?? NO_GEAR;
  return { owned: state.owned, level: clampLevel(state.level, maxLevel) };
}

export function soulWeaponOwned(profile: ProfileV1, name: string): boolean {
  return profile.soulWeapons[name]?.owned ?? false;
}

/** Rule 6: entries whose names the current data no longer has. */
export function unknownEntries(profile: ProfileV1, known: KnownNames): string[] {
  const kinds = ["skills", "weapons", "accessories", "relics", "spirits", "soulWeapons"] as const;
  return kinds.flatMap((kind) => {
    const names = new Set(known[kind]);
    return Object.keys(profile[kind])
      .filter((name) => !names.has(name))
      .map((name) => `${kind}: ${name}`);
  });
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`

Expected: all tests in `rules.test.ts` PASS (22 tests).

Then run: `npx tsc --noEmit` and `npx eslint .` — both clean.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/profile/types.ts src/lib/profile/rules.ts src/lib/profile/rules.test.ts
git commit -m "Add the player profile rules with tests"
```

---

### Task 9: Profile storage and migration

**Files:**
- Create: `src/lib/profile/migration.ts`
- Create: `src/lib/profile/storage.ts`
- Test: `src/lib/profile/migration.test.ts`
- Test: `src/lib/profile/storage.test.ts`

**Interfaces:**
- Consumes: `emptyProfile`, `ProfileV1` (Task 8); `clampLevel` (Task 8); `src/data/optimizer/skills.json` and `relics.json` (Task 7).
- Produces (`@/lib/profile/migration`):
  - `LEGACY_SKILL_NAMES: Readonly<Record<string, string>>` — old skill id → name
  - `LEGACY_RELIC_NAMES: Readonly<Record<string, string>>` — old relic id → name
  - `importLegacyLevels(skillRaw: string | null, relicRaw: string | null): ProfileV1`
- Produces (`@/lib/profile/storage`):
  - `PROFILE_KEY`, `UNREADABLE_KEY`, `LEGACY_SKILL_KEY`, `LEGACY_RELIC_KEY` (string constants)
  - `type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">`
  - `parseProfile(raw: string): ProfileV1 | null`
  - `loadProfile(storage: StorageLike): ProfileV1`
  - `saveProfile(storage: StorageLike, profile: ProfileV1): boolean`

- [ ] **Step 1: Write the failing migration tests**

Create `src/lib/profile/migration.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import relicsData from "@/data/optimizer/relics.json";
import skillsData from "@/data/optimizer/skills.json";
import { importLegacyLevels, LEGACY_RELIC_NAMES, LEGACY_SKILL_NAMES } from "./migration";

describe("legacy name tables", () => {
  it("cover the 46 old skills and 12 old relics", () => {
    expect(Object.keys(LEGACY_SKILL_NAMES)).toHaveLength(46);
    expect(Object.keys(LEGACY_RELIC_NAMES)).toHaveLength(12);
  });

  it("only name items the optimizer data has", () => {
    const skills = new Set(skillsData.skills.map((s) => s.name));
    const relics = new Set(relicsData.relics.map((r) => r.name));
    expect(Object.values(LEGACY_SKILL_NAMES).filter((n) => !skills.has(n))).toEqual([]);
    expect(Object.values(LEGACY_RELIC_NAMES).filter((n) => !relics.has(n))).toEqual([]);
  });
});

describe("importLegacyLevels", () => {
  it("moves old id-keyed levels onto names", () => {
    const profile = importLegacyLevels('{"2":36,"1":5}', '{"0":100,"5":7}');
    expect(profile.skills).toEqual({ "Ice Stone": { level: 36 }, "Fire Slash": { level: 5 } });
    expect(profile.relics).toEqual({ "Strength Gloves": { level: 100 }, "Lucky Pendant": { level: 7 } });
  });

  it("keeps unknown ids rather than dropping them", () => {
    const profile = importLegacyLevels('{"99":4}', null);
    expect(profile.skills).toEqual({ "legacy-skill-99": { level: 4 } });
  });

  it("ignores unreadable or non-numeric input", () => {
    const profile = importLegacyLevels("not json", '{"0":"high"}');
    expect(profile.skills).toEqual({});
    expect(profile.relics).toEqual({});
  });
});
```

- [ ] **Step 2: Write the failing storage tests**

Create `src/lib/profile/storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  LEGACY_RELIC_KEY,
  LEGACY_SKILL_KEY,
  loadProfile,
  parseProfile,
  PROFILE_KEY,
  saveProfile,
  type StorageLike,
  UNREADABLE_KEY,
} from "./storage";
import { emptyProfile } from "./types";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  return { data, storage };
}

describe("loadProfile", () => {
  it("starts empty when nothing is stored, and writes nothing", () => {
    const { data, storage } = memoryStorage();
    expect(loadProfile(storage)).toEqual(emptyProfile());
    expect(data.size).toBe(0);
  });

  it("reads back a saved profile", () => {
    const { storage } = memoryStorage();
    const profile = { ...emptyProfile(), skills: { "Fire Slash": { level: 12 } }, equippedWeapon: "Epic 1" };
    expect(saveProfile(storage, profile)).toBe(true);
    expect(loadProfile(storage)).toEqual(profile);
  });

  it("backs up an unreadable profile and starts empty", () => {
    const { data, storage } = memoryStorage({ [PROFILE_KEY]: "{broken" });
    expect(loadProfile(storage)).toEqual(emptyProfile());
    expect(data.get(UNREADABLE_KEY)).toBe("{broken");
  });

  it("treats an unknown version as unreadable", () => {
    const raw = JSON.stringify({ version: 2, skills: {} });
    const { data, storage } = memoryStorage({ [PROFILE_KEY]: raw });
    expect(loadProfile(storage)).toEqual(emptyProfile());
    expect(data.get(UNREADABLE_KEY)).toBe(raw);
  });

  it("imports legacy levels when no profile exists, then removes the old keys", () => {
    const { data, storage } = memoryStorage({
      [LEGACY_SKILL_KEY]: '{"2":36}',
      [LEGACY_RELIC_KEY]: '{"0":100}',
    });
    const profile = loadProfile(storage);
    expect(profile.skills).toEqual({ "Ice Stone": { level: 36 } });
    expect(profile.relics).toEqual({ "Strength Gloves": { level: 100 } });
    expect(JSON.parse(data.get(PROFILE_KEY) ?? "null")).toEqual(profile);
    expect(data.has(LEGACY_SKILL_KEY)).toBe(false);
    expect(data.has(LEGACY_RELIC_KEY)).toBe(false);
  });

  it("never imports legacy levels over an existing profile", () => {
    const existing = { ...emptyProfile(), skills: { "Ice Stone": { level: 200 } } };
    const { data, storage } = memoryStorage({
      [PROFILE_KEY]: JSON.stringify(existing),
      [LEGACY_SKILL_KEY]: '{"2":36}',
    });
    expect(loadProfile(storage)).toEqual(existing);
    expect(data.has(LEGACY_SKILL_KEY)).toBe(false);
  });

  it("keeps the legacy keys if the migrated profile cannot be saved", () => {
    const { data, storage } = memoryStorage({ [LEGACY_SKILL_KEY]: '{"2":36}' });
    storage.setItem = () => {
      throw new Error("quota");
    };
    expect(loadProfile(storage).skills).toEqual({ "Ice Stone": { level: 36 } });
    expect(data.has(LEGACY_SKILL_KEY)).toBe(true);
  });

  it("survives storage that throws on read", () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(loadProfile(storage)).toEqual(emptyProfile());
  });
});

describe("parseProfile", () => {
  it("drops malformed entries and keeps valid ones", () => {
    const raw = JSON.stringify({
      ...emptyProfile(),
      skills: { "Fire Slash": { level: 5 }, Broken: { level: "high" } },
      weapons: { "Common 4": { owned: true, level: 3 }, Bad: { owned: "yes", level: 1 } },
      equippedWeapon: 42,
    });
    const profile = parseProfile(raw);
    expect(profile?.skills).toEqual({ "Fire Slash": { level: 5 } });
    expect(profile?.weapons).toEqual({ "Common 4": { owned: true, level: 3 } });
    expect(profile?.equippedWeapon).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL with `Failed to resolve import "./migration"` and `"./storage"`.

- [ ] **Step 4: Write the migration**

Create `src/lib/profile/migration.ts`:

```ts
import { clampLevel } from "./rules";
import { emptyProfile, type ProfileV1 } from "./types";

/**
 * Old skill ids, frozen on 2026-09-13 from the pre-optimizer
 * src/data/skills.json, which keyed saved levels by these ids.
 */
export const LEGACY_SKILL_NAMES: Readonly<Record<string, string>> = {
  "1": "Fire Slash", "2": "Ice Stone", "3": "Lightning Slash", "4": "Stone Strike",
  "5": "Fire Sword", "6": "Mana's Blessing", "7": "Lightning Stroke",
  "8": "Ground's Blessing", "9": "Hot Blast", "10": "Ice Shower", "11": "Agile",
  "12": "Power Strike", "13": "Flame Slash", "14": "Water Slash", "15": "Thunder Slash",
  "16": "Power Impact", "17": "Burning Sword", "18": "Flowing Blade", "19": "Speed Sword",
  "20": "Earth's Will", "21": "Flame Wave", "22": "Curved Blade", "23": "Fulgurous",
  "24": "Iron Will", "25": "Hellfire Slash", "26": "Dancing Waves", "27": "Wind Sword",
  "28": "Life Mana", "29": "Fire Blast", "30": "Ice Time", "31": "Thunderbolt Slash",
  "32": "Giga Strike", "33": "Rage", "34": "Meditation", "35": "Red Lightning",
  "36": "Giga Impact", "37": "Pillar of Fire", "38": "Blizzard", "39": "Supersonic",
  "40": "Demon Hunt", "41": "Warrior Burn", "42": "Strong Current", "43": "Lightning Body",
  "44": "Wrath of Gods", "45": "Rave", "46": "Mantra",
};

/**
 * Old relic ids from the pre-optimizer src/data/equipment.json. The wiki
 * spelled id 5 "Lucky Pendent"; it is mapped to the optimizer's spelling.
 */
export const LEGACY_RELIC_NAMES: Readonly<Record<string, string>> = {
  "0": "Strength Gloves", "1": "Hunter's Eye", "2": "HP Ring", "3": "Recovery Totem",
  "4": "Bracelet of Speed", "5": "Lucky Pendant", "6": "Focus Ring", "7": "Invisible Cloak",
  "8": "Silence Flame", "9": "Abyss's Water Drop", "10": "Eye of Typoon", "11": "Emperor Ring",
};

function parseLevels(raw: string | null): [string, number][] {
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data)) return [];
    return Object.entries(data).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
    );
  } catch {
    return [];
  }
}

/** Build a profile from the two old id-keyed level stores. */
export function importLegacyLevels(
  skillRaw: string | null,
  relicRaw: string | null,
): ProfileV1 {
  const profile = emptyProfile();
  // Unknown ids are kept under a readable key so nothing is silently dropped.
  for (const [id, level] of parseLevels(skillRaw)) {
    profile.skills[LEGACY_SKILL_NAMES[id] ?? `legacy-skill-${id}`] = {
      level: clampLevel(level, null),
    };
  }
  for (const [id, level] of parseLevels(relicRaw)) {
    profile.relics[LEGACY_RELIC_NAMES[id] ?? `legacy-relic-${id}`] = {
      level: clampLevel(level, null),
    };
  }
  return profile;
}
```

- [ ] **Step 5: Write the storage**

Create `src/lib/profile/storage.ts`:

```ts
import { importLegacyLevels } from "./migration";
import { emptyProfile, type GearState, type ProfileV1 } from "./types";

export const PROFILE_KEY = "slayer-analyzer.profile";
export const UNREADABLE_KEY = "slayer-analyzer.profile.unreadable";
export const LEGACY_SKILL_KEY = "analyzer.skillLevels";
export const LEGACY_RELIC_KEY = "analyzer.relicLevels";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const wholeLevel = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;

function entries<T>(value: unknown, read: (entry: Json) => T | null): Record<string, T> {
  const result: Record<string, T> = {};
  if (!isRecord(value)) return result;
  for (const [name, entry] of Object.entries(value)) {
    const parsed = isRecord(entry) ? read(entry) : null;
    if (parsed !== null) result[name] = parsed;
  }
  return result;
}

const levelEntry = (entry: Json) => {
  const level = wholeLevel(entry.level);
  return level === null ? null : { level };
};

const ownedLevelEntry = (entry: Json): GearState | null => {
  const level = wholeLevel(entry.level);
  return level === null || typeof entry.owned !== "boolean"
    ? null
    : { owned: entry.owned, level };
};

const ownedEntry = (entry: Json) =>
  typeof entry.owned === "boolean" ? { owned: entry.owned } : null;

const name = (value: unknown) => (typeof value === "string" ? value : null);

/** A stored profile, or null if it is not a readable version 1 profile. */
export function parseProfile(raw: string): ProfileV1 | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.version !== 1) return null;

  return {
    version: 1,
    skills: entries(data.skills, levelEntry),
    weapons: entries(data.weapons, ownedLevelEntry),
    accessories: entries(data.accessories, ownedLevelEntry),
    equippedWeapon: name(data.equippedWeapon),
    equippedAccessory: name(data.equippedAccessory),
    relics: entries(data.relics, levelEntry),
    spirits: entries(data.spirits, ownedLevelEntry),
    soulWeapons: entries(data.soulWeapons, ownedEntry),
    equippedSoulWeapon: name(data.equippedSoulWeapon),
  };
}

// Storage can be unavailable (private windows, blocked site data), so every
// access is guarded and the profile then lasts for the session only.
function read(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function write(storage: StorageLike, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeLegacyKeys(storage: StorageLike) {
  for (const key of [LEGACY_SKILL_KEY, LEGACY_RELIC_KEY]) {
    try {
      storage.removeItem(key);
    } catch {
      // Leaving an old key behind is harmless; it is never imported over a profile.
    }
  }
}

export function saveProfile(storage: StorageLike, profile: ProfileV1): boolean {
  return write(storage, PROFILE_KEY, JSON.stringify(profile));
}

export function loadProfile(storage: StorageLike): ProfileV1 {
  const raw = read(storage, PROFILE_KEY);

  if (raw !== null) {
    // A profile exists, so old keys are removed without being imported.
    removeLegacyKeys(storage);
    const parsed = parseProfile(raw);
    if (parsed !== null) return parsed;
    write(storage, UNREADABLE_KEY, raw);
    return emptyProfile();
  }

  const skillRaw = read(storage, LEGACY_SKILL_KEY);
  const relicRaw = read(storage, LEGACY_RELIC_KEY);
  if (skillRaw === null && relicRaw === null) return emptyProfile();

  const migrated = importLegacyLevels(skillRaw, relicRaw);
  if (saveProfile(storage, migrated)) removeLegacyKeys(storage);
  return migrated;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`

Expected: all tests PASS (22 rules, 5 migration, 9 storage). Then `npx tsc --noEmit` and `npx eslint .` are clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/profile/migration.ts src/lib/profile/storage.ts src/lib/profile/migration.test.ts src/lib/profile/storage.test.ts
git commit -m "Store the player profile and migrate saved levels"
```

---

### Task 10: Profile store and hook

**Files:**
- Create: `src/lib/profile/store.ts`
- Test: `src/lib/profile/store.test.ts`
- Create: `src/lib/profile/use-profile.ts`

**Interfaces:**
- Consumes: `loadProfile`, `saveProfile`, `StorageLike` (Task 9); every action in `rules.ts` (Task 8); `emptyProfile` (Task 8).
- Produces:
  - `@/lib/profile/store`: `createProfileStore(getStorage: () => StorageLike | null)` returning `{ subscribe(listener): () => void; getSnapshot(): ProfileV1; update(change: (p: ProfileV1) => ProfileV1): void }`.
  - `@/lib/profile/use-profile`: `useProfile()` returning `{ profile, setSkillLevel(name, level, maxLevel), setAllSkillLevels(items: { name: string; maxLevel: number }[], level), setGearLevel(kind, grade, level, maxLevel), setOwned(kind, key, owned), equip(kind, key | null), setRelicLevel(name, level, maxLevel), setAllRelicLevels(items: { name: string; maxLevel: number }[], level), setSpiritLevel(name, level, maxLevel), resetProfile() }`.

- [ ] **Step 1: Write the failing store tests**

Create `src/lib/profile/store.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { setSkillLevel } from "./rules";
import { createProfileStore } from "./store";
import { PROFILE_KEY, type StorageLike } from "./storage";
import { emptyProfile } from "./types";

function memoryStorage() {
  const data = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  return { data, storage };
}

describe("createProfileStore", () => {
  it("returns the same snapshot until something changes", () => {
    const { storage } = memoryStorage();
    const store = createProfileStore(() => storage);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("saves every update and notifies subscribers", () => {
    const { data, storage } = memoryStorage();
    const store = createProfileStore(() => storage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.update((p) => setSkillLevel(p, "Fire Slash", 7, 250));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().skills["Fire Slash"]).toEqual({ level: 7 });
    expect(JSON.parse(data.get(PROFILE_KEY) ?? "null").skills).toEqual({ "Fire Slash": { level: 7 } });

    unsubscribe();
    store.update((p) => setSkillLevel(p, "Fire Slash", 8, 250));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("works for the session when no storage is available", () => {
    const store = createProfileStore(() => null);
    expect(store.getSnapshot()).toEqual(emptyProfile());
    store.update((p) => setSkillLevel(p, "Fire Slash", 3, 250));
    expect(store.getSnapshot().skills["Fire Slash"]).toEqual({ level: 3 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL with `Failed to resolve import "./store"`.

- [ ] **Step 3: Write the store**

Create `src/lib/profile/store.ts`:

```ts
import { loadProfile, saveProfile, type StorageLike } from "./storage";
import { emptyProfile, type ProfileV1 } from "./types";

/**
 * An external store for useSyncExternalStore. The profile is read from
 * storage on first use and saved after every change.
 */
export function createProfileStore(getStorage: () => StorageLike | null) {
  const listeners = new Set<() => void>();
  let current: ProfileV1 | null = null;

  function getSnapshot(): ProfileV1 {
    if (current === null) {
      const storage = getStorage();
      current = storage ? loadProfile(storage) : emptyProfile();
    }
    return current;
  }

  function update(change: (profile: ProfileV1) => ProfileV1) {
    current = change(getSnapshot());
    const storage = getStorage();
    if (storage) saveProfile(storage, current);
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { subscribe, getSnapshot, update };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: all tests PASS (3 new).

- [ ] **Step 5: Write the hook**

Create `src/lib/profile/use-profile.ts`:

```ts
"use client";

import { useSyncExternalStore } from "react";
import * as rules from "./rules";
import { createProfileStore } from "./store";
import type { StorageLike } from "./storage";
import {
  emptyProfile,
  type EquippableKind,
  type GearKind,
  type OwnableKind,
} from "./types";

function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const store = createProfileStore(browserStorage);
const SERVER_PROFILE = emptyProfile();

type Levelled = { name: string; maxLevel: number };

/** The player's profile and every action that changes it. */
export function useProfile() {
  const profile = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => SERVER_PROFILE,
  );
  const { update } = store;

  return {
    profile,
    setSkillLevel: (name: string, level: number, maxLevel: number) =>
      update((p) => rules.setSkillLevel(p, name, level, maxLevel)),
    setAllSkillLevels: (items: Levelled[], level: number) =>
      update((p) =>
        items.reduce((acc, item) => rules.setSkillLevel(acc, item.name, level, item.maxLevel), p),
      ),
    setGearLevel: (kind: GearKind, grade: string, level: number, maxLevel: number) =>
      update((p) => rules.setGearLevel(p, kind, grade, level, maxLevel)),
    setOwned: (kind: OwnableKind, key: string, owned: boolean) =>
      update((p) => rules.setOwned(p, kind, key, owned)),
    equip: (kind: EquippableKind, key: string | null) =>
      update((p) => rules.equip(p, kind, key)),
    setRelicLevel: (name: string, level: number, maxLevel: number) =>
      update((p) => rules.setRelicLevel(p, name, level, maxLevel)),
    setAllRelicLevels: (items: Levelled[], level: number) =>
      update((p) =>
        items.reduce((acc, item) => rules.setRelicLevel(acc, item.name, level, item.maxLevel), p),
      ),
    setSpiritLevel: (name: string, level: number, maxLevel: number) =>
      update((p) => rules.setSpiritLevel(p, name, level, maxLevel)),
    resetProfile: () => update(() => emptyProfile()),
  };
}
```

- [ ] **Step 6: Check types and lint**

Run: `npx tsc --noEmit` and `npx eslint .`

Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/profile/store.ts src/lib/profile/store.test.ts src/lib/profile/use-profile.ts
git commit -m "Expose the profile to React through useProfile"
```

### Task 11: Game formulas, typed data and sprite sizes

**Files:**
- Create: `src/lib/game/formulas.ts`
- Test: `src/lib/game/formulas.test.ts`
- Create: `src/components/analyzer/data.ts`
- Modify: `src/components/analyzer/sprite.tsx` (accept any native size)

**Interfaces:**
- Consumes: `src/data/optimizer/*.json` (Task 7); `KnownNames` (Task 8).
- Produces (`@/lib/game/formulas`):
  - `type Band = { from: number; to: number | null; factor: number }`
  - `OWNED_SHARE = 0.3`
  - `skillPower(baseValue: number, upgradeValue: number, level: number): number | null` — null below level 1
  - `gearEffects(multiplier: number, factors: readonly number[], level: number): { equip: number; owned: number }` — percentages
  - `bandAt(bands: readonly Band[], level: number): Band | null`
  - `relicBuff(bands: readonly Band[], level: number): number | null` — percentage
- Produces (`src/components/analyzer/data.ts`):
  - Types `Skill`, `Gear`, `Relic`, `Spirit`, `SoulWeapon` (fields exactly as extracted in Tasks 2–6)
  - `SKILLS`, `WEAPONS`, `ACCESSORIES`, `RELICS`, `SPIRITS`, `SOUL_WEAPONS`, `GEAR_LEVEL_FACTORS`, `KNOWN_NAMES: KnownNames`
  - `GRADE_ORDER: readonly string[]`, `ELEMENTS: readonly ["Fire", "Water", "Wind", "Earth"]`
  - `formatValue(value: number | null | undefined): string`, `formatPercent(value: number | null): string`
- Produces (`sprite.tsx`): `Sprite({ src, native: number, size, className })`

- [ ] **Step 1: Write the failing formula tests**

Create `src/lib/game/formulas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import accessoriesData from "@/data/optimizer/accessories.json";
import gearLevelsData from "@/data/optimizer/gear-levels.json";
import relicsData from "@/data/optimizer/relics.json";
import { bandAt, gearEffects, relicBuff, skillPower } from "./formulas";

function relic(name: string) {
  const found = relicsData.relics.find((r) => r.name === name);
  if (!found) throw new Error(`no relic ${name}`);
  return found;
}

describe("skillPower", () => {
  it("is not defined below level 1", () => {
    expect(skillPower(110, 11, 0)).toBeNull();
  });
  it("adds the per-level value after level 1", () => {
    expect(skillPower(110, 11, 1)).toBe(110);
    expect(skillPower(110, 11, 36)).toBe(495);
  });
});

describe("gearEffects", () => {
  it("matches the in-game Rusty Bracelet at level 297", () => {
    const common4 = accessoriesData.accessories.find((g) => g.grade === "Common 4");
    if (!common4) throw new Error("no Common 4 accessory");
    const { equip, owned } = gearEffects(common4.multiplier, gearLevelsData.factors, 297);
    expect(equip).toBeCloseTo(109.9, 1);
    expect(owned).toBeCloseTo(33.0, 1);
  });
  it("is the bare multiplier at level 0", () => {
    expect(gearEffects(7, [1, 1.375], 0)).toEqual({ equip: 7, owned: 7 * 0.3 });
  });
  it("stops at the end of the factor table", () => {
    expect(gearEffects(7, [1, 2], 50).equip).toBe(14);
  });
});

describe("relics", () => {
  it("match the game at level 100", () => {
    expect(relicBuff(relic("Strength Gloves").bands, 100)).toBeCloseTo(2200);
    expect(relicBuff(relic("Hunter's Eye").bands, 100)).toBeCloseTo(400);
    expect(relicBuff(relic("HP Ring").bands, 100)).toBeCloseTo(1400);
  });
  it("use the 50-59 band at level 50", () => {
    expect(relicBuff(relic("Strength Gloves").bands, 50)).toBeCloseTo(400);
  });
  it("find the band that contains a level", () => {
    const bands = [
      { from: 0, to: 9, factor: 0.05 },
      { from: 10, to: null, factor: 0.1 },
    ];
    expect(bandAt(bands, 9)?.factor).toBe(0.05);
    expect(bandAt(bands, 10)?.factor).toBe(0.1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL with `Failed to resolve import "./formulas"`.

- [ ] **Step 3: Write the formulas**

Create `src/lib/game/formulas.ts`:

```ts
/** A relic level band: `factor` applies from `from` to `to` (null = no end). */
export type Band = { from: number; to: number | null; factor: number };

/** Owned effect is this share of the equip effect (Equipment Data F149 vs E149). */
export const OWNED_SHARE = 0.3;

/**
 * Skill power % at a level, as the wiki's skill card computes it. The game's
 * displayed number also folds in account bonuses, which are out of scope.
 */
export function skillPower(baseValue: number, upgradeValue: number, level: number): number | null {
  if (level < 1) return null;
  return baseValue + upgradeValue * (Math.floor(level) - 1);
}

/** Equip effect % = grade multiplier x factor for the enhance level. */
export function gearEffects(
  multiplier: number,
  factors: readonly number[],
  level: number,
): { equip: number; owned: number } {
  const index = Math.min(Math.max(Math.floor(level), 0), factors.length - 1);
  const equip = multiplier * factors[index];
  return { equip, owned: equip * OWNED_SHARE };
}

export function bandAt(bands: readonly Band[], level: number): Band | null {
  return bands.find((band) => level >= band.from && (band.to === null || level <= band.to)) ?? null;
}

/** Relic buff % at a level: level x the band's factor x 100. */
export function relicBuff(bands: readonly Band[], level: number): number | null {
  const band = bandAt(bands, level);
  return band === null ? null : level * band.factor * 100;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`

Expected: all tests PASS (7 new).

- [ ] **Step 5: Write the typed data module**

Create `src/components/analyzer/data.ts`:

```ts
import accessoriesData from "@/data/optimizer/accessories.json";
import gearLevelsData from "@/data/optimizer/gear-levels.json";
import relicsData from "@/data/optimizer/relics.json";
import skillsData from "@/data/optimizer/skills.json";
import soulWeaponsData from "@/data/optimizer/soul-weapons.json";
import spiritsData from "@/data/optimizer/spirits.json";
import weaponsData from "@/data/optimizer/weapons.json";
import type { Band } from "@/lib/game/formulas";
import type { KnownNames } from "@/lib/profile/types";

export const GRADE_ORDER = ["Common", "Great", "Rare", "Epic", "Legendary", "Mythic", "Immortal"] as const;
export const ELEMENTS = ["Fire", "Water", "Wind", "Earth"] as const;

type Art = { icon: string | null; iconSize: number | null };

export type Skill = Art & {
  id: number;
  name: string;
  element: string | null;
  grade: string;
  maxLevel: number;
  mpCost: number | null;
  baseValue: number | null;
  upgradeValue: number | null;
  cooldown: number | null;
  range: number | null;
  duration: number | null;
  description: { basic: string | null; specific: string | null };
};

export type Gear = Art & {
  grade: string;
  tier: string;
  gradeNumber: number | null;
  tierRank: number | null;
  multiplier: number;
  baseMaxLevel: number;
  maxLevel: number;
  secondary: Record<string, number | null>;
};

export type Relic = Art & {
  id: number;
  name: string;
  buff: string | null;
  maxLevel: number;
  bands: Band[];
};

export type Spirit = Art & {
  id: number;
  name: string;
  maxLevel: number;
  element: string | null;
  skill: {
    name: string | null;
    description: string | null;
    type: string | null;
    cooldown: number | null;
    levels: { level: number; effect: string }[];
  } | null;
};

export type SoulWeapon = Art & {
  id: number;
  name: string;
  soulColor: string | null;
  attack: number | null;
  cost: number | null;
  disassemblyReward: number | null;
  requirement: { item: string | null; grade: string | null };
  stage: { number: number | null; name: string | null };
  engraving: { atk: number | null; hp: number | null };
};

export const SKILLS = skillsData.skills as unknown as Skill[];
export const WEAPONS = weaponsData.weapons as unknown as Gear[];
export const ACCESSORIES = accessoriesData.accessories as unknown as Gear[];
export const RELICS = relicsData.relics as unknown as Relic[];
export const SPIRITS = spiritsData.spirits as unknown as Spirit[];
export const SOUL_WEAPONS = soulWeaponsData.soulWeapons as unknown as SoulWeapon[];
export const GEAR_LEVEL_FACTORS: readonly number[] = gearLevelsData.factors;

export const KNOWN_NAMES: KnownNames = {
  skills: SKILLS.map((skill) => skill.name),
  weapons: WEAPONS.map((gear) => gear.grade),
  accessories: ACCESSORIES.map((gear) => gear.grade),
  relics: RELICS.map((relic) => relic.name),
  spirits: SPIRITS.map((spirit) => spirit.name),
  soulWeapons: SOUL_WEAPONS.map((weapon) => weapon.name),
};

/** Values run into the trillions, so long digit strings get compacted. */
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 });

export function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Math.abs(value) >= 100_000
    ? compact.format(value)
    : value.toLocaleString("en", { maximumFractionDigits: 2 });
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${formatValue(value)}%`;
}
```

- [ ] **Step 6: Let `Sprite` take any native size**

In `src/components/analyzer/sprite.tsx`, replace:

```tsx
export type NativeSize = 64 | 128;
```

with:

```tsx
/** The art's real pixel width, recorded per item by the extractor. */
export type NativeSize = number;
```

- [ ] **Step 7: Check types and lint**

Run: `npx tsc --noEmit` and `npx eslint .`

Expected: both clean. (`data.ts` is not imported by any screen yet.)

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/formulas.ts src/lib/game/formulas.test.ts src/components/analyzer/data.ts src/components/analyzer/sprite.tsx
git commit -m "Add game formulas and typed optimizer data for the analyzer"
```

---

### Task 12: Skill grid on the new data and profile

**Files:**
- Modify (replace contents): `src/components/analyzer/skill-grid.tsx`

**Interfaces:**
- Consumes: `SKILLS`, `ELEMENTS`, `GRADE_ORDER`, `Skill` (Task 11); `skillPower` (Task 11); `skillLevel` (Task 8); `useProfile` (Task 10); `InlineLevel`, `LevelInput` (existing `level-input.tsx`, both accept `min`); `Sprite`; `ELEMENT_TEXT`.
- Produces: `SkillGrid()` (same export the shell already renders).

- [ ] **Step 1: Replace the skill grid**

Replace the whole of `src/components/analyzer/skill-grid.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { skillPower } from "@/lib/game/formulas";
import { skillLevel } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import { ELEMENTS, GRADE_ORDER, SKILLS, type Skill } from "./data";
import { InlineLevel, LevelInput } from "./level-input";
import { Sprite } from "./sprite";
import { ELEMENT_TEXT } from "./tiers";

const GRID = "grid grid-cols-[repeat(4,minmax(10rem,1fr))] gap-3";
const MAX_SKILL_LEVEL = Math.max(...SKILLS.map((skill) => skill.maxLevel));

/** Within an element the game runs lowest grade first, then by id. */
function byGrade(a: Skill, b: Skill) {
  const rank = (skill: Skill) => GRADE_ORDER.indexOf(skill.grade as (typeof GRADE_ORDER)[number]);
  return rank(a) - rank(b) || a.id - b.id;
}

const COLUMNS = ELEMENTS.map((element) =>
  SKILLS.filter((skill) => skill.element === element).sort(byGrade),
);
const ELEMENTLESS = SKILLS.filter((skill) => skill.element === null).sort(byGrade);
const ROWS = Math.max(...COLUMNS.map((column) => column.length));

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-ink">{value ?? "—"}</dd>
    </div>
  );
}

function SkillCard({
  skill,
  level,
  onLevelChange,
}: {
  skill: Skill;
  level: number;
  onLevelChange: (level: number) => void;
}) {
  const power =
    skill.baseValue === null || skill.upgradeValue === null
      ? null
      : skillPower(skill.baseValue, skill.upgradeValue, level);

  return (
    <article
      className={`flex h-full flex-col gap-2 rounded-lg border border-ink/15 p-3 transition-opacity hover:border-ink/40 ${level === 0 ? "opacity-55" : ""}`}
    >
      <header className="flex items-start gap-2.5">
        {skill.icon && skill.iconSize ? (
          <Sprite
            src={skill.icon}
            native={skill.iconSize}
            size={64}
            className="rounded-md border border-ink/15"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-sm leading-tight font-medium">{skill.name}</h3>
          <span className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
            {skill.grade}
          </span>
        </div>
      </header>

      {skill.description.specific ? (
        <p className="line-clamp-2 text-xs leading-snug text-dim">
          {skill.description.specific}
        </p>
      ) : null}

      <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        <Stat label="MP" value={skill.mpCost} />
        <Stat label="CD" value={skill.cooldown} />
        <Stat label="Base" value={skill.baseValue} />
        <Stat label="+/lv" value={skill.upgradeValue} />
      </dl>

      <div className="flex items-center justify-between gap-2 border-t border-ink/10 pt-2">
        <InlineLevel
          value={level}
          min={0}
          max={skill.maxLevel}
          onChange={onLevelChange}
          name={skill.name}
        />
        <span className="font-mono text-xs text-element-earth tabular-nums">
          {power === null ? "Not learned" : `${power.toLocaleString("en")}%`}
        </span>
      </div>
    </article>
  );
}

export function SkillGrid() {
  const { profile, setSkillLevel, setAllSkillLevels } = useProfile();
  const [allLevel, setAllLevel] = useState(0);

  const card = (skill: Skill) => (
    <SkillCard
      key={skill.id}
      skill={skill}
      level={skillLevel(profile, skill.name, skill.maxLevel)}
      onLevelChange={(level) => setSkillLevel(skill.name, level, skill.maxLevel)}
    />
  );

  return (
    <div className="min-w-[46rem] p-4 sm:p-6">
      <div className="mb-4">
        <LevelInput
          value={allLevel}
          min={0}
          max={MAX_SKILL_LEVEL}
          label="Set every skill"
          onChange={(level) => {
            setAllLevel(level);
            setAllSkillLevels(SKILLS, level);
          }}
        />
      </div>

      <div className={`${GRID} sticky top-0 z-10 bg-ground pb-3 font-mono text-xs tracking-[0.12em] uppercase`}>
        {ELEMENTS.map((element) => (
          <span key={element} className={ELEMENT_TEXT[element]}>
            {element}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: ROWS }, (_, row) => (
          <div key={row} className={GRID}>
            {COLUMNS.map((column, index) =>
              column[row] ? card(column[row]) : <div key={`${index}-${row}`} />,
            )}
          </div>
        ))}
        {ELEMENTLESS.length > 0 ? <div className={GRID}>{ELEMENTLESS.map(card)}</div> : null}
      </div>

      <p className="mt-4 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        {SKILLS.length} skills. Level 0 means not learned. Power = base +
        per-level x (level - 1). Levels are saved in this browser.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Check types and lint**

Run: `npx tsc --noEmit` and `npx eslint .`

Expected: both clean.

- [ ] **Step 3: Verify in the browser**

Start the dev server (`npm run dev`), open `http://localhost:3000/slayer-legends-analyzer?tab=skill`, then check:
- four element columns with 16, 15, 16 and 15 skills, and a final row with Rave and Mantra;
- the first row reads Fire Slash, Ice Stone, Lightning Slash, Stone Strike;
- every card starts dimmed and reads "Not learned";
- setting Ice Stone to 36 shows 495% and undims the card; reloading keeps it;
- "Set every skill" to 250 fills every card, and Rave and Mantra cap at their own max.

- [ ] **Step 4: Commit**

```bash
git add src/components/analyzer/skill-grid.tsx
git commit -m "Show all 64 skills with saved per-skill levels"
```

---

### Task 13: Profile controls, gear grid and soul weapons

**Files:**
- Create: `src/components/analyzer/profile-controls.tsx`
- Modify (replace contents): `src/components/analyzer/gear-grid.tsx`
- Modify (replace contents): `src/components/analyzer/equipment-panel.tsx`

**Interfaces:**
- Consumes: `WEAPONS`/`ACCESSORIES` shape `Gear`, `GEAR_LEVEL_FACTORS`, `formatValue`, `formatPercent` (Task 11); `gearEffects` (Task 11); `gearState`, `equippedKey` (Task 8); `GearKind` (Task 8); `useProfile` (Task 10).
- Produces:
  - `OwnedToggle({ owned, onChange, name })`, `EquipButton({ equipped, onToggle, name })`, `EquippedBadge()`, `ResetProfileButton({ onReset })` from `profile-controls.tsx`
  - `GearGrid({ kind: GearKind, items: Gear[] })` — replaces the old `{ items, native }` props
  - `EquipmentPanel()` on the new data, with soul weapon ownership and equip

- [ ] **Step 1: Write the profile controls**

Create `src/components/analyzer/profile-controls.tsx`:

```tsx
"use client";

export function OwnedToggle({
  owned,
  onChange,
  name,
}: {
  owned: boolean;
  onChange: (owned: boolean) => void;
  name: string;
}) {
  return (
    <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
      <input
        type="checkbox"
        checked={owned}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={`${name} owned`}
        className="size-3.5 accent-ink"
      />
      Owned
    </label>
  );
}

export function EquipButton({
  equipped,
  onToggle,
  name,
}: {
  equipped: boolean;
  onToggle: () => void;
  name: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={equipped}
      aria-label={`${equipped ? "Unequip" : "Equip"} ${name}`}
      className={`rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] uppercase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        equipped ? "border-ink bg-ink text-ground" : "border-ink/25 text-ink hover:border-ink"
      }`}
    >
      {equipped ? "Equipped" : "Equip"}
    </button>
  );
}

/** The corner "E" the game puts on an equipped item. */
export function EquippedBadge() {
  return (
    <span
      aria-label="Equipped"
      className="absolute top-1 left-1 z-10 grid size-4 place-items-center rounded-sm bg-ink font-mono text-[9px] font-bold text-ground"
    >
      E
    </span>
  );
}

export function ResetProfileButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (
          window.confirm(
            "Reset your profile? This clears every level, owned item and equipped item saved in this browser.",
          )
        ) {
          onReset();
        }
      }}
      className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase underline-offset-4 hover:text-ink hover:underline"
    >
      Reset profile
    </button>
  );
}
```

- [ ] **Step 2: Replace the gear grid**

Replace the whole of `src/components/analyzer/gear-grid.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { gearEffects } from "@/lib/game/formulas";
import { equippedKey, gearState } from "@/lib/profile/rules";
import type { GearKind } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { formatPercent, formatValue, GEAR_LEVEL_FACTORS, type Gear } from "./data";
import { InlineLevel } from "./level-input";
import { EquipButton, EquippedBadge, OwnedToggle } from "./profile-controls";
import { Sprite } from "./sprite";
import { TIER_BORDER, TIER_TEXT } from "./tiers";

const SECONDARY_LABELS: Record<string, string> = {
  critHitAt0: "Crit hit at Lv 0",
  goldBonus: "Gold bonus",
  critHitIncreaseAt0: "Crit hit increase at Lv 0",
  maxManaAt0: "Max mana at Lv 0",
  expBonus: "EXP bonus",
  manaRecoveryAt0: "Mana recovery at Lv 0",
};

/** The game lays a tier out as one row, grade 4 through grade 1. */
function byTier(items: Gear[]) {
  const rows = new Map<string, Gear[]>();
  for (const item of items) {
    rows.set(item.tier, [...(rows.get(item.tier) ?? []), item]);
  }
  for (const row of rows.values()) {
    row.sort((a, b) => (b.gradeNumber ?? 0) - (a.gradeNumber ?? 0));
  }
  return [...rows.entries()];
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function GearTile({
  gear,
  owned,
  level,
  equipped,
  selected,
  onSelect,
}: {
  gear: Gear;
  owned: boolean;
  level: number;
  equipped: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${gear.grade}${owned ? `, level ${level}` : ", not owned"}${equipped ? ", equipped" : ""}`}
      className={`relative aspect-square w-full rounded-md border bg-ink/[0.04] transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected
          ? "border-ink ring-1 ring-ink"
          : `${TIER_BORDER[gear.tier] ?? "border-ink/20"} hover:brightness-125`
      }`}
    >
      {gear.icon && gear.iconSize ? (
        <Sprite
          src={gear.icon}
          native={gear.iconSize}
          size={64}
          className={`absolute inset-0 m-auto ${owned ? "" : "opacity-35 grayscale"}`}
        />
      ) : null}
      {equipped ? <EquippedBadge /> : null}
      {owned ? (
        <span className="absolute top-1 right-1.5 font-mono text-[9px] text-ink tabular-nums">
          Lv {level}
        </span>
      ) : null}
      {gear.gradeNumber ? (
        <span className={`absolute bottom-1 left-1.5 font-mono text-[9px] ${TIER_TEXT[gear.tier] ?? "text-dim"}`}>
          G{gear.gradeNumber}
        </span>
      ) : null}
    </button>
  );
}

function GearDetail({ kind, gear }: { kind: GearKind; gear: Gear | null }) {
  const { profile, setGearLevel, setOwned, equip } = useProfile();

  if (!gear) {
    return (
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Pick a grade to set it up.
      </p>
    );
  }

  const state = gearState(profile, kind, gear.grade, gear.maxLevel);
  const equipped = equippedKey(profile, kind) === gear.grade;
  const effects = gearEffects(gear.multiplier, GEAR_LEVEL_FACTORS, state.level);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-2">
        {gear.icon && gear.iconSize ? (
          <Sprite
            src={gear.icon}
            native={gear.iconSize}
            size={128}
            className={`rounded-md border ${TIER_BORDER[gear.tier] ?? "border-ink/20"}`}
          />
        ) : null}
        <div>
          <p className={`font-mono text-[10px] tracking-[0.08em] uppercase ${TIER_TEXT[gear.tier] ?? "text-dim"}`}>
            {gear.tier}
          </p>
          <h3 className="text-base leading-tight font-medium">{gear.grade}</h3>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <OwnedToggle
          owned={state.owned}
          name={gear.grade}
          onChange={(owned) => setOwned(kind, gear.grade, owned)}
        />
        <InlineLevel
          value={state.level}
          min={0}
          max={gear.maxLevel}
          name={gear.grade}
          onChange={(level) => setGearLevel(kind, gear.grade, level, gear.maxLevel)}
        />
        <EquipButton
          equipped={equipped}
          name={gear.grade}
          onToggle={() => equip(kind, equipped ? null : gear.grade)}
        />
      </div>

      <dl className="grid gap-y-1 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        <Row label={`Equip effect at Lv ${state.level}`} value={formatPercent(effects.equip)} />
        <Row label={`Owned effect at Lv ${state.level}`} value={formatPercent(effects.owned)} />
        <Row label="Multiplier" value={formatValue(gear.multiplier)} />
        <Row label="Max level before awakening" value={formatValue(gear.baseMaxLevel)} />
        {Object.entries(gear.secondary).map(([key, value]) => (
          <Row key={key} label={SECONDARY_LABELS[key] ?? key} value={formatValue(value)} />
        ))}
      </dl>

      {kind === "weapons" && gear.tier === "Immortal" ? (
        <p className="border-t border-ink/15 pt-2 font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
          Weapon awakening also multiplies this grade. Awakening isn&apos;t
          modelled yet.
        </p>
      ) : null}
    </div>
  );
}

export function GearGrid({ kind, items }: { kind: GearKind; items: Gear[] }) {
  const { profile } = useProfile();
  const [selected, setSelected] = useState<string | null>(null);
  const equipped = equippedKey(profile, kind);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {byTier(items).map(([tier, row]) => (
          <section key={tier} className="flex flex-col gap-2">
            <h3 className={`font-mono text-[10px] tracking-[0.12em] uppercase ${TIER_TEXT[tier] ?? "text-dim"}`}>
              {tier}
            </h3>
            <div className="grid grid-cols-4 gap-2 sm:max-w-md">
              {row.map((gear) => {
                const state = gearState(profile, kind, gear.grade, gear.maxLevel);
                return (
                  <GearTile
                    key={gear.grade}
                    gear={gear}
                    owned={state.owned}
                    level={state.level}
                    equipped={equipped === gear.grade}
                    selected={selected === gear.grade}
                    onSelect={() => setSelected(selected === gear.grade ? null : gear.grade)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <aside className="shrink-0 rounded-lg border border-ink/15 p-3 lg:sticky lg:top-0 lg:w-72">
        <GearDetail kind={kind} gear={items.find((gear) => gear.grade === selected) ?? null} />
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Replace the equipment panel**

`GearGrid` now takes `kind` and the new `Gear` type, so the panel moves to the new data in the same task, soul weapons included. `RelicList` and `SpiritGrid` take no props and keep working unchanged until Task 14.

Replace the whole of `src/components/analyzer/equipment-panel.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { equippedKey, soulWeaponOwned } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import {
  ACCESSORIES,
  formatValue,
  RELICS,
  SOUL_WEAPONS,
  SPIRITS,
  WEAPONS,
  type SoulWeapon,
} from "./data";
import { GearGrid } from "./gear-grid";
import { EquipButton, EquippedBadge, OwnedToggle } from "./profile-controls";
import { RelicList } from "./relic-list";
import { SpiritGrid } from "./spirit-grid";
import { Sprite } from "./sprite";

const CARD_GRID = "grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]";
const PANEL = "min-h-0 flex-1 overflow-auto p-4 pb-20 sm:p-6 sm:pb-20";
const WIKI_URL = "https://slayerlegend.wiki/";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function SoulWeaponCard({
  weapon,
  owned,
  equipped,
  onOwnedChange,
  onEquipToggle,
}: {
  weapon: SoulWeapon;
  owned: boolean;
  equipped: boolean;
  onOwnedChange: (owned: boolean) => void;
  onEquipToggle: () => void;
}) {
  const stage = weapon.stage.name ?? (weapon.stage.number ? `Stage ${weapon.stage.number}` : null);

  return (
    <article
      className={`relative flex h-full flex-col gap-2 rounded-lg border border-ink/15 p-3 transition-opacity hover:border-ink/40 ${owned ? "" : "opacity-55"}`}
    >
      {equipped ? <EquippedBadge /> : null}
      <header className="flex items-start gap-2.5">
        {weapon.icon && weapon.iconSize ? (
          <Sprite
            src={weapon.icon}
            native={weapon.iconSize}
            size={64}
            className="rounded-md border border-ink/15"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-sm leading-tight font-medium">{weapon.name}</h3>
          <span className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
            {[stage, weapon.soulColor].filter(Boolean).join(" · ")}
          </span>
        </div>
      </header>

      <dl className="grid gap-y-0.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        <Row label="ATK" value={formatValue(weapon.attack)} />
        <Row label="Souls" value={formatValue(weapon.cost)} />
        <Row
          label="Needs"
          value={
            weapon.requirement.item
              ? [weapon.requirement.item, weapon.requirement.grade].filter(Boolean).join(" ")
              : "—"
          }
        />
        <Row label="Salvage" value={formatValue(weapon.disassemblyReward)} />
        <Row
          label="Engraving ATK / HP"
          value={`${formatValue(weapon.engraving.atk)} / ${formatValue(weapon.engraving.hp)}`}
        />
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink/10 pt-2">
        <OwnedToggle owned={owned} name={weapon.name} onChange={onOwnedChange} />
        <EquipButton equipped={equipped} name={weapon.name} onToggle={onEquipToggle} />
      </div>
    </article>
  );
}

const EQUIPMENT_TABS = [
  { id: "weapons", label: "Weapons", count: WEAPONS.length },
  { id: "accessories", label: "Accessories", count: ACCESSORIES.length },
  { id: "relics", label: "Relics", count: RELICS.length },
  { id: "spirits", label: "Spirits", count: SPIRITS.length },
  { id: "soul-weapons", label: "Soul Weapons", count: SOUL_WEAPONS.length },
];

export function EquipmentPanel() {
  const [active, setActive] = useState("weapons");
  const { profile, setOwned, equip } = useProfile();
  const equippedSoulWeapon = equippedKey(profile, "soulWeapons");

  return (
    <Tabs
      value={active}
      onValueChange={(value) => setActive(String(value))}
      className="flex h-full min-h-0 flex-col gap-0"
    >
      <div className="flex shrink-0 items-end justify-between gap-4 border-b border-ink/15 px-4 sm:px-6">
        <TabsList
          variant="line"
          className="h-auto! w-auto justify-start gap-4 overflow-visible rounded-none bg-transparent p-0 pb-2"
        >
          {EQUIPMENT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="h-auto flex-none gap-1.5 rounded-none px-0 pt-4 font-mono text-xs tracking-[0.08em] text-dim uppercase data-active:text-ink!"
            >
              {tab.label}
              <span className="text-[10px] opacity-60">{tab.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <p className="hidden pb-2 font-mono text-[10px] tracking-[0.06em] text-dim uppercase lg:block">
          Data: Master Optimizer · spirit skills from{" "}
          <a
            href={WIKI_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="underline-offset-4 hover:text-ink hover:underline"
          >
            Slayer Legend Wiki
          </a>
        </p>
      </div>

      <TabsContent value="weapons" className={PANEL}>
        <GearGrid kind="weapons" items={WEAPONS} />
      </TabsContent>

      <TabsContent value="accessories" className={PANEL}>
        <GearGrid kind="accessories" items={ACCESSORIES} />
      </TabsContent>

      <TabsContent value="relics" className={PANEL}>
        <RelicList />
      </TabsContent>

      <TabsContent value="spirits" className={PANEL}>
        <SpiritGrid />
      </TabsContent>

      <TabsContent value="soul-weapons" className={PANEL}>
        <div className={CARD_GRID}>
          {SOUL_WEAPONS.map((weapon) => (
            <SoulWeaponCard
              key={weapon.id}
              weapon={weapon}
              owned={soulWeaponOwned(profile, weapon.name)}
              equipped={equippedSoulWeapon === weapon.name}
              onOwnedChange={(owned) => setOwned("soulWeapons", weapon.name, owned)}
              onEquipToggle={() =>
                equip("soulWeapons", equippedSoulWeapon === weapon.name ? null : weapon.name)
              }
            />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 4: Check types and lint**

Run: `npx tsc --noEmit` and `npx eslint .`

Expected: both clean.

- [ ] **Step 5: Verify in the browser**

Open `http://localhost:3000/slayer-legends-analyzer?tab=equips` and check:
- Weapons and Accessories each show 25 grades in tier rows, all greyed;
- selecting Common 4 accessory and setting level 297 marks it owned and shows equip effect 109.9% and owned effect 33%;
- Equip puts an E badge on that tile; unticking Owned removes the badge and keeps level 297;
- equipping a second weapon grade moves the E badge;
- Soul Weapons shows 89 cards; Innocence reads Salvage 1,000; Equip marks it owned with an E badge;
- after a reload, every choice above is still there.

- [ ] **Step 6: Commit**

```bash
git add src/components/analyzer/profile-controls.tsx src/components/analyzer/gear-grid.tsx src/components/analyzer/equipment-panel.tsx
git commit -m "Save gear and soul weapon ownership, levels and equipped items"
```

---

### Task 14: Relics and spirits on the new data and profile

**Files:**
- Modify (replace contents): `src/components/analyzer/relic-list.tsx`
- Modify (replace contents): `src/components/analyzer/spirit-grid.tsx`

**Interfaces:**
- Consumes: `RELICS`, `SPIRITS`, `Relic`, `Spirit`, `formatPercent` (Task 11); `bandAt`, `relicBuff`, `Band` (Task 11); `relicLevel`, `spiritState` (Task 8); `useProfile` (Task 10); `OwnedToggle` (Task 13); `InlineLevel`, `LevelInput`, `Sprite`, `ELEMENT_BORDER`, `ELEMENT_TEXT`.
- Produces: `RelicList()` and `SpiritGrid()`, same exports and no props, as the panel already renders.

- [ ] **Step 1: Replace the relic list**

Replace the whole of `src/components/analyzer/relic-list.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { bandAt, relicBuff, type Band } from "@/lib/game/formulas";
import { relicLevel } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import { formatPercent, RELICS, type Relic } from "./data";
import { InlineLevel, LevelInput } from "./level-input";
import { Sprite } from "./sprite";

const MAX_RELIC_LEVEL = Math.max(...RELICS.map((relic) => relic.maxLevel));

const bandLabel = (band: Band) => (band.to === null ? `${band.from}+` : `${band.from}-${band.to}`);

function RelicRow({
  relic,
  level,
  onLevelChange,
}: {
  relic: Relic;
  level: number;
  onLevelChange: (level: number) => void;
}) {
  const active = level > 0 ? bandAt(relic.bands, level) : null;

  return (
    <article
      className={`flex items-start gap-3 rounded-lg border border-ink/15 p-3 transition-opacity hover:border-ink/40 ${level === 0 ? "opacity-55" : ""}`}
    >
      {relic.icon && relic.iconSize ? (
        <Sprite
          src={relic.icon}
          native={relic.iconSize}
          size={64}
          className="rounded-md border border-ink/15"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h3 className="text-sm leading-tight font-medium">
            {relic.name}{" "}
            <span className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
              Max Lv.{relic.maxLevel}
            </span>
          </h3>
          <InlineLevel
            value={level}
            min={0}
            max={relic.maxLevel}
            name={relic.name}
            onChange={onLevelChange}
          />
        </header>

        <p className="font-mono text-xs text-element-earth tabular-nums">
          {level === 0 ? "Not owned" : `${relic.buff} + ${formatPercent(relicBuff(relic.bands, level))}`}
        </p>

        <dl className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
          {relic.bands.map((band) => (
            <div
              key={band.from}
              className={`flex gap-1 ${band === active ? "font-bold text-ink" : ""}`}
            >
              <dt>Lv {bandLabel(band)}</dt>
              <dd className="text-ink">
                {(band.factor * 100).toLocaleString("en", { maximumFractionDigits: 2 })}%
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

export function RelicList() {
  const { profile, setRelicLevel, setAllRelicLevels } = useProfile();
  const [allLevel, setAllLevel] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <LevelInput
        value={allLevel}
        min={0}
        max={MAX_RELIC_LEVEL}
        label="Set every relic"
        onChange={(level) => {
          setAllLevel(level);
          setAllRelicLevels(RELICS, level);
        }}
      />

      <div className="flex flex-col gap-2">
        {RELICS.map((relic) => (
          <RelicRow
            key={relic.id}
            relic={relic}
            level={relicLevel(profile, relic.name, relic.maxLevel)}
            onLevelChange={(level) => setRelicLevel(relic.name, level, relic.maxLevel)}
          />
        ))}
      </div>

      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Level 0 means not owned. Buff = level x the per-level factor of the
        band that level falls in; the band in use is bold. Levels are saved in
        this browser.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Replace the spirit grid**

Replace the whole of `src/components/analyzer/spirit-grid.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { spiritState } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import { SPIRITS, type Spirit } from "./data";
import { InlineLevel } from "./level-input";
import { OwnedToggle } from "./profile-controls";
import { Sprite } from "./sprite";
import { ELEMENT_BORDER, ELEMENT_TEXT } from "./tiers";

const elementBorder = (spirit: Spirit) =>
  (spirit.element && ELEMENT_BORDER[spirit.element]) || "border-ink/20";
const elementText = (spirit: Spirit) =>
  (spirit.element && ELEMENT_TEXT[spirit.element]) || "text-dim";

function SpiritTile({
  spirit,
  owned,
  level,
  selected,
  onSelect,
}: {
  spirit: Spirit;
  owned: boolean;
  level: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${spirit.name}${owned ? `, level ${level}` : ", not owned"}`}
      className={`relative flex aspect-square w-full flex-col items-center justify-end gap-1 rounded-md border bg-ink/[0.04] p-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-ink ring-1 ring-ink" : `${elementBorder(spirit)} hover:brightness-125`
      }`}
    >
      {spirit.icon && spirit.iconSize ? (
        <Sprite
          src={spirit.icon}
          native={spirit.iconSize}
          size={64}
          className={`size-8 sm:size-16 ${owned ? "" : "opacity-35 grayscale"}`}
        />
      ) : null}
      <span className="w-full truncate text-center text-[11px] leading-none">{spirit.name}</span>
      {spirit.element ? (
        <span className={`absolute top-1 left-1.5 font-mono text-[9px] ${elementText(spirit)}`}>
          {spirit.element.slice(0, 2).toUpperCase()}
        </span>
      ) : null}
      {owned ? (
        <span className="absolute top-1 right-1.5 font-mono text-[9px] text-ink tabular-nums">
          Lv {level}
        </span>
      ) : null}
    </button>
  );
}

function SpiritDetail({ spirit }: { spirit: Spirit | null }) {
  const { profile, setOwned, setSpiritLevel } = useProfile();

  if (!spirit) {
    return (
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Pick a spirit to set it up.
      </p>
    );
  }

  const state = spiritState(profile, spirit.name, spirit.maxLevel);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-2">
        {spirit.icon && spirit.iconSize ? (
          <Sprite
            src={spirit.icon}
            native={spirit.iconSize}
            size={128}
            className={`rounded-md border ${elementBorder(spirit)}`}
          />
        ) : null}
        <div>
          <p className={`font-mono text-[10px] tracking-[0.08em] uppercase ${elementText(spirit)}`}>
            {[spirit.element, spirit.skill?.type].filter(Boolean).join(" · ")}
          </p>
          <h3 className="text-base leading-tight font-medium">{spirit.name}</h3>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <OwnedToggle
          owned={state.owned}
          name={spirit.name}
          onChange={(owned) => setOwned("spirits", spirit.name, owned)}
        />
        <InlineLevel
          value={state.level}
          min={0}
          max={spirit.maxLevel}
          name={spirit.name}
          onChange={(level) => setSpiritLevel(spirit.name, level, spirit.maxLevel)}
        />
      </div>

      {spirit.skill?.description ? (
        <p className="text-xs leading-snug text-dim">
          <span className="text-ink">{spirit.skill.name}.</span> {spirit.skill.description}
        </p>
      ) : null}

      {spirit.skill ? (
        <dl className="grid gap-y-1 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
          {spirit.skill.cooldown ? (
            <div className="flex items-baseline justify-between gap-2">
              <dt>Cooldown</dt>
              <dd className="text-ink">{spirit.skill.cooldown}s</dd>
            </div>
          ) : null}
          {spirit.skill.levels.map((entry) => (
            <div key={entry.level} className="flex items-baseline justify-between gap-2">
              <dt>Skill Lv {entry.level}</dt>
              <dd className="text-ink">{entry.effect}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

export function SpiritGrid() {
  const { profile } = useProfile();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="grid min-w-0 flex-1 grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {SPIRITS.map((spirit) => {
          const state = spiritState(profile, spirit.name, spirit.maxLevel);
          return (
            <SpiritTile
              key={spirit.id}
              spirit={spirit}
              owned={state.owned}
              level={state.level}
              selected={selected === spirit.name}
              onSelect={() => setSelected(selected === spirit.name ? null : spirit.name)}
            />
          );
        })}
      </div>

      <aside className="shrink-0 rounded-lg border border-ink/15 p-3 lg:sticky lg:top-0 lg:w-72">
        <SpiritDetail spirit={SPIRITS.find((spirit) => spirit.name === selected) ?? null} />
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Check types and lint**

Run: `npx tsc --noEmit` and `npx eslint .`

Expected: both clean.

- [ ] **Step 4: Verify in the browser**

Open `http://localhost:3000/slayer-legends-analyzer?tab=equips`, then:
- Relics: all 12 rows dimmed and reading "Not owned". Strength Gloves at 100 reads `Extra Dmg + 2,200%`; at 50 it reads `+ 400%` with the `Lv 50-59` band bold. "Set every relic" at 100 fills every row.
- Spirits: 12 greyed tiles. Selecting Sala shows Fire, its skill and five skill levels. Setting level 395 marks it owned and shows `Lv 395` on the tile; unticking Owned greys it and keeps 395.
- Reload: all of the above persists.

- [ ] **Step 5: Commit**

```bash
git add src/components/analyzer/relic-list.tsx src/components/analyzer/spirit-grid.tsx
git commit -m "Save relic and spirit levels, with correct relic level bands"
```

---

### Task 15: Reset profile and unknown-entry warnings in the shell

**Files:**
- Modify: `src/components/analyzer/analyzer-shell.tsx` (targeted edits only; keep the `CompanionPanel` branch)

**Interfaces:**
- Consumes: `useProfile` (Task 10); `unknownEntries` (Task 8); `KNOWN_NAMES` (Task 11); `ResetProfileButton` (Task 13).
- Produces: a Reset profile control in the top half, and a development console warning listing profile entries the data no longer has (spec rule 6).

- [ ] **Step 1: Add the imports**

In `src/components/analyzer/analyzer-shell.tsx`, replace:

```tsx
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

with:

```tsx
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { unknownEntries } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import { KNOWN_NAMES } from "./data";
import { ResetProfileButton } from "./profile-controls";
```

- [ ] **Step 2: Read the profile and warn about unknown entries**

Replace:

```tsx
  const active = isTabId(requested) ? requested : DEFAULT_TAB;
```

with:

```tsx
  const active = isTabId(requested) ? requested : DEFAULT_TAB;
  const { profile, resetProfile } = useProfile();

  // Rule 6: entries for items a data update renamed or removed are kept but
  // not shown. Say so during development so they can be remapped.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const unknown = unknownEntries(profile, KNOWN_NAMES);
    if (unknown.length > 0) {
      console.warn(`Saved profile entries not in the current data (kept, not shown): ${unknown.join(", ")}`);
    }
  }, [profile]);
```

- [ ] **Step 3: Put Reset profile in the top half**

Replace:

```tsx
        className="flex h-1/2 shrink-0 items-center justify-center border-b border-ink/15"
      >
```

with:

```tsx
        className="relative flex h-1/2 shrink-0 items-center justify-center border-b border-ink/15"
      >
        <div className="absolute top-3 right-4">
          <ResetProfileButton onReset={resetProfile} />
        </div>
```

- [ ] **Step 4: Check types and lint**

Run: `npx tsc --noEmit` and `npx eslint .`

Expected: both clean.

- [ ] **Step 5: Verify in the browser**

- Set a skill level, a weapon level and a relic level. Click Reset profile and cancel: nothing changes. Click it again and confirm: every screen returns to defaults, and a reload keeps them cleared.
- In the browser console run `localStorage.setItem("slayer-analyzer.profile", JSON.stringify({version:1,skills:{"Gone Skill":{level:3}},weapons:{},accessories:{},equippedWeapon:null,equippedAccessory:null,relics:{},spirits:{},soulWeapons:{},equippedSoulWeapon:null}))`, then reload. Expected: a console warning naming `skills: Gone Skill`, and no error on screen.
- The Companion tab still renders exactly as before.

- [ ] **Step 6: Commit**

```bash
git add src/components/analyzer/analyzer-shell.tsx
git commit -m "Add Reset profile and warn about saved entries missing from the data"
```

---

### Task 16: Cleanup and full verification

**Files:**
- Modify (replace contents): `src/components/analyzer/equipment.ts`
- Delete: `src/components/analyzer/skills.ts`, `scripts/extract-skills.py`, `scripts/extract-relic-icons.py`, `scripts/fetch-wiki-equipment.py`, `src/data/skills.json`, `src/data/equipment.json`, and the old art folders that nothing references

**Interfaces:**
- Consumes: everything above.
- Produces: a tree with one data pipeline. `use-levels.ts` stays, because the separately maintained companion panel imports it. `equipment.ts` becomes a one-line re-export for the same reason.

- [ ] **Step 1: List what still imports the old modules**

Run:

```bash
grep -rn --include=*.ts --include=*.tsx -e 'from "./skills"' -e 'from "./equipment"' -e 'from "./use-levels"' -e 'data/skills.json' -e 'data/equipment.json' src
```

Expected: only `src/components/analyzer/companion-panel.tsx` (importing `formatValue` from `./equipment` and `useLevels` from `./use-levels`). If anything else appears, stop and fix that import before deleting.

- [ ] **Step 2: Reduce `equipment.ts` to what the companion panel uses**

Replace the whole of `src/components/analyzer/equipment.ts` with:

```ts
// The companion panel, maintained separately, still imports formatValue from
// here. Everything else reads the optimizer data through ./data.
export { formatValue } from "./data";
```

- [ ] **Step 3: Delete the old code, data and scripts**

```bash
git rm src/components/analyzer/skills.ts scripts/extract-skills.py scripts/extract-relic-icons.py scripts/fetch-wiki-equipment.py src/data/skills.json src/data/equipment.json
```

- [ ] **Step 4: Delete old art folders nothing references**

Run:

```bash
for folder in skills elements weapons accessories relics spirits soul-weapons; do
  if grep -rqs --include=*.ts --include=*.tsx --include=*.json -e "\"/$folder/" src; then
    echo "KEEP public/$folder (still referenced)"
  else
    git rm -rq "public/$folder" && echo "removed public/$folder"
  fi
done
```

Expected: every folder removed. Any `KEEP` line means a file still points into that folder; report it rather than deleting.

- [ ] **Step 5: Run every automated check**

Stop any running dev server first, since `next build` rewrites the `.next` folder a dev server is using. Then run:

```bash
python -m unittest discover -s scripts/optimizer/tests -t scripts -v
npm test
npx tsc --noEmit
npx eslint .
npx next build
```

Expected: all Python tests pass with none skipped; all Vitest tests pass; typecheck and lint clean; the build lists `/` and `/slayer-legends-analyzer` as static.

- [ ] **Step 6: Verify the whole milestone in the browser**

Start `npm run dev`, then on `http://localhost:3000/slayer-legends-analyzer`:
- **Migration:** in a fresh browser profile, run `localStorage.clear(); localStorage.setItem("analyzer.skillLevels", '{"2":36}'); localStorage.setItem("analyzer.relicLevels", '{"5":7}')` and reload. Ice Stone shows level 36 and 495%, Lucky Pendant shows level 7, and both old keys are gone from localStorage.
- **Every screen:** Skill, Weapons, Accessories, Relics, Spirits and Soul Weapons each accept input, show dimming, greying and E badges as specified, and keep everything after a reload.
- **Themes and size:** repeat a quick pass in light theme, dark theme and at 375 px wide. No horizontal page overflow, and the tab bar stays fixed.
- **Companion tab:** still renders and saves as before.

- [ ] **Step 7: Commit**

```bash
git add -A src/components/analyzer/equipment.ts
git commit -m "Remove the old skill and equipment data pipelines"
```
