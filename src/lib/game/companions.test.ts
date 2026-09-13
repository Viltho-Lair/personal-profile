import { describe, expect, it } from "vitest";
import data from "@/data/optimizer/companions.json";
import {
  companionEffect,
  companionLevel,
  companionStatus,
  costToMax,
  formatEffect,
  nextLevelCost,
  promotionBuff,
  type CompanionFormula,
  type CostTable,
} from "./companions";

const ellie = data.companions[0];
const skill = (name: string) => {
  const found = ellie.skills.find((s) => s.name === name);
  if (!found) throw new Error(name);
  return found;
};

describe("companionEffect", () => {
  it("is level x amount for ordinary passives", () => {
    const blessing = skill("Blessing of Forest");
    expect(companionEffect(blessing.formula as CompanionFormula, 100)).toBeCloseTo(3);
    expect(formatEffect("percent", 3)).toBe("+300%");
  });

  it("follows the Understanding steps like COMPANIONS G24", () => {
    const understanding: CompanionFormula = { kind: "understanding", display: "percent" };
    expect(companionEffect(understanding, 10)).toBeCloseTo(0.1);
    // 25: step 3 -> 10 + 20 + 5 x 3 = 45
    expect(companionEffect(understanding, 25)).toBeCloseTo(0.45);
    // 500: step 51 -> 10 x 50 x 51 / 2 = 12,750
    expect(companionEffect(understanding, 500)).toBeCloseTo(127.5);
    expect(companionEffect(understanding, 510)).toBeCloseTo(132.5);
  });
});

describe("costs", () => {
  const costs = skill("Intensive Fire").costs as unknown as CostTable;

  it("next level cost is the table row for the current level", () => {
    expect(nextLevelCost(costs, 1, 100)).toEqual([16, 8]);
    expect(nextLevelCost(costs, 100, 100)).toBeNull();
  });

  it("cost to max adds every remaining level", () => {
    const [stones, emeralds] = costToMax(costs, 98, 100);
    expect([stones, emeralds]).toEqual([costs[98][0] + costs[99][0], costs[98][1] + costs[99][1]]);
    expect(costToMax(costs, 100, 100)).toEqual([0, 0]);
  });

  it("levels past the table cost the same as its last level", () => {
    const understanding = skill("Wind's Understanding").costs as unknown as CostTable;
    const last = understanding[understanding.length - 1];
    expect(costToMax(understanding, 1499, 1500)).toEqual([last[0], last[1]]);
  });
});

describe("companion level and promotion", () => {
  it("counts passive levels", () => {
    expect(companionLevel(299)).toBe(59);
    expect(companionLevel(320)).toBe(62);
    const increments = (data.promotion as { elementIncrements: number[] }).elementIncrements;
    // advancement 000 is promotion #1: 0.5% per level
    expect(companionStatus(increments, 0, 20)).toBeCloseTo(0.1);
    expect(companionStatus(increments, 4, 10)).toBeCloseTo(0.3);
    expect(companionStatus(increments, 99, 1)).toBe(increments.at(-1));
  });

  it("multiplies a rolled value by the slot's rank", () => {
    expect(promotionBuff(0.2, "7th", data.promotion.rankMultipliers)).toBeCloseTo(0.8);
    expect(promotionBuff(0.2, null, data.promotion.rankMultipliers)).toBe(0);
  });
});
