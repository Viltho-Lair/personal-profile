import characterData from "@/data/optimizer/character.json";
import companionsData from "@/data/optimizer/companions.json";
import memoryTreeData from "@/data/optimizer/memory-tree.json";
import costTablesData from "@/data/optimizer/upgrade-costs.json";
import { SPIRIT_DAMAGE_SKILLS, type FightInput } from "@/lib/game/battle";
import { enhanceMax, type EnhanceStat, type KnowledgeGrade } from "@/lib/game/character";
import {
  classCubes,
  critChanceGold,
  critDamageGold,
  deathStrikeChanceGold,
  deathStrikeGold,
  gearCubes,
  passiveCost,
  relicCost,
  spiritCost,
  statGold,
  type CostTables,
} from "@/lib/game/costs";
import { rarityGroup } from "@/lib/game/formulas";
import type { MemoryTree } from "@/lib/game/memory-tree";
import { buildPath, MAX_PATH_SPEND, mergeSteps } from "@/lib/game/plan-path";
import { bestRaveTiming, playFight, raveTimings, type RaveTiming } from "@/lib/game/rave-timing";
import { openRefinementLines } from "@/lib/game/refinement";
import { maxAffection } from "@/lib/game/beasts";
import { activeFamiliars, awakening, companionState, effectiveSkillLevel, equippedKey, familiarStars, gearState, presetBeast, spiritLevelCap, spiritState } from "@/lib/profile/rules";
import { MAX_FAMILIAR_STARS, MAX_SPIRIT_ENHANCE, MIN_SPIRIT_ENHANCE, RESOURCES, type ProfileV1, type ResourceKey } from "@/lib/profile/types";
import { ACCESSORIES, AWAKENING, FAMILIARS, MASTERY_PAGES, MAX_AWAKENING, RELICS, SKILL_BY_NAME, SKILLS, SOUL_WEAPONS, SPIRIT_TIERS, SPIRITS, WEAPONS } from "./data";
import { BEASTS, classLevelCap, SHRINE } from "./stat-sources";
import { promotionFight } from "./promotion-fight";
import type { SpiritFactors } from "./spirit-stats";

const TABLES = costTablesData as unknown as CostTables;
const ENHANCE = characterData.enhance as unknown as (EnhanceStat & { icon: string | null; iconSize: number | null })[];
const KNOWLEDGE = characterData.growingKnowledge as KnowledgeGrade[];
const CLASSES = characterData.classes as { name: string; icon: string | null; iconSize: number | null }[];
const COMPANIONS = companionsData.companions as unknown as { name: string; skills: { name: string; maxLevel: number }[]; skins: { icon: string | null; iconSize: number | null }[] }[];
const TREE = memoryTreeData as unknown as MemoryTree & { icons: Record<string, { icon: string; iconSize: number }> };

/** A cost: amounts of the player's resources, and anything the workbook prices without naming its unit. */
export type UpgradeCost = { resources: Partial<Record<ResourceKey, number>>; other: { label: string; amount: number }[]; unpriced: boolean };

/** One thing that can be levelled: where it is, how far it can go, what it looks like and what a level costs. */
export type Upgrade = {
  id: string;
  /** What kind of upgrade it is ("Enhance", "Weapon", "Spirit" ...) and its name. */
  kind: string;
  name: string;
  icon: string | null;
  iconSize: number | null;
  current: number;
  max: number;
  /** Where its curve starts (0 unless said): a spirit's skill enhance at 1, a familiar not owned at -1. */
  min?: number;
  /** How its levels read: levels, stars (-1 = not owned), or a skill swapped into the preset (0 = not yet, 1 = swapped). */
  unit?: "stars" | "swap";
  /** The profile with this upgrade at `level`. */
  apply: (profile: ProfileV1, level: number) => ProfileV1;
  cost: (from: number, to: number) => UpgradeCost;
};

const priced = (resources: Partial<Record<ResourceKey, number>>): UpgradeCost => ({ resources, other: [], unpriced: false });
const other = (label: string, amount: number): UpgradeCost => ({ resources: {}, other: [{ label, amount }], unpriced: false });
const UNPRICED: UpgradeCost = { resources: {}, other: [], unpriced: true };
const character = (profile: ProfileV1, change: Partial<ProfileV1["character"]>): ProfileV1 => ({ ...profile, character: { ...profile.character, ...change } });

