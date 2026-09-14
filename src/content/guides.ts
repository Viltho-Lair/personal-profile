/** Every guide, in reading order. Each slug has a page at src/app/guides/<slug>. */
export const GUIDES = [
  {
    slug: "how-to-use-the-analyzer",
    title: "How to use the Slayer Legends Analyzer",
    description:
      "A tab-by-tab walkthrough: entering your profile and resources, reading the Stats Summary, playing a promotion fight, and following its upgrade plan.",
    updated: "2026-09-14",
  },
  {
    slug: "how-stats-are-calculated",
    title: "How character stats are calculated",
    description:
      "Why some upgrades multiply your ATK while others barely move it: the grouped formulas behind ATK, HP, spirits, crit, gold, EXP and element damage.",
    updated: "2026-09-14",
  },
  {
    slug: "character-progression",
    title: "Enhance, Growth, Promotion and Classes",
    description:
      "How the core character systems scale, with the level thresholds, promotion multipliers, class numbers, Memory Tree and Constellation of Light that matter.",
    updated: "2026-09-14",
  },
  {
    slug: "skills",
    title: "Skills: power, Mastery, Refinement and Proficiency",
    description:
      "How skill power grows with level, how Mastery, Refinement, Proficiency, Skill Stones and Familiars add to it, and how skills play in a fight.",
    updated: "2026-09-14",
  },
  {
    slug: "equipment",
    title: "Weapons, accessories, relics and spirits",
    description:
      "Equip versus owned effects, awakening, relic level bands, spirit levels and partners, soul weapon completion, the Sealed Shrine and the Black Orb, with worked numbers.",
    updated: "2026-09-14",
  },
  {
    slug: "companions-and-beasts",
    title: "Companions and beasts",
    description:
      "Ellie, Zeke, Miho and Luna's passives, advancement and promotion rolls, how owned and mounted beasts add to your stats, and what beast skills do in a fight.",
    updated: "2026-09-14",
  },
  {
    slug: "promotion-fights",
    title: "Promotion fights: how the simulator works",
    description:
      "How the analyzer estimates a promotion boss, plays the fight with your skills, familiar, beast and spirits, reads the result, and plans the upgrades that win it.",
    updated: "2026-09-14",
  },
] as const;

export type GuideSlug = (typeof GUIDES)[number]["slug"];
