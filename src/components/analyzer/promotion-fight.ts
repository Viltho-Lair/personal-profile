import characterData from "@/data/optimizer/character.json";
import promotionBossData from "@/data/optimizer/promotion-bosses.json";
import stagesData from "@/data/optimizer/stages.json";
import type { FarmStage } from "@/lib/game/farm";
import { ANIMATION_SECONDS, simulateFight, withStones, type FightInput, type FightResult, type FightSkill, type SkillEffect } from "@/lib/game/battle";
import { enhanceStat, type EnhanceStat } from "@/lib/game/character";
import { skillPower } from "@/lib/game/formulas";
import refinementData from "@/data/optimizer/skill-refinement.json";
import { openRefinementLines, refinementEffects, type RefinementData } from "@/lib/game/refinement";
import { shrineEffects } from "@/lib/game/shrine";
import { computeStats, ELEMENTS, type Element, type StatSources } from "@/lib/game/stats";
import { activeFamiliars, activeSkillStones, awakening, effectiveSkillLevel, equippedKey, familiarStars, gearState, masteryLevel, presetBeast } from "@/lib/profile/rules";
import type { ProfileV1 } from "@/lib/profile/types";
import { AWAKENING, FAMILIARS, MASTERY_PAGES, MAX_AWAKENING, SKILL_BY_NAME, WEAPONS, type Familiar, type Skill } from "./data";
import type { SpiritFactors } from "./spirit-stats";
import { activeSpiritSkills, BEASTS, classLevelCap, classTotals, collectSources, companionSkill, gearTotals, SHRINE } from "./stat-sources";
import { formatNumber } from "@/lib/number-format";

type PromotionStage = { name: string; stage: number; range: number };
export const PROMOTION_STAGES = promotionBossData.promotions as PromotionStage[];
const BOSS_HP = promotionBossData.bossHp as number[];
const ENHANCE = characterData.enhance as unknown as EnhanceStat[];

export const FIGHT_SECONDS = 60;
/** A farming run ends when the box breaks, or after this long. */
export const FARM_SECONDS = 180;
export const FARM_STAGES = stagesData.stages as FarmStage[];
const REFINEMENT_DATA = refinementData as unknown as RefinementData;

const bossHpAt = (stage: number) => BOSS_HP[Math.min(BOSS_HP.length, Math.max(1, Math.round(stage))) - 1] ?? 0;
export const STAGE_COUNT = BOSS_HP.length;
export const stageBossHp = bossHpAt;

