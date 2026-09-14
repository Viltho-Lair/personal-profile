import { describe, expect, it } from "vitest";
import {
  setBossMonster,
  setNormalMonster,
  toggleManualSkill,
  addToSkillPreset,
  setShrineLevel,
  setOutfitOwned,
  setBeast,
  updateOrbAccessory,
  setMountedBeast,
  mountedBeast,
  presetBeast,
  setPresetBeast,
  setBeastMounted,
  selectLoadout,
  awakening,
  companionState,
  clampLevel,
  clearSkillPresetSlot,
  effectiveSkillLevel,
  equip,
  activeFamiliars,
  setRefinementLine,
  placeSoulGem,
  setSoulGem,
  effectiveSpiritLevel,
  equipFamiliar,
  selectPreset,
  setSpiritPresetSlot,
  toggleMainSpirit,
  familiarStars,
  isMasteryPageComplete,
  masteryLevel,
  openMasteryPages,
  equippedKey,
  gearState,
  proficiencyLevel,
  relicLevel,
  selectSkillPreset,
  setAwakening,
  setCompanionAdvancement,
  setCompanionPromotion,
  setCompanionSkillLevel,
  setFamiliarProficiency,
  setFamiliarStars,
  setFountainEffect,
  setGearLevel,
  setMasteryLevel,
  setMasteryPage,
  setOwned,
  setProficiencyLevel,
  setRelicLevel,
  setSkillLevel,
  setSkillsAtMax,
  setSpiritAwakening,
  setSpiritEnhance,
  setSpiritLevel,
  skillLevel,
  soulWeaponOwned,
  spiritState,
  unknownEntries,
} from "./rules";
import { emptyProfile, SKILL_PRESET_COUNT, SKILL_PRESET_SLOTS } from "./types";

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
    expect(spiritState(p, "Sala", 1000)).toEqual({ owned: false, level: 0, awakening: null, enhance: 1 });
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
    expect(spiritState(p, "Sala", 1000)).toEqual({ owned: true, level: 395, awakening: "Common", enhance: 1 });
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
    expect(unknownEntries(p, known)).toEqual([
      "skills: Old Skill",
      "soulWeapons: Retired Blade",
      "equippedSoulWeapon: Retired Blade",
    ]);
    expect(p.skills["Old Skill"]).toEqual({ level: 9 });
  });

  it("reports an equipped item even when its stored gear/soul-weapon entry is known", () => {
    let p = equip(emptyProfile(), "weapons", "Retired Grade");
    p = equip(p, "accessories", "Rare 2");
    const known = {
      skills: [], weapons: ["Retired Grade"], accessories: ["Rare 2"],
      relics: [], spirits: [], soulWeapons: [],
    };
    expect(unknownEntries(p, known)).toEqual([]);

    const renamed = { ...known, weapons: [] };
    expect(unknownEntries(p, renamed)).toEqual([
      "weapons: Retired Grade",
      "equippedWeapon: Retired Grade",
    ]);
  });

  it("does not report a null equipped slot", () => {
    const known = {
      skills: [], weapons: [], accessories: [],
      relics: [], spirits: [], soulWeapons: [],
    };
    expect(unknownEntries(emptyProfile(), known)).toEqual([]);
  });
});

