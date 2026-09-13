import { describe, expect, it } from "vitest";
import accessoriesData from "@/data/optimizer/accessories.json";
import gearLevelsData from "@/data/optimizer/gear-levels.json";
import relicsData from "@/data/optimizer/relics.json";
import { bandAt, gearEffects, relicBuff, skillPower } from "./formulas";

function relic(name: string) {
  const found = relicsData.relics.find((r) => r.name === name);
  if (!found) throw new Error(`no relic ${name}`);
  return found;
}

describe("skillPower", () => {
  it("is not defined below level 1", () => {
    expect(skillPower(110, 11, 0)).toBeNull();
  });
  it("adds the per-level value after level 1", () => {
    expect(skillPower(110, 11, 1)).toBe(110);
    expect(skillPower(110, 11, 36)).toBe(495);
  });
});

describe("gearEffects", () => {
  it("matches the in-game Rusty Bracelet at level 297", () => {
    const common4 = accessoriesData.accessories.find((g) => g.grade === "Common 4");
    if (!common4) throw new Error("no Common 4 accessory");
    const { equip, owned } = gearEffects(common4.multiplier, gearLevelsData.factors, 297);
    expect(equip).toBeCloseTo(109.9, 1);
    expect(owned).toBeCloseTo(33.0, 1);
  });
  it("is the bare multiplier at level 0", () => {
    expect(gearEffects(7, [1, 1.375], 0)).toEqual({ equip: 7, owned: 7 * 0.3 });
  });
  it("stops at the end of the factor table", () => {
    expect(gearEffects(7, [1, 2], 50).equip).toBe(14);
  });
});

describe("relics", () => {
  it("match the game at level 100", () => {
    expect(relicBuff(relic("Strength Gloves").bands, 100, relic("Strength Gloves").percent)).toBeCloseTo(2200);
    expect(relicBuff(relic("Hunter's Eye").bands, 100, relic("Hunter's Eye").percent)).toBeCloseTo(400);
    expect(relicBuff(relic("HP Ring").bands, 100, relic("HP Ring").percent)).toBeCloseTo(1400);
  });
  it("use the 50-59 band at level 50", () => {
    expect(relicBuff(relic("Strength Gloves").bands, 50, relic("Strength Gloves").percent)).toBeCloseTo(400);
  });
  it("find the band that contains a level", () => {
    const bands = [
      { from: 0, to: 9, factor: 0.05 },
      { from: 10, to: null, factor: 0.1 },
    ];
    expect(bandAt(bands, 9)?.factor).toBe(0.05);
    expect(bandAt(bands, 10)?.factor).toBe(0.1);
  });
  it("keep flat relics unscaled", () => {
    const focus = relic("Focus Ring");
    expect(focus.percent).toBe(false);
    const top = focus.bands[focus.bands.length - 1];
    expect(relicBuff(focus.bands, 100, focus.percent)).toBeCloseTo(100 * top.factor);
  });
  it("apply a single flat band at every level", () => {
    const bracelet = relic("Bracelet of Speed");
    expect(relicBuff(bracelet.bands, 1, bracelet.percent)).toBeCloseTo(0.7);
    expect(relicBuff(bracelet.bands, 100, bracelet.percent)).toBeCloseTo(70);
  });
});
