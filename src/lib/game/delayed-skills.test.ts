import { describe, expect, it } from "vitest";
import { MEDITATION_FIRST_SECONDS, presetFightSkills } from "@/components/analyzer/promotion-fight";
import { emptyProfile } from "@/lib/profile/types";
import { createFight, simulateFight } from "./battle";

const preset = (names: string[]) => {
  const p = emptyProfile();
  p.skills = Object.fromEntries(names.map((name) => [name, { level: 1 }]));
  p.skillPresets[0] = [...names, ...Array(10 - names.length).fill(null)];
  return presetFightSkills(p).skills;
};

const base = { attack: 100, critChance: 0, critDamage: 1, deathStrikeChance: 0, deathStrikeDamage: 1, extraDamage: { Fire: 0, Water: 0, Wind: 0, Earth: 0 } };

describe("skills that count down before their first use", () => {
  it("start delayed skills on their 'after N seconds into battle' countdown, then go every cooldown", () => {
    const [wrath, current] = preset(["Wrath of Gods", "Strong Current"]);
    expect(wrath).toMatchObject({ name: "Wrath of Gods", startsOnCooldown: true, firstEvery: 20, every: 30, startAt: 0 });
    expect(current).toMatchObject({ name: "Strong Current", startsOnCooldown: true, firstEvery: 2, every: 50, startAt: 0 });
    const casts = simulateFight({ ...base, duration: 60, skills: [current!] }).casts.filter((c) => c.name === "Strong Current").map((c) => Math.round(c.t));
    expect(casts).toEqual([2, 52]);
  });

  it("counts Meditation down 2 seconds before its first use, and lets it be pressed only then", () => {
    const [meditation] = preset(["Meditation"]);
    expect(meditation).toMatchObject({ startsOnCooldown: true, firstEvery: MEDITATION_FIRST_SECONDS });
    const fight = createFight({ ...base, duration: 30, skills: [meditation!], manual: ["Meditation"] });
    fight.advance(1);
    expect(fight.cast("Meditation")).toBe(false);
    fight.advance(1.1);
    expect(fight.cast("Meditation")).toBe(true);
  });
});
