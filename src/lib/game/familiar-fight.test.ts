import { describe, expect, it } from "vitest";
import { familiarFightSkills, PE_REPEAT_SECONDS } from "@/components/analyzer/promotion-fight";
import { emptyProfile, type ProfileV1 } from "@/lib/profile/types";

const withFamiliars = (stars: number, battle = "Ku"): ProfileV1 => {
  const p = emptyProfile();
  p.familiars = { Hi: { stars }, [battle]: { stars }, Rion: { stars } };
  p.presets.familiars[0] = { attribute: "Hi", battle, weapon: "Rion" };
  return p;
};

describe("familiar specials", () => {
  it("only work once a familiar is at 11 stars", () => {
    const below = familiarFightSkills(withFamiliars(10), 60);
    expect(below.skill?.maxUses).toBe(1);
    expect(below.skill?.bonus).toBe(0);
    expect(below.specials).toEqual([]);
    expect(below.notes).toEqual([]);

    const maxed = familiarFightSkills(withFamiliars(11), 60);
    expect(maxed.skill?.maxUses).toBe(2);
    expect(maxed.skill?.bonus).toBeCloseTo(0.1);
    expect(maxed.specials.map((s) => s.name)).toEqual(["Rion"]);
    expect(maxed.notes).toEqual(["Hi: Addtional Burn DMG for 3s"]);
  });

  it("lets Pe repeat its attack at any stars, 10% faster at 11", () => {
    expect(familiarFightSkills(withFamiliars(8, "Pe"), 60).skill?.hitEvery).toBe(PE_REPEAT_SECONDS);
    expect(familiarFightSkills(withFamiliars(11, "Pe"), 60).skill?.hitEvery).toBeCloseTo(PE_REPEAT_SECONDS * 0.9);
  });
});