/** Nova's Awakened Blast goes to 18; the Black Orb's summon levels to 75. */
const MAX_CLASS_AWAKENING = 18;
const MAX_BLACK_ORB_LEVEL = 75;
const MAX_BEAST_AWAKEN = 6;
/** Skills with "attack" mechanics that aren't damage to swap in: Rave and Meditation work through the others. */
const NOT_SWAPPED = new Set(["Rave", "Meditation"]);

/**
 * Every upgrade the player could make from this profile, each short of its cap: nothing maxed is offered. With the
 * active preset's weakest attack skill named, other learned attack skills are offered in its place.
 */
export function listUpgrades(profile: ProfileV1, options: { weakestAttack?: string | null } = {}): Upgrade[] {
  const c = profile.character;
  const upgrades: Upgrade[] = [];
  const add = (upgrade: Upgrade) => {
    if (upgrade.max > upgrade.current) upgrades.push(upgrade);
  };

  // Enhance: gold.
  const critLevel = c.enhance["CRIT %"] ?? 0;
  const enhanceGold: Record<string, (from: number, to: number) => number> = {
    ATK: (from, to) => statGold(TABLES, from, to),
    "CRIT DMG": critDamageGold,
    "CRIT %": (from, to) => critChanceGold(TABLES, from, to),
    "DEATH STRIKE": deathStrikeGold,
    "DEATH STRIKE %": deathStrikeChanceGold,
  };
  for (const stat of ENHANCE) {
    const gold = enhanceGold[stat.name];
    if (!gold) continue;
    add({
      id: `enhance:${stat.name}`,
      kind: "Enhance",
      name: stat.name,
      icon: stat.icon,
      iconSize: stat.iconSize,
      current: c.enhance[stat.name] ?? 0,
      max: enhanceMax(stat, critLevel, KNOWLEDGE[c.growingKnowledge], KNOWLEDGE[c.superhuman]),
      apply: (p, level) => character(p, { enhance: { ...p.character.enhance, [stat.name]: level } }),
      cost: (from, to) => priced({ gold: gold(from, to) }),
    });
  }

  // Weapons and accessories: cubes, owned ones up to their awakening's cap.
  for (const [kind, key, list, label] of [
    ["weapons", "weapons", WEAPONS, "Weapon"],
    ["accessories", "accessories", ACCESSORIES, "Accessory"],
  ] as const) {
    const cap = AWAKENING[awakening(profile, kind, MAX_AWAKENING)]?.maxLevel ?? 200;
    for (const gear of list) {
      const state = gearState(profile, kind, gear.grade, gear.maxLevel);
      if (!state.owned) continue;
      add({
        id: `${key}:${gear.grade}`,
        kind: label,
        name: gear.grade,
        icon: gear.icon,
        iconSize: gear.iconSize,
        current: state.level,
        max: Math.min(gear.maxLevel, cap),
        apply: (p, level) => ({ ...p, [key]: { ...p[key], [gear.grade]: { ...p[key][gear.grade], owned: true, level } } }),
        cost: (from, to) => priced({ cubes: gearCubes(TABLES, gear.grade, from, to) }),
      });
    }
  }

  // Weapon and accessory awakening (Orr and Orb): raises the level cap and the effects; the workbook has no cost.
  for (const [kind, key, list, label] of [
    ["weapons", "weaponAwakening", WEAPONS, "Weapon awakening"],
    ["accessories", "accessoryAwakening", ACCESSORIES, "Accessory awakening"],
  ] as const) {
    const equippedGrade = equippedKey(profile, kind);
    const art = list.find((g) => g.grade === equippedGrade) ?? list[list.length - 1];
    add({
      id: `awakening:${kind}`,
      kind: label,
      name: kind === "weapons" ? "Orr" : "Orb",
      icon: art?.icon ?? null,
      iconSize: art?.iconSize ?? null,
      current: awakening(profile, kind, MAX_AWAKENING),
      max: MAX_AWAKENING,
      apply: (p, level) => ({ ...p, [key]: level }),
      cost: () => UNPRICED,
    });
  }

  // Class awakening (Awakened Blast): unpriced.
  const lastClass = CLASSES[CLASSES.length - 1];
  add({
    id: "awakening:class",
    kind: "Class awakening",
    name: "Awakened Blast",
    icon: lastClass?.icon ?? null,
    iconSize: lastClass?.iconSize ?? null,
    current: c.classAwakening,
    max: MAX_CLASS_AWAKENING,
    apply: (p, level) => character(p, { classAwakening: level }),
    cost: () => UNPRICED,
  });

  // Classes: cubes, by class grade (Trainee 1 ... the 20th and later at 20).
  CLASSES.forEach((cls, index) => {
    const state = c.classes[cls.name];
    if (!state?.owned) return;
    const grade = Math.min(index + 1, TABLES.cubes.classFactors.length);
    add({
      id: `class:${cls.name}`,
      kind: "Class",
      name: cls.name,
      icon: cls.icon,
      iconSize: cls.iconSize,
      current: state.level,
      max: classLevelCap(c),
      apply: (p, level) => character(p, { classes: { ...p.character.classes, [cls.name]: { owned: true, level } } }),
      cost: (from, to) => priced({ cubes: classCubes(TABLES, grade, from, to) }),
    });
  });

  // Spirits: cubes and Mana Crystals.
  for (const spirit of SPIRITS) {
    const state = spiritState(profile, spirit.name, spirit.maxLevel);
    if (!state.owned) continue;
    const art = spirit.art[state.awakening ? rarityGroup(state.awakening) : "Common"] ?? spirit.art.Common;
    add({
      id: `spirit:${spirit.name}`,
      kind: "Spirit",
      name: spirit.name,
      icon: art?.icon ?? null,
      iconSize: art?.iconSize ?? null,
      current: state.level,
      max: spiritLevelCap(profile, spirit.name, spirit.maxLevel) ?? state.level,
      apply: (p, level) => ({ ...p, spirits: { ...p.spirits, [spirit.name]: { ...p.spirits[spirit.name]!, owned: true, level } } }),
      cost: (from, to) => priced(spiritCost(TABLES, from, to)),
    });
  }

  // Spirit awakening and skill enhance: unpriced.
  for (const spirit of SPIRITS) {
    const state = spiritState(profile, spirit.name, spirit.maxLevel);
    if (!state.owned) continue;
    const art = spirit.art[state.awakening ? rarityGroup(state.awakening) : "Common"] ?? spirit.art.Common;
    const tier = Math.max(0, SPIRIT_TIERS.indexOf(state.awakening ?? "Common"));
    add({
      id: `spirit-awakening:${spirit.name}`,
      kind: "Spirit awakening",
      name: `${spirit.name} · ${state.awakening ?? "Common"}`,
      icon: art?.icon ?? null,
      iconSize: art?.iconSize ?? null,
      current: tier,
      max: SPIRIT_TIERS.length - 1,
      apply: (p, level) => ({ ...p, spirits: { ...p.spirits, [spirit.name]: { ...p.spirits[spirit.name]!, awakening: SPIRIT_TIERS[level] ?? null } } }),
      cost: () => UNPRICED,
    });
    if (spirit.skill) {
      add({
        id: `spirit-enhance:${spirit.name}`,
        kind: "Spirit skill enhance",
        name: `${spirit.name} · ${spirit.skill.name}`,
        icon: art?.icon ?? null,
        iconSize: art?.iconSize ?? null,
        current: state.enhance,
        min: MIN_SPIRIT_ENHANCE,
        max: MAX_SPIRIT_ENHANCE,
        apply: (p, level) => ({ ...p, spirits: { ...p.spirits, [spirit.name]: { ...p.spirits[spirit.name]!, enhance: level } } }),
        cost: () => UNPRICED,
      });
    }
  }

  // Every familiar's stars, owned or not (-1): the Mana Altar counts the best six, and the equipped ones fight. Unpriced.
  const equippedFamiliars = new Set(Object.values(activeFamiliars(profile)));
  for (const familiar of FAMILIARS) {
    const stars = familiarStars(profile, familiar.name);
    const art = familiar.art.find((band) => band.from <= (stars ?? 0) && (stars ?? 0) <= band.to) ?? familiar.art[0];
    add({
      id: `familiar:${familiar.name}`,
      kind: stars === null ? "New familiar" : equippedFamiliars.has(familiar.name) ? "Familiar stars · equipped" : "Familiar stars",
      name: familiar.name,
      icon: art?.icon ?? null,
      iconSize: art?.iconSize ?? null,
      current: stars ?? -1,
      min: -1,
      max: MAX_FAMILIAR_STARS,
      unit: "stars",
      apply: (p, level) => ({ ...p, familiars: { ...p.familiars, [familiar.name]: { stars: level } } }),
      cost: () => UNPRICED,
    });
  }

  // Owned beasts' awaken levels: unpriced.
  for (const beast of BEASTS.beasts) {
    const state = profile.beasts[beast.name];
    if (!state || state.awaken === null) continue;
    add({
      id: `beast:${beast.name}`,
      kind: "Beast awaken",
      name: beast.name,
      icon: beast.art.sprite ?? null,
      iconSize: 64,
      current: state.awaken,
      max: MAX_BEAST_AWAKEN,
      apply: (p, level) => ({ ...p, beasts: { ...p.beasts, [beast.name]: { ...p.beasts[beast.name]!, awaken: level } } }),
      cost: () => UNPRICED,
    });
  }

  // Owned beasts' affection, up to their awaken's cap: unpriced.
  for (const beast of BEASTS.beasts) {
    const state = profile.beasts[beast.name];
    if (!state || state.awaken === null) continue;
    add({
      id: `beast-affection:${beast.name}`,
      kind: "Beast affection",
      name: beast.name,
      icon: beast.art.sprite ?? null,
      iconSize: 64,
      current: state.affection,
      min: 1,
      max: maxAffection(state.awaken),
      apply: (p, level) => ({ ...p, beasts: { ...p.beasts, [beast.name]: { ...p.beasts[beast.name]!, affection: level } } }),
      cost: () => UNPRICED,
    });
  }

  // Sealed Shrine statues: unpriced.
  for (const statue of SHRINE.statues) {
    add({
      id: `shrine:${statue.key}`,
      kind: "Sealed Shrine",
      name: statue.name,
      icon: statue.icon ?? null,
      iconSize: statue.iconSize ?? null,
      current: profile.sealedShrine[statue.key as keyof ProfileV1["sealedShrine"]] ?? 0,
      max: statue.levels.length,
      apply: (p, level) => ({ ...p, sealedShrine: { ...p.sealedShrine, [statue.key]: level } }),
      cost: () => UNPRICED,
    });
  }

  // The Black Orb's level: unpriced here.
  add({
    id: "black-orb",
    kind: "Black Orb",
    name: "Black Orb level",
    icon: null,
    iconSize: null,
    current: profile.blackOrb.level,
    max: MAX_BLACK_ORB_LEVEL,
    apply: (p, level) => ({ ...p, blackOrb: { ...p.blackOrb, level } }),
    cost: () => UNPRICED,
  });

  // Companion passives: Stones and Emeralds.
  for (const companion of COMPANIONS) {
    const state = companionState(profile, companion.name);
    const portrait = companion.skins[0];
    for (const skill of companion.skills) {
      add({
        id: `companion:${companion.name}:${skill.name}`,
        kind: `${companion.name} passive`,
        name: skill.name,
        icon: portrait?.icon ?? null,
        iconSize: portrait?.iconSize ?? null,
        current: state.skills[skill.name] ?? 0,
        max: skill.maxLevel,
        apply: (p, level) => {
          const now = companionState(p, companion.name);
          return { ...p, companions: { ...p.companions, [companion.name]: { ...now, skills: { ...now.skills, [skill.name]: level } } } };
        },
        cost: (from, to) => {
          const cost = passiveCost(TABLES, companion.name, skill.name, from, to);
          return cost ? priced(cost) : UNPRICED;
        },
      });
    }
  }

  // Memory Tree sub nodes: a flat cost a level, in a material the workbook doesn't name.
  for (const main of TREE.mainNodes) {
    for (const node of main.subNodes) {
      if (!node.buff || node.costPerLevel <= 0) continue;
      const icon = TREE.icons[node.buff.toLowerCase().replace(/\s+/g, "-")];
      add({
        id: `tree:${node.id}`,
        kind: "Memory Tree",
        name: `${node.buff}${node.mode ? ` · ${node.mode}` : ""} (node ${main.id}-${node.number})`,
        icon: icon?.icon ?? null,
        iconSize: icon?.iconSize ?? null,
        current: Math.min(node.maxLevel, c.memoryTree[node.id] ?? 0),
        max: node.maxLevel,
        apply: (p, level) => character(p, { memoryTree: { ...p.character.memoryTree, [node.id]: level } }),
        cost: (from, to) => other("Memory Tree material", Math.max(0, to - from) * node.costPerLevel),
      });
    }
  }

  // Skill Mastery nodes: points a level (unnamed in the workbook), on the pages open so far: up to the first unfinished one.
  const nodeLevel = (id: string, max: number) => Math.min(max, profile.masteryNodes[id]?.level ?? 0);
  const openPage = MASTERY_PAGES.find((page) => page.nodes.some((node) => node.cost && nodeLevel(node.id, node.maxLevel) < node.maxLevel))?.page ?? Infinity;
  for (const page of MASTERY_PAGES.filter((pg) => pg.page <= openPage)) {
    for (const node of page.nodes) {
      if (!node.cost) continue;
      const perLevel = node.cost.perLevel < 0 ? -node.cost.perLevel : node.cost.base;
      add({
        id: `mastery:${node.id}`,
        kind: `Skill Mastery p${page.page}`,
        name: node.label ?? node.id,
        icon: node.icon,
        iconSize: node.iconSize,
        current: Math.min(node.maxLevel, profile.masteryNodes[node.id]?.level ?? 0),
        max: node.maxLevel,
        apply: (p, level) => ({ ...p, masteryNodes: { ...p.masteryNodes, [node.id]: { level } } }),
        cost: (from, to) => other("Mastery points", Math.max(0, to - from) * perLevel),
      });
    }
  }

  // Relics: the expected cost of their attempts.
  for (const relic of RELICS) {
    add({
      id: `relic:${relic.name}`,
      kind: "Relic",
      name: relic.name,
      icon: relic.icon,
      iconSize: relic.iconSize,
      current: profile.relics[relic.name]?.level ?? 0,
      max: relic.maxLevel,
      apply: (p, level) => ({ ...p, relics: { ...p.relics, [relic.name]: { level } } }),
      cost: (from, to) => other("Relic attempts (expected)", relicCost(from, to)),
    });
  }

  // Skills in the active preset, and Mantra: levels the workbook doesn't price.
  if (!profile.skillsAtMax) {
    const preset = new Set([...(profile.skillPresets[profile.activeSkillPreset] ?? []), "Mantra"]);
    for (const name of preset) {
      const skill = name ? SKILL_BY_NAME.get(name) : undefined;
      if (!skill?.maxLevel) continue;
      add({
        id: `skill:${skill.name}`,
        kind: "Skill",
        name: skill.name,
        icon: skill.icon,
        iconSize: skill.iconSize,
        current: profile.skills[skill.name]?.level ?? 0,
        max: skill.maxLevel,
        apply: (p, level) => ({ ...p, skills: { ...p.skills, [skill.name]: { level } } }),
        cost: () => UNPRICED,
      });
    }
  }

  // Learned attack skills in place of the preset's weakest one.
  const presetSkills = profile.skillPresets[profile.activeSkillPreset] ?? [];
  const weakest = options.weakestAttack;
  if (weakest && presetSkills.includes(weakest)) {
    for (const skill of SKILLS) {
      const mechanics = (skill as typeof skill & { mechanics?: { type: string | null } | null }).mechanics;
      if (mechanics?.type !== "attack" || skill.baseValue === null || NOT_SWAPPED.has(skill.name) || presetSkills.includes(skill.name)) continue;
      if (effectiveSkillLevel(profile, skill.name, skill.maxLevel) < 1) continue;
      add({
        id: `swap:${skill.name}`,
        kind: `Skill preset · instead of ${weakest}`,
        name: skill.name,
        icon: skill.icon,
        iconSize: skill.iconSize,
        current: 0,
        max: 1,
        unit: "swap",
        apply: (p, level) => {
          if (level < 1) return p;
          const presets = p.skillPresets.map((preset, index) => (index === p.activeSkillPreset ? preset.map((name) => (name === weakest ? skill.name : name)) : preset));
          return { ...p, skillPresets: presets };
        },
        cost: () => UNPRICED,
      });
    }
  }

  // The next soul weapons, one after another: souls of each weapon's colour.
  const equipped = SOUL_WEAPONS.findIndex((w) => w.name === profile.equippedSoulWeapon);
  if (SOUL_WEAPONS.length > 0) {
    const next = SOUL_WEAPONS[Math.min(SOUL_WEAPONS.length - 1, equipped + 1)];
    add({
      id: "soul-weapon",
      kind: "Soul Weapon",
      name: next?.name ?? "Soul Weapon",
      icon: next?.icon ?? null,
      iconSize: next?.iconSize ?? null,
      current: equipped + 1,
      max: SOUL_WEAPONS.length,
      apply: (p, level) => {
        const weapon = SOUL_WEAPONS[level - 1];
        if (!weapon) return p;
        // A new soul weapon gets engraved like the one it replaces, so its completion effect carries over.
        const engraved = p.equippedSoulWeapon ? p.soulEngraving.completed[p.equippedSoulWeapon] === true : false;
        return {
          ...p,
          equippedSoulWeapon: weapon.name,
          soulWeapons: { ...p.soulWeapons, [weapon.name]: { owned: true } },
          soulEngraving: { ...p.soulEngraving, completed: { ...p.soulEngraving.completed, [weapon.name]: engraved } },
        };
      },
      cost: (from, to) => {
        const resources: Partial<Record<ResourceKey, number>> = {};
        for (let i = from; i < to; i += 1) {
          const weapon = SOUL_WEAPONS[i];
          const key = weapon?.soulColor === "GREEN" ? "greenSouls" : weapon?.soulColor === "BLUE" ? "blueSouls" : "redSouls";
          resources[key] = (resources[key] ?? 0) + (weapon?.cost ?? 0);
        }
        return priced(resources);
      },
    });
  }

  return upgrades;
}