/** The highest stage whose boss HP this much damage covers (0 when not even stage 1's). */
export function stagesCleared(damage: number): number {
  let low = 0;
  let high = BOSS_HP.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if ((BOSS_HP[mid - 1] ?? Infinity) <= damage) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** A promotion's boss, estimated as its recommended stage's boss, with the stages either side of the range. */
export function promotionBoss(index: number) {
  const promotion = PROMOTION_STAGES[index];
  if (!promotion) return null;
  const stage = Math.max(1, promotion.stage);
  return {
    name: promotion.name,
    stage,
    minStage: Math.max(1, stage - promotion.range),
    maxStage: stage + promotion.range,
    hp: bossHpAt(stage),
    minHp: bossHpAt(stage - promotion.range),
    maxHp: bossHpAt(stage + promotion.range),
  };
}

/** How a skill plays out, from the game's Skills Data columns. */
export type SkillMechanics = {
  type: "attack" | "buff" | "passive" | null;
  trigger: "always" | "seconds" | "hits" | "special";
  passive: "stack" | "delayed" | null;
  every: number | null;
  duration: number;
  additional: number[];
  hits: { base: number; mastery: { node: string; hits: number } | null } | null;
  masteryDamage: { node: string; multiplier: number }[];
};

type SkillWithMechanics = Skill & { mechanics?: SkillMechanics | null };

const MASTERY_MAX = new Map(MASTERY_PAGES.flatMap((page) => page.nodes.map((node) => [node.id, node.maxLevel] as const)));
const nodeDone = (profile: ProfileV1, id: string) => {
  const max = MASTERY_MAX.get(id);
  return max !== undefined && masteryLevel(profile, id, max) >= max;
};

const num = (pattern: RegExp, text: string) => {
  const match = text.match(pattern);
  const value = match?.slice(1).find((group) => group !== undefined);
  return value !== undefined ? Number(value) : null;
};

/** Attack skills that charge the slayer forward when stage farming. */
const DASHES: Record<string, "farthest" | "through"> = { Fulgurous: "farthest", Supersonic: "through" };
/** Fulgurous charges every time it has the mana, target or not. */
const CASTS_ANYWAY = new Set(["Fulgurous"]);
/** Meteors and lightning strikes land on random tiles within reach. */
const RANDOM_TILES = new Set(["Ice Stone", "Ice Shower", "Ice Time", "Lightning Stroke", "Red Lightning"]);
/** Skills that deal their damage once a second. */
const PER_SECOND = new Set(["Blizzard"]);

/** Skills played out in stopped time. */
const FREEZING = new Set(["Demon Hunt"]);

/**
 * Skill Mastery nodes the workbook's skill formulas don't read: later pages
 * pair their 3x DMG (or the 3x alone) with a second effect. Each applies once
 * its node is checked. Range, monster, stun, fire-enemy and damage-resistance
 * effects don't change a single boss fight, so they're left out; Stone Strike's
 * +20% boss DMG (9-FT22) is already in its workbook multiplier (3 x 1.2).
 */
const MASTERY_EXTRAS: {
  node: string;
  skills: string[];
  multiplier?: number;
  manaCost?: number;
  /** Share of the usual 0.3s cast animation. */
  animation?: number;
  stopsTime?: boolean;
  strikes?: number;
  cooldown?: number;
}[] = [
  { node: "6-DL37", skills: ["Fulgurous"], multiplier: 3, manaCost: -5 },
  { node: "10-GN22", skills: ["Demon Hunt"], multiplier: 3 },
  { node: "10-GB32", skills: ["Blizzard"], multiplier: 3 },
  { node: "6-DF7", skills: ["Water Slash"], animation: 0.5 },
  { node: "6-DF22", skills: ["Hot Blast", "Fire Blast"], stopsTime: true },
  { node: "7-DZ17", skills: ["Fire Slash", "Flame Slash", "Hellfire Slash"], strikes: -1 },
  { node: "8-EN12", skills: ["Pillar of Fire"], cooldown: -2 },
];

/**
 * What checked Skill Mastery nodes do to a skill: its hit count (e.g. 2x Hits), the damage
 * multiplier of every checked node (1.5x, 3x, and the later pages' nodes the workbook doesn't read)
 * and the nodes that apply.
 */
export function skillMasteryOnSkill(profile: ProfileV1, skill: SkillWithMechanics) {
  const m = skill.mechanics;
  const hits = m?.hits ? (m.hits.mastery && nodeDone(profile, m.hits.mastery.node) ? m.hits.mastery.hits : m.hits.base) : 1;
  const nodes = (m?.masteryDamage ?? []).filter((node) => nodeDone(profile, node.node));
  const extras = MASTERY_EXTRAS.filter((extra) => extra.skills.includes(skill.name) && nodeDone(profile, extra.node));
  const multiplier = nodes.reduce((product, node) => product * node.multiplier, 1) * extras.reduce((product, extra) => product * (extra.multiplier ?? 1), 1);
  const add = (key: "manaCost" | "strikes" | "cooldown") => extras.reduce((total, extra) => total + (extra[key] ?? 0), 0);
  return {
    hits,
    multiplier,
    manaCost: add("manaCost"),
    strikes: add("strikes"),
    cooldown: add("cooldown"),
    nodes: [...nodes.map((node) => node.node), ...extras.map((extra) => extra.node)],
  };
}

/** A preset skill as a fight skill, or the reason it's left out. */
function toFightSkill(profile: ProfileV1, skill: SkillWithMechanics, preset: SkillWithMechanics[]): FightSkill | string {
  const m = skill.mechanics;
  const level = effectiveSkillLevel(profile, skill.name, skill.maxLevel);
  if (level < 1) return `${skill.name} (not learned)`;
  if (!m || skill.baseValue === null || skill.upgradeValue === null) return skill.name;
  const power = (skillPower(skill.baseValue, skill.upgradeValue, level) ?? 0) / 100;
  const text = skill.description.specific ?? "";
  const element = (ELEMENTS as readonly string[]).includes(skill.element ?? "") ? (skill.element as Element) : null;
  // Only the lines the skill's level has opened count.
  const refined = refinementEffects(REFINEMENT_DATA, (profile.skillRefinement[skill.name] ?? []).slice(0, openRefinementLines(level)));
  const base: Omit<FightSkill, "effect"> = {
    mpCost: Math.max(0, (skill.mpCost ?? 0) * (1 - refined.mana)),
    // Stacking passives complete after their stages (Skills Data's Range column).
    maxStacks: m.passive === "stack" ? (skill.range ?? null) : null,
    name: skill.name,
    element,
    kind: m.type ?? "attack",
    trigger: m.trigger === "hits" ? "hits" : m.trigger === "always" ? "always" : "seconds",
    every: m.every ?? 10,
    duration: m.duration || num(/for (\d+) ?sec/i, text) || 0,
    delay: 0,
    startAt: num(/after (\d+) seconds into battle/i, text) ?? 0,
    freezes: FREEZING.has(skill.name),
    bonus: 0,
    // Farming, an attack skill hits every monster within the range its text gives (the workbook's Range otherwise),
    // up to the number of enemies the text names.
    range: m.type === "attack" ? Math.max(1, num(/within (?:a )?(\d+) range|within range (\d+)|range (\d+)/i, text) ?? skill.range ?? 1) : undefined,
    maxTargets: num(/to (\d+) enemies/i, text) ?? undefined,
    castsAnyway: CASTS_ANYWAY.has(skill.name) || undefined,
    randomTiles: RANDOM_TILES.has(skill.name) || undefined,
    hitEvery: PER_SECOND.has(skill.name) ? 1 : undefined,
  };
  const make = (effect: SkillEffect, extra: Partial<FightSkill> = {}): FightSkill => ({ ...base, ...extra, effect });

  if (skill.name === "Mantra") return "Mantra (already in the stats)";
  if (skill.name === "Heart of Fire") return "";
  if (skill.name === "Rave") return make({ type: "rave", power }, { kind: "attack", trigger: "seconds", duration: num(/for (\d+) seconds/i, text) ?? 5 });
  if (skill.name === "Meditation") return make({ type: "chargeCooldowns", power }, { kind: "buff" });
  // Breath of Waves recovers 50% of current HP as it speeds cooldowns up.
  if (skill.name === "Breath of Waves")
    return make({ type: "cooldownRate", power }, { kind: "buff", hpCost: -((num(/Recover (\d+)% of current HP/i, text) ?? 50) / 100) });
  // Warrior Burn spends 50% of current HP for its ATK.
  if (skill.name === "Warrior Burn")
    return make({ type: "atk", power }, { kind: "buff", hpCost: (num(/Consume (\d+)% HP of current HP/i, text) ?? 50) / 100 });
  if (skill.name === "Ignition") return make({ type: "nextSkill", power }, { kind: "buff" });
  if (skill.name === "Full Moon") return make({ type: "atk", power }, { kind: "buff", delay: num(/for (\d+) seconds/i, text) ?? 3 });
  // Wrath of Gods first goes 20 seconds in, then every cooldown (30s), restarting it straight away.
  if (skill.name === "Wrath of Gods")
    return make(
      { type: "atk", power },
      { kind: "passive", trigger: "seconds", startAt: 0, startsOnCooldown: true, firstEvery: num(/after (\d+) seconds into battle/i, text) ?? 20 },
    );
  if (skill.name === "Heaven's Punishment") return make({ type: "damage", power, hits: 1 }, { kind: "attack", startAt: 6 });
  if (skill.name === "Sea Judgment")
    return make({ type: "damage", power, hits: 1, growsTo: 7 }, { kind: "passive", trigger: "elementCasts", every: m.additional[0] || 3 });
  if (skill.name === "Blast Wind") return make({ type: "elementStack", power }, { kind: "passive", trigger: "elementCasts", every: 5 });
  // Rage drains 0.5% of max life a second while it lasts.
  if (skill.name === "Rage") return make({ type: "rage", power, drain: 0.005 }, { kind: "buff" });
  // Mana's Blessing raises Mana Recovery for the whole fight, as in the Stats Summary.
  if (skill.name === "Mana's Blessing") return make({ type: "manaRecovery", power }, { kind: "passive", trigger: "always" });
  // Agile raises movement speed for its duration; Storm Rush for every monster killed.
  if (skill.name === "Agile") return make({ type: "mspd", power }, { kind: "buff" });
  if (skill.name === "Storm Rush") return make({ type: "mspdPerKill", power }, { kind: "passive", trigger: "always", maxStacks: null });
  if (skill.name === "Life Mana")
    return make({ type: "restore", hp: power, mana: (num(/(\d+)% recovery of mana/i, text) ?? 30) / 100 }, { kind: "buff" });
  if (skill.name === "Lightning Body")
    return make({ type: "speed", power }, { kind: "buff", hpCost: (num(/(\d+)% of current HP/i, text) ?? 50) / 100 });

  if (m.type === "attack") {
    if (!/X%.{0,20}(damage|DMG)|X% of (their )?ATK|(damage|DMG) X%/i.test(text) || /copy the last|frozen|Y%/i.test(text)) return skill.name;
    const { hits, multiplier: amp } = skillMasteryOnSkill(profile, skill);
    const heartOfFire = preset.find((s) => s.name === "Heart of Fire");
    const fireSkills = preset.filter((s) => s.element === "Fire" && s.mechanics?.type === "attack").length;
    let bonus = 0;
    if (heartOfFire && element === "Fire" && fireSkills >= 4 && heartOfFire.baseValue !== null && heartOfFire.upgradeValue !== null) {
      const heart = (skillPower(heartOfFire.baseValue, heartOfFire.upgradeValue, effectiveSkillLevel(profile, heartOfFire.name, heartOfFire.maxLevel)) ?? 0) / 100;
      bonus = heart * (1 + Math.max(0, fireSkills - 4));
    }
    // Refinement: extra damage, and a shorter cooldown or fewer required hits.
    let every = base.trigger === "hits" ? base.every * (1 - refined.strikes) : base.every * (1 - refined.cooldown);
    // Statue of Demon and Luna's Wisdom of War add skill damage.
    const shrine = shrineEffects(SHRINE, profile.sealedShrine).skillDamage;
    const wisdom = companionSkill(profile, "Luna", "Wisdom of War");
    // Checked mastery nodes the workbook doesn't read.
    const extras = MASTERY_EXTRAS.filter((extra) => extra.skills.includes(skill.name) && nodeDone(profile, extra.node));
    let mpCost = base.mpCost ?? 0;
    let animation: number | undefined;
    let freezes = base.freezes;
    for (const extra of extras) {
      mpCost = Math.max(0, mpCost + (extra.manaCost ?? 0));
      if (extra.animation) animation = ANIMATION_SECONDS * extra.animation;
      if (extra.stopsTime) freezes = true;
      if (extra.strikes && base.trigger === "hits") every = Math.max(1, every + extra.strikes);
      if (extra.cooldown && base.trigger === "seconds") every = Math.max(0.1, every + extra.cooldown);
    }
    return make(
      { type: "damage", power: power * amp, hits },
      { bonus: bonus + refined.damage + shrine + wisdom, every, mpCost, animation, freezes, dash: DASHES[skill.name] },
    );
  }

  const speed = /ATK SPD/i.test(text);
  const atk = /total ATK/i.test(text);
  if (!speed && !atk) return skill.name;
  if (/as HP decreases|reviv|MSPD|per monster/i.test(text)) return skill.name;
  if (m.type === "passive" && m.passive === "stack") {
    return make({ type: speed ? "speedStack" : "atkStack", power }, { trigger: m.trigger === "hits" ? "hits" : "seconds" });
  }
  if (m.type === "passive" && m.trigger === "always") return make({ type: speed ? "speed" : "atk", power }, { trigger: "always" });
  return make({ type: speed ? "speed" : "atk", power });
}

/** The active skill preset as fight skills, with the active skill stones applied. */
export function presetFightSkills(profile: ProfileV1) {
  const stones = activeSkillStones(profile);
  const preset = (profile.skillPresets[profile.activeSkillPreset] ?? [])
    .map((name) => (name ? (SKILL_BY_NAME.get(name) as SkillWithMechanics | undefined) : undefined))
    .filter((s): s is SkillWithMechanics => Boolean(s));
  const skills: FightSkill[] = [];
  const skipped: string[] = [];
  for (const skill of preset) {
    const result = toFightSkill(profile, skill, preset);
    if (typeof result === "string") {
      if (result) skipped.push(result); // Heart of Fire works through the fire skills' bonus
    }
    else skills.push(withStones(result, stones));
  }

  return { skills, skipped };
}

/** The enemy: boss or normal monster, its HP, and the accompanying spirits' skills. */
export type FightTarget = Pick<FightInput, "bossMonster" | "enemyHp" | "spirits" | "enemyElement">;

/** Seconds between familiar uses when a familiar allows more than one (Ku: 2 uses, 20 seconds apart). */
export const FAMILIAR_COOLDOWN = 30;
export const FAMILIAR_SKILL = "Familiar";
/** Seconds between Pe's repeated attacks (its stat is labelled Seconds: one repeat a second). */
export const PE_REPEAT_SECONDS = 1;

type FamiliarPart = { familiar: Familiar; stars: number; values: Record<string, number | null> };

/**
 * The equipped familiars' combined use, once a battle unless a familiar says otherwise (Ku: 2 uses): the
 * weapon familiar's range and damage, times the attribute familiar's damage and element, hitting the battle
 * familiar's number of times (Ku and Sha: Hits, Pe: Seconds, Po: Hits). Pe repeats the attack that many
 * times one after another, a second apart (10% faster at Immortal). Specials that play in a fight come with
 * it; the rest are listed as not modelled.
 */
export function familiarFightSkills(profile: ProfileV1, duration: number) {
  const equipped = activeFamiliars(profile);
  const part = (name: string | null): FamiliarPart | null => {
    const familiar = name ? FAMILIARS.find((f) => f.name === name) : undefined;
    const stars = familiar ? familiarStars(profile, familiar.name) : null;
    if (!familiar || stars === null) return null;
    return { familiar, stars, values: familiar.stars.find((s) => s.star === stars)?.values ?? {} };
  };
  const weapon = part(equipped.weapon);
  const attribute = part(equipped.attribute);
  const battle = part(equipped.battle);
  const notes: string[] = [];
  if (!weapon || !attribute || !battle) return { skill: null, specials: [] as FightSkill[], parts: { weapon, attribute, battle }, notes, range: 0 };

  const hits = Math.max(1, Math.round(battle.familiar.name === "Pe" ? (battle.values.Seconds ?? 1) : (battle.values.Hits ?? 1)));
  const power = (weapon.values.Damage ?? 0) * (attribute.values.Damage ?? 0);
  const element = (ELEMENTS as readonly string[]).includes(attribute.familiar.element ?? "") ? (attribute.familiar.element as Element) : null;
  let every = FAMILIAR_COOLDOWN;
  let bonus = 0;
  let maxUses = 1;
  let hitEvery: number | undefined;
  const skill: FightSkill = {
    name: FAMILIAR_SKILL,
    element,
    kind: "attack",
    trigger: "seconds",
    every,
    duration: 0,
    delay: 0,
    startAt: 0,
    freezes: false,
    bonus,
    familiar: true,
    range: Math.max(1, weapon.values.Range ?? 1),
    effect: { type: "damage", power, hits },
  };
  const special = (name: string, effect: FightSkill["effect"], extra: Partial<FightSkill> = {}): FightSkill => ({
    name,
    element: null,
    kind: "passive",
    trigger: "familiarCasts",
    every: 1,
    duration: 0,
    delay: 0,
    startAt: 0,
    freezes: false,
    bonus: 0,
    uncharged: true,
    effect,
    ...extra,
  });
  const specials: FightSkill[] = [];
  for (const { familiar } of [attribute, battle, weapon]) {
    switch (familiar.name) {
      case "Na":
        skill.lowHpBonus = { below: 0.6, bonus: 0.1 };
        break;
      case "Rion":
        specials.push(special("Rion", { type: "speed", power: 2 }, { duration: 10 }));
        break;
      case "Ru":
        specials.push(special("Ru", { type: "atk", power: 1.5 }, { duration: 5 }));
        break;
      case "A":
        specials.push(special("A", { type: "chargeCooldowns", power: 0.15 }));
        break;
      case "Je":
        specials.push(special("Je", { type: "mspd", power: 0.25 }, { duration: 10 }));
        break;
      case "Ku":
        bonus += 0.1;
        maxUses = 2;
        every = 20;
        break;
      case "Pe":
        // Repeats the attack its Seconds number of times, a second apart; at Immortal the repeats come 10% faster.
        hitEvery = PE_REPEAT_SECONDS * (battle.familiar.stars.find((s) => s.star === battle.stars)?.rarity === "Immortal" ? 0.9 : 1);
        break;
      case "Po":
        // 15 extra attacks 2 seconds before the end: a one-off that starts ready then.
        specials.push(special("Po", { type: "damage", power: 1, hits: 15 }, { trigger: "seconds", every: duration * 10, startAt: Math.max(0, duration - 2), familiar: true }));
        break;
      default:
        if (familiar.special) notes.push(`${familiar.name}: ${familiar.special}`);
    }
  }
  return { skill: { ...skill, every, bonus, maxUses, hitEvery }, specials, parts: { weapon, attribute, battle }, notes, range: weapon.values.Range ?? 0 };
}

/** A knockback has a 50% chance every 10 seconds, so a boar's knockbacks come one every 20 seconds on average. */
export const KNOCKBACK_SECONDS = 10 / 0.5;

/**
 * The equipped beast's skill, once a battle (equipping it is enough; mounting only adds the ride bonuses),
 * or why it doesn't go: wolves after X strike skills (ATK +Y% 10s), boars after X knockbacks (ATK +Y% 30s),
 * bats after X kills (MSPD +Y% 30s), dracos once their stacking skill maxes (boss DMG +Y% 60s).
 * Golems only work in the Rift.
 */
export function beastFightSkill(profile: ProfileV1): { skill: FightSkill | null; beast: (typeof BEASTS.beasts)[number] | null; note: string | null } {
  const beast = BEASTS.beasts.find((b) => b.name === presetBeast(profile)) ?? null;
  const awaken = beast ? profile.beasts[beast.name]?.awaken : null;
  if (!beast || awaken === null || awaken === undefined) return { skill: null, beast: null, note: null };
  const power = (beast.skill.values[awaken] ?? 0) / 100;
  const base = { name: beast.name, element: null, kind: "passive" as const, delay: 0, startAt: 0, freezes: false, bonus: 0, uncharged: true, maxUses: 1 };
  const x = typeof beast.skill.x === "number" ? beast.skill.x : 0;
  switch (beast.family) {
    case "Wolf":
      return { beast, note: null, skill: { ...base, trigger: "attackCasts", every: x, duration: 10, effect: { type: "atk", power } } };
    case "Boar":
      return { beast, note: null, skill: { ...base, trigger: "seconds", startsOnCooldown: true, every: x * KNOCKBACK_SECONDS, duration: 30, effect: { type: "atk", power } } };
    case "Bat":
      return { beast, note: null, skill: { ...base, trigger: "kills", every: x, duration: 30, effect: { type: "mspd", power } } };
    case "Draco":
      return {
        beast,
        note: null,
        skill: { ...base, trigger: "stacksComplete", watch: beast.skill.x === "all buffs" ? "all" : String(beast.skill.x), every: 1, duration: 60, effect: { type: "bossDamage", power } },
      };
    default:
      return { beast, skill: null, note: `${beast.name}: only in the Rift` };
  }
}

/** The fight's input from the stats: hit, element damage, attack speed, life and mana pools. */
export function fightInput(
  sources: StatSources,
  skills: FightSkill[],
  duration: number,
  manual: string[] = [],
  step?: number,
  target: FightTarget = {},
): FightInput {
  const stats = computeStats(sources);
  return {
    attack: stats.attack,
    critChance: stats.critChance,
    critDamage: stats.critDamage,
    deathStrikeChance: stats.deathStrikeChance,
    deathStrikeDamage: stats.deathStrikeDamage,
    extraDamage: stats.elementDamage,
    elementAmp: stats.elementAmp,
    bossDamage: target.bossMonster === false ? stats.monsterDamage : stats.bossDamage,
    ...target,
    attackSpeed: stats.attackSpeed,
    movementSpeed: stats.movementSpeed,
    maxHp: stats.hp,
    hpRecovery: stats.hpRecovery,
    maxMana: stats.mana,
    manaRecovery: stats.manaRecovery,
    skills,
    manual,
    duration,
    step,
  };
}

function fight(sources: StatSources, skills: FightSkill[], duration: number, step?: number, manual: string[] = [], target: FightTarget = {}): FightResult {
  return simulateFight(fightInput(sources, skills, duration, manual, step, target));
}

export type Suggestion = { label: string; detail: string };

const pctText = (fraction: number) => `${formatNumber(fraction * 100, 1)}%`;
const levelText = (level: number) => formatNumber(level);
/** The needed rise as a share: x1.033 (+3.3%). */
const shareText = (ratio: number) => `+${pctText(ratio - 1)}`;

/** The lowest level in [from, to] where `reaches` holds, or null when even `to` falls short. */
function lowestLevel(from: number, to: number, reaches: (level: number) => boolean): number | null {
  if (to < from || !reaches(to)) return null;
  let low = from;
  let high = to;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (reaches(mid)) high = mid;
    else low = mid + 1;
  }
  return low;
}
const atkStat = ENHANCE.find((stat) => stat.name === "ATK");

