import { describe, expect, it } from "vitest";
import relicsData from "@/data/optimizer/relics.json";
import skillsData from "@/data/optimizer/skills.json";
import { importLegacyLevels, LEGACY_RELIC_NAMES, LEGACY_SKILL_NAMES } from "./migration";

describe("legacy name tables", () => {
  it("cover the 46 old skills and 12 old relics", () => {
    expect(Object.keys(LEGACY_SKILL_NAMES)).toHaveLength(46);
    expect(Object.keys(LEGACY_RELIC_NAMES)).toHaveLength(12);
  });

  it("only name items the optimizer data has", () => {
    const skills = new Set(skillsData.skills.map((s) => s.name));
    const relics = new Set(relicsData.relics.map((r) => r.name));
    expect(Object.values(LEGACY_SKILL_NAMES).filter((n) => !skills.has(n))).toEqual([]);
    expect(Object.values(LEGACY_RELIC_NAMES).filter((n) => !relics.has(n))).toEqual([]);
  });
});

describe("importLegacyLevels", () => {
  it("moves old id-keyed levels onto names", () => {
    const profile = importLegacyLevels('{"2":36,"1":5}', '{"0":100,"5":7}');
    expect(profile.skills).toEqual({ "Ice Stone": { level: 36 }, "Fire Slash": { level: 5 } });
    expect(profile.relics).toEqual({ "Strength Gloves": { level: 100 }, "Lucky Pendant": { level: 7 } });
  });

  it("keeps unknown ids rather than dropping them", () => {
    const profile = importLegacyLevels('{"99":4}', null);
    expect(profile.skills).toEqual({ "legacy-skill-99": { level: 4 } });
  });

  it("ignores unreadable or non-numeric input", () => {
    const profile = importLegacyLevels("not json", '{"0":"high"}');
    expect(profile.skills).toEqual({});
    expect(profile.relics).toEqual({});
  });
});
