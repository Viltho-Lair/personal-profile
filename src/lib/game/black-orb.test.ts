import { describe, expect, it } from "vitest";
import data from "@/data/optimizer/black-orb.json";
import { blackOrbEffects, emptyBlackOrb, type BlackOrbData, type OrbAccessory } from "./black-orb";

const orbData = data as unknown as BlackOrbData;

const accessory = (level: number, top: number, lines: OrbAccessory["lines"]): OrbAccessory => ({ level, top, lines });

describe("black orb", () => {
  it("doubles lines of the accessory's own element and spreads All lines", () => {
    const orb = emptyBlackOrb();
    orb.level = 10;
    orb.accessories.Fire = accessory(49, 34243, [
      { element: "Fire", value: 8, bonus: 1 },
      { element: "Water", value: 5, bonus: 0 },
      { element: "All", value: 7, bonus: 0 },
      { element: null, value: 0, bonus: 0 },
    ]);
    const effects = blackOrbEffects(orbData, orb);
    expect(effects.amp.Fire).toBeCloseTo(0.16 + 0.07);
    expect(effects.amp.Water).toBeCloseTo(0.05 + 0.07);
    expect(effects.amp.Earth).toBeCloseTo(0.07);
    // Awakening (+1) needs orb level 20.
    expect(effects.element.Fire).toBeCloseTo(342.43);
    expect(effects.element.Water).toBe(0);
  });

  it("adds awakening, bonus effects, resonance and level buffs once the orb is high enough", () => {
    const orb = emptyBlackOrb();
    orb.level = 51;
    const fourFire = accessory(49, 100, Array.from({ length: 4 }, () => ({ element: "Fire" as const, value: 5, bonus: 1 })));
    orb.accessories.Fire = fourFire;
    orb.accessories.Wind = accessory(49, 100, [
      { element: "Wind", value: 5, bonus: 0 },
      { element: "Wind", value: 5, bonus: 0 },
      { element: "Earth", value: 5, bonus: 0 },
      { element: "All", value: 6, bonus: 0 },
    ]);
    const effects = blackOrbEffects(orbData, orb);
    // 98 accessory levels give resonance to every attribute
    expect(effects.resonanceAll).toBeCloseTo(0.04);
    // Fire: 4 lines x (5% + 1%) doubled, own 4-line bonus, the Wind All line
    expect(effects.amp.Fire).toBeCloseTo(0.48 + 0.1 + 0.06 + effects.resonanceAll);
    // Wind: own 2 lines doubled + All, 2-line bonus 5%, Fire's 4-line bonus to every attribute
    expect(effects.amp.Wind).toBeCloseTo(0.2 + 0.06 + 0.05 + 0.1 + effects.resonanceAll);
    // 4 "+" levels awaken 40% of the top stat
    expect(effects.element.Fire).toBeCloseTo(1.4);
    expect(effects.totalLevels).toBe(98);
    expect(effects.hp).toBeGreaterThan(0);
    expect(effects.boss).toBeGreaterThan(0);
    expect(effects.monster).toBeGreaterThan(0);
  });
});