/**
 * Levers that multiply ATK, so damage scales with them directly: raising the
 * group's total by `ratio` scales every hit by `ratio`. Each says how much
 * more that group needs as a share, and what to level for it where there's
 * one thing to level (the equipped weapon, the equipped class, ATK enhance).
 */
const ATK_GROUPS: {
  label: string;
  group: (s: StatSources) => number;
  describe: (s: StatSources, ratio: number, profile: ProfileV1) => string | null;
}[] = [
  {
    label: "Enhance ATK",
    group: (s) =>
      (s.enhance.atk + s.growth.atk + s.knowledge) * (1 + s.engraving.atk + s.refinement.atk + s.appearance.atk + s.shrine.atk) +
      s.soulWeapon.atk * (1 + s.soulWeapon.engravingAtk + s.shrine.soulWeaponAtk),
    describe: (s, ratio, profile) => {
      const added =
        ((s.enhance.atk + s.growth.atk + s.knowledge) * (1 + s.engraving.atk + s.refinement.atk + s.appearance.atk + s.shrine.atk) +
          s.soulWeapon.atk * (1 + s.soulWeapon.engravingAtk + s.shrine.soulWeaponAtk)) *
        (ratio - 1);
      if (!atkStat) return null;
      const target = s.enhance.atk + added / (1 + s.engraving.atk + s.refinement.atk + s.appearance.atk + s.shrine.atk);
      const max = atkStat.maxLevel ?? 2_200_000;
      if (enhanceStat(atkStat.formula, max).value < target) return null;
      let low = 0;
      let high = max;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (enhanceStat(atkStat.formula, mid).value >= target) high = mid;
        else low = mid + 1;
      }
      return `${shareText(ratio)} base ATK: ATK enhance to about Lv ${levelText(low)} (now Lv ${levelText(profile.character.enhance.ATK ?? 0)})`;
    },
  },
  {
    label: "Weapons",
    group: (s) => 100 + s.weapon.equip + s.weapon.owned,
    describe: (s, ratio, profile) => {
      const grade = equippedKey(profile, "weapons");
      const gear = WEAPONS.find((w) => w.grade === grade);
      if (!gear) return `${shareText(ratio)} weapon effect: no weapon equipped`;
      const need = (100 + s.weapon.equip + s.weapon.owned) * ratio;
      const cap = Math.min(gear.maxLevel, AWAKENING[awakening(profile, "weapons", MAX_AWAKENING)]?.maxLevel ?? gear.maxLevel);
      const now = gearState(profile, "weapons", gear.grade, gear.maxLevel).level;
      const at = (level: number) => {
        const t = gearTotals({ ...profile, weapons: { ...profile.weapons, [gear.grade]: { owned: true, level } } }, "weapons", WEAPONS);
        return 100 + t.equip + t.owned >= need;
      };
      const level = lowestLevel(now + 1, cap, at);
      return level !== null
        ? `${shareText(ratio)} weapon effect: equipped ${gear.grade} weapon from Lv ${levelText(now)} to Lv ${levelText(level)}`
        : `${shareText(ratio)} weapon effect: more than the equipped ${gear.grade} weapon gives at its Lv ${levelText(cap)} cap, so it needs a higher awakening`;
    },
  },
  {
    label: "Classes",
    group: (s) => 100 + s.classes.equip + s.classes.owned,
    describe: (s, ratio, profile) => {
      const c = profile.character;
      const name = c.equippedClass;
      const state = name ? c.classes[name] : undefined;
      if (!name || !state?.owned) return `${shareText(ratio)} class effect: no class equipped`;
      const need = (100 + s.classes.equip + s.classes.owned) * ratio;
      const cap = classLevelCap(c);
      const at = (level: number) => {
        const t = classTotals({ ...c, classes: { ...c.classes, [name]: { ...state, level } } });
        return 100 + t.equip + t.owned >= need;
      };
      const level = lowestLevel(state.level + 1, cap, at);
      return level !== null
        ? `${shareText(ratio)} class effect: ${name} from Lv ${levelText(state.level)} to Lv ${levelText(level)}`
        : `${shareText(ratio)} class effect: more than ${name} gives at its Lv ${levelText(cap)} cap, so it needs Awakened Blast or Constellation levels`;
    },
  },
  {
    label: "Extra ATK",
    group: (s) => 1 + s.relics.atk + s.companionPromotion.atk + s.slayerPromotion.atk + s.mastery.atk + s.companions.blessingOfForest + s.memoryTree.atk + s.constellation.atk,
    describe: (s, ratio) => {
      const group = 1 + s.relics.atk + s.companionPromotion.atk + s.slayerPromotion.atk + s.mastery.atk + s.companions.blessingOfForest + s.memoryTree.atk + s.constellation.atk;
      return `${shareText(ratio)} Extra ATK: +${pctText(group * (ratio - 1))} more Extra ATK (now +${pctText(group - 1)}) from companion or slayer promotion, Skill Mastery, Memory Tree or Constellation`;
    },
  },
  {
    label: "Spirits",
    group: (s) => 1 + s.spirits.atk,
    describe: (s, ratio) => `${shareText(ratio)} spirit ATK: +${pctText((1 + s.spirits.atk) * (ratio - 1))} more from the spirit preset (now +${pctText(s.spirits.atk)}): spirit levels, awakening or Fountain of Circulation`,
  },
  {
    label: "Breakthrough",
    group: (s) => 1 + s.memoryTree.atkMultiplier + s.constellation.promotion,
    describe: (s, ratio) => {
      const group = 1 + s.memoryTree.atkMultiplier + s.constellation.promotion;
      return `${shareText(ratio)} promotion ATK: +${pctText(group * (ratio - 1))} more from Memory Tree breakthrough or completed constellations (now +${pctText(group - 1)})`;
    },
  },
];

