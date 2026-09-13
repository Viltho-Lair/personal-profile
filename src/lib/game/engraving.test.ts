import { describe, expect, it } from "vitest";
import { canPlace, gemSoulWeaponAtk, gemTotals, plateComplete, rotatedCells, type GemPlacement, type SoulGem } from "./engraving";

const gems: (SoulGem | null)[] = [
  { shape: 4, rarity: 3, level: 45, value: 12, soulWeaponAtk: 10.72 }, // O, CRIT Dmg
  { shape: 5, rarity: 4, level: 50, value: 8, soulWeaponAtk: 10.72 }, // I, Gold
  { shape: 6, rarity: 1, level: 10, value: 5, soulWeaponAtk: 10.08 }, // S, Accuracy
  null,
];

describe("rotatedCells", () => {
  it("turns an I piece on its side and back", () => {
    expect(rotatedCells(5, 1)).toEqual([[0, 0], [0, 1], [0, 2], [0, 3]]);
    expect(rotatedCells(5, 2)).toEqual(rotatedCells(5, 0));
  });

  it("keeps an L's four cells through every turn", () => {
    for (let r = 0; r < 4; r += 1) expect(new Set(rotatedCells(1, r).map(String)).size).toBe(4);
    expect(rotatedCells(1, 1)).toEqual([[0, 0], [0, 1], [0, 2], [1, 0]]);
  });
});

describe("placing gems", () => {
  const plate = ["##..", "##..", "####", "...."];

  it("needs open, uncovered cells", () => {
    const square: GemPlacement = { gem: 0, row: 0, col: 0, rotation: 0 };
    expect(canPlace(plate, [], gems, square)).toBe(true);
    expect(canPlace(plate, [], gems, { ...square, col: 1 })).toBe(false);
    expect(canPlace(plate, [square], gems, { gem: 1, row: 1, col: 0, rotation: 1 })).toBe(false);
    expect(canPlace(plate, [square], gems, { gem: 1, row: 2, col: 0, rotation: 1 })).toBe(true);
    expect(canPlace(plate, [], gems, { gem: 3, row: 0, col: 0, rotation: 0 })).toBe(false);
  });

  it("is complete when every open cell is covered and totals the gem stats", () => {
    const placements: GemPlacement[] = [
      { gem: 0, row: 0, col: 0, rotation: 0 },
      { gem: 1, row: 2, col: 0, rotation: 1 },
    ];
    expect(plateComplete(plate, placements.slice(0, 1), gems)).toBe(false);
    expect(plateComplete(plate, placements, gems)).toBe(true);
    const totals = gemTotals([...placements, { gem: 2, row: 0, col: 2, rotation: 0 }], gems);
    expect(totals.critDamage).toBeCloseTo(0.12);
    expect(totals.gold).toBeCloseTo(0.08);
    expect(totals.accuracy).toBe(5);
  });

  it("sums every gem's Engraving Effect into Soul Weapon ATK", () => {
    expect(gemSoulWeaponAtk(gems)).toBeCloseTo(0.3152);
  });
});