describe("skill settings", () => {
  it("proficiency level is whole, capped at the table's last level, and 0 by default", () => {
    expect(proficiencyLevel(emptyProfile(), 328)).toBe(0);
    expect(proficiencyLevel(setProficiencyLevel(emptyProfile(), 400.7, 328), 328)).toBe(328);
    expect(proficiencyLevel(setProficiencyLevel(emptyProfile(), 12.9, 328), 328)).toBe(12);
  });

  it("max skills overrides every skill level without losing the typed levels", () => {
    let p = setSkillLevel(emptyProfile(), "Fire Slash", 12, 250);
    p = setSkillsAtMax(p, true);
    expect(effectiveSkillLevel(p, "Fire Slash", 250)).toBe(250);
    expect(effectiveSkillLevel(p, "Rave", 5)).toBe(5);
    p = setSkillsAtMax(p, false);
    expect(effectiveSkillLevel(p, "Fire Slash", 250)).toBe(12);
    expect(effectiveSkillLevel(p, "Rave", 5)).toBe(0);
  });

  it("starts with 5 empty presets of 10 slots, preset 1 selected", () => {
    const p = emptyProfile();
    expect(p.skillPresets).toHaveLength(SKILL_PRESET_COUNT);
    expect(p.skillPresets.every((slots) => slots.length === SKILL_PRESET_SLOTS && slots.every((s) => s === null))).toBe(true);
    expect(p.activeSkillPreset).toBe(0);
  });

  it("fills the first empty slot, top row then bottom row", () => {
    let p = addToSkillPreset(emptyProfile(), 1, "Fire Slash");
    p = addToSkillPreset(p, 1, "Ice Stone");
    expect(p.skillPresets[1].slice(0, 3)).toEqual(["Fire Slash", "Ice Stone", null]);
    expect(p.skillPresets[0].every((s) => s === null)).toBe(true);
  });

  it("refills a cleared slot before later ones", () => {
    let p = addToSkillPreset(emptyProfile(), 0, "Fire Slash");
    p = addToSkillPreset(p, 0, "Ice Stone");
    p = clearSkillPresetSlot(p, 0, 0);
    p = addToSkillPreset(p, 0, "Rave");
    expect(p.skillPresets[0].slice(0, 2)).toEqual(["Rave", "Ice Stone"]);
  });

  it("keeps a skill in a preset only once and ignores adds to a full preset", () => {
    let p = addToSkillPreset(emptyProfile(), 0, "Fire Slash");
    expect(addToSkillPreset(p, 0, "Fire Slash")).toBe(p);
    for (let i = 1; i < SKILL_PRESET_SLOTS; i += 1) p = addToSkillPreset(p, 0, `Skill ${i}`);
    expect(addToSkillPreset(p, 0, "One Too Many")).toBe(p);
  });

  it("selects presets 1-5 only", () => {
    expect(selectSkillPreset(emptyProfile(), 4).activeSkillPreset).toBe(4);
    expect(selectSkillPreset(emptyProfile(), 9).activeSkillPreset).toBe(0);
  });

  it("reports preset skills the data no longer has", () => {
    const p = addToSkillPreset(emptyProfile(), 2, "Retired Skill");
    const known = { skills: [], weapons: [], accessories: [], relics: [], spirits: [], soulWeapons: [] };
    expect(unknownEntries(p, known)).toEqual(["skillPresets: Retired Skill"]);
  });
});

describe("skill mastery", () => {
  const page1 = [{ id: "1-A", maxLevel: 10 }, { id: "1-B", maxLevel: 1 }];
  const page2 = [{ id: "2-A", maxLevel: 5 }];
  const pages = [{ nodes: page1 }, { nodes: page2 }, { nodes: [{ id: "3-A", maxLevel: 1 }] }];

  it("node levels are clamped to the node's max", () => {
    const p = setMasteryLevel(emptyProfile(), "1-A", 40, 10);
    expect(masteryLevel(p, "1-A", 10)).toBe(10);
    expect(masteryLevel(emptyProfile(), "1-A", 10)).toBe(0);
  });

  it("only page 1 is open until it is filled", () => {
    let p = setMasteryLevel(emptyProfile(), "1-A", 10, 10);
    expect(openMasteryPages(p, pages)).toBe(1);
    p = setMasteryLevel(p, "1-B", 1, 1);
    expect(isMasteryPageComplete(p, page1)).toBe(true);
    expect(openMasteryPages(p, pages)).toBe(2);
    expect(openMasteryPages(setMasteryPage(p, page2, true), pages)).toBe(3);
  });

  it("clearing a page closes the pages after it", () => {
    let p = setMasteryPage(setMasteryPage(emptyProfile(), page1, true), page2, true);
    expect(openMasteryPages(p, pages)).toBe(3);
    p = setMasteryPage(p, page1, false);
    expect(openMasteryPages(p, pages)).toBe(1);
  });
});

describe("black orb", () => {
  it("changes an accessory and one of its lines", () => {
    let p = updateOrbAccessory(emptyProfile(), "Fire", { level: 49, top: 34243 });
    p = updateOrbAccessory(p, "Fire", { line: { index: 2, change: { element: "Fire", value: 9 } } });
    expect(p.blackOrb.accessories.Fire).toMatchObject({ level: 49, top: 34243 });
    expect(p.blackOrb.accessories.Fire.lines[2]).toEqual({ element: "Fire", value: 9, bonus: 0 });
    expect(p.blackOrb.accessories.Water.level).toBe(0);
  });
});