/** Hit multipliers that don't scale linearly: solved by re-running the fight. */
const HIT_LEVERS: { label: string; apply: (s: StatSources, x: number) => void; cap: (s: StatSources) => number | null; describe: (x: number) => string }[] = [
  {
    label: "CRIT DMG",
    apply: (s, x) => (s.enhance.critDamage += x),
    cap: () => null,
    describe: (x) => `+${pctText(x)} CRIT DMG (about ${formatNumber(Math.ceil(x / 0.01))} CRIT DMG levels)`,
  },
  {
    label: "CRIT chance",
    apply: (s, x) => (s.enhance.critChance += x),
    cap: (s) => Math.max(0, 1 - s.enhance.critChance),
    describe: (x) => `+${pctText(x)} CRIT chance`,
  },
  {
    label: "Death Strike",
    apply: (s, x) => (s.enhance.deathStrikeDamage += x),
    cap: () => null,
    describe: (x) => `+${pctText(x)} Death Strike damage`,
  },
];

function solveHitLever(
  lever: (typeof HIT_LEVERS)[number],
  base: StatSources,
  skills: FightSkill[],
  duration: number,
  hp: number,
  manual: string[],
  target: FightTarget,
) {
  const beats = (x: number) => {
    const s = structuredClone(base);
    lever.apply(s, x);
    return fight(s, skills, duration, 0.1, manual, target).total >= hp;
  };
  const cap = lever.cap(base);
  let high = cap ?? 1;
  if (cap === null) {
    while (!beats(high)) {
      high *= 16;
      if (high > 1e300) return null;
    }
  } else if (cap <= 0 || !beats(cap)) {
    return null;
  }
  let low = 0;
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    if (beats(mid)) high = mid;
    else low = mid;
  }
  return high;
}

