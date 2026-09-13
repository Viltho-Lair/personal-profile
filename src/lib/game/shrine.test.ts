import { describe, expect, it } from "vitest";
import data from "@/data/optimizer/sealed-shrine.json";
import { emptyShrineLevels, shrineEffects, statueValues, type ShrineData } from "./shrine";

const shrine = data as unknown as ShrineData;

describe("sealed shrine", () => {
  it("reads nothing at level 0 and clamps to the last level", () => {
    const order = shrine.statues.find((s) => s.key === "order");
    expect(statueValues(order, 0)).toEqual([0, 0, 0, 0]);
    expect(statueValues(order, 999)).toEqual(order?.levels.at(-1));
  });

  it("maps each statue's columns to its stats", () => {
    const effects = shrineEffects(shrine, { ...emptyShrineLevels(), dragon: 17, order: 73, chaos: 17, demon: 37 });
    expect(effects.latent.STR).toBe(0.8);
    expect(effects.element.Fire).toBe(0.18);
    expect(effects).toMatchObject({ soulWeaponAtk: 0.35, atk: 0.45, hp: 1.6, skillDamage: 1.66 });
    expect(shrineEffects(shrine, emptyShrineLevels()).atk).toBe(0);
  });
});
