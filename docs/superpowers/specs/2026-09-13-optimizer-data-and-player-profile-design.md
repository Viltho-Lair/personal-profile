# Optimizer data foundation and player profile

Milestone 1 of rebuilding the Slayer Legends Analyzer around the community
Master Optimizer spreadsheet.

- **Date:** 2026-09-13
- **Status:** Design approved in conversation; awaiting review of this document
- **Route affected:** `/slayer-legends-analyzer`

## Goal

Make the Master Optimizer workbook the single source of game data for the
analyzer, and let players record their own account — levels, ownership and
what they have equipped — on the screens that already exist, saved in their
browser.

Later milestones build on this: game-shaped navigation, account-wide inputs,
the calculation engine and analysis views. None of those are in scope here.

## Background

The analyzer currently draws on two sources:

- **Slayer Legend Master Document** (an older workbook) for skills and relic
  icons, via `scripts/extract-skills.py` and `scripts/extract-relic-icons.py`.
- **Slayer Legend Wiki** published JSON and CDN art for weapons, accessories,
  relics, spirits and soul weapons, via `scripts/fetch-wiki-equipment.py`.

The **Master Optimizer** (`Copy of Slayer Legend - Master Optimizer.xlsx`,
33 sheets, about 2,700 embedded images) is newer and more complete. It has
three layers: input sheets where a player enters their account (`SKILLS`,
`EQUIPMENT`, …), data sheets holding game tables (`Skills Data`,
`Equipment Data`, …) and calculator sheets built on top.

A coverage check against the screens that exist today:

| Area | In the optimizer | Notes |
|---|---|---|
| Skills | Yes | Current values; for example Fire Slash max level is 250, not 130 |
| Weapons, accessories | Yes | All 25 grades, Common 4 through Immortal |
| Relics | Yes | |
| Spirits | Yes | Skill descriptions are **not** in the workbook |
| Soul weapons | Yes | Roughly 89 named entries on a first pass, more than the wiki's 81; exact count confirmed in the first step |

## Decisions

| Question | Decision |
|---|---|
| First milestone | Data foundation plus player setup on existing screens |
| Player inputs | Levels, ownership and equipped only |
| Where the profile lives | The player's browser only, for now |
| How data enters the app | A script extracts the workbook to JSON committed in the repo |

Rejected alternatives for data entry: parsing the 20 MB workbook during every
build (grows git history by 20 MB per update, slows builds, awkward image
handling in JavaScript), and pulling the live Google Sheet on every run
(depends on link sharing staying on and the layout staying stable). The
chosen extractor can gain a "download the shared sheet first" step later
without changing anything downstream.

## Scope

**In scope**

- One extractor that turns the optimizer workbook into JSON and art.
- A player profile stored in the browser, with typed actions and tests.
- Inputs and state display on the existing Skill and Equips screens.
- Moving levels already saved by the current app into the new profile.
- Removing the old data scripts and files once nothing depends on them.

**Out of scope**

- Restructuring navigation to match the game (Character, Skill, Equipment,
  Companion, Adventure, Shop).
- Account-wide inputs such as skill proficiency, element damage, total ATK,
  partner, familiar and Black Orb amplifiers.
- Any calculation beyond what the screens already compute.
- Profile export and import, accounts, or sharing.
- Fusion copy counters (for example 2/5) and star ratings.

## Part 1: Data foundation

### Extractor

`scripts/extract-optimizer.py [path-to-xlsx]` reads the workbook. The path
defaults to `~/Downloads/Copy of Slayer Legend - Master Optimizer.xlsx`.

It replaces `extract-skills.py`, `extract-relic-icons.py` and the equipment
parts of `fetch-wiki-equipment.py`. The wiki fetch shrinks to spirit skill
descriptions only.

### Locating data

Tables are found **by header text, not column position**. `Equipment Data`
holds several tables side by side across 109 columns, so fixed column numbers
would break when a column is inserted. For each area the extractor looks for
the table's title and header row, reads until the table ends, and **stops
with an error naming the missing header** if an expected header is absent.
It never writes partial output for an area it could not read.

The workbook is a copy that someone filled in, so it contains their account
in columns such as `OWNED`, `CURRENT LEVEL` and `EQUIPPED`. **Those columns are
never extracted.** Only game reference data goes into the JSON.

### Output

