import { describe, expect, it } from "vitest";
import accessoriesData from "@/data/optimizer/accessories.json";
import gearLevelsData from "@/data/optimizer/gear-levels.json";
import relicsData from "@/data/optimizer/relics.json";
import {
  awakeningStage,
  bandAt,
  gearEffects,
  rarityGroup,
  relicBuff,
  skillPower,
  spiritStat,
} from "./formulas";

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

describe("awakening", () => {
  it("changes art every 6 awakenings and shows 0-5 stars", () => {
    expect(awakeningStage(0)).toEqual({ art: 0, stars: 0 });
    expect(awakeningStage(5)).toEqual({ art: 0, stars: 5 });
    expect(awakeningStage(6)).toEqual({ art: 1, stars: 0 });
    expect(awakeningStage(29)).toEqual({ art: 4, stars: 5 });
    expect(awakeningStage(30)).toEqual({ art: 5, stars: 0 });
  });

  it("the awakened multiplier scales the Immortal equip effect", () => {
    const base = gearEffects(10_000_000, [1, 1.375], 1);
    const awakened = gearEffects(10_000_000, [1, 1.375], 1, 1.18);
    expect(awakened.equip).toBeCloseTo(base.equip * 1.18);
  });
});

describe("spiritStat", () => {
  it("is ratio x factor / 100, rounded up to 4 places", () => {
    // Ark ATK at Common level 0: 1.05 x 3.33 / 100 = 0.034965 -> 0.035
    expect(spiritStat(1.05, 3.33)).toBe(0.035);
    expect(spiritStat(1, 13.33)).toBe(0.1333);
  });

  it("names the rarity group of a tier", () => {
    expect(rarityGroup("Legendary A3")).toBe("Legendary");
    expect(rarityGroup("Epic")).toBe("Epic");
  });
});
