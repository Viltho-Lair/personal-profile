import { describe, expect, it } from "vitest";
import tablesData from "@/data/optimizer/upgrade-costs.json";
import {
  classCubes,
  critChanceGold,
  critDamageGold,
  deathStrikeChanceGold,
  deathStrikeGold,
  gearCubes,
  passiveCost,
  relicCost,
  spiritCost,
  statGold,
  type CostTables,
} from "./costs";

const tables = tablesData as unknown as CostTables;

// Every expected value is a cached cell of the Master Optimizer.
describe("upgrade costs", () => {
  it("prices gold enhance levels", () => {
    expect(statGold(tables, 1, 5)).toBeCloseTo(10.01000354, 6); // Gold Enhancement Data!G2, ATK 1 -> 5
    expect(statGold(tables, 1, 20)).toBeCloseTo(1143.615627, 4); // W2, HP 1 -> 20
    expect(statGold(tables, 1, 100)).toBeCloseTo(164169.7533, 2); // AE2, HP Recovery 1 -> 100
    expect(critDamageGold(1, 100)).toBeCloseTo(176401.6667, 2); // AR5
    expect(critChanceGold(tables, 1, 11)).toBe(2210); // AP9
    expect(critChanceGold(tables, 1, 100)).toBe(1666766); // AT9
    expect(deathStrikeGold(1, 2)).toBeCloseTo(98.0005, 4);
    expect(deathStrikeGold(1, 11)).toBeCloseTo(296560.41, 1);
    expect(deathStrikeChanceGold(1, 11)).toBe(25333);
  });

  it("uses each band's multiplier, and grows it past a million", () => {
    // One level at 70,000 is in the ×1.2 band.
    const L = 70000;
    expect(statGold(tables, L, L + 1)).toBeCloseTo((1.2 * L ** 4) / 1e8 + L ** 3 / 1e4 + (L * (L - 1)) / 2, -3);
    expect(statGold(tables, 1_000_000, 1_000_001)).toBeGreaterThan(statGold(tables, 999_999, 1_000_000));
  });

  it("prices cube levels for gear, classes and spirits", () => {
    expect(gearCubes(tables, "Immortal", 0, 1)).toBe(10205); // Equipment Data!D276
    expect(gearCubes(tables, "Legendary 4", 0, 1)).toBe(367); // D268
    expect(gearCubes(tables, "Immortal", 0, 200)).toBe(1_945_786_523); // B436
    expect(classCubes(tables, 20, 0, 200)).toBe(1_362_050_474); // H436
    expect(classCubes(tables, 4, 25, 26)).toBe(4615); // Cube Optimizer Data!AJ3
    expect(spiritCost(tables, 0, 1)).toEqual({ cubes: 30, crystals: 300 }); // C441, D441
    expect(spiritCost(tables, 0, 20)).toEqual({ cubes: 1_323_000, crystals: 15410 }); // CO52, CO53 for one of three
  });

  it("prices companion passives, the Understanding passives past 100 at level 99's cost", () => {
    expect(passiveCost(tables, "Ellie", "Detect Weakness", 10, 100)).toEqual({ stones: 588_800, emeralds: 117_760 }); // COMPANIONS!F36, F37
    expect(passiveCost(tables, "Zeke", "Earth's Understanding", 130, 300)).toEqual({ stones: 1_360_000, emeralds: 229_500 }); // O36, O37
    expect(passiveCost(tables, "Miho", "Fire Understanding", 5, 25)).toEqual({ stones: 46_400, emeralds: 7_830 }); // X36, X37
    expect(passiveCost(tables, "Ellie", "Nothing", 0, 1)).toBeNull();
  });

  it("prices relic levels by their expected attempts", () => {
    expect(relicCost(0, 1)).toBeCloseTo(5000 / 11);
    expect(relicCost(54, 55)).toBeCloseTo(5000 / 11 / 0.1);
  });
});
