import { describe, expect, it } from "vitest";
import {
  clampLevel,
  equip,
  equippedKey,
  gearState,
  relicLevel,
  setGearLevel,
  setOwned,
  setRelicLevel,
  setSkillLevel,
  setSpiritLevel,
  skillLevel,
  soulWeaponOwned,
  spiritState,
  unknownEntries,
} from "./rules";
import { emptyProfile } from "./types";

describe("clampLevel", () => {
  it("keeps whole levels within range", () => {
    expect(clampLevel(36, 250)).toBe(36);
  });
  it("rounds fractions down", () => {
    expect(clampLevel(36.9, 250)).toBe(36);
  });
  it("caps at the max level", () => {
    expect(clampLevel(300, 250)).toBe(250);
  });
  it("turns negative and invalid input into 0", () => {
    expect(clampLevel(-3, 250)).toBe(0);
    expect(clampLevel(Number.NaN, 250)).toBe(0);
  });
  it("has no upper bound when the max is null", () => {
    expect(clampLevel(5000, null)).toBe(5000);
  });
});

describe("defaults", () => {
  it("untouched items read as not owned at level 0", () => {
    const p = emptyProfile();
    expect(skillLevel(p, "Fire Slash", 250)).toBe(0);
    expect(gearState(p, "weapons", "Common 4", 1700)).toEqual({ owned: false, level: 0 });
    expect(relicLevel(p, "HP Ring", 100)).toBe(0);
    expect(spiritState(p, "Sala", 1000)).toEqual({ owned: false, level: 0 });
    expect(soulWeaponOwned(p, "Innocence")).toBe(false);
    expect(equippedKey(p, "weapons")).toBeNull();
  });
});

describe("rule 1: equipping marks an item owned", () => {
  it("applies to gear", () => {
    const p = equip(emptyProfile(), "accessories", "Rare 2");
    expect(equippedKey(p, "accessories")).toBe("Rare 2");
    expect(gearState(p, "accessories", "Rare 2", 1700).owned).toBe(true);
  });
  it("applies to soul weapons", () => {
    const p = equip(emptyProfile(), "soulWeapons", "Innocence");
    expect(soulWeaponOwned(p, "Innocence")).toBe(true);
  });
  it("equipping another item replaces the first", () => {
    let p = equip(emptyProfile(), "weapons", "Common 4");
    p = equip(p, "weapons", "Epic 1");
    expect(equippedKey(p, "weapons")).toBe("Epic 1");
    expect(gearState(p, "weapons", "Common 4", 1700).owned).toBe(true);
  });
  it("equipping null unequips", () => {
    const p = equip(equip(emptyProfile(), "weapons", "Common 4"), "weapons", null);
    expect(equippedKey(p, "weapons")).toBeNull();
  });
});

describe("rule 2: removing ownership unequips and keeps the level", () => {
  it("applies to gear", () => {
    let p = setGearLevel(emptyProfile(), "weapons", "Epic 1", 120, 1700);
    p = equip(p, "weapons", "Epic 1");
    p = setOwned(p, "weapons", "Epic 1", false);
    expect(equippedKey(p, "weapons")).toBeNull();
    expect(gearState(p, "weapons", "Epic 1", 1700)).toEqual({ owned: false, level: 120 });
    const restored = setOwned(p, "weapons", "Epic 1", true);
    expect(gearState(restored, "weapons", "Epic 1", 1700).level).toBe(120);
  });
  it("only unequips the item being removed", () => {
    let p = equip(emptyProfile(), "weapons", "Epic 1");
    p = setOwned(p, "weapons", "Common 4", false);
    expect(equippedKey(p, "weapons")).toBe("Epic 1");
  });
  it("applies to soul weapons", () => {
    let p = equip(emptyProfile(), "soulWeapons", "Innocence");
    p = setOwned(p, "soulWeapons", "Innocence", false);
    expect(equippedKey(p, "soulWeapons")).toBeNull();
  });
});

describe("rule 3: a level above 0 marks gear and spirits owned", () => {
  it("applies to gear", () => {
    const p = setGearLevel(emptyProfile(), "weapons", "Rare 3", 10, 1700);
    expect(gearState(p, "weapons", "Rare 3", 1700)).toEqual({ owned: true, level: 10 });
  });
  it("level 0 does not mark ownership", () => {
    const p = setGearLevel(emptyProfile(), "weapons", "Rare 3", 0, 1700);
    expect(gearState(p, "weapons", "Rare 3", 1700).owned).toBe(false);
  });
  it("applies to spirits", () => {
    const p = setSpiritLevel(emptyProfile(), "Sala", 395, 1000);
    expect(spiritState(p, "Sala", 1000)).toEqual({ owned: true, level: 395 });
  });
});

describe("rule 4: a relic's level is its ownership", () => {
  it("stores only a level", () => {
    const p = setRelicLevel(emptyProfile(), "HP Ring", 100, 100);
    expect(p.relics["HP Ring"]).toEqual({ level: 100 });
    expect(relicLevel(p, "HP Ring", 100)).toBe(100);
  });
});

describe("rule 5: levels are clamped", () => {
  it("when set", () => {
    const p = setSkillLevel(emptyProfile(), "Fire Slash", 999, 250);
    expect(skillLevel(p, "Fire Slash", 250)).toBe(250);
  });
  it("when read against a lower max from newer data", () => {
    const p = setSkillLevel(emptyProfile(), "Fire Slash", 200, 250);
    expect(skillLevel(p, "Fire Slash", 130)).toBe(130);
  });
  it("a raised max keeps the stored level", () => {
    const p = setSkillLevel(emptyProfile(), "Fire Slash", 130, 130);
    expect(skillLevel(p, "Fire Slash", 250)).toBe(130);
  });
});

describe("rule 6: unknown entries", () => {
  it("are listed without being removed", () => {
    let p = setSkillLevel(emptyProfile(), "Fire Slash", 5, 250);
    p = setSkillLevel(p, "Old Skill", 9, 250);
    p = equip(p, "soulWeapons", "Retired Blade");
    const known = {
      skills: ["Fire Slash"], weapons: [], accessories: [],
      relics: [], spirits: [], soulWeapons: [],
    };
    expect(unknownEntries(p, known)).toEqual(["skills: Old Skill", "soulWeapons: Retired Blade"]);
    expect(p.skills["Old Skill"]).toEqual({ level: 9 });
  });
});

describe("actions", () => {
  it("return a new profile and leave the old one untouched", () => {
    const before = emptyProfile();
    const after = setSkillLevel(before, "Fire Slash", 3, 250);
    expect(before.skills).toEqual({});
    expect(after).not.toBe(before);
  });
});
