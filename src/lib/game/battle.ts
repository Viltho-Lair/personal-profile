/**
 * An approximate boss fight, hit by hit, that can be played out in real time.
 *
 * - Basic attacks land at the attack speed: one a second (the workbook has no
 *   base attack speed), raised by the Bracelet of Speed and ATK SPD buffs.
 * - Attack skills and activated buffs each wait in their own queue once ready
 *   (a cooldown in seconds, or a number of basic-attack hits) and cast when
 *   there's mana for them. Every one of them is ready at the start: its first
 *   use comes before its first cooldown or strike count. Casts don't wait for each other, and every cast
 *   pauses basic attacks for its animation. Skills with auto off wait for a
 *   manual cast once ready.
 * - Life and mana pools refill every second by HP Recovery and Mana Recovery.
 *   Lightning Body spends half of the current life; Rage adds ATK for each
 *   percent of life missing and stops HP recovery while it lasts.
 * - Passives run on their own: always on, stacking over time or hits up to
 *   their stages (then they're complete), skill uses, or starting later.
 * - Rave stores the damage skills and basic attacks deal for its duration (5
 *   seconds) while the fight carries on. It can then be used again to unleash
 *   its share of that damage (110% at level 5) as it is, with no multipliers on
 *   top, played out in stopped time, and only then does its cooldown start.
 * - Meditation charges every skill with a cooldown, attacks and buffs alike;
 *   skills that go on a condition (strikes, skill uses) aren't charged.
 * - Demon Hunt plays its hits in stopped time. While the clock is stopped,
 *   cooldowns, buffs and recovery don't run.
 * - A buff lasts its duration from when it takes effect; casting it again
 *   refreshes it rather than stacking.
 * - Spirit skills of the accompanying spirits: Last Fight multiplies the last
 *   seconds' damage, Breath of Fire takes a share of the enemy's remaining HP,
 *   Wilderness Roar / Reign raise skill damage against bosses / normal
 *   monsters, Judge's Torpedo and Thief Wind only work on normal monsters,
 *   Leveling adds damage while the enemy is above 70% HP, Wind Force recovers
 *   cooldowns, and Time Freeze stops the battle timer while the fight goes on.
 */

import { HIGH_HP_THRESHOLD, type SpiritSkillEffects } from "./spirit-skills";
import type { ByElement, Element } from "./stats";

export const ANIMATION_SECONDS = 0.3;
export const DEFAULT_STEP = 0.02;

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
  /** Charges every cooldown and required-strike count by `power` of its length (Meditation). */
  | { type: "chargeCooldowns"; power: number }
  /** The next attack skill of the same element deals +power (Ignition). */
  | { type: "nextSkill"; power: number }
  /** Total ATK +power for each percent of life missing, no HP recovery while it lasts (Rage). */
  | { type: "rage"; power: number }
  /** Mana Recovery +power while it's on (Mana's Blessing). */
  | { type: "manaRecovery"; power: number }
  /** Restores these shares of max life and max mana at once (Life Mana). */
  | { type: "restore"; hp: number; mana: number };

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
  /** Starts on its cooldown instead of ready, then goes each time it comes round; Meditation only charges it after the first (Wrath of Gods). */
  startsOnCooldown?: boolean;
  /** Length of that first cooldown when it differs from the rest (Wrath of Gods: 20s, then 30s). */
  firstEvery?: number;
  /** Attack played out in stopped time (Demon Hunt). */
  freezes: boolean;
  effect: SkillEffect;
  /** Extra damage this skill deals from other sources (Heart of Fire), as a fraction. */
  bonus: number;
  /** Mana spent per cast. */
  mpCost?: number;
  /** Share of the current life spent per cast (Lightning Body 0.5); negative heals that share (Breath of Waves -0.5). */
  hpCost?: number;
  /** Stages a stacking passive completes; it stops once they're all done. */
  maxStacks?: number | null;
  /** Seconds its cast animation lasts, per hit for stopped-time attacks (0.3 when not set). */
  animation?: number;
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
  /** Extra damage against the enemy on every hit (Black Orb boss or monster damage). */
  bossDamage?: number;
  /** A boss monster (the default) or a normal monster. */
  bossMonster?: boolean;
  /** The enemy's HP, read by spirit skills (remaining HP share, execute, first strike, above 70%). */
  enemyHp?: number;
  /** Spirit skills of the accompanying spirits. */
  spirits?: SpiritSkillEffects;
  /** Basic attacks a second before ATK SPD buffs (1 plus the Bracelet of Speed). */
  attackSpeed?: number;
  /** Life and mana pools and what they refill each second; no pools means skills cost nothing. */
  maxHp?: number;
  hpRecovery?: number;
  maxMana?: number;
  manaRecovery?: number;
  skills: FightSkill[];
  /** Skills with auto off, by name: they wait for `cast` once ready. */
  manual?: string[];
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

