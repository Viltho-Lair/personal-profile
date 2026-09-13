import { describe, expect, it } from "vitest";
import data from "@/data/optimizer/beasts.json";
import { beastSkillText, beastTotals, beastValue, maxAffection, type BeastData } from "./beasts";

const beasts = data as unknown as BeastData;
const byName = (name: string) => beasts.beasts.find((b) => b.name === name)!;

describe("beasts", () => {
  it("reads the affection table by tier, awaken and level", () => {
    expect(beastValue(beasts, byName("Shadow Wolf"), { awaken: 3, affection: 20 }, "combat")).toBe(14.48);
    expect(beastValue(beasts, byName("Gray Wolf"), { awaken: null, affection: 20 }, "combat")).toBe(0);
    // Affection past the awaken cap reads the cap.
    expect(beastValue(beasts, byName("Gray Wolf"), { awaken: 0, affection: 50 }, "combat")).toBe(
      beastValue(beasts, byName("Gray Wolf"), { awaken: 0, affection: maxAffection(0) }, "combat"),
    );
  });

  it("counts every attack beast's mounted ATK only while mounted, and dracos by Draco Combat", () => {
    const states = { "Gray Wolf": { awaken: 0, affection: 1 }, "Brown Boar": { awaken: 0, affection: 1 }, "Light Draco": { awaken: 0, affection: 1 } };
    const riding = beastTotals(beasts, states, true);
    expect(riding.combat).toBeCloseTo((3 + 3 + 20) / 100);
    expect(riding.mountedAtk).toBeCloseTo((2 + 2) / 100);
    expect(beastTotals(beasts, states, false).mountedAtk).toBe(0);
    expect(riding.mspd).toBeCloseTo(0.02);
  });

  it("fills the skill text for an awaken level", () => {
    expect(beastSkillText(byName("Gray Wolf"), 2)).toBe("After 9 strike skills used, ATK +12% for 10s");
  });
});