One file per area in `src/data/optimizer/`:

| File | Required fields per item |
|---|---|
| `skills.json` | name, element, grade, maxLevel, baseValue, upgradeValue, cooldown, mpCost, basic and specific description, icon, iconSize |
| `weapons.json` | grade (for example "Common 4"), tier, gradeNumber, maxLevel, equip effect base, owned effect base, multiplier, icon, iconSize |
| `accessories.json` | same fields as weapons |
| `relics.json` | name, buff, baseValue, level band factors, maxLevel, icon, iconSize |
| `spirits.json` | name, element, maxLevel, skill (name, description, cooldown, level effects — from the wiki), icon, iconSize |
| `soul-weapons.json` | name, attack, requirement, disassemblyReward, stage, icon, iconSize |

Every file carries a `source` block: workbook file name, sheet name and
extraction date. Every item that can be levelled must have a `maxLevel`; the
extractor fails if it cannot find one.

`iconSize` records each image's real pixel size (64 or 128), so the existing
`Sprite` component stops relying on hard-coded native sizes per screen.

### Art

Images anchored to an item's row are written to `public/art/<area>/` with a
slug of the item name. Where the workbook has no image for an item, the
existing art is kept and the extractor lists every such gap in its output.

### Change summary

Each run compares the new output with the JSON already in the repo and prints,
per area, the items added, removed and changed, with before and after values
(for example `Fire Slash maxLevel 130 → 250`). A sheet update becomes a change
to review rather than a silent overwrite.

### First implementation step

Before writing any output, map the workbook and record the findings in the
implementation plan:

- where relics, spirits and soul weapons sit inside `Equipment Data`, with
  table boundaries confirmed against known counts;
- which `Skills Data` columns hold baseValue, upgradeValue, cooldown and
  mpCost;
- where each levelled area's `maxLevel` comes from, spirits in particular.

If any required field has no source in the workbook, that is raised as a
decision to make, not filled with a guessed default.

## Part 2: Player profile

### Shape

One versioned record, stored sparsely: only values the player has changed
are saved, and everything else falls back to defaults derived from the data.
New items added by a sheet update therefore appear without migration.

```ts
type Grade = string; // "Common 4" … "Immortal", as named in the data

type GearState = { owned: boolean; level: number };

type ProfileV1 = {
  version: 1;
  skills: Record<string, { level: number }>; // keyed by skill name
  weapons: Record<Grade, GearState>;
  accessories: Record<Grade, GearState>;
  equippedWeapon: Grade | null;
  equippedAccessory: Grade | null;
  relics: Record<string, { level: number }>; // keyed by relic name
  spirits: Record<string, { owned: boolean; level: number }>; // by name
  soulWeapons: Record<string, { owned: boolean }>; // by name
  equippedSoulWeapon: string | null;
};
```

Items are keyed by **name** (grade name for gear). Names are shared by every
source the app has used, whereas numeric IDs differ between the old workbook,
the wiki and the optimizer.

Defaults: skills level 0 (not learned); gear not owned, level 0; relics level
0 (not owned); spirits not owned, level 0; soul weapons not owned; nothing
equipped.

### Rules

1. Equipping an item marks it owned.
2. Marking an item not owned unequips it if it is equipped. Its level is kept,
   so owning it again restores the level.
3. Setting a gear or spirit level above 0 marks that item owned.
4. A relic's level is its ownership: level 0 means not owned. Relics have no
   separate owned flag.
5. Levels are integers clamped to `[0, maxLevel]` using the item's current
   `maxLevel` from the data. Fractions round down and invalid input becomes 0.
6. Entries whose name no longer exists in the data are kept in storage,
   ignored by the screens, and reported in a development console warning so
   they can be remapped.

### Storage

- Key: `slayer-analyzer.profile`.
- Access goes through an external store read with `useSyncExternalStore`, the
  pattern already used for levels, so server rendering starts from an empty
  profile and the client switches to the stored one after hydration.
- Screens use one `useProfile()` hook exposing the profile and typed actions:
  `setSkillLevel`, `setGearLevel`, `setOwned`, `equip`, `setRelicLevel`,
  `setSpiritLevel`, `resetProfile`. Screens never touch storage directly.
- If the stored value cannot be parsed, it is copied unchanged to
  `slayer-analyzer.profile.unreadable` and the player starts from an empty
  profile. Nothing is silently discarded.
