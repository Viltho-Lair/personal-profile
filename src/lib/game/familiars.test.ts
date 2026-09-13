import { describe, expect, it } from "vitest";
import familiarsData from "@/data/optimizer/familiars.json";
import { altarStars, manaAltar } from "./familiars";

describe("altarStars", () => {
  it("adds up the six highest star counts only", () => {
    expect(altarStars([11, 1, 11, 10, 2, 11, 9, 11])).toBe(11 + 11 + 11 + 11 + 10 + 9);
    expect(altarStars([])).toBe(0);
  });
});

describe("manaAltar", () => {
  const levels = familiarsData.manaAltar;

  it("gives nothing below 30 stars", () => {
    expect(manaAltar(29, levels)).toEqual({ level: 0, skillDamage: 0, soul: 0, nextStars: 30 });
  });

  it("sums every reached level, like the workbook's FILTER over levels <= stars - 29", () => {
    const at31 = manaAltar(31, levels);
    expect(at31.level).toBe(2);
    expect(at31.skillDamage).toBeCloseTo((levels[0].skillDamage + levels[1].skillDamage) / 100);
    expect(manaAltar(66, levels).level).toBe(37);
    expect(manaAltar(66, levels).nextStars).toBeNull();
  });
});
