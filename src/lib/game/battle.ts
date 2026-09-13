/**
 * An approximate boss fight, hit by hit.
 *
 * - Basic attacks land one per second, faster with ATK SPD buffs.
 * - Attack skills and activated buffs each wait in their own queue once ready
 *   (a cooldown in seconds, or a number of basic-attack hits). Casts in a queue
 *   are 0.3s apart, and every cast pauses basic attacks for its animation.
 * - Passives run on their own: always on, stacking over time, hits or skill
 *   uses, or starting some seconds into the fight.
 * - Rave stops the fight clock for its duration: the damage dealt meanwhile is
 *   stored and Rave adds its share of it. Demon Hunt plays its hits in stopped
 *   time. While the clock is stopped, cooldowns and buff durations don't run.
 * - A buff lasts its duration from when it takes effect; casting it again
 *   refreshes it rather than stacking.
 */

import type { ByElement, Element } from "./stats";

export const ANIMATION_SECONDS = 0.3;

export type SkillEffect =
  /** `growsTo`: one more hit per use, up to this many (Sea Judgment). */
  | { type: "damage"; power: number; hits: number; growsTo?: number }
  | { type: "atk" | "speed"; power: number }
  | { type: "atkStack" | "speedStack"; power: number }
  /** Extra damage for skills of the same element, per stack (Blast Wind). */
  | { type: "elementStack"; power: number }
  | { type: "rave"; power: number }
  /** Cooldowns recharge faster by `power` while it lasts (Breath of Waves). */
  | { type: "cooldownRate"; power: number }
  /** Charges every cooldown by `power` of its length (Meditation). */
  | { type: "chargeCooldowns"; power: number }
  /** The next attack skill of the same element deals +power (Ignition). */
  | { type: "nextSkill"; power: number };

export type FightSkill = {
  name: string;
  element: Element | null;
  kind: "attack" | "buff" | "passive";
  /** What readies it: seconds of cooldown, basic-attack hits, always on, uses of skills of its element, or attack skill casts. */
  trigger: "seconds" | "hits" | "always" | "elementCasts" | "attackCasts";
  every: number;
  /** Seconds a buff lasts. */
  duration: number;
  /** Seconds after the cast before a buff takes effect (Full Moon gathers for 3). */
  delay: number;
  /** Seconds into the fight before it first goes (delayed passives). */
  startAt: number;
  /** Attack played out in stopped time (Demon Hunt). */
  freezes: boolean;
  effect: SkillEffect;
  /** Extra damage this skill deals from other sources (Heart of Fire), as a fraction. */
  bonus: number;
};

export type FightInput = {
  attack: number;
  critChance: number;
  critDamage: number;
  deathStrikeChance: number;
  deathStrikeDamage: number;
  /** Element damage and its amps: an element skill deals x (1 + damage + bonuses) x (1 + amp). */
  extraDamage: ByElement;
  elementAmp?: ByElement;
  /** Extra damage against the boss on every hit (Black Orb). */
  bossDamage?: number;
  skills: FightSkill[];
  duration: number;
  step?: number;
};

export type FightResult = {
  /** Cumulative damage after each hit, by fight-clock time. */
  points: { t: number; damage: number }[];
  casts: { name: string; t: number }[];
  total: number;
  basic: number;
  bySkill: Record<string, number>;
};

/** Expected damage of a hit (DMG Efficiency Data A51): it can crit, death strike, both or neither. */
export function expectedHit(
  attack: number,
  i: Pick<FightInput, "critChance" | "critDamage" | "deathStrikeChance" | "deathStrikeDamage">,
) {
  const c = Math.min(1, Math.max(0, i.critChance));
  const d = Math.min(1, Math.max(0, i.deathStrikeChance));
  return (
    attack * (1 - c) * (1 - d) +
    attack * i.critDamage * i.deathStrikeDamage * c * d +
    attack * i.critDamage * (c - c * d) +
    attack * i.deathStrikeDamage * (d - c * d)
  );
}