- If storage is unavailable (private windows, blocked site data), the profile
  lasts for the session and the screens keep working.

### Migration from the current app

The current app stores `analyzer.skillLevels` and `analyzer.relicLevels`,
keyed by the old numeric IDs. On first load with no profile present:

1. Read both old keys.
2. Map old IDs to names with a frozen lookup table captured from the current
   `src/data/skills.json` and `src/data/equipment.json` before those files are
   removed (46 skills, 12 relics).
3. Write the levels into the new profile, clamped by rule 5.
4. Remove the old keys only after the profile is saved successfully.

If a profile already exists, the old keys are removed without importing, so
old values never overwrite newer ones.

### Reset

"Reset profile" clears the stored profile after an explicit confirmation.

## Part 3: Screens

Only the existing Skill and Equips screens change.

| Screen | Inputs | State display |
|---|---|---|
| Skills | Level per card, 0 to that skill's max; "Set every skill" stays | Cards at level 0 are dimmed |
| Weapons, accessories | Detail panel: Owned toggle, enhance level, Equip button | Unowned tiles greyed; equipped tile carries an **E** corner badge, as in the game; level shown on the tile |
| Relics | Existing per-row level box; "Set every relic" stays | Rows at level 0 dimmed |
| Spirits | Detail panel: Owned toggle and level | Unowned tiles greyed; level shown on the tile |
| Soul weapons | Owned toggle and Equip button per card | **E** badge on the equipped card |

Gear detail panels show the optimizer's reference values for the grade (base
equip effect, base owned effect) exactly as extracted. Values at the player's
enhance level wait for the calculation milestone.

A **Reset profile** control sits in a corner of the top half of the analyzer,
behind a confirmation.

The optimizer is credited in the analyzer alongside the existing wiki credit.

## Verification

### Extractor

- Counts: 25 weapon grades, 25 accessory grades, 12 relics and 12 spirits.
  The soul weapon count must equal the number of named rows in the workbook's
  soul weapon table (excluding placeholder rows such as "None"), as recorded
  in the first implementation step. Skills are cross-checked against the 46 known skills
  by name, and any skill added or missing is listed.
- Spot checks against values already confirmed in game: Strength Gloves at
  level 100 yields 2,200%, Hunter's Eye 400%, HP Ring 1,400%.
- No player-state columns appear in any output file.
- The change summary from the first run is reviewed before the output is
  used by the app.

### Profile

The profile logic is written test first, in pure functions separate from
React. The project has no test runner, so this milestone adds Vitest for that
logic only. Tests cover:

- each rule in "Rules", including clamping when `maxLevel` changes;
- migration from both old storage keys, including unknown old IDs;
- an unreadable stored value being backed up rather than lost;
- defaults for items never touched.

### Screens

In the browser, on every affected screen: set values, reload, and confirm
they persist; confirm the E badge, dimming and greying; check light theme,
dark theme and a 375 px wide viewport. Typecheck, ESLint and a production
build must pass.

## Cleanup

Once the screens read only the new data:

- Remove `scripts/extract-skills.py` and `scripts/extract-relic-icons.py`.
- Reduce `scripts/fetch-wiki-equipment.py` to spirit skill descriptions and
  rename it to match.
- Remove `src/data/skills.json`, `src/data/equipment.json` and the art folders
  they reference, after confirming nothing imports them.

## Risks

- **Concurrent work in this folder.** Another session left uncommitted
  companion files (`scripts/fetch-wiki-companions.py`,
  `src/data/companions.json`, `public/companions/`). That work must be
  finished or set aside before implementation starts, or the two will
  conflict.
- **Images not anchored per item.** Some areas may place art away from item
  rows. The fallback is existing art plus the gap list; no area is blocked.
- **Table layout drift.** A future copy of the sheet may move or rename
  headers. The extractor fails with the missing header's name instead of
  producing wrong data.

## Later milestones

2. Game-shaped navigation: Character, Skill, Equipment, Companion, Adventure
   and Shop, each with the in-game sub-tabs.
3. Account-wide inputs used by the optimizer's calculations.
4. Calculation engine ported from the workbook's formulas and checked against
   the workbook's own outputs.
5. Analysis views: the scatter chart, stat tracking and upgrade suggestions.
