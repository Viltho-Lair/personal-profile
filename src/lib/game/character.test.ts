import { describe, expect, it } from "vitest";
import data from "@/data/optimizer/character.json";
import {
  abilityRowOpen,
  awakenedClassName,
  classMaxLevel,
  enhanceMax,
  latentMultiplier,
  latentPerLevel,
  type EnhanceStat,
} from "./character";

const stat = (name: string) => data.enhance.find((s) => s.name === name) as EnhanceStat;

describe("enhanceMax", () => {
  it("uses the sheet's fixed caps", () => {
    expect(enhanceMax(stat("ATK"), 0, undefined, undefined)).toBe(2_200_000);
  });

  it("keeps Death Strike at 1 until CRIT % is 1000, then Growing Knowledge + Superhuman", () => {
    const grades = data.growingKnowledge;
    expect(enhanceMax(stat("DEATH STRIKE"), 999, grades[5], grades[5])).toBe(1);
    expect(enhanceMax(stat("DEATH STRIKE"), 1000, grades[1], grades[2])).toBe(4050 + 90);
    expect(enhanceMax(stat("DEATH STRIKE %"), 1000, grades[0], grades[0])).toBe(1000);
  });
});

describe("latent power", () => {
  it("looks up the awakened multiplier, 1 when not awakened", () => {
    expect(latentMultiplier(data.latentAwakening.stats, 0, 3)).toBe(1);
    expect(latentMultiplier(data.latentAwakening.stats, 1, 1)).toBe(1.02);
  });

  it("grows the base value with slayer level above 250 and the latent sum", () => {
    expect(latentPerLevel("STR", 5, 450, 20)).toBe(5 + (200 * 20) / 200);
    expect(latentPerLevel("HP", 30, 450, 20)).toBeCloseTo(30 * (1 + 0.2 * 20));
    expect(latentPerLevel("ACC", 3, 450, 20)).toBe(3);
  });
});

describe("classes and abilities", () => {
  it("awakening raises the class cap and renames the last class", () => {
    expect(classMaxLevel(18)).toBe(1100);
    expect([0, 6, 12, 18].map(awakenedClassName)).toEqual(["Blast", "Tera", "Seed", "Nova"]);
  });

  it("opens ability rows as promotions pass them", () => {
    expect(abilityRowOpen(1, 0)).toBe(true);
    expect(abilityRowOpen(1, 1)).toBe(false);
    expect(abilityRowOpen(7, 6)).toBe(true);
  });
});