/** The enemy a plan aims at: the fight's kind, and for promotions and stages which one. */
export type PlanTarget = {
  mode: "promotion" | "monster" | "stages";
  promotionIndex: number;
  /** The stage to clear, for the stages analysis. */
  stage?: number;
  duration: number;
  manual: string[];
};

/** The fight a plan runs: the target's setup for this profile, with the plan's precision. */
function planSetup(profile: ProfileV1, factors: SpiritFactors | null, target: PlanTarget, step: number | null) {
  const planned: ProfileV1 = {
    ...profile,
    bossMonster: target.mode === "promotion",
    normalMonster: target.mode === "monster",
    stageFarming: { ...profile.stageFarming, on: false },
  };
  const setup = promotionFight(planned, factors, target.promotionIndex, target.duration, target.manual, target.mode === "stages" ? { stage: target.stage } : {});
  return { setup, input: { ...setup.input, step: step ?? undefined } };
}

/**
 * The damage a profile deals in the fight (all of it, and the player's own without spirit skills) and the HP it has
 * to beat, with Rave pressed at `rave` (auto without): coarse steps for searching, null for the fight's own.
 */
export function planFight(profile: ProfileV1, factors: SpiritFactors | null, target: PlanTarget, step: number | null = 0.1, rave: RaveTiming | null = null) {
  const { setup, input } = planSetup(profile, factors, target, step);
  const hp = setup.boss?.hp ?? 0;
  const result = playFight(input, rave);
  // Spirit skills' damage (and Rave's copy of it) helps beat the enemy but isn't the player's own damage that upgrades raise.
  const spirit = SPIRIT_DAMAGE_SKILLS.reduce((sum, name) => sum + (result.bySkill[name] ?? 0), 0) + result.releases.reduce((sum, r) => sum + r.spirit, 0);
  const own = result.total - spirit;
  return { total: result.total, own, hp, bySkill: result.bySkill, setup };
}