export type SkillStatus = {
  name: string;
  /** How far toward ready, 0..1. */
  ready: number;
  queued: boolean;
  active: boolean;
  stacks: number;
  complete: boolean;
  manual: boolean;
  /** Real time of the latest cast, -1 before the first. */
  lastCast: number;
  uses: number;
  /** Rave's stored damage is waiting to be released by pressing it again. */
  charged: boolean;
  /** Damage waiting in that release. */
  stored: number;
  /** Mana a cast costs, and whether it's queued but short of mana. */
  mpCost: number;
  waitingForMana: boolean;
};

export type FightState = FightResult & {
  clock: number;
  real: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  hpRecovery: number;
  manaRecovery: number;
  /** Whether HP Recovery is running (Rage stops it). */
  recovering: boolean;
  /** Time Freeze holds the battle timer right now. */
  timeStopped: boolean;
  attacksPerSecond: number;
  /** Total ATK and ATK SPD the buffs, stacks and Rage add right now, as fractions. */
  atkBonus: number;
  speedBonus: number;
  done: boolean;
  skills: SkillStatus[];
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
  manual: boolean;
  lastCast: number;
  /** Rave has gone and waits for its release: no cooldown runs meanwhile. */
  holding: boolean;
  /** The stopped time is over and the stored damage can be released. */
  charged: boolean;
  /** Order it joined a queue in, shared by both queues. */
  queuedAt: number;
};

const isStack = (skill: FightSkill) =>
  skill.effect.type === "atkStack" || skill.effect.type === "speedStack" || skill.effect.type === "elementStack";
const complete = (l: Live) => isStack(l.skill) && l.skill.maxStacks != null && l.stacks >= l.skill.maxStacks;
const castable = (skill: FightSkill) => skill.kind !== "passive";
/** What readies a skill next: its first cooldown before it has gone, its usual one after. */
const target = (l: Live) => (l.uses === 0 && l.skill.firstEvery != null ? l.skill.firstEvery : l.skill.every);

export type Fight = {
  /** Plays the fight forward by this many real seconds (or until it ends). */
  advance: (seconds: number) => void;
  /** Queues a ready skill whose auto is off; false when it isn't ready. */
  cast: (name: string) => boolean;
  state: () => FightState;
};

