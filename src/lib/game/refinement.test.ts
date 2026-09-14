import { describe, expect, it } from "vitest";
import data from "@/data/optimizer/skill-refinement.json";
import { optionLabel, ownedEffect, refinementEffects, refinementOptions, tierOf, type RefinementData } from "./refinement";

const refinement = data as unknown as RefinementData;

describe("skill refinement", () => {
  it("offers cooldown skills Cooldown Reduction and hit skills Required Strikes", () => {
    expect(refinementOptions(refinement, "seconds")).toContain("Cooldown Reduction(%)");
    expect(refinementOptions(refinement, "seconds")).not.toContain("Reduction in Required Strikes(%)");
    expect(refinementOptions(refinement, "hits")).toContain("Reduction in Required Strikes(%)");
    expect(refinementOptions(refinement, "hits")).toHaveLength(6);
  });

  it("names the enemy element from the damage cycle", () => {
    expect(optionLabel("DMG dealt to attribute enemies(%)", "Water")).toBe("DMG dealt to Fire attribute enemies(%)");
    expect(optionLabel("DMG dealt to attribute enemies(%)", "Fire")).toBe("DMG dealt to Earth attribute enemies(%)");
  });

  it("colours values by range and counts top-colour lines for the owned effect", () => {
    expect(tierOf(refinement, "DMG Increase(%)", 13)).toBe(5);
    expect(tierOf(refinement, "DMG Increase(%)", 12)).toBe(4);
    const aqua = { option: "DMG Increase(%)", value: 15 };
    const red = { option: "DMG Increase(%)", value: 11 };
    expect(ownedEffect(refinement, "Fire Slash", [aqua, aqua, red])?.value).toBe(0);
    expect(ownedEffect(refinement, "Fire Slash", [aqua, aqua, aqua])).toMatchObject({ stat: "Character HP", value: 0.02, mythic: 3 });
    expect(ownedEffect(refinement, "Flame Slash", [aqua, aqua, aqua, aqua, aqua])?.value).toBe(0.09);
    // Only Aqua lines work: the red DMG line and a low cooldown roll add nothing.
    expect(refinementEffects(refinement, [aqua, red, { option: "Cooldown Reduction(%)", value: 1.0 }])).toMatchObject({ damage: 0.15, cooldown: 0 });
    expect(refinementEffects(refinement, [{ option: "Cooldown Reduction(%)", value: 1.5 }]).cooldown).toBeCloseTo(0.015);
  });
});
