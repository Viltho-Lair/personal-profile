import { clampLevel } from "./rules";
import { emptyProfile, type ProfileV1 } from "./types";

/**
 * Old skill ids, frozen on 2026-09-13 from the pre-optimizer
 * src/data/skills.json, which keyed saved levels by these ids.
 */
export const LEGACY_SKILL_NAMES: Readonly<Record<string, string>> = {
  "1": "Fire Slash", "2": "Ice Stone", "3": "Lightning Slash", "4": "Stone Strike",
  "5": "Fire Sword", "6": "Mana's Blessing", "7": "Lightning Stroke",
  "8": "Ground's Blessing", "9": "Hot Blast", "10": "Ice Shower", "11": "Agile",
  "12": "Power Strike", "13": "Flame Slash", "14": "Water Slash", "15": "Thunder Slash",
  "16": "Power Impact", "17": "Burning Sword", "18": "Flowing Blade", "19": "Speed Sword",
  "20": "Earth's Will", "21": "Flame Wave", "22": "Curved Blade", "23": "Fulgurous",
  "24": "Iron Will", "25": "Hellfire Slash", "26": "Dancing Waves", "27": "Wind Sword",
  "28": "Life Mana", "29": "Fire Blast", "30": "Ice Time", "31": "Thunderbolt Slash",
  "32": "Giga Strike", "33": "Rage", "34": "Meditation", "35": "Red Lightning",
  "36": "Giga Impact", "37": "Pillar of Fire", "38": "Blizzard", "39": "Supersonic",
  "40": "Demon Hunt", "41": "Warrior Burn", "42": "Strong Current", "43": "Lightning Body",
  "44": "Wrath of Gods", "45": "Rave", "46": "Mantra",
};

/**
 * Old relic ids from the pre-optimizer src/data/equipment.json. The wiki
 * spelled id 5 "Lucky Pendent"; it is mapped to the optimizer's spelling.
 */
export const LEGACY_RELIC_NAMES: Readonly<Record<string, string>> = {
  "0": "Strength Gloves", "1": "Hunter's Eye", "2": "HP Ring", "3": "Recovery Totem",
  "4": "Bracelet of Speed", "5": "Lucky Pendant", "6": "Focus Ring", "7": "Invisible Cloak",
  "8": "Silence Flame", "9": "Abyss's Water Drop", "10": "Eye of Typoon", "11": "Emperor Ring",
};

function parseLevels(raw: string | null): [string, number][] {
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data)) return [];
    return Object.entries(data).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1]),
    );
  } catch {
    return [];
  }
}

/** Build a profile from the two old id-keyed level stores. */
export function importLegacyLevels(
  skillRaw: string | null,
  relicRaw: string | null,
): ProfileV1 {
  const profile = emptyProfile();
  // Unknown ids are kept under a readable key so nothing is silently dropped.
  for (const [id, level] of parseLevels(skillRaw)) {
    profile.skills[LEGACY_SKILL_NAMES[id] ?? `legacy-skill-${id}`] = {
      level: clampLevel(level, null),
    };
  }
  for (const [id, level] of parseLevels(relicRaw)) {
    profile.relics[LEGACY_RELIC_NAMES[id] ?? `legacy-relic-${id}`] = {
      level: clampLevel(level, null),
    };
  }
  return profile;
}