/**
 * Everything a fight needs before it's played: the preset's fight skills, the input and what it's against.
 * Against a boss monster it's the chosen promotion's boss. Otherwise it's the stages: the highest stage
 * whose boss the fight beats (HP-based skills read that boss), and the next stage's boss as the target.
 */
export function promotionFight(profile: ProfileV1, factors: SpiritFactors | null, promotionIndex: number, duration: number, manual: string[] = []) {
  // Skill buffs play out in the fight itself, so the stats come without them.
  const sources = collectSources(profile, factors, false);
  const preset = profile.includeSkills ? presetFightSkills(profile) : { skills: [], skipped: [] };
  // The equipped beast's skill always runs, like the accompanying spirits' skills.
  const beast = beastFightSkill(profile);
  // The familiar use and its specials, always there like the beast.
  const familiar = familiarFightSkills(profile, duration);
  const skills = [...preset.skills, ...(beast.skill ? [beast.skill] : []), ...(familiar.skill ? [familiar.skill, ...familiar.specials] : [])];
  const skipped = [...preset.skipped, ...(beast.note ? [beast.note] : []), ...familiar.notes];
  const spirits = activeSpiritSkills(profile);
  const enemyElement = profile.enemyElement;

  // Stage farming: normal monsters wave after wave, the run ending when the box breaks.
  if (profile.stageFarming.on) {
    const farm = FARM_STAGES[Math.min(FARM_STAGES.length, profile.stageFarming.stage) - 1] ?? FARM_STAGES[0];
    const target: FightTarget = { bossMonster: false, enemyHp: farm.enemyHp, spirits, enemyElement };
    return {
      mode: "farm" as const,
      boss: null,
      stages: null,
      farm,
      beast,
      familiar,
      sources,
      skills,
      skipped,
      spirits,
      target,
      input: { ...fightInput(sources, skills, FARM_SECONDS, manual, undefined, target), farm },
    };
  }

  if (profile.bossMonster) {
    const boss = promotionBoss(promotionIndex);
    const target: FightTarget = { bossMonster: true, enemyHp: boss?.hp ?? 0, spirits, enemyElement };
    return { mode: "promotion" as const, boss, stages: null, farm: null, beast, familiar, sources, skills, skipped, spirits, target, input: fightInput(sources, skills, duration, manual, undefined, target) };
  }

  const against = (stage: number): FightTarget => ({ bossMonster: false, enemyHp: bossHpAt(stage), spirits, enemyElement });
  const clears = (stage: number) => fight(sources, skills, duration, undefined, manual, against(stage)).total >= bossHpAt(stage);
  let reached = 0;
  let high = BOSS_HP.length;
  while (reached < high) {
    const mid = Math.ceil((reached + high) / 2);
    if (clears(mid)) reached = mid;
    else high = mid - 1;
  }
  const next = reached < BOSS_HP.length ? reached + 1 : null;
  const target = against(Math.max(1, reached));
  const boss = next
    ? { name: `Stage ${next}`, stage: next, minStage: next, maxStage: next, hp: bossHpAt(next), minHp: bossHpAt(next), maxHp: bossHpAt(next) }
    : null;
  return {
    mode: "stages" as const,
    boss,
    stages: { reached, next },
    farm: null,
    beast,
    familiar,
    sources,
    skills,
    skipped,
    spirits,
    target,
    input: fightInput(sources, skills, duration, manual, undefined, target),
  };
}

