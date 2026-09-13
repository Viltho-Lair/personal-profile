import characterData from "@/data/optimizer/character.json";
import promotionBossData from "@/data/optimizer/promotion-bosses.json";
import { simulateBattle, withStones, type BattleSkill, type BattleResult, type SkillEffect } from "@/lib/game/battle";
import { enhanceStat, type EnhanceStat } from "@/lib/game/character";
import { skillPower } from "@/lib/game/formulas";
import { computeStats, ELEMENTS, type Element, type StatSources } from "@/lib/game/stats";
import { activeSkillStones, effectiveSkillLevel } from "@/lib/profile/rules";
import type { ProfileV1 } from "@/lib/profile/types";
import { SKILL_BY_NAME } from "./data";
import type { SpiritFactors } from "./spirit-stats";
import { collectSources } from "./stat-sources";

type PromotionStage = { name: string; stage: number; range: number };
export const PROMOTION_STAGES = promotionBossData.promotions as PromotionStage[];
const BOSS_HP = promotionBossData.bossHp as number[];
const ENHANCE = characterData.enhance as unknown as EnhanceStat[];

const bossHpAt = (stage: number) => BOSS_HP[Math.min(BOSS_HP.length, Math.max(1, Math.round(stage))) - 1] ?? 0;

/** A promotion's boss: its recommended stage's boss HP, with the stages either side of the range. */
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

const num = (pattern: RegExp, text: string) => {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
};

/** How a skill's effect plays out in a fight, read from its description; null when it isn't modelled. */
function skillEffect(text: string, power: number): SkillEffect | null {
  const startAt = num(/after (\d+) seconds into battle/i, text) ?? 0;
  const duration = num(/for (\d+) ?sec/i, text);
  if (/additional damage of X% of the damage done/i.test(text)) return { kind: "damageAmp", power, duration: duration ?? 5 };
  const speedEvery = num(/ATK SPD \+X% every (\d+) seconds/i, text);
  if (speedEvery) return { kind: "speedStack", power, every: speedEvery, per: "seconds" };
  const speedAttacks = num(/ATK SPD \+X% for every (\d+) attacks/i, text);
  if (speedAttacks) return { kind: "speedStack", power, every: speedAttacks, per: "attacks" };
  const atkEvery = num(/total ATK \+X% every (\d+) seconds/i, text);
  if (atkEvery) return { kind: "atkStack", power, every: atkEvery, per: "seconds" };
  const atkAttacks = num(/total ATK \+X% for every (\d+) attacks/i, text);
  if (atkAttacks) return { kind: "atkStack", power, every: atkAttacks, per: "attacks" };
  if (/ATK SPD|total ATK/i.test(text)) {
    if (/per |reviv|as HP decreases|MSPD/i.test(text)) return null;
    if (/ATK SPD (by )?\+?X%/i.test(text)) return { kind: "speedBuff", power, duration, startAt };
    if (/total ATK (\+|increases by )X%/i.test(text)) return { kind: "atkBuff", power, duration, startAt };
  }
  // Damage that waits on other skills, conditions or copies isn't modelled.
  if (/frozen|next .*skill|copy the last|once \d+ .*skills are equipped|per every|after using|Y%/i.test(text)) return null;
  if (/X% damage of ATK per second/i.test(text)) return { kind: "damage", power, hits: Math.max(1, duration ?? 1) };
  if (/X%.{0,20}(damage|DMG)|X% of (their )?ATK|(damage|DMG) X%/i.test(text)) {
    const hits =
      num(/(\d+) consecutive attacks/i, text) ??
      num(/attacks?\b[^.]*?(\d+) times?\b/i, text) ??
      num(/summon (\d+) lightning/i, text) ??
      num(/cast (\d+)/i, text) ??
      1;
    return { kind: "damage", power, hits };
  }
  return null;
}

/** The active skill preset as fight skills, with the active skill stones applied. */
export function presetBattleSkills(profile: ProfileV1) {
  const stones = activeSkillStones(profile);
  const skills: BattleSkill[] = [];
  const skipped: string[] = [];
  for (const name of profile.skillPresets[profile.activeSkillPreset] ?? []) {
    const skill = name ? SKILL_BY_NAME.get(name) : undefined;
    if (!skill) continue;
    const level = effectiveSkillLevel(profile, skill.name, skill.maxLevel);
    const power = skill.baseValue !== null && skill.upgradeValue !== null ? skillPower(skill.baseValue, skill.upgradeValue, level) : null;
    const effect = power !== null ? skillEffect(skill.description.specific ?? "", power / 100) : null;
    if (!effect) {
      skipped.push(level < 1 ? `${skill.name} (not learned)` : skill.name);
      continue;
    }
    const element = (ELEMENTS as readonly string[]).includes(skill.element ?? "") ? (skill.element as Element) : null;
    skills.push(withStones({ name: skill.name, element, cooldown: skill.cooldown || 10, effect }, stones));
  }
  return { skills, skipped };
}

function fight(sources: StatSources, skills: BattleSkill[], duration: number, step?: number): BattleResult {
  const stats = computeStats(sources);
  return simulateBattle({
    attack: stats.attack,
    critChance: stats.critChance,
    critDamage: stats.critDamage,
    deathStrikeChance: stats.deathStrikeChance,
    deathStrikeDamage: stats.deathStrikeDamage,
    extraDamage: stats.extraDamage,
    skills,
    duration,
    step,
  });
}

export type Suggestion = { label: string; detail: string };

type Lever = {
  label: string;
  apply: (s: StatSources, x: number) => void;
  /** Largest sensible increase, or null for no cap. */
  cap: (s: StatSources) => number | null;
  /** How big the increase is next to what's there now, for ranking. */
  relative: (s: StatSources, x: number) => number;
  describe: (s: StatSources, x: number) => string | null;
};

