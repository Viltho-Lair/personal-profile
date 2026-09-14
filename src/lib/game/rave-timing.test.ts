import { describe, expect, it } from "vitest";
import type { FightInput, FightSkill } from "./battle";
import { bestRaveTiming, playFight, raveTimings } from "./rave-timing";

const base: FightInput = {
  attack: 100,
  critChance: 0,
  critDamage: 1,
  deathStrikeChance: 0,
  deathStrikeDamage: 1,
  extraDamage: { Fire: 0, Water: 0, Wind: 0, Earth: 0 },
  skills: [],
  duration: 60,
};

const skill = (s: Partial<FightSkill> & Pick<FightSkill, "name" | "effect">): FightSkill => ({
  element: null,
  kind: "attack",
  trigger: "seconds",
  every: 10,
  duration: 0,
  delay: 0,
  startAt: 0,
  freezes: false,
  bonus: 0,
  ...s,
});

// A big ATK buff 20 to 25 seconds in, like Wrath of Gods, and Rave with a 30-second cooldown.
const wrath = skill({ name: "Wrath of Gods", kind: "passive", every: 60, firstEvery: 20, startsOnCooldown: true, duration: 5, effect: { type: "atk", power: 9 } });
const rave = skill({ name: "Rave", every: 30, duration: 5, effect: { type: "rave", power: 1 } });

describe("Rave by hand", () => {
  it("tries auto first, then press times 5 seconds apart with the second at least 10 after the first", () => {
    const timings = raveTimings(30);
    expect(timings[0]).toBeNull();
    expect(timings).toContainEqual({ first: 0, second: 10 });
    expect(timings).toContainEqual({ first: 15, second: 25 });
    expect(timings.every((t) => t === null || (t.second - t.first >= 10 && t.second <= 25))).toBe(true);
  });

  it("stores the damage during the buff when pressed as it starts, beating auto", () => {
    const input = { ...base, skills: [wrath, rave] };
    const timing = bestRaveTiming(input);
    expect(timing?.first).toBe(20);
    expect(playFight(input, timing).total).toBeGreaterThan(playFight(input, null).total);
  });

  it("plays on auto without a Rave in the fight", () => {
    const input = { ...base, skills: [wrath] };
    expect(bestRaveTiming(input)).toBeNull();
    expect(playFight(input, { first: 20, second: 40 }).total).toBeCloseTo(playFight(input, null).total);
  });
});