describe("beasts", () => {
  it("clamps awaken and affection and dismounts a beast that's no longer owned", () => {
    let p = setBeast(emptyProfile(), "Gray Wolf", { awaken: 9, affection: 99 });
    expect(p.beasts["Gray Wolf"]).toEqual({ awaken: 6, affection: 70 });
    p = setMountedBeast(p, "Gray Wolf");
    expect(mountedBeast(p)).toBe("Gray Wolf");
    p = setBeast(p, "Gray Wolf", { awaken: null });
    expect(mountedBeast(p)).toBeNull();
  });

  it("keeps a picked beast unmounted until its mount box is ticked", () => {
    let p = setBeast(emptyProfile(), "Gray Wolf", { awaken: 1 });
    p = setPresetBeast(p, "Gray Wolf");
    expect(presetBeast(p)).toBe("Gray Wolf");
    expect(mountedBeast(p)).toBeNull();
    p = setBeastMounted(p, true);
    expect(mountedBeast(p)).toBe("Gray Wolf");
    p = setBeastMounted(p, false);
    expect(mountedBeast(p)).toBeNull();
    expect(presetBeast(p)).toBe("Gray Wolf");
  });
});

describe("loadouts", () => {
  it("saves each kind's preset into the active loadout and brings them back when switching", () => {
    let p = selectPreset(emptyProfile(), "spirits", 2);
    p = selectSkillPreset(p, 3);
    expect(p.loadouts[0]).toMatchObject({ spirits: 2, skills: 3 });
    p = selectLoadout(p, 1);
    expect(p.activeSkillPreset).toBe(0);
    expect(p.activePresets.spirits).toBe(0);
    p = selectPreset(p, "beasts", 4);
    expect(p.loadouts[1].beasts).toBe(4);
    p = selectLoadout(p, 0);
    expect(p.activePresets).toMatchObject({ spirits: 2, beasts: 0 });
    expect(p.activeSkillPreset).toBe(3);
  });
});

describe("appearance", () => {
  it("adds and removes owned outfits per group", () => {
    let p = setOutfitOwned(emptyProfile(), "guild", "Chef", true);
    expect(setOutfitOwned(p, "guild", "Chef", true)).toBe(p);
    expect(p.appearance).toEqual({ clothing: [], guild: ["Chef"] });
    p = setOutfitOwned(p, "guild", "Chef", false);
    expect(p.appearance.guild).toEqual([]);
  });
});

describe("sealed shrine", () => {
  it("clamps statue levels to the table", () => {
    const p = setShrineLevel(emptyProfile(), "order", 90, 73);
    expect(p.sealedShrine).toMatchObject({ order: 73, dragon: 0 });
    expect(setShrineLevel(p, "order", 73, 73)).toBe(p);
  });
});

describe("skill refinement", () => {
  it("fills lines up to the one being set and clears a changed option's value", () => {
    let p = setRefinementLine(emptyProfile(), "Fire Slash", 2, { option: "DMG Increase(%)" });
    p = setRefinementLine(p, "Fire Slash", 2, { value: 15 });
    expect(p.skillRefinement["Fire Slash"]).toEqual([
      { option: null, value: null },
      { option: null, value: null },
      { option: "DMG Increase(%)", value: 15 },
    ]);
    expect(setRefinementLine(p, "Fire Slash", 5, { value: 1 })).toBe(p);
  });
});

describe("soul engraving", () => {
  it("drops a gem from every plate when it changes shape or is cleared", () => {
    let p = setSoulGem(emptyProfile(), 0, { shape: 4, rarity: 2, level: 10, value: 6, soulWeaponAtk: 0 });
    p = placeSoulGem(p, "Pride", { gem: 0, row: 0, col: 0, rotation: 0 });
    p = placeSoulGem(p, "Pride", { gem: 0, row: 1, col: 1, rotation: 1 });
    expect(p.soulEngraving.plates.Pride).toEqual([{ gem: 0, row: 1, col: 1, rotation: 1 }]);
    p = setSoulGem(p, 0, { shape: 4, rarity: 3, level: 20, value: 9, soulWeaponAtk: 0 });
    expect(p.soulEngraving.plates.Pride).toHaveLength(1);
    p = setSoulGem(p, 0, { shape: 5, rarity: 3, level: 20, value: 9, soulWeaponAtk: 0 });
    expect(p.soulEngraving.plates.Pride).toEqual([]);
  });
});

