/** Every guide, in reading order. Each slug has a page at src/app/guides/<slug>. */
export const GUIDES = [
  {
    slug: "how-to-use-the-analyzer",
    title: "How to use the Slayer Legends Analyzer",
    description:
      "A tab-by-tab walkthrough: entering your profile, reading the Stats Summary, and testing a promotion fight before you attempt it.",
    updated: "2026-09-13",
  },
  {
    slug: "how-stats-are-calculated",
    title: "How character stats are calculated",
    description:
      "Why some upgrades multiply your ATK while others barely move it: the grouped formula behind ATK, HP, crit, gold and EXP.",
    updated: "2026-09-13",
  },
  {
    slug: "character-progression",
    title: "Enhance, Growth, Promotion and Classes",
    description:
      "How the core character systems scale, with the level thresholds, promotion multipliers and class numbers that matter.",
    updated: "2026-09-13",
  },
  {
    slug: "skills",
    title: "Skills: power, Mastery, Refinement and Proficiency",
    description:
      "How skill power grows with level, and how Mastery, Refinement, Skill Proficiency, Skill Stones and Familiars add to it.",
    updated: "2026-09-13",
  },
  {
    slug: "equipment",
    title: "Weapons, accessories, relics and spirits",
    description:
      "Equip versus owned effects, awakening, relic level bands, spirit awakening tiers and soul weapon completion, with worked numbers.",
    updated: "2026-09-13",
  },
  {
    slug: "companions-and-beasts",
    title: "Companions and beasts",
    description:
      "Ellie, Zeke, Miho and Luna's passives, advancement and promotion rolls, and how owned and mounted beasts add to your stats.",
    updated: "2026-09-13",
  },
  {
    slug: "promotion-fights",
    title: "Promotion fights: how the simulator works",
    description:
      "How the analyzer estimates a promotion boss, models crits, death strikes, mana and skill timing, and decides whether you're ready.",
    updated: "2026-09-13",
  },
] as const;

export type GuideSlug = (typeof GUIDES)[number]["slug"];