/** An upgrade in a plan: the upgrade (without its functions), the level it goes to, and what that costs. */
export type PlanStep = { upgrade: Omit<Upgrade, "apply" | "cost">; level: number; cost: UpgradeCost };
/** A plan: its upgrades from where they are to where they go, their total cost, and the fight's damage after them. */
export type Plan = { steps: PlanStep[]; cost: UpgradeCost; total: number };

export type UpgradePlans = {
  baseline: number;
  hp: number;
  /** When Rave is pressed by hand in every planned fight, or null on auto. */
  rave: RaveTiming | null;
  /** How many times the player's own damage has to grow to win; null when a million times isn't enough. */
  needed: number | null;
  /** Things the profile seems to be missing that change the plans. */
  checks: string[];
  /** The path up the steepest curves; `won` when it gets there. */
  plan: Plan | null;
  won: boolean;
  /** When the path falls short: how many times the player's own damage still has to grow after it (null past a million). */
  stillNeeded: number | null;
  /** The fight with every upgrade that adds damage maxed: the end of every curve. */
  maxed: number;
  /** The path's budget, in multiples of what's owned (or what's been spent so far). */
  budget: number;
};

const strip = (upgrade: Upgrade): Omit<Upgrade, "apply" | "cost"> => {
  const { apply: _apply, cost: _cost, ...rest } = upgrade;
  void _apply;
  void _cost;
  return rest;
};

