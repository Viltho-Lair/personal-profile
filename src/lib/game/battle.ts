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
 *   percent of life missing, stops HP recovery and drains 0.5% of max life a
 *   second while it lasts, ending early (its cooldown carries on) rather than
 *   taking life to zero.
 * - Passives run on their own: always on, stacking over time or hits up to
 *   their stages (then they're complete), skill uses, or starting later.
 * - Rave stores all the damage done to the enemy for its duration (5 seconds):
 *   skills, basic attacks and spirit skills alike. It stops time while it
 *   stores: the battle timer and skill cooldowns hold while attacks keep landing. It can then be used again to unleash
 *   its share of that damage (110% at level 5) as it is, with no multipliers on
 *   top, played out in stopped time, and only then does its cooldown start.
 * - Meditation charges every attack and buff, their cooldowns and strike
 *   counts alike, and passives with a cooldown; passives that go on a
 *   condition (strikes, skill uses, stacks) aren't charged.
 * - Demon Hunt plays its hits in stopped time. While the clock is stopped,
 *   cooldowns, buffs and recovery don't run.
 * - A buff lasts its duration from when it takes effect; casting it again
 *   refreshes it rather than stacking.
 * - An element-restricted enemy takes x2 from the element that beats it, x0.7
 *   from the one it beats, x1 from the rest.
 * - Stage farming walks through a stage's waves: basic attacks and Rave hit the
 *   monster in front, attack skills and the familiar every monster in their
 *   range, skills wait for something in reach, and the slayer walks on when
 *   nothing is. Kills ready bat beasts; the run ends when the box breaks.
 * - The familiar use hits Y times for Z% of ATK as its attribute familiar's
 *   element, like an attack skill you can put on auto or cast by hand; its
 *   familiars' specials go with each use.
 * - The equipped beast's skill runs on its own: wolves after strike skills,
 *   boars after knockbacks (a 50% chance every 10 seconds), dracos once a
 *   stacking skill maxes out, bats after kills.
 * - Spirit skills of the accompanying spirits: Last Fight multiplies the last
 *   seconds' damage, Breath of Fire takes a share of the enemy's remaining HP,
 *   Wilderness Roar / Reign raise skill damage against bosses / normal
 *   monsters, Judge's Torpedo and Thief Wind only work on normal monsters,
 *   Leveling adds damage while the enemy is above 70% HP, Wind Force recovers
 *   cooldowns, and Time Freeze stops the battle timer while the fight goes on.
 */

import { elementMatchup } from "./elements";
import { BASIC_RANGE, createField, MOVE_SPEED, type FarmStage, type FieldState } from "./farm";

/**
 * Something the farming view draws: a basic attack, an attack skill's sweep over its range, a charge, a
 * buff, a spirit skill, Rave's release or a kill. `real` is when it shows; `from` and `to` are field positions.
 */
export type FightEvent = {
  kind: "basic" | "sweep" | "charge" | "buff" | "breath" | "rave" | "kill" | "familiar";
  real: number;
  name: string;
  element: Element | null;
  from: number;
  to: number;
  /** Hits (sweeps, familiar), which charge it was, or the fallen monster's id (kills). */
  count: number;
  /** Where the monsters it reached stood, nearest first (sweeps, familiar). */
  targets?: number[];
};

/** Seconds a Supersonic-style charge takes on screen, one after another. */
export const CHARGE_SECONDS = 0.12;
const MAX_EVENTS = 240;
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
  /** Total ATK +power for each percent of life missing; no HP recovery and `drain` of max life a second while it lasts (Rage). */
  | { type: "rage"; power: number; drain?: number }
  /** Mana Recovery +power while it's on (Mana's Blessing). */
  | { type: "manaRecovery"; power: number }
  /** Restores these shares of max life and max mana at once (Life Mana). */
  | { type: "restore"; hp: number; mana: number }
  /** Boss damage +power while it's on, against a boss only (Draco beasts). */
  | { type: "bossDamage"; power: number }
  /** Movement speed +power while it's on (Bat beasts, Agile). */
  | { type: "mspd"; power: number }
  /** Movement speed +power for every monster killed so far (Storm Rush). */
  | { type: "mspdPerKill"; power: number };

export type FightSkill = {
  name: string;
  element: Element | null;
  kind: "attack" | "buff" | "passive";
  /** What readies it: seconds of cooldown, basic-attack hits, always on, uses of skills of its element, or attack skill casts. */
  trigger: "seconds" | "hits" | "always" | "elementCasts" | "attackCasts" | "stacksComplete" | "kills" | "familiarCasts";
  /** The familiar use: it doesn't count as a strike skill, and its uses ready "familiarCasts" specials. */
  familiar?: boolean;
  /** How far ahead an attack reaches when stage farming: it hits every monster within it. */
  range?: number;
  /**
   * Farming, the attack charges the slayer forward: to the farthest monster it hits ("farthest", Fulgurous),
   * or once per hit through its whole range ("through", Supersonic's 6 consecutive charges), hitting what's
   * in range before each charge.
   */
  dash?: "farthest" | "through";
  /** Extra damage while the enemy is at or below this share of its HP (Na: +10% at 60% or less). */
  lowHpBonus?: { below: number; bonus: number };
  /** For "stacksComplete": the stacking skill to watch, or "all" for every stacking skill in the fight. */
  watch?: string;
  /** Goes on its own condition, so Meditation, Wind Force and cooldown charges leave it alone (beasts). */
  uncharged?: boolean;
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
  /** The enemy's element when it's element restricted; null or unset hits every element for x1. */
  enemyElement?: Element | null;
  /** Stage farming: the stage walked through instead of one enemy. */
  farm?: FarmStage;
  /** A boss monster (the default) or a normal monster. */
  bossMonster?: boolean;
  /** The enemy's HP, read by spirit skills (remaining HP share, execute, first strike, above 70%). */
  enemyHp?: number;
  /** Spirit skills of the accompanying spirits. */
  spirits?: SpiritSkillEffects;
  /** Basic attacks a second before ATK SPD buffs (1 plus the Bracelet of Speed). */
  attackSpeed?: number;
  /** Movement speed multiple from the stats (1 = the base walk), before MSPD buffs. */
  movementSpeed?: number;
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
  /** Every skill that went: its name, fight-clock time and the real time it went. */
  casts: { name: string; t: number; real: number }[];
  /** Each time Rave unleashed its stored damage: when, and how much it dealt. */
  releases: { t: number; damage: number; amount: number }[];
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
  /** Stage farming: where the slayer and the monsters are, and when the box broke. */
  field: FieldState | null;
  clearedAt: number | null;
  /** Farming: what was drawn lately (basic attacks, sweeps, charges, buffs, kills), oldest first. */
  events: FightEvent[];
  /** Range walked a second right now, and the MSPD bonus on it. */
  moveSpeed: number;
  mspdBonus: number;
  /** Rave is storing, so time and skill cooldowns stand still. */
  raveStopping: boolean;
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
  const field = input.farm ? createField(input.farm) : null;
  const struckIds = new Set<number>();
  let lastKills = 0;
  const events: FightEvent[] = [];
  const log = (event: Omit<FightEvent, "real"> & { real?: number }) => {
    if (!field) return;
    events.push({ real, ...event });
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  };
  const at = () => field?.position() ?? 0;
  let clearedAt: number | null = null;
  /** The current enemy's max and remaining HP: the monster in front when farming, else the one enemy. */
  const targetMax = () => (field ? (field.front()?.maxHp ?? 0) : enemyHp);
  const targetLeft = () => (field ? (field.front()?.hp ?? 0) : Math.max(0, enemyHp - total));
  /** Fight-clock time Rave's storing ends, -1 when it isn't storing. */
  let raveUntil = -1;
  let raveStored = 0;
  let nextBasic = 0;
  const nextSkillBonus: Partial<Record<Element, number>> = {};
  let total = 0;
  let basic = 0;
  const bySkill: Record<string, number> = {};
  const points = [{ t: 0, damage: 0 }];
  const casts: FightResult["casts"] = [];
  const releases: FightResult["releases"] = [];

  const isOn = (l: Live) => l.skill.trigger === "always" || (action >= l.activeFrom && action < l.activeUntil);

  const bonuses = () => {
    let atk = 0;
    let speed = 0;
    let cooldownRate = 0;
    let rage = false;
    let manaRate = 0;
    let bossDamage = 0;
    let mspd = 0;
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
      if (e.type === "bossDamage") bossDamage += e.power;
      if (e.type === "mspd") mspd += e.power;
      if (e.type === "mspdPerKill") mspd += e.power * (field?.kills() ?? 0);
      if (e.type === "rage") {
        atk += e.power * missing;
        rage = true;
      }
    }
    return { atk, speed, cooldownRate, element, rage, manaRate, bossDamage, mspd };
  };

  const boss = 1 + (input.bossDamage ?? 0);
  /** Adds damage to the enemy; a storing Rave stores all of it except its own release (`stored` false). */
  const record = (amount: number, source: string | null, stored = true) => {
    total += amount;
    if (source) bySkill[source] = (bySkill[source] ?? 0) + amount;
    else basic += amount;
    if (stored && action < raveUntil) raveStored += amount;
    points.push({ t: clock, damage: total });
  };
  /**
   * A hit with the enemy multipliers; `raw` damage (a share of the enemy's HP) skips them. Farming, it lands on
   * the monster in front (`single`) or every monster within `range`, and counts what they lost.
   */
  const deal = (hit: number, source: string | null, raw = false, range = BASIC_RANGE, single = true) => {
    let amount = hit;
    if (!raw) {
      amount *= boss * (bossMonster ? 1 + bonuses().bossDamage : 1);
      if (spirits?.lastFight && clock >= input.duration - spirits.lastFight.seconds) amount *= spirits.lastFight.multiplier;
      if (spirits?.highHpDamage && targetMax() > 0 && targetLeft() > targetMax() * HIGH_HP_THRESHOLD) amount *= 1 + spirits.highHpDamage;
    }
    if (field) {
      const front = field.front();
      // Thief Wind takes its share off each normal monster the first time it's hit.
      if (spirits?.firstStrike && front && field.inRange(range) && !struckIds.has(front.id)) {
        struckIds.add(front.id);
        record(field.hit(front.maxHp * spirits.firstStrike, range, true), "Thief Wind");
      }
      record(field.hit(amount, range, single), source);
      const next = field.front();
      // Judge's Torpedo finishes a normal monster below its share of HP.
      if (spirits?.execute && next && field.inRange(range) && next.hp <= next.maxHp * spirits.execute) {
        record(field.hit(next.hp, range, true), "Judge's Torpedo");
      }
      return;
    }
    record(amount, source);
    if (bossMonster || !spirits || enemyHp <= 0) return;
    // Thief Wind: the first hit on a normal monster takes a share of its HP.
    if (spirits.firstStrike && !struck) {
      struck = true;
      record(enemyHp * spirits.firstStrike, "Thief Wind");
    }
    // Judge's Torpedo: a normal monster below its share of HP dies at once.
    if (spirits.execute && !executed && total < enemyHp && enemyHp - total <= enemyHp * spirits.execute) {
      executed = true;
      record(enemyHp - total, "Judge's Torpedo");
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
    casts.push({ name: s.name, t: clock, real });
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
      if (s.lowHpBonus && targetMax() > 0 && targetLeft() <= targetMax() * s.lowHpBonus.below) bonus += s.lowHpBonus.bonus;
      if (s.element && nextSkillBonus[s.element]) {
        bonus += nextSkillBonus[s.element] ?? 0;
        delete nextSkillBonus[s.element];
      }
      const hits = e.growsTo ? Math.min(e.growsTo, Math.round(e.hits) + l.uses - 1) : e.hits;
      const whole = Math.max(1, Math.round(hits));
      const amp = (s.element ? 1 + (input.elementAmp?.[s.element] ?? 0) : 1) * elementMatchup(s.element, input.enemyElement ?? null);
      const perHit = (expectedHit(input.attack * (1 + now.atk), input) * e.power * (1 + bonus) * amp * (s.familiar ? 1 : skillAmp) * hits) / whole;
      const reach = s.range ?? BASIC_RANGE;
      const kind = s.familiar ? "familiar" : "sweep";
      if (field && s.dash === "through") {
        // Consecutive charges: each hits what's in range, then charges through it while anything is left ahead.
        for (let i = 0; i < whole; i += 1) {
          const start = at();
          deal(perHit, s.name, false, reach, false);
          const onward = field.aheadInRange(reach);
          if (onward) field.dash(start + reach);
          log({ kind: "charge", name: s.name, element: s.element, from: start, to: onward ? start + reach : start, count: i, real: real + i * CHARGE_SECONDS });
        }
      } else {
        const farthest = field && s.dash ? field.farthest(reach) : null;
        const start = at();
        const targets = field?.positionsInRange(reach).slice(0, 12);
        for (let i = 0; i < whole; i += 1) deal(perHit, s.name, false, reach, false);
        log({ kind, name: s.name, element: s.element, from: start, to: start + reach, count: whole, targets });
        // A charge moves the slayer with it.
        if (field && s.dash) {
          field.dash(farthest ?? start);
          log({ kind: "charge", name: s.name, element: s.element, from: start, to: farthest ?? start, count: 0 });
        }
      }
      if (s.freezes) {
        animation = castSeconds * whole;
        frozenUntil = Math.max(frozenUntil, real + animation);
      }
      if (s.element && queue) countElementUse(s.element, l);
      // Every attack skill cast counts toward "after X strike skills used", passives included; a familiar use
      // readies its familiars' specials instead.
      const counts = s.familiar ? "familiarCasts" : "attackCasts";
      for (const other of live) if (other !== l && other.skill.trigger === counts && other.started) other.progress += 1;
    } else if (e.type === "rave") {
      if (release) {
        // The reuse unleashes Rave's share of the stored damage in stopped time, as it is: the stored
        // hits already had their multipliers. The cooldown starts now.
        record(field ? field.hit(raveStored * e.power, BASIC_RANGE, true) : raveStored * e.power, s.name, false);
        log({ kind: "rave", name: s.name, element: null, from: at(), to: field?.front()?.position ?? at(), count: 1 });
        releases.push({ t: clock, damage: total, amount: raveStored * e.power });
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
      // Meditation charges every attack and buff (cooldown or strike count) and cooldown passives;
      // conditional passives (strikes, skill uses, stacks) aren't charged.
      for (const other of live) {
        // A skill that starts on its cooldown (Wrath of Gods) isn't charged until it has gone once.
        if (other === l || isStack(other.skill) || other.skill.uncharged || other.holding || (other.skill.startsOnCooldown && other.uses === 0)) continue;
        const t = other.skill.trigger;
        if (t === "seconds" || (t === "hits" && castable(other.skill))) {
          other.progress = Math.min(target(other), other.progress + e.power * other.skill.every);
        }
      }
    } else if (isStack(s)) {
      l.stacks += 1;
    } else {
      l.activeFrom = action + s.delay;
      l.activeUntil = action + s.delay + s.duration;
      if (s.duration > 0) log({ kind: "buff", name: s.name, element: s.element, from: at(), to: at(), count: 0 });
    }

    if (queue) {
      // The cast's animation holds back the next basic attack by its length.
      nextBasic = Math.max(nextBasic, real) + animation;
    }
  };

  const done = () => clock >= input.duration || (field?.cleared() ?? false);
  /** Farming, an attack (or Rave's release) waits until something is in its reach. */
  const inReach = (l: Live) => {
    if (!field) return true;
    const e = l.skill.effect;
    if (e.type === "damage") return field.inRange(l.skill.range ?? BASIC_RANGE);
    if (e.type === "rave" && l.charged) return field.inRange(BASIC_RANGE);
    return true;
  };

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
        if (targetMax() > 0 && (!field || field.inRange(BASIC_RANGE))) {
          deal(spirits.breath.share * targetLeft(), "Breath of Fire", true);
          log({ kind: "breath", name: "Breath of Fire", element: "Fire", from: at(), to: field?.front()?.position ?? at(), count: 1 });
        }
      }
      if (spirits.cooldownRecovery && action >= nextRecovery) {
        nextRecovery += spirits.cooldownRecovery.every;
        for (const l of live) {
          const s = l.skill;
          if (s.trigger !== "seconds" || isStack(s) || s.uncharged || l.queued || l.holding || (s.startsOnCooldown && l.uses === 0)) continue;
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
      // Goes once, when the stacking skill it watches (or every one, for "all") is complete.
      if (s.trigger === "stacksComplete") {
        if (!l.started || l.uses > 0) continue;
        const watched = live.filter((o) => o !== l && isStack(o.skill) && (s.watch === "all" || o.skill.name === s.watch));
        if (watched.length && watched.every(complete)) go(l, null);
        continue;
      }
      if (!l.started || s.trigger === "always" || l.queued || l.holding || complete(l)) continue;
      // Cooldowns hold while Rave stops time.
      if (s.trigger === "seconds" && !frozen && !(raveUntil >= 0 && action < raveUntil)) l.progress += step * (1 + now.cooldownRate);
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
        const index = queues[queue].findIndex((l) => inReach(l) && (l.charged || (!short(l) && (!holder || l.queuedAt < holder.queuedAt))));
        if (index < 0) break;
        go(queues[queue].splice(index, 1)[0]!, queue);
      }
    }

    const attacksPerSecond = baseSpeed * (1 + now.speed);
    // Farming, the slayer walks on while nothing is in reach of a basic attack.
    if (field && !blocked && !field.inRange(BASIC_RANGE)) field.move(MOVE_SPEED * (input.movementSpeed ?? 1) * (1 + now.mspd) * step);
    if (real >= nextBasic && !blocked && (!field || field.inRange(BASIC_RANGE))) {
      if (field) log({ kind: "basic", name: "Basic attack", element: null, from: at(), to: field.front()?.position ?? at() + BASIC_RANGE, count: 1 });
      deal(expectedHit(input.attack * (1 + now.atk), input), null);
      nextBasic = real + 1 / attacksPerSecond;
      for (const l of live) if (l.skill.trigger === "hits" && l.started && !l.queued && !complete(l)) l.progress += 1;
    }

    if (!frozen) {
      if (maxHp > 0 && !now.rage) hp = Math.min(maxHp, hp + (input.hpRecovery ?? 0) * step);
      // Rage drains life while it lasts; when the drain would empty it, Rage ends instead (its cooldown runs on).
      for (const l of live) {
        const e = l.skill.effect;
        if (maxHp <= 0 || e.type !== "rage" || !e.drain || !isOn(l)) continue;
        const drain = e.drain * maxHp * step;
        if (hp - drain <= 0) l.activeUntil = action;
        else hp -= drain;
      }
      if (pools) mana = Math.min(maxMana, mana + (input.manaRecovery ?? 0) * (1 + now.manaRate) * step);
    }

    if (field) {
      const kills = field.kills();
      if (kills > lastKills) {
        // Each monster that fell this tick bursts where it stood.
        for (const e of field.fallen().slice(lastKills)) log({ kind: "kill", name: e.box ? "Box" : "Monster", element: null, from: e.position, to: e.position, count: e.id });
        for (const l of live) if (l.skill.trigger === "kills" && l.started && !l.queued) l.progress += kills - lastKills;
        lastKills = kills;
      }
      if (clearedAt === null && field.cleared()) clearedAt = clock;
    }

    real += step;
    if (real >= frozenUntil) {
      action += step;
      // Time Freeze and a storing Rave hold the battle timer.
      if (real >= stopUntil && !(raveUntil >= 0 && action < raveUntil)) clock = Math.min(input.duration, clock + step);
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
        releases,
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
        field: field?.state() ?? null,
        clearedAt,
        events,
        moveSpeed: MOVE_SPEED * (input.movementSpeed ?? 1) * (1 + now.mspd),
        raveStopping: raveUntil >= 0 && action < raveUntil,
        mspdBonus: now.mspd,
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
  const { points, casts, releases, total, basic, bySkill } = fight.state();
  return { points, casts, releases, total, basic, bySkill };
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