describe("spirit presets and main spirits", () => {
  it("moves a spirit between slots of the active preset", () => {
    let p = setSpiritPresetSlot(emptyProfile(), 0, "Ark");
    p = setSpiritPresetSlot(p, 2, "Ark");
    expect(p.presets.spirits[0]).toEqual([null, null, "Ark"]);
  });

  it("gives other spirits the lowest main level once six are main", () => {
    const names = ["A", "B", "C", "D", "E", "F"];
    let p = emptyProfile();
    names.forEach((name, i) => {
      p = setSpiritLevel(toggleMainSpirit(p, name), name, 100 + i * 10, 1000);
    });
    p = setSpiritLevel(p, "G", 5, 1000);
    expect(effectiveSpiritLevel(p, "G", 1000)).toBe(100);
    expect(effectiveSpiritLevel(p, "F", 1000)).toBe(150);
    expect(toggleMainSpirit(p, "G").mainSpirits).toHaveLength(6);
    expect(effectiveSpiritLevel(toggleMainSpirit(p, "A"), "G", 1000)).toBe(5);
  });

  it("only counts the lineup once all six main spirits are owned, and unticks a spirit that's no longer owned", () => {
    const names = ["A", "B", "C", "D", "E", "F"];
    let p = emptyProfile();
    names.forEach((name) => {
      p = setSpiritAwakening(setSpiritLevel(toggleMainSpirit(p, name), name, 400, 1000), name, "Immortal A0");
    });
    p = setSpiritAwakening(p, "G", "Immortal A0");
    expect(effectiveSpiritLevel(p, "G", 1000)).toBe(400);
    p = setSpiritAwakening(p, "C", null);
    expect(p.mainSpirits).not.toContain("C");
    expect(effectiveSpiritLevel(p, "G", 1000)).toBe(0);
  });
});

describe("familiars", () => {
  it("are not owned until given stars, and stars cap at 11", () => {
    expect(familiarStars(emptyProfile(), "Hi")).toBeNull();
    expect(familiarStars(setFamiliarStars(emptyProfile(), "Hi", "attribute", 14), "Hi")).toBe(11);
    expect(familiarStars(setFamiliarStars(emptyProfile(), "Hi", "attribute", 0), "Hi")).toBe(0);
  });

  it("equipping marks a familiar owned and replaces the group's familiar", () => {
    let p = equipFamiliar(emptyProfile(), "battle", "Ku");
    expect(familiarStars(p, "Ku")).toBe(0);
    p = equipFamiliar(setFamiliarStars(p, "Sha", "battle", 9), "battle", "Sha");
    expect(activeFamiliars(p)).toEqual({ weapon: null, attribute: null, battle: "Sha" });
    expect(familiarStars(p, "Sha")).toBe(9);
  });

  it("removing a familiar unequips it", () => {
    let p = equipFamiliar(emptyProfile(), "weapon", "Na");
    p = setFamiliarStars(p, "Na", "weapon", null);
    expect(familiarStars(p, "Na")).toBeNull();
    expect(activeFamiliars(p).weapon).toBeNull();
  });

  it("equips into the active familiar preset only", () => {
    let p = equipFamiliar(emptyProfile(), "weapon", "Na");
    p = selectPreset(p, "familiars", 2);
    expect(activeFamiliars(p).weapon).toBeNull();
    p = equipFamiliar(p, "weapon", "Pe");
    expect(p.presets.familiars[0].weapon).toBe("Na");
    expect(activeFamiliars(p).weapon).toBe("Pe");
  });

  it("reports familiars and mastery nodes the data no longer has", () => {
    let p = equipFamiliar(emptyProfile(), "weapon", "Gone");
    p = setMasteryLevel(p, "11-A1", 1, 1);
    const known = {
      skills: [], weapons: [], accessories: [], relics: [], spirits: [], soulWeapons: [],
      masteryNodes: [], familiars: [],
    };
    expect(unknownEntries(p, known)).toEqual(["masteryNodes: 11-A1", "familiars: Gone"]);
  });
});

describe("awakening", () => {
  it("is 0 by default, separate for weapons and accessories, and capped", () => {
    let p = setAwakening(emptyProfile(), "weapons", 7, 30);
    p = setAwakening(p, "accessories", 99, 30);
    expect(awakening(p, "weapons", 30)).toBe(7);
    expect(awakening(p, "accessories", 30)).toBe(30);
    expect(awakening(emptyProfile(), "weapons", 30)).toBe(0);
  });
});