/** Adds costs together. */
export function sumCosts(costs: UpgradeCost[]): UpgradeCost {
  const total: UpgradeCost = { resources: {}, other: [], unpriced: false };
  for (const cost of costs) {
    for (const [key, amount] of Object.entries(cost.resources) as [ResourceKey, number][]) total.resources[key] = (total.resources[key] ?? 0) + amount;
    for (const item of cost.other) {
      const same = total.other.find((o) => o.label === item.label);
      if (same) same.amount += item.amount;
      else total.other.push({ ...item });
    }
    total.unpriced ||= cost.unpriced;
  }
  return total;
}

/** The part of an upgrade's curve a step covers: its levels over the whole track, from its start to its max. */
export const curveShare = (upgrade: Pick<Upgrade, "min" | "max">, from: number, to: number) => (to - from) / Math.max(1, upgrade.max - (upgrade.min ?? 0));

/** What a resource's price is measured against: what's already been put into these upgrades (each from nothing to where it is). */
export function resourceScale(upgrades: readonly Upgrade[]): Record<ResourceKey, number> {
  const invested = Object.fromEntries(RESOURCES.map((r) => [r.key, 0])) as Record<ResourceKey, number>;
  for (const upgrade of upgrades) {
    if (upgrade.current <= 0) continue;
    const cost = upgrade.cost(Math.max(0, upgrade.min ?? 0), upgrade.current);
    for (const [key, amount] of Object.entries(cost.resources) as [ResourceKey, number][]) {
      if (Number.isFinite(amount) && amount > 0) invested[key] += amount;
    }
  }
  return invested;
}

