import characterData from "@/data/optimizer/character.json";
import promotionBossData from "@/data/optimizer/promotion-bosses.json";
import { ANIMATION_SECONDS, simulateFight, withStones, type FightInput, type FightResult, type FightSkill, type SkillEffect } from "@/lib/game/battle";
import { enhanceStat, type EnhanceStat } from "@/lib/game/character";
import { skillPower } from "@/lib/game/formulas";
import { refinementEffects } from "@/lib/game/refinement";
import { shrineEffects } from "@/lib/game/shrine";
import { computeStats, ELEMENTS, type Element, type StatSources } from "@/lib/game/stats";
import { activeSkillStones, effectiveSkillLevel, masteryLevel, mountedBeast } from "@/lib/profile/rules";
import type { ProfileV1 } from "@/lib/profile/types";
import { MASTERY_PAGES, SKILL_BY_NAME, type Skill } from "./data";
import type { SpiritFactors } from "./spirit-stats";
import { BEASTS, collectSources, companionSkill, SHRINE } from "./stat-sources";

type PromotionStage = { name: string; stage: number; range: number };
export const PROMOTION_STAGES = promotionBossData.promotions as PromotionStage[];
const BOSS_HP = promotionBossData.bossHp as number[];
const ENHANCE = characterData.enhance as unknown as EnhanceStat[];

export const FIGHT_SECONDS = 60;

const bossHpAt = (stage: number) => BOSS_HP[Math.min(BOSS_HP.length, Math.max(1, Math.round(stage))) - 1] ?? 0;

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
  return match ? Number(match[1]) : null;
};

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