describe("spirit awakening and enhance", () => {
  it("choosing a tier owns the spirit; clearing it un-owns but keeps level and enhance", () => {
    let p = setSpiritAwakening(emptyProfile(), "Ark", "Mythic A2");
    p = setSpiritEnhance(setSpiritLevel(p, "Ark", 300, 1000), "Ark", 4);
    expect(spiritState(p, "Ark", 1000)).toEqual({ owned: true, level: 300, awakening: "Mythic A2", enhance: 4 });
    p = setSpiritAwakening(p, "Ark", null);
    expect(spiritState(p, "Ark", 1000)).toEqual({ owned: false, level: 300, awakening: null, enhance: 4 });
  });

  it("enhance stays between 1 and 5", () => {
    expect(spiritState(setSpiritEnhance(emptyProfile(), "Bo", 9), "Bo", 1000).enhance).toBe(5);
    expect(spiritState(setSpiritEnhance(emptyProfile(), "Bo", 0), "Bo", 1000).enhance).toBe(1);
  });

  it("the owned toggle sets or clears the tier", () => {
    let p = setOwned(emptyProfile(), "spirits", "Bo", true);
    expect(spiritState(p, "Bo", 1000).awakening).toBe("Common");
    p = setOwned(p, "spirits", "Bo", false);
    expect(spiritState(p, "Bo", 1000).awakening).toBeNull();
  });
});

describe("companions", () => {
  it("default to advancement 0, no skill levels and seven empty promotion rows", () => {
    const ellie = companionState(emptyProfile(), "Ellie");
    expect(ellie.advancement).toBe(0);
    expect(ellie.promotion).toHaveLength(7);
  });

  it("save advancement, skill levels and promotion rolls per companion", () => {
    let p = setCompanionAdvancement(emptyProfile(), "Zeke", 60, 48);
    p = setCompanionSkillLevel(p, "Zeke", "Lunatic", 140, 100);
    p = setCompanionPromotion(p, "Zeke", 2, { option: "Extra HP" });
    p = setCompanionPromotion(p, "Zeke", 2, { tier: 4 });
    const zeke = companionState(p, "Zeke");
    expect(zeke.advancement).toBe(48);
    expect(zeke.skills.Lunatic).toBe(100);
    expect(zeke.promotion[2]).toEqual({ option: "Extra HP", tier: 4 });
    expect(companionState(p, "Ellie").skills).toEqual({});
  });
});

describe("familiar proficiency and fountain", () => {
  it("saves proficiency levels and fountain effects", () => {
    let p = setFamiliarProficiency(emptyProfile(), "weapon", 12.7);
    p = setFountainEffect(p, 2, 0.35);
    p = setFountainEffect(p, 0, -1);
    expect(p.familiarProficiency).toEqual({ attribute: 0, weapon: 12, battle: 0 });
    expect(p.fountainEffects).toEqual([0, 0, 0.35, 0]);
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

describe("fight settings", () => {
  it("keeps boss and normal monster one or the other, with neither meaning the stages analysis", () => {
    let p = emptyProfile();
    expect([p.bossMonster, p.normalMonster]).toEqual([true, false]);
    p = setNormalMonster(p, true);
    expect([p.bossMonster, p.normalMonster]).toEqual([false, true]);
    p = setBossMonster(p, true);
    expect([p.bossMonster, p.normalMonster]).toEqual([true, false]);
    p = setBossMonster(p, false);
    expect([p.bossMonster, p.normalMonster]).toEqual([false, false]);
  });

  it("saves which skills are cast by hand with each skill preset", () => {
    let p = toggleManualSkill(emptyProfile(), "Rave");
    p = toggleManualSkill(p, "Familiar");
    expect(p.skillPresetManual[0]).toEqual(["Rave", "Familiar"]);
    p = selectSkillPreset(p, 1);
    expect(p.skillPresetManual[1]).toEqual([]);
    p = toggleManualSkill(p, "Supersonic");
    p = selectSkillPreset(p, 0);
    p = toggleManualSkill(p, "Rave");
    expect(p.skillPresetManual[0]).toEqual(["Familiar"]);
    expect(p.skillPresetManual[1]).toEqual(["Supersonic"]);
  });
});