/** A price as a share of the player's means, summed over its resources: 0 without one, Infinity when a resource can't be measured. */
export function costShare(cost: UpgradeCost, scale: Record<ResourceKey, number>): number {
  let share = 0;
  for (const [key, amount] of Object.entries(cost.resources) as [ResourceKey, number][]) {
    if (!(amount > 0)) continue;
    if (!(scale[key] > 0)) return Infinity;
    share += amount / scale[key];
  }
  return share;
}

/** The Mana Altar counts the six familiars with the most stars. */
const ALTAR_FAMILIARS = 6;

/** Things missing from the profile that change what the plans suggest. */
export function profileChecks(profile: ProfileV1): string[] {
  const checks: string[] = [];
  const owned = FAMILIARS.filter((f) => familiarStars(profile, f.name) !== null).length;
  if (owned < ALTAR_FAMILIARS) checks.push(`Only ${owned} familiar${owned === 1 ? "" : "s"} entered: the Mana Altar counts your best ${ALTAR_FAMILIARS}, so add any others you own.`);
  const unrefined = (profile.skillPresets[profile.activeSkillPreset] ?? []).filter((name): name is string => {
    const skill = name ? SKILL_BY_NAME.get(name) : undefined;
    const mechanics = (skill as (typeof skill & { mechanics?: { type: string | null } | null }) | undefined)?.mechanics;
    if (!skill || mechanics?.type !== "attack" || NOT_SWAPPED.has(skill.name)) return false;
    const open = openRefinementLines(effectiveSkillLevel(profile, skill.name, skill.maxLevel));
    return open > 0 && !(profile.skillRefinement[skill.name] ?? []).some((line) => line.option && line.value);
  });
  if (unrefined.length) checks.push(`No refinement lines entered for ${unrefined.join(", ")}: their extra damage is left out.`);
  if (!presetBeast(profile)) checks.push("No beast picked in the active beast preset.");
  if (SHRINE.statues.every((statue) => (profile.sealedShrine[statue.key as keyof ProfileV1["sealedShrine"]] ?? 0) === 0)) checks.push("Sealed Shrine statues are all at 0.");
  return checks;
}