export function createFight(input: FightInput): Fight {
  const step = input.step ?? DEFAULT_STEP;
  const manual = new Set(input.manual ?? []);
  // Cooldown skills, and every attack or buff you can press (strike-count ones too), are ready at the
  // start; stacks and other counters start from zero.
  const readyAtStart = (skill: FightSkill) =>
    !isStack(skill) && !skill.startsOnCooldown && (skill.trigger === "seconds" || (castable(skill) && skill.trigger === "hits"));
  const live: Live[] = input.skills.map((skill) => ({
    skill,
    progress: readyAtStart(skill) ? skill.every : 0,
    queued: false,
    activeFrom: -1,
    activeUntil: -1,
    stacks: 0,
    uses: 0,
    started: skill.startAt <= 0,
    manual: castable(skill) && manual.has(skill.name),
    lastCast: -1,
    holding: false,
    queuedAt: 0,
    charged: false,
  }));
  const queues: Record<"attack" | "buff", Live[]> = { attack: [], buff: [] };
  let queueOrder = 0;
  const enqueue = (l: Live) => {
    l.queued = true;
    l.queuedAt = (queueOrder += 1);
    queues[l.skill.kind === "attack" ? "attack" : "buff"].push(l);
  };

  const maxHp = input.maxHp ?? 0;
  const maxMana = input.maxMana ?? 0;
  const pools = maxMana > 0;
  let hp = maxHp;
  let mana = maxMana;
  const baseSpeed = input.attackSpeed ?? 1;

  const spirits = input.spirits;
  const bossMonster = input.bossMonster !== false;
  const enemyHp = input.enemyHp ?? 0;
  const skillAmp = 1 + (spirits ? (bossMonster ? spirits.bossSkillDamage : spirits.monsterSkillDamage) : 0);

  let real = 0;
  /** The battle timer: it stops for stopped-time attacks and Time Freeze. */
  let clock = 0;
  /** Seconds of action: buffs and spirit timers run on it, through Time Freeze too. */
  let action = 0;
  let frozenUntil = 0; // real time the clock runs again
  let stopUntil = -1; // real time Time Freeze ends
  let timeStopUsed = false;
  let nextBreath = spirits?.breath?.every ?? Infinity;
  let nextRecovery = spirits?.cooldownRecovery?.every ?? Infinity;
  let struck = false;
  let executed = false;
  /** Fight-clock time Rave's storing ends, -1 when it isn't storing. */
  let raveUntil = -1;
  let raveStored = 0;
  let nextBasic = 0;
  const nextSkillBonus: Partial<Record<Element, number>> = {};
  let total = 0;
  let basic = 0;
  const bySkill: Record<string, number> = {};
  const points = [{ t: 0, damage: 0 }];
  const casts: { name: string; t: number }[] = [];

  const isOn = (l: Live) => l.skill.trigger === "always" || (action >= l.activeFrom && action < l.activeUntil);

  const bonuses = () => {
    let atk = 0;
    let speed = 0;
    let cooldownRate = 0;
    let rage = false;
    let manaRate = 0;
    const element: Partial<Record<Element, number>> = {};
    const missing = maxHp > 0 ? Math.max(0, 1 - hp / maxHp) * 100 : 0;
    for (const l of live) {
      const e = l.skill.effect;
      if (e.type === "atkStack") atk += e.power * l.stacks;
      if (e.type === "speedStack") speed += e.power * l.stacks;
      if (e.type === "elementStack" && l.skill.element) element[l.skill.element] = (element[l.skill.element] ?? 0) + e.power * l.stacks;
      if (!isOn(l)) continue;
      if (e.type === "atk") atk += e.power;
      if (e.type === "speed") speed += e.power;
      if (e.type === "cooldownRate") cooldownRate += e.power;
      if (e.type === "manaRecovery") manaRate += e.power;
      if (e.type === "rage") {
        atk += e.power * missing;
        rage = true;
      }
    }
    return { atk, speed, cooldownRate, element, rage, manaRate };
  };

  const boss = 1 + (input.bossDamage ?? 0);
  /** Adds damage; only skills' and basic attacks' damage is `stored` by a storing Rave. */
  const record = (amount: number, source: string | null, stored = true) => {
    total += amount;
    if (source) bySkill[source] = (bySkill[source] ?? 0) + amount;
    else basic += amount;
    if (stored && action < raveUntil) raveStored += amount;
    points.push({ t: clock, damage: total });
  };
  /** A hit with the enemy multipliers; `raw` damage (a share of the enemy's HP) skips them. */
  const deal = (hit: number, source: string | null, raw = false) => {
    let amount = hit;
    if (!raw) {
      amount *= boss;
      if (spirits?.lastFight && clock >= input.duration - spirits.lastFight.seconds) amount *= spirits.lastFight.multiplier;
      if (spirits?.highHpDamage && enemyHp > 0 && total < enemyHp * (1 - HIGH_HP_THRESHOLD)) amount *= 1 + spirits.highHpDamage;
    }
    record(amount, source, !raw);
    if (bossMonster || !spirits || enemyHp <= 0) return;
    // Thief Wind: the first hit on a normal monster takes a share of its HP.
    if (spirits.firstStrike && !struck) {
      struck = true;
      record(enemyHp * spirits.firstStrike, "Thief Wind", false);
    }
    // Judge's Torpedo: a normal monster below its share of HP dies at once.
    if (spirits.execute && !executed && total < enemyHp && enemyHp - total <= enemyHp * spirits.execute) {
      executed = true;
      record(enemyHp - total, "Judge's Torpedo", false);
    }
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
    l.lastCast = real;
    const release = e.type === "rave" && l.charged;
    if (pools && !release) mana = Math.max(0, mana - (s.mpCost ?? 0));
    if (s.hpCost) hp = Math.min(maxHp, hp - hp * s.hpCost);
    const now = bonuses();
    const castSeconds = s.animation ?? ANIMATION_SECONDS;
    let animation = queue ? castSeconds : 0;

    if (e.type === "damage") {
      let bonus = s.bonus + (s.element ? input.extraDamage[s.element] + (now.element[s.element] ?? 0) : 0);
      if (s.element && nextSkillBonus[s.element]) {
        bonus += nextSkillBonus[s.element] ?? 0;
        delete nextSkillBonus[s.element];
      }
      const hits = e.growsTo ? Math.min(e.growsTo, Math.round(e.hits) + l.uses - 1) : e.hits;
      const whole = Math.max(1, Math.round(hits));
      const amp = s.element ? 1 + (input.elementAmp?.[s.element] ?? 0) : 1;
      const perHit = (expectedHit(input.attack * (1 + now.atk), input) * e.power * (1 + bonus) * amp * skillAmp * hits) / whole;
      for (let i = 0; i < whole; i += 1) deal(perHit, s.name);
      if (s.freezes) {
        animation = castSeconds * whole;
        frozenUntil = Math.max(frozenUntil, real + animation);
      }
      if (s.element && queue) countElementUse(s.element, l);
      // Every attack skill cast counts toward "after X strike skills used", passives included.
      for (const other of live) if (other !== l && other.skill.trigger === "attackCasts" && other.started) other.progress += 1;
    } else if (e.type === "rave") {
      if (release) {
        // The reuse unleashes Rave's share of the stored damage in stopped time, as it is: the stored
        // hits already had their multipliers. The cooldown starts now.
        record(raveStored * e.power, s.name, false);
        raveStored = 0;
        l.charged = false;
        l.holding = false;
        frozenUntil = Math.max(frozenUntil, real + ANIMATION_SECONDS);
      } else {
        // Storing runs with the fight: everything keeps going for the duration.
        raveUntil = action + s.duration;
        raveStored = 0;
        l.holding = true;
      }
    } else if (e.type === "restore") {
      hp = Math.min(maxHp, hp + e.hp * maxHp);
      mana = Math.min(maxMana, mana + e.mana * maxMana);
    } else if (e.type === "nextSkill") {
      if (s.element) nextSkillBonus[s.element] = e.power;
    } else if (e.type === "chargeCooldowns") {
      // Meditation charges every cooldown, attacks and buffs alike; conditional skills (strikes, skill uses) aren't charged.
      for (const other of live) {
        // A skill that starts on its cooldown (Wrath of Gods) isn't charged until it has gone once.
        if (other.skill.startsOnCooldown && other.uses === 0) continue;
        if (other !== l && other.skill.trigger === "seconds" && !isStack(other.skill) && !other.holding) {
          other.progress = Math.min(target(other), other.progress + e.power * other.skill.every);
        }
      }
    } else if (isStack(s)) {
      l.stacks += 1;
    } else {
      l.activeFrom = action + s.delay;
      l.activeUntil = action + s.delay + s.duration;
    }

    if (queue) {
      // The cast's animation holds back the next basic attack by its length.
      nextBasic = Math.max(nextBasic, real) + animation;
    }
  };

  const done = () => clock >= input.duration;

  const tick = () => {
    const frozen = real < frozenUntil;
    const now = bonuses();

    if (spirits && !frozen) {
      // Time Freeze stops the battle timer once, a few seconds in; the fight carries on meanwhile.
      if (spirits.timeStop && !timeStopUsed && clock >= spirits.timeStop.at) {
        timeStopUsed = true;
        stopUntil = real + spirits.timeStop.seconds;
      }
      if (spirits.breath && action >= nextBreath) {
        nextBreath += spirits.breath.every;
        if (enemyHp > 0) deal(spirits.breath.share * Math.max(0, enemyHp - total), "Breath of Fire", true);
      }
      if (spirits.cooldownRecovery && action >= nextRecovery) {
        nextRecovery += spirits.cooldownRecovery.every;
        for (const l of live) {
          const s = l.skill;
          if (s.trigger !== "seconds" || isStack(s) || l.queued || l.holding || (s.startsOnCooldown && l.uses === 0)) continue;
          l.progress = Math.min(target(l), l.progress + spirits.cooldownRecovery.share * s.every);
        }
      }
    }

    if (raveUntil >= 0 && action >= raveUntil) {
      raveUntil = -1;
      // Rave is ready to release: on auto it queues straight away, by hand it waits for a press.
      for (const l of live) {
        if (l.skill.effect.type !== "rave" || !l.holding || l.charged) continue;
        l.charged = true;
        if (!l.manual) enqueue(l);
      }
    }

    for (const l of live) {
      const s = l.skill;
      if (!l.started && clock >= s.startAt) {
        l.started = true;
        if (readyAtStart(s)) l.progress = s.every;
      }
      if (!l.started || s.trigger === "always" || l.queued || l.holding || complete(l)) continue;
      if (s.trigger === "seconds" && !frozen) l.progress += step * (1 + now.cooldownRate);
      if (l.progress < target(l)) continue;
      l.progress = Math.min(l.progress, target(l));
      if (s.kind === "passive") go(l, null);
      else if (!l.manual) {
        enqueue(l);
      }
    }

    // Skills and basic attacks wait out stopped time.
    const blocked = frozen;
    // Every ready skill goes at once, with no wait between casts.
    for (const queue of ["buff", "attack"] as const) {
      // A stopped-time attack (Demon Hunt) holds the rest until the clock runs again.
      while (queues[queue].length && real >= frozenUntil) {
        // Skills cast in the order they became ready: one short of mana holds every skill
        // queued after it (in either queue), so cheaper skills can't keep taking its mana.
        const short = (l: Live) => !l.charged && (l.skill.mpCost ?? 0) > mana;
        const holder = pools
          ? [...queues.buff, ...queues.attack].filter(short).reduce<Live | null>((first, l) => (!first || l.queuedAt < first.queuedAt ? l : first), null)
          : null;
        const index = queues[queue].findIndex((l) => l.charged || (!short(l) && (!holder || l.queuedAt < holder.queuedAt)));
        if (index < 0) break;
        go(queues[queue].splice(index, 1)[0]!, queue);
      }
    }

    const attacksPerSecond = baseSpeed * (1 + now.speed);
    if (real >= nextBasic && !blocked) {
      deal(expectedHit(input.attack * (1 + now.atk), input), null);
      nextBasic = real + 1 / attacksPerSecond;
      for (const l of live) if (l.skill.trigger === "hits" && l.started && !l.queued && !complete(l)) l.progress += 1;
    }

    if (!frozen) {
      if (maxHp > 0 && !now.rage) hp = Math.min(maxHp, hp + (input.hpRecovery ?? 0) * step);
      if (pools) mana = Math.min(maxMana, mana + (input.manaRecovery ?? 0) * (1 + now.manaRate) * step);
    }

    real += step;
    if (real >= frozenUntil) {
      action += step;
      if (real >= stopUntil) clock = Math.min(input.duration, clock + step);
    }
  };

  let carry = 0;
  return {
    advance: (seconds) => {
      carry += seconds;
      while (carry >= step && !done()) {
        tick();
        carry -= step;
      }
    },
    cast: (name) => {
      const l = live.find((x) => x.skill.name === name);
      if (!l || !l.manual || l.queued || !l.started || done()) return false;
      if (l.holding ? !l.charged : l.progress < l.skill.every) return false;
      enqueue(l);
      return true;
    },
    state: () => {
      const now = bonuses();
      return {
        points,
        casts,
        total,
        basic,
        bySkill,
        clock,
        real,
        hp,
        maxHp,
        mana,
        maxMana,
        hpRecovery: input.hpRecovery ?? 0,
        manaRecovery: (input.manaRecovery ?? 0) * (1 + now.manaRate),
        recovering: !now.rage,
        timeStopped: real < stopUntil,
        attacksPerSecond: baseSpeed * (1 + now.speed),
        atkBonus: now.atk,
        speedBonus: now.speed,
        done: done(),
        skills: live.map((l) => ({
          name: l.skill.name,
          ready: l.skill.trigger === "always" || l.charged ? 1 : l.holding ? 0 : Math.min(1, l.progress / Math.max(1e-9, target(l))),
          queued: l.queued,
          active: isOn(l) && !isStack(l.skill) && l.skill.duration > 0,
          stacks: l.stacks,
          complete: complete(l),
          manual: l.manual,
          lastCast: l.lastCast,
          uses: l.uses,
          charged: l.charged,
          stored: l.skill.effect.type === "rave" && l.holding ? raveStored * l.skill.effect.power : 0,
          mpCost: l.skill.mpCost ?? 0,
          waitingForMana: pools && l.queued && !l.charged && (l.skill.mpCost ?? 0) > mana,
        })),
      };
    },
  };
}

/** The whole fight at once. */
export function simulateFight(input: FightInput): FightResult {
  const fight = createFight(input);
  // Stopped time adds real seconds past the fight's length; the loop ends on the fight clock.
  fight.advance(Number.MAX_SAFE_INTEGER);
  const { points, casts, total, basic, bySkill } = fight.state();
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