/** A preset skill as a fight skill, or the reason it's left out. */
function toFightSkill(profile: ProfileV1, skill: SkillWithMechanics, preset: SkillWithMechanics[]): FightSkill | string {
  const m = skill.mechanics;
  const level = effectiveSkillLevel(profile, skill.name, skill.maxLevel);
  if (level < 1) return `${skill.name} (not learned)`;
  if (!m || skill.baseValue === null || skill.upgradeValue === null) return skill.name;
  const power = (skillPower(skill.baseValue, skill.upgradeValue, level) ?? 0) / 100;
  const text = skill.description.specific ?? "";
  const element = (ELEMENTS as readonly string[]).includes(skill.element ?? "") ? (skill.element as Element) : null;
  const refined = refinementEffects(profile.skillRefinement[skill.name] ?? []);
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
  // Wrath of Gods starts on its cooldown, goes when it comes round and restarts it straight away.
  if (skill.name === "Wrath of Gods") return make({ type: "atk", power }, { kind: "passive", trigger: "seconds", startAt: 0, startsOnCooldown: true });
  if (skill.name === "Heaven's Punishment") return make({ type: "damage", power, hits: 1 }, { kind: "attack", startAt: 6 });
  if (skill.name === "Sea Judgment")
    return make({ type: "damage", power, hits: 1, growsTo: 7 }, { kind: "passive", trigger: "elementCasts", every: m.additional[0] || 3 });
  if (skill.name === "Blast Wind") return make({ type: "elementStack", power }, { kind: "passive", trigger: "elementCasts", every: 5 });
  if (skill.name === "Rage") return make({ type: "rage", power }, { kind: "buff" });
  // Mana's Blessing raises Mana Recovery for the whole fight, as in the Stats Summary.
  if (skill.name === "Mana's Blessing") return make({ type: "manaRecovery", power }, { kind: "passive", trigger: "always" });
  if (skill.name === "Life Mana")
    return make({ type: "restore", hp: power, mana: (num(/(\d+)% recovery of mana/i, text) ?? 30) / 100 }, { kind: "buff" });
  if (skill.name === "Lightning Body")
    return make({ type: "speed", power }, { kind: "buff", hpCost: (num(/(\d+)% of current HP/i, text) ?? 50) / 100 });

  if (m.type === "attack") {
    if (!/X%.{0,20}(damage|DMG)|X% of (their )?ATK|(damage|DMG) X%/i.test(text) || /copy the last|frozen|Y%/i.test(text)) return skill.name;
    const hits = m.hits?.mastery && nodeDone(profile, m.hits.mastery.node) ? m.hits.mastery.hits : (m.hits?.base ?? 1);
    const amp = m.masteryDamage.reduce((product, node) => product * (nodeDone(profile, node.node) ? node.multiplier : 1), 1);
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
    let extraAmp = 1;
    let mpCost = base.mpCost ?? 0;
    let animation: number | undefined;
    let freezes = base.freezes;
    for (const extra of extras) {
      extraAmp *= extra.multiplier ?? 1;
      mpCost = Math.max(0, mpCost + (extra.manaCost ?? 0));
      if (extra.animation) animation = ANIMATION_SECONDS * extra.animation;
      if (extra.stopsTime) freezes = true;
      if (extra.strikes && base.trigger === "hits") every = Math.max(1, every + extra.strikes);
      if (extra.cooldown && base.trigger === "seconds") every = Math.max(0.1, every + extra.cooldown);
    }
    return make(
      { type: "damage", power: power * amp * extraAmp, hits },
      { bonus: bonus + refined.damage + shrine + wisdom, every, mpCost, animation, freezes },
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

  // The mounted beast's skill: wolves raise ATK after a number of attack skill casts.
  const beast = BEASTS.beasts.find((b) => b.name === mountedBeast(profile));
  const awaken = beast ? profile.beasts[beast.name]?.awaken : null;
  if (beast && awaken !== null && awaken !== undefined) {
    if (beast.family === "Wolf" && typeof beast.skill.x === "number") {
      skills.push({
        name: beast.name,
        element: null,
        kind: "passive",
        trigger: "attackCasts",
        every: beast.skill.x,
        duration: 10,
        delay: 0,
        startAt: 0,
        freezes: false,
        bonus: 0,
        effect: { type: "atk", power: (beast.skill.values[awaken] ?? 0) / 100 },
      });
    } else {
      skipped.push(`${beast.name} (mounted skill not modelled)`);
    }
  }
  return { skills, skipped };
}

/** The fight's input from the stats: hit, element damage, attack speed, life and mana pools. */
export function fightInput(sources: StatSources, skills: FightSkill[], duration: number, manual: string[] = [], step?: number): FightInput {
  const stats = computeStats(sources);
  return {
    attack: stats.attack,
    critChance: stats.critChance,
    critDamage: stats.critDamage,
    deathStrikeChance: stats.deathStrikeChance,
    deathStrikeDamage: stats.deathStrikeDamage,
    extraDamage: stats.elementDamage,
    elementAmp: stats.elementAmp,
    bossDamage: stats.bossDamage,
    attackSpeed: stats.attackSpeed,
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

function fight(sources: StatSources, skills: FightSkill[], duration: number, step?: number, manual: string[] = []): FightResult {
  return simulateFight(fightInput(sources, skills, duration, manual, step));
}

export type Suggestion = { label: string; detail: string };

const pctText = (fraction: number) => `${(fraction * 100).toLocaleString("en", { maximumFractionDigits: 1 })}%`;
const atkStat = ENHANCE.find((stat) => stat.name === "ATK");

/**
 * Levers that multiply ATK, so damage scales with them directly: raising the
 * group's total by `ratio` scales every hit by `ratio`.
 */
const ATK_GROUPS: { label: string; group: (s: StatSources) => number; describe: (s: StatSources, added: number) => string | null }[] = [
  {
    label: "Enhance ATK",
    group: (s) =>
      (s.enhance.atk + s.growth.atk + s.knowledge) * (1 + s.engraving.atk + s.refinement.atk + s.appearance.atk + s.shrine.atk) +
      s.soulWeapon.atk * (1 + s.shrine.soulWeaponAtk),
    describe: (s, added) => {
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
      return `ATK enhance to about Lv ${low.toLocaleString("en")}`;
    },
  },
  {
    label: "Weapons",
    group: (s) => 100 + s.weapon.equip + s.weapon.owned,
    describe: (_, added) => `+${added.toLocaleString("en", { maximumFractionDigits: 0 })}% weapon equip/owned effect (levels, awakening)`,
  },
  {
    label: "Classes",
    group: (s) => 100 + s.classes.equip + s.classes.owned,
    describe: (_, added) => `+${added.toLocaleString("en", { maximumFractionDigits: 0 })}% class equip/owned effect`,
  },
  {
    label: "Extra ATK",
    group: (s) => 1 + s.relics.atk + s.companionPromotion.atk + s.slayerPromotion.atk + s.mastery.atk + s.companions.blessingOfForest + s.memoryTree.atk + s.constellation.atk,
    describe: (_, added) => `+${pctText(added)} Extra ATK (companion/slayer promotion, Strength Gloves, mastery, Memory Tree, Constellation)`,
  },
  {
    label: "Spirits",
    group: (s) => 1 + s.spirits.atk,
    describe: (_, added) => `+${pctText(added)} ATK from the spirit preset (awakening, levels, main 6)`,
  },
  {
    label: "Breakthrough",
    group: (s) => 1 + s.memoryTree.atkMultiplier + s.constellation.promotion,
    describe: (_, added) => `+${pctText(added)} Memory Tree grade / Constellation completion ATK`,
  },
];

/** Hit multipliers that don't scale linearly: solved by re-running the fight. */
const HIT_LEVERS: { label: string; apply: (s: StatSources, x: number) => void; cap: (s: StatSources) => number | null; describe: (x: number) => string }[] = [
  {
    label: "CRIT DMG",
    apply: (s, x) => (s.enhance.critDamage += x),
    cap: () => null,
    describe: (x) => `+${pctText(x)} CRIT DMG (about ${Math.ceil(x / 0.01).toLocaleString("en")} CRIT DMG levels)`,
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

function solveHitLever(lever: (typeof HIT_LEVERS)[number], base: StatSources, skills: FightSkill[], duration: number, hp: number, manual: string[]) {
  const beats = (x: number) => {
    const s = structuredClone(base);
    lever.apply(s, x);
    return fight(s, skills, duration, 0.1, manual).total >= hp;
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

/** Everything a fight needs before it's played: the boss, the preset's fight skills and the input. */
export function promotionFight(profile: ProfileV1, factors: SpiritFactors | null, promotionIndex: number, duration: number, manual: string[] = []) {
  const boss = promotionBoss(promotionIndex);
  // Skill buffs play out in the fight itself, so the stats come without them.
  const sources = collectSources(profile, factors, false);
  const { skills, skipped } = profile.includeSkills ? presetFightSkills(profile) : { skills: [], skipped: [] };
  return { boss, sources, skills, skipped, input: fightInput(sources, skills, duration, manual) };
}

/** After a fight falls short: what alone would close the gap, and the same with skills when they were left out. */
export function promotionSuggestions(
  profile: ProfileV1,
  fightSetup: ReturnType<typeof promotionFight>,
  total: number,
  duration: number,
  manual: string[] = [],
) {
  const { boss, sources, skills } = fightSetup;
  let suggestions: Suggestion[] = [];
  let spread: number | null = null;
  let withSkills: number | null = null;
  if (!boss || total <= 0 || total >= boss.hp) return { suggestions, spread, withSkills };
  const ratio = boss.hp / total;
  const atk = ATK_GROUPS.flatMap((lever) => {
    const group = lever.group(sources);
    const detail = lever.describe(sources, group * (ratio - 1));
    return detail ? [{ label: lever.label, detail, rank: ratio }] : [];
  });
  const hits = HIT_LEVERS.flatMap((lever) => {
    const x = solveHitLever(lever, sources, skills, duration, boss.hp, manual);
    return x === null ? [] : [{ label: lever.label, detail: lever.describe(x), rank: 1 + x }];
  });
  suggestions = [...hits, ...atk]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 4)
    .map(({ label, detail }) => ({ label, detail }));
  spread = Math.pow(ratio, 1 / 5);
  if (!profile.includeSkills) withSkills = fight(sources, presetFightSkills(profile).skills, duration).total;
  return { suggestions, spread, withSkills };
}