/** How many times the fight's attack has to grow for the total to reach the HP: 1 when it already does, null past a million. */
function neededAttack(input: FightInput, hp: number, rave: RaveTiming | null, onFight?: () => void): number | null {
  const total = (scale: number) => {
    onFight?.();
    return playFight({ ...input, attack: input.attack * scale }, rave).total;
  };
  if (total(1) >= hp) return 1;
  let low = 1;
  let high = 2;
  while (total(high) < hp) {
    low = high;
    high *= 4;
    if (high > 1e6) return null;
  }
  while (high / low > 1.01) {
    const mid = Math.sqrt(low * high);
    if (total(mid) >= hp) high = mid;
    else low = mid;
  }
  return high;
}

/** The preset's attack skill that dealt the least in this fight: the one other skills are tried in place of. */
function weakestAttack(profile: ProfileV1, bySkill: Record<string, number>, attacks: readonly string[]): string | null {
  const preset = (profile.skillPresets[profile.activeSkillPreset] ?? []).filter((name): name is string => name !== null && attacks.includes(name));
  if (!preset.length) return null;
  return preset.reduce((weak, name) => ((bySkill[name] ?? 0) < (bySkill[weak] ?? 0) ? name : weak));
}

/**
 * How to beat the target. First the gap: how much more of their own damage the player needs, with Rave pressed at its
 * best timing. Then the path: every piece of content that isn't maxed is a curve from its start to its max, and step
 * by step the one whose next stretch (5% of it) lifts the combined damage the most moves, until the fight is won.
 * Alongside it, the end of every curve (everything maxed). Fights run coarse while searching; the plan's result is
 * confirmed at full precision.
 */