type Live = {
  skill: FightSkill;
  /** Seconds of cooldown, hits or skill uses counted toward the next go. */
  progress: number;
  queued: boolean;
  activeFrom: number;
  activeUntil: number;
  stacks: number;
  uses: number;
  started: boolean;
};

const isStack = (skill: FightSkill) =>
  skill.effect.type === "atkStack" || skill.effect.type === "speedStack" || skill.effect.type === "elementStack";

export function simulateFight(input: FightInput): FightResult {
  const step = input.step ?? 0.02;
  // Cooldown skills are ready at the start; stacks and counters start from zero.
  const readyAtStart = (skill: FightSkill) => skill.trigger === "seconds" && !isStack(skill);
  const live: Live[] = input.skills.map((skill) => ({
    skill,
    progress: readyAtStart(skill) ? skill.every : 0,
    queued: false,
    activeFrom: -1,
    activeUntil: -1,
    stacks: 0,
    uses: 0,
    started: skill.startAt <= 0,
  }));
  const queues: Record<"attack" | "buff", Live[]> = { attack: [], buff: [] };
  const queueFreeAt = { attack: 0, buff: 0 }; // real time

  let real = 0;
  let clock = 0;
  let frozenUntil = 0; // real time the clock runs again
  let raveUntil = -1;
  let raveStored = 0;
  let ravePower = 0;
  let nextBasic = 0;
  const nextSkillBonus: Partial<Record<Element, number>> = {};
  let total = 0;
  let basic = 0;
  const bySkill: Record<string, number> = {};
  const points = [{ t: 0, damage: 0 }];
  const casts: { name: string; t: number }[] = [];

  const bonuses = () => {
    let atk = 0;
    let speed = 0;
    let cooldownRate = 0;
    const element: Partial<Record<Element, number>> = {};
    for (const l of live) {
      const e = l.skill.effect;
      if (e.type === "atkStack") atk += e.power * l.stacks;
      if (e.type === "speedStack") speed += e.power * l.stacks;
      if (e.type === "elementStack" && l.skill.element) element[l.skill.element] = (element[l.skill.element] ?? 0) + e.power * l.stacks;
      const on = l.skill.trigger === "always" || (clock >= l.activeFrom && clock < l.activeUntil);
      if (!on) continue;
      if (e.type === "atk") atk += e.power;
      if (e.type === "speed") speed += e.power;
      if (e.type === "cooldownRate") cooldownRate += e.power;
    }
    return { atk, speed, cooldownRate, element };
  };

  const boss = 1 + (input.bossDamage ?? 0);
  const deal = (hit: number, source: string | null) => {
    const amount = hit * boss;
    total += amount;
    if (source) bySkill[source] = (bySkill[source] ?? 0) + amount;
    else basic += amount;
    if (real < raveUntil) raveStored += amount;
    points.push({ t: clock, damage: total });
  };

  const countElementUse = (element: Element, except: Live) => {
    for (const other of live) {
      if (other !== except && other.skill.trigger === "elementCasts" && other.skill.element === element && other.started) other.progress += 1;
    }
  };

  const go = (l: Live, queue: "attack" | "buff" | null) => {
    const s = l.skill;
    const e = s.effect;
    casts.push({ name: s.name, t: clock });
    l.progress = 0;
    l.queued = false;
    l.uses += 1;
    const now = bonuses();
    let animation = queue ? ANIMATION_SECONDS : 0;

    if (e.type === "damage") {
      let bonus = s.bonus + (s.element ? input.extraDamage[s.element] + (now.element[s.element] ?? 0) : 0);
      if (s.element && nextSkillBonus[s.element]) {
        bonus += nextSkillBonus[s.element] ?? 0;
        delete nextSkillBonus[s.element];
      }
      const hits = e.growsTo ? Math.min(e.growsTo, Math.round(e.hits) + l.uses - 1) : e.hits;
      const whole = Math.max(1, Math.round(hits));
      const amp = s.element ? 1 + (input.elementAmp?.[s.element] ?? 0) : 1;
      const perHit = (expectedHit(input.attack * (1 + now.atk), input) * e.power * (1 + bonus) * amp * hits) / whole;
      for (let i = 0; i < whole; i += 1) deal(perHit, s.name);
      if (s.freezes) {
        animation = ANIMATION_SECONDS * whole;
        frozenUntil = Math.max(frozenUntil, real + animation);
      }
      if (s.element && queue) countElementUse(s.element, l);
      // Every attack skill cast counts toward "after X strike skills used", passives included.
      for (const other of live) if (other !== l && other.skill.trigger === "attackCasts" && other.started) other.progress += 1;
    } else if (e.type === "rave") {
      raveUntil = real + Math.max(s.duration, ANIMATION_SECONDS);
      raveStored = 0;
      ravePower = e.power;
      frozenUntil = Math.max(frozenUntil, raveUntil);
    } else if (e.type === "nextSkill") {
      if (s.element) nextSkillBonus[s.element] = e.power;
    } else if (e.type === "chargeCooldowns") {
      for (const other of live) if (other !== l && other.skill.trigger === "seconds" && !isStack(other.skill)) other.progress += e.power * other.skill.every;
    } else if (isStack(s)) {
      l.stacks += 1;
    } else {
      l.activeFrom = clock + s.delay;
      l.activeUntil = clock + s.delay + s.duration;
    }

    if (queue) {
      queueFreeAt[queue] = real + animation;
      // The cast's animation holds back the next basic attack by its length.
      nextBasic = Math.max(nextBasic, real) + animation;
    }
  };

  while (clock < input.duration) {
    const frozen = real < frozenUntil;
    const inRave = real < raveUntil;
    const now = bonuses();

    if (raveUntil >= 0 && !inRave) {
      deal(raveStored * ravePower, "Rave");
      raveUntil = -1;
    }

    for (const l of live) {
      const s = l.skill;
      if (!l.started && clock >= s.startAt) {
        l.started = true;
        if (readyAtStart(s)) l.progress = s.every;
      }
      if (!l.started || s.trigger === "always" || l.queued) continue;
      if (s.trigger === "seconds" && !frozen) l.progress += step * (1 + now.cooldownRate);
      if (l.progress < s.every) continue;
      if (s.kind === "passive") go(l, null);
      else {
        l.queued = true;
        queues[s.kind === "attack" ? "attack" : "buff"].push(l);
      }
    }

    // Skills keep going during Rave's stopped time, but wait out a stopped-time attack.
    const blocked = frozen && !inRave;
    for (const queue of ["buff", "attack"] as const) {
      if (queues[queue].length && real >= queueFreeAt[queue] && !blocked) go(queues[queue].shift()!, queue);
    }

    if (real >= nextBasic && !blocked) {
      deal(expectedHit(input.attack * (1 + now.atk), input), null);
      nextBasic = real + 1 / (1 + now.speed);
      for (const l of live) if (l.skill.trigger === "hits" && l.started && !l.queued) l.progress += 1;
    }

    real += step;
    if (real >= frozenUntil) clock = Math.min(input.duration, clock + step);
  }

  return { points, casts, total, basic, bySkill };
}

export type SkillStone = { grade: "A" | "B"; element: Element };
export type SkillStoneSet = { cooldown: SkillStone | null; time: SkillStone | null; heat: SkillStone | null };

/** Type A stones give 4%, type B 7%. */
export const stoneAmount = (stone: SkillStone | null, element: Element | null) =>
  stone && element && stone.element === element ? (stone.grade === "B" ? 0.07 : 0.04) : 0;

/** Skill stones: cooldown down, duration up, required hits down, for skills of the stone's element. */
export function withStones(skill: FightSkill, stones: SkillStoneSet): FightSkill {
  const every =
    skill.trigger === "seconds"
      ? skill.every * (1 - stoneAmount(stones.cooldown, skill.element))
      : skill.trigger === "hits"
        ? Math.max(1, Math.round(skill.every * (1 - stoneAmount(stones.heat, skill.element))))
        : skill.every;
  return { ...skill, every, duration: skill.duration * (1 + stoneAmount(stones.time, skill.element)) };
}
