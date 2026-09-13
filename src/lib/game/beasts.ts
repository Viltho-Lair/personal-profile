/** A beast from Companions Data: mounted effects and its skill (Y by awaken level 0..6). */
export type Beast = {
  name: string;
  family: "Wolf" | "Boar" | "Bat" | "Golem" | "Draco";
  tier: string;
  mounted: ("atk" | "mspd" | "affection")[];
  skill: { text: string; x: number | string; values: number[] };
};
type BeastStat = "combat" | "dracoCombat" | "atkAffection" | "mspd";
/** Percent values by tier, stat and awaken level, one per affection level from 1. */
export type BeastData = { beasts: Beast[]; tables: Record<string, Record<BeastStat, number[][]>> };
/** A beast's awaken level (null: not owned) and affection level. */
export type BeastState = { awaken: number | null; affection: number };

export const MAX_BEAST_AWAKEN = 6;

/** Affection is capped at 10 levels per awaken step: 10 at awaken 0, 70 at awaken 6. */
export const maxAffection = (awaken: number) => (awaken + 1) * 10;

/** A table value in percent for an owned beast; 0 when not owned. */
export function beastValue(data: BeastData, beast: Beast, state: BeastState | undefined, stat: BeastStat): number {
  if (!state || state.awaken === null) return 0;
  const levels = data.tables[beast.tier]?.[stat]?.[state.awaken] ?? [];
  const affection = Math.min(Math.max(1, state.affection), levels.length);
  return levels[affection - 1] ?? 0;
}

export type BeastTotals = {
  /** Owned effect on ATK, HP and HP Recovery, as a fraction (Companions Data GM2). */
  combat: number;
  /** Mounted effects as fractions: ATK (GM3, counted only while mounted), MSPD and affection. */
  mountedAtk: number;
  mspd: number;
  affection: number;
};

/**
 * Totals over every owned beast. As in the workbook, the mounted ATK of every
 * attack beast counts once any beast is mounted.
 */
export function beastTotals(data: BeastData, states: Record<string, BeastState>, mounted: boolean): BeastTotals {
  const totals: BeastTotals = { combat: 0, mountedAtk: 0, mspd: 0, affection: 0 };
  for (const beast of data.beasts) {
    const state = states[beast.name];
    totals.combat += beastValue(data, beast, state, beast.family === "Draco" ? "dracoCombat" : "combat") / 100;
    for (const effect of beast.mounted) {
      const value = beastValue(data, beast, state, effect === "mspd" ? "mspd" : "atkAffection") / 100;
      if (effect === "atk") totals.mountedAtk += mounted ? value : 0;
      else totals[effect] += value;
    }
  }
  return totals;
}

/** The skill's text with X and Y filled in for an awaken level. */
export function beastSkillText(beast: Beast, awaken: number | null): string {
  const y = awaken === null ? null : beast.skill.values[awaken];
  return beast.skill.text.replace("X", String(beast.skill.x)).replace("Y", y === null || y === undefined ? "Y" : String(y));
}