export function planUpgrades(
  profile: ProfileV1,
  factors: SpiritFactors | null,
  target: PlanTarget,
  progress?: (done: number, of: number) => void,
): UpgradePlans {
  let done = 0;
  let of = 1;
  const tick = () => {
    done += 1;
    // The path's length isn't known ahead, so the bar keeps some room until the end.
    if (done >= of - 1) of = done + 20;
    progress?.(done, of);
  };

  const { input } = planSetup(profile, factors, target, 0.1);
  of = raveTimings(input.duration).length + 30;
  const rave = bestRaveTiming(input, tick);
  const base = planFight(profile, factors, target, null, rave);
  const { hp } = base;
  const needed = neededAttack(input, hp, rave, tick);
  const checks = profileChecks(profile);
  const attacks = base.setup.skills.filter((s) => s.effect.type === "damage").map((s) => s.name);
  const upgrades = listUpgrades(profile, { weakestAttack: weakestAttack(profile, base.bySkill, attacks) });
  const byId = new Map(upgrades.map((u) => [u.id, u]));
  const scale = resourceScale(upgrades);
  const fight = (p: ProfileV1, step: number | null = 0.1) => {
    tick();
    return planFight(p, factors, target, step, rave);
  };
  const coarse = fight(profile);
  of = done + upgrades.length * 3 + 100;

  // Every upgrade maxed on its own: which curves raise the player's own damage at all. Spirit skills' damage (Breath
  // of Fire takes a share of the enemy's HP) doesn't grow with upgrades, so it isn't what's compared.
  const useful: { upgrade: Upgrade; ownGain: number }[] = [];
  for (const upgrade of upgrades) {
    const maxed = fight(upgrade.apply(profile, upgrade.max));
    const ownGain = maxed.own / Math.max(coarse.own, 1e-300);
    if (ownGain > 1 + 1e-9) useful.push({ upgrade, ownGain });
  }
  useful.sort((a, b) => b.ownGain - a.ownGain);
  // Skill swaps replace the same skill: only the best of them counts toward everything maxed.
  const bestSwap = useful.find(({ upgrade }) => upgrade.unit === "swap");
  const maxedProfile = useful.filter(({ upgrade }) => upgrade.unit !== "swap" || upgrade === bestSwap?.upgrade).reduce((p, { upgrade }) => upgrade.apply(p, upgrade.max), profile);
  const maxed = useful.length ? fight(maxedProfile, null).total : base.total;

  const withLevels = (levels: Record<string, number>) =>
    Object.entries(levels).reduce((p, [id, level]) => {
      const upgrade = byId.get(id)!;
      return level !== upgrade.current ? upgrade.apply(p, level) : p;
    }, profile);
  const path =
    base.total >= hp
      ? { steps: [], levels: {} }
      : buildPath({
          // A step is as big as the stretch of its curve, or as its price against the player's means when that's more.
          candidates: useful.map(({ upgrade }) => {
            const price = (from: number, to: number) => costShare(upgrade.cost(from, to), scale);
            return { id: upgrade.id, current: upgrade.current, max: upgrade.max, size: (from, to) => Math.max(curveShare(upgrade, from, to), price(from, to)), spend: price };
          }),
          hp,
          fight: (levels) => {
            const result = fight(withLevels(levels));
            return { own: result.own, total: result.total };
          },
        });

  let plan: Plan | null = null;
  if (path.steps.length) {
    const steps = mergeSteps(path.steps).map(({ id, from, to }) => {
      const upgrade = byId.get(id)!;
      return { upgrade: { ...strip(upgrade), current: from }, level: to, cost: upgrade.cost(from, to) };
    });
    plan = { steps, cost: sumCosts(steps.map((s) => s.cost)), total: fight(withLevels(path.levels), null).total };
  }
  const won = (plan?.total ?? base.total) >= hp;
  const stillNeeded = won ? 1 : neededAttack(planSetup(withLevels(path.levels), factors, target, 0.1).input, hp, rave, tick);
  progress?.(of, of);

  return {
    baseline: base.total,
    hp,
    rave,
    needed,
    checks,
    plan,
    won,
    stillNeeded,
    maxed,
    budget: MAX_PATH_SPEND,
  };
}
