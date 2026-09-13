/**
 * An approximate boss fight: cumulative damage over time from basic attacks
 * and, when included, the skill preset. It assumes one basic attack per
 * second (raised by ATK SPD buffs), skills cast on cooldown from the start,
 * no mana limits and no player timing.
 */

import type { ByElement, Element } from "./stats";

export type SkillEffect =
  | { kind: "damage"; power: number; hits: number }
  | { kind: "atkBuff"; power: number; duration: number | null; startAt: number }
  | { kind: "atkStack"; power: number; every: number; per: "seconds" | "attacks" }
  | { kind: "speedBuff"; power: number; duration: number | null; startAt: number }
  | { kind: "speedStack"; power: number; every: number; per: "seconds" | "attacks" }
  | { kind: "damageAmp"; power: number; duration: number };

export type BattleSkill = { name: string; element: Element | null; cooldown: number; effect: SkillEffect };

export type BattleInput = {
  attack: number;
  critChance: number;
  /** Total CRIT DMG multiplier (1.01 = 101%). */
  critDamage: number;
  deathStrikeChance: number;
  /** Death Strike multiplier (1.01 = 101%). */
  deathStrikeDamage: number;
  extraDamage: ByElement;
  skills: BattleSkill[];
  duration: number;
  step?: number;
};

export type BattleResult = {
  /** Cumulative damage at each whole second, starting at 0. */
  points: { t: number; damage: number }[];
  total: number;
  basic: number;
  bySkill: Record<string, number>;
};

/**
 * Expected damage per hit for a given ATK (DMG Efficiency Data A51): a hit can
 * crit, death strike, both, or neither.
 */
export function expectedHit(attack: number, i: Pick<BattleInput, "critChance" | "critDamage" | "deathStrikeChance" | "deathStrikeDamage">) {
  const c = Math.min(1, Math.max(0, i.critChance));
  const d = Math.min(1, Math.max(0, i.deathStrikeChance));
  return (
    attack * (1 - c) * (1 - d) +
    attack * i.critDamage * i.deathStrikeDamage * c * d +
    attack * i.critDamage * (c - c * d) +
    attack * i.deathStrikeDamage * (d - c * d)
  );
}

/** Whether a repeating window (from `startAt`, every `cooldown`, lasting `duration`) covers time t. */
function windowActive(t: number, startAt: number, cooldown: number, duration: number | null) {
  if (t < startAt) return false;
  if (duration === null) return true;
  const period = Math.max(cooldown, duration);
  return (t - startAt) % period < duration;
}

export function simulateBattle(input: BattleInput): BattleResult {
  const step = input.step ?? 0.1;
  const steps = Math.round(input.duration / step);
  const bySkill: Record<string, number> = {};
  const nextCast = new Map<string, number>();
  let total = 0;
  let basic = 0;
  let attacks = 0;
  const points = [{ t: 0, damage: 0 }];

  for (let i = 0; i < steps; i += 1) {
    const t = i * step;
    let atk = 1;
    let speed = 0;
    let amp = 0;
    for (const skill of input.skills) {
      const e = skill.effect;
      if (e.kind === "atkBuff" && windowActive(t, e.startAt, skill.cooldown, e.duration)) atk += e.power;
      if (e.kind === "speedBuff" && windowActive(t, e.startAt, skill.cooldown, e.duration)) speed += e.power;
      if (e.kind === "damageAmp" && windowActive(t, 0, skill.cooldown, e.duration)) amp += e.power;
      if (e.kind === "atkStack" || e.kind === "speedStack") {
        const stacks = Math.floor((e.per === "seconds" ? t : attacks) / Math.max(e.every, step));
        if (e.kind === "atkStack") atk += e.power * stacks;
        else speed += e.power * stacks;
      }
    }

    const hit = expectedHit(input.attack * atk, input) * (1 + amp);
    const rate = 1 + speed;
    const basicDamage = hit * rate * step;
    basic += basicDamage;
    total += basicDamage;
    attacks += rate * step;

    for (const skill of input.skills) {
      if (skill.effect.kind !== "damage") continue;
      const due = nextCast.get(skill.name) ?? 0;
      if (t + 1e-9 < due) continue;
      const damage = hit * skill.effect.power * skill.effect.hits * (1 + (skill.element ? input.extraDamage[skill.element] : 0));
      bySkill[skill.name] = (bySkill[skill.name] ?? 0) + damage;
      total += damage;
      nextCast.set(skill.name, due + Math.max(skill.cooldown, step));
    }

    if (Math.round((t + step) * 1e6) % 1e6 === 0 || i === steps - 1) points.push({ t: Math.round(t + step), damage: total });
  }
  return { points, total, basic, bySkill };
}

export type SkillStone = { grade: "A" | "B"; element: Element };
export type SkillStoneSet = { cooldown: SkillStone | null; time: SkillStone | null; heat: SkillStone | null };

/** Type A stones give 4%, type B 7%. */
export const stoneAmount = (stone: SkillStone | null, element: Element | null) =>
  stone && element && stone.element === element ? (stone.grade === "B" ? 0.07 : 0.04) : 0;

/** Applies the skill stones to a skill: cooldown down, duration up, required attacks down. */
export function withStones(skill: BattleSkill, stones: SkillStoneSet): BattleSkill {
  const cooldown = skill.cooldown * (1 - stoneAmount(stones.cooldown, skill.element));
  const longer = 1 + stoneAmount(stones.time, skill.element);
  const fewerAttacks = 1 - stoneAmount(stones.heat, skill.element);
  const e = skill.effect;
  let effect: SkillEffect = e;
  if ((e.kind === "atkBuff" || e.kind === "speedBuff") && e.duration !== null) effect = { ...e, duration: e.duration * longer };
  if (e.kind === "damageAmp") effect = { ...e, duration: e.duration * longer };
  if ((e.kind === "atkStack" || e.kind === "speedStack") && e.per === "attacks") effect = { ...e, every: e.every * fewerAttacks };
  return { ...skill, cooldown, effect };
}