/** After a fight falls short: what alone would close the gap, and the same with skills when they were left out. */
export function promotionSuggestions(
  profile: ProfileV1,
  fightSetup: ReturnType<typeof promotionFight>,
  total: number,
  duration: number,
  manual: string[] = [],
) {
  const { boss, sources, skills, target } = fightSetup;
  let suggestions: Suggestion[] = [];
  let spread: number | null = null;
  let withSkills: number | null = null;
  if (!boss || total <= 0 || total >= boss.hp) return { suggestions, spread, withSkills };
  const ratio = boss.hp / total;
  const atk = ATK_GROUPS.flatMap((lever) => {
    const detail = lever.describe(sources, ratio, profile);
    return detail ? [{ label: lever.label, detail, rank: ratio }] : [];
  });
  const hits = HIT_LEVERS.flatMap((lever) => {
    const x = solveHitLever(lever, sources, skills, duration, boss.hp, manual, target);
    return x === null ? [] : [{ label: lever.label, detail: lever.describe(x), rank: 1 + x }];
  });
  suggestions = [...hits, ...atk]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 4)
    .map(({ label, detail }) => ({ label, detail }));
  spread = Math.pow(ratio, 1 / 5);
  if (!profile.includeSkills) withSkills = fight(sources, [...presetFightSkills(profile).skills, ...fightSetup.skills.filter((s) => s.uncharged || s.familiar)], duration, undefined, [], target).total;
  return { suggestions, spread, withSkills };
}