const pctText = (fraction: number) => `${(fraction * 100).toLocaleString("en", { maximumFractionDigits: 1 })}%`;
const atkStat = ENHANCE.find((stat) => stat.name === "ATK");

const LEVERS: Lever[] = [
  {
    label: "Enhance ATK",
    apply: (s, x) => (s.enhance.atk += x),
    cap: () => null,
    relative: (s, x) => (s.enhance.atk + s.growth.atk + s.knowledge + x) / Math.max(1, s.enhance.atk + s.growth.atk + s.knowledge),
    describe: (s, x) => {
      if (!atkStat) return null;
      const target = s.enhance.atk + x;
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
    label: "CRIT DMG",
    apply: (s, x) => (s.enhance.critDamage += x),
    cap: () => null,
    relative: (s, x) => 1 + x / Math.max(0.01, 1 + s.enhance.critDamage),
    describe: (_, x) => `+${pctText(x)} CRIT DMG (about ${Math.ceil(x / 0.01).toLocaleString("en")} CRIT DMG levels)`,
  },
  {
    label: "CRIT chance",
    apply: (s, x) => (s.enhance.critChance += x),
    cap: (s) => Math.max(0, 1 - s.enhance.critChance),
    relative: (s, x) => (s.enhance.critChance + x) / Math.max(0.01, s.enhance.critChance),
    describe: (_, x) => `+${pctText(x)} CRIT chance`,
  },
  {
    label: "Death Strike",
    apply: (s, x) => (s.enhance.deathStrikeDamage += x),
    cap: () => null,
    relative: (s, x) => 1 + x / Math.max(0.01, 1 + s.enhance.deathStrikeDamage),
    describe: (_, x) => `+${pctText(x)} Death Strike damage`,
  },
  {
    label: "Weapons",
    apply: (s, x) => (s.weapon.owned += x),
    cap: () => null,
    relative: (s, x) => (100 + s.weapon.equip + s.weapon.owned + x) / (100 + s.weapon.equip + s.weapon.owned),
    describe: (_, x) => `+${x.toLocaleString("en", { maximumFractionDigits: 0 })}% weapon equip/owned effect (levels, awakening)`,
  },
  {
    label: "Classes",
    apply: (s, x) => (s.classes.owned += x),
    cap: () => null,
    relative: (s, x) => (100 + s.classes.equip + s.classes.owned + x) / (100 + s.classes.equip + s.classes.owned),
    describe: (_, x) => `+${x.toLocaleString("en", { maximumFractionDigits: 0 })}% class equip/owned effect`,
  },
  {
    label: "Extra ATK",
    apply: (s, x) => (s.companionPromotion.atk += x),
    cap: () => null,
    relative: (s, x) => 1 + x / (1 + s.companionPromotion.atk + s.slayerPromotion.atk + s.relics.atk + s.mastery.atk + s.memoryTree.atk + s.constellation.atk),
    describe: (_, x) => `+${pctText(x)} Extra ATK (companion/slayer promotion, Strength Gloves, mastery, Memory Tree, Constellation)`,
  },
  {
    label: "Spirits",
    apply: (s, x) => (s.spirits.atk += x),
    cap: () => null,
    relative: (s, x) => 1 + x / (1 + s.spirits.atk),
    describe: (_, x) => `+${pctText(x)} ATK from the spirit preset (awakening, levels, main 6)`,
  },
  {
    label: "Breakthrough",
    apply: (s, x) => (s.memoryTree.atkMultiplier += x),
    cap: () => null,
    relative: (s, x) => 1 + x / (1 + s.memoryTree.atkMultiplier + s.constellation.promotion),
    describe: (_, x) => `+${pctText(x)} Memory Tree grade / Constellation completion ATK`,
  },
];

/** The smallest increase of one lever that beats `hp`, found by doubling then halving. */
function solve(lever: Lever, base: StatSources, skills: BattleSkill[], duration: number, hp: number) {
  const beats = (x: number) => {
    const s = structuredClone(base);
    lever.apply(s, x);
    return fight(s, skills, duration, 0.5).total >= hp;
  };
  const cap = lever.cap(base);
  let high = cap ?? 1;
  if (cap === null) {
    while (!beats(high)) {
      high *= 4;
      if (high > 1e300) return null;
    }
  } else if (cap <= 0 || !beats(cap)) {
    return null;
  }
  let low = 0;
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    if (beats(mid)) high = mid;
    else low = mid;
  }
  return high;
}

export function promotionFight(profile: ProfileV1, factors: SpiritFactors | null, promotionIndex: number, duration: number) {
  const boss = promotionBoss(promotionIndex);
  const includeSkills = profile.includeSkills;
  const sources = collectSources(profile, factors, includeSkills);
  const { skills, skipped } = includeSkills ? presetBattleSkills(profile) : { skills: [], skipped: [] };
  const result = fight(sources, skills, duration);
  if (!boss) return { boss, result, skills, skipped, suggestions: [], withSkills: null };

  let suggestions: Suggestion[] = [];
  let withSkills: number | null = null;
  if (result.total < boss.hp) {
    suggestions = LEVERS.flatMap((lever) => {
      const x = solve(lever, sources, skills, duration, boss.hp);
      const detail = x === null ? null : lever.describe(sources, x);
      return x === null || !detail ? [] : [{ lever, x, detail, rank: lever.relative(sources, x) }];
    })
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map(({ lever, detail }) => ({ label: lever.label, detail }));
    if (!includeSkills) {
      const preset = presetBattleSkills(profile);
      withSkills = fight(collectSources(profile, factors, true), preset.skills, duration).total;
    }
  }
  return { boss, result, skills, skipped, suggestions, withSkills };
}
