import characterData from "@/data/optimizer/character.json";
import companionsData from "@/data/optimizer/companions.json";
import memoryTreeData from "@/data/optimizer/memory-tree.json";
import costTablesData from "@/data/optimizer/upgrade-costs.json";
import { simulateFight } from "@/lib/game/battle";
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
import { activeFamiliars, awakening, companionState, equippedKey, familiarStars, gearState, spiritLevelCap, spiritState } from "@/lib/profile/rules";
import { MAX_FAMILIAR_STARS, MAX_SPIRIT_ENHANCE, RESOURCES, type ProfileV1, type ResourceKey } from "@/lib/profile/types";
import { ACCESSORIES, AWAKENING, FAMILIARS, MASTERY_PAGES, MAX_AWAKENING, RELICS, SKILL_BY_NAME, SOUL_WEAPONS, SPIRIT_TIERS, SPIRITS, WEAPONS } from "./data";
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

/** Every upgrade the player could make from this profile, each short of its cap: nothing maxed is offered. */
export function listUpgrades(profile: ProfileV1): Upgrade[] {
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
        max: MAX_SPIRIT_ENHANCE,
        apply: (p, level) => ({ ...p, spirits: { ...p.spirits, [spirit.name]: { ...p.spirits[spirit.name]!, enhance: level } } }),
        cost: () => UNPRICED,
      });
    }
  }

  // The equipped familiars' stars: unpriced here.
  for (const name of Object.values(activeFamiliars(profile))) {
    const familiar = name ? FAMILIARS.find((f) => f.name === name) : undefined;
    const stars = familiar ? familiarStars(profile, familiar.name) : null;
    if (!familiar || stars === null) continue;
    const art = familiar.art.find((band) => band.from <= stars && stars <= band.to) ?? familiar.art[0];
    add({
      id: `familiar:${familiar.name}`,
      kind: "Familiar stars",
      name: familiar.name,
      icon: art?.icon ?? null,
      iconSize: art?.iconSize ?? null,
      current: stars,
      max: MAX_FAMILIAR_STARS,
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

  // Skill Mastery nodes: points a level (unnamed in the workbook).
  for (const page of MASTERY_PAGES) {
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

/** Spirit skills' damage: part of beating the enemy, but not the player's own damage that upgrades raise. */
const SPIRIT_DAMAGE = ["Breath of Fire", "Thief Wind", "Judge's Torpedo"];

/**
 * The damage a profile deals in the fight (all of it, and the player's own without spirit skills) and the HP it has
 * to beat: coarse steps for searching, null for the fight's own.
 */
export function planFight(profile: ProfileV1, factors: SpiritFactors | null, target: PlanTarget, step: number | null = 0.1) {
  const planned: ProfileV1 = {
    ...profile,
    bossMonster: target.mode === "promotion",
    normalMonster: target.mode === "monster",
    stageFarming: { ...profile.stageFarming, on: false },
  };
  const setup = promotionFight(planned, factors, target.promotionIndex, target.duration, target.manual, target.mode === "stages" ? { stage: target.stage } : {});
  const hp = setup.boss?.hp ?? 0;
  const result = simulateFight({ ...setup.input, step: step ?? undefined });
  const own = result.total - SPIRIT_DAMAGE.reduce((sum, name) => sum + (result.bySkill[name] ?? 0), 0);
  return { total: result.total, own, hp };
}

/** Whether a cost fits what the player owns; unnamed units and unpriced upgrades can't be checked. */
export function affordable(cost: UpgradeCost, owned: ProfileV1["resources"]): { fits: boolean; short: Partial<Record<ResourceKey, number>> } {
  const short: Partial<Record<ResourceKey, number>> = {};
  for (const { key } of RESOURCES) {
    const need = cost.resources[key] ?? 0;
    if (need > (owned[key] ?? 0)) short[key] = need - (owned[key] ?? 0);
  }
  return { fits: Object.keys(short).length === 0 && !cost.unpriced && cost.other.length === 0, short };
}

/** An upgrade in a plan: the upgrade (without its functions), the level it goes to, and what that costs. */
export type PlanStep = { upgrade: Omit<Upgrade, "apply" | "cost">; level: number; cost: UpgradeCost };
/** A plan: its upgrades, their total cost, and the damage the fight deals with them. */
export type Plan = { steps: PlanStep[]; cost: UpgradeCost; total: number };
/** One upgrade maxed: how much it raises the player's own damage (×), the fight's total with it, and what maxing costs. */
export type Gain = { upgrade: Omit<Upgrade, "apply" | "cost">; ownGain: number; total: number; cost: UpgradeCost };

export type UpgradePlans = {
  baseline: number;
  /** The player's own damage, without spirit skills. */
  own: number;
  hp: number;
  /** Single upgrades that beat the target alone, cheapest for what's owned first. */
  singles: Plan[];
  /** The fewest upgrades that beat it together when no single one does, a few alternatives. */
  combos: Plan[];
  /** The damage with every upgrade maxed, and the upgrades that raise the player's own damage the most on their own. */
  maxed: number;
  gains: Gain[];
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

/** How much of the owned resources a cost takes at worst (Infinity for what can't be checked). */
function ownedShare(cost: UpgradeCost, owned: ProfileV1["resources"]) {
  if (cost.unpriced) return Infinity;
  let worst = 0;
  for (const { key } of RESOURCES) {
    const need = cost.resources[key] ?? 0;
    if (need > 0) worst = Math.max(worst, need / Math.max(1, owned[key] ?? 0));
  }
  return worst + (cost.other.length ? 1e6 : 0);
}

const byAffordability = (owned: ProfileV1["resources"]) => (a: Plan, b: Plan) =>
  Number(!affordable(b.cost, owned).fits) - Number(!affordable(a.cost, owned).fits) || ownedShare(a.cost, owned) - ownedShare(b.cost, owned);

/**
 * What would beat the target, by re-running the fight: single upgrades at the lowest level that does it alone, and
 * when none does, the fewest upgrades that do it together (the strongest maxed first, then each lowered as far as it
 * can go), with alternatives that leave out an earlier plan's strongest pick. `progress` reports the work done.
 */
export function planUpgrades(
  profile: ProfileV1,
  factors: SpiritFactors | null,
  target: PlanTarget,
  progress?: (done: number, of: number) => void,
): UpgradePlans {
  const { total: baseline, own, hp } = planFight(profile, factors, target);
  const upgrades = listUpgrades(profile);
  const owned = profile.resources;
  const damage = (p: ProfileV1, step: number | null = 0.1) => planFight(p, factors, target, step).total;
  const work = upgrades.length * 2;
  let done = 0;
  const tick = () => progress?.(Math.min(work, (done += 1)), work);

  // Each upgrade maxed on its own: what raises the player's own damage at all, and by how much. Spirit skills'
  // damage (Breath of Fire takes a share of the enemy's HP) doesn't grow with upgrades, so it isn't what's compared.
  const useful: { upgrade: Upgrade; best: number; ownGain: number }[] = [];
  for (const upgrade of upgrades) {
    const fight = planFight(upgrade.apply(profile, upgrade.max), factors, target);
    tick();
    const ownGain = fight.own / Math.max(own, 1e-300);
    if (ownGain > 1 + 1e-9) useful.push({ upgrade, best: fight.total, ownGain });
  }
  useful.sort((a, b) => b.ownGain - a.ownGain);

  /** The lowest level of one upgrade that keeps `base` (with the others applied) at or over the HP. */
  const lowest = (upgrade: Upgrade, base: ProfileV1): number | null => {
    const beats = (level: number, step: number | null) => damage(upgrade.apply(base, level), step) >= hp;
    const search = (from: number, step: number | null) => {
      let low = from;
      let high = upgrade.max;
      if (!beats(high, step)) return null;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (beats(mid, step)) high = mid;
        else low = mid + 1;
      }
      return low;
    };
    const coarse = search(upgrade.current, 0.1);
    if (coarse === null) return null;
    // Confirmed at the fight's own precision; when the coarse search was just short, searched again at it.
    return beats(coarse, null) ? coarse : search(coarse + 1, null);
  };

  const singles: Plan[] = [];
  for (const { upgrade, best } of useful) {
    tick();
    if (best < hp) continue;
    const level = lowest(upgrade, profile);
    if (level === null || level <= upgrade.current) continue;
    const cost = upgrade.cost(upgrade.current, level);
    singles.push({ steps: [{ upgrade: strip(upgrade), level, cost }], cost, total: damage(upgrade.apply(profile, level)) });
  }
  singles.sort(byAffordability(owned));

  // Every useful upgrade maxed: the most this profile could deal.
  const maxed = useful.length ? damage(useful.reduce((p, { upgrade }) => upgrade.apply(p, upgrade.max), profile)) : baseline;

  /** The fewest of `pool` (strongest first) that beat the HP maxed together, then each lowered as far as it goes. */
  const combine = (pool: { upgrade: Upgrade }[]): Plan | null => {
    const chosen: Upgrade[] = [];
    let p = profile;
    for (const { upgrade } of pool) {
      chosen.push(upgrade);
      p = upgrade.apply(p, upgrade.max);
      if (damage(p) >= hp) break;
    }
    if (damage(p, null) < hp) return null;
    // Lower each, the last picked (the least damage) first, keeping the others where they are.
    const levels = new Map(chosen.map((u) => [u.id, u.max]));
    for (const upgrade of [...chosen].reverse()) {
      const base = chosen.filter((u) => u !== upgrade).reduce((q, u) => u.apply(q, levels.get(u.id)!), profile);
      const level = lowest(upgrade, base);
      if (level !== null) levels.set(upgrade.id, level);
    }
    const kept = chosen.filter((u) => levels.get(u.id)! > u.current);
    const steps = kept.map((u) => ({ upgrade: strip(u), level: levels.get(u.id)!, cost: u.cost(u.current, levels.get(u.id)!) }));
    const final = kept.reduce((q, u) => u.apply(q, levels.get(u.id)!), profile);
    return { steps, cost: sumCosts(steps.map((s) => s.cost)), total: damage(final, null) };
  };

  const combos: Plan[] = [];
  if (!singles.length && maxed >= hp) {
    let pool = useful;
    for (let attempt = 0; attempt < 3 && pool.length; attempt += 1) {
      const plan = combine(pool);
      if (!plan || plan.total < hp) break;
      const key = plan.steps.map((s) => s.upgrade.id).sort().join();
      if (!combos.some((c) => c.steps.map((s) => s.upgrade.id).sort().join() === key)) combos.push(plan);
      // The next alternative goes without this plan's strongest upgrade.
      const first = plan.steps[0]?.upgrade.id;
      pool = pool.filter(({ upgrade }) => upgrade.id !== first);
    }
    combos.sort((a, b) => a.steps.length - b.steps.length || byAffordability(owned)(a, b));
  }
  progress?.(work, work);

  return {
    baseline,
    own,
    hp,
    singles,
    combos,
    maxed,
    gains: useful.slice(0, 8).map(({ upgrade, best, ownGain }) => ({ upgrade: strip(upgrade), ownGain, total: best, cost: upgrade.cost(upgrade.current, upgrade.max) })),
  };
}
