"use client";

import { useEffect, useState } from "react";
import { amplifiedSpiritStat, spiritStat } from "@/lib/game/formulas";
import { clampLevel, companionState, effectiveSpiritLevel, spiritState } from "@/lib/profile/rules";
import type { ProfileV1 } from "@/lib/profile/types";
import { SPIRIT_COMPANION_AMP, type Spirit } from "./data";

export type SpiritFactors = {
  tiers: string[];
  atkHp: Record<string, number[]>;
  goldExp: Record<string, number[]>;
};

export type SpiritStatKey = keyof Spirit["ratios"];

/** The factor matrices are large (23 tiers x 1,001 levels), so they load only when needed. */
export function useSpiritFactors() {
  const [factors, setFactors] = useState<SpiritFactors | null>(null);
  useEffect(() => {
    let active = true;
    import("@/data/optimizer/spirit-factors.json").then((module) => {
      if (active) setFactors(module.default as unknown as SpiritFactors);
    });
    return () => {
      active = false;
    };
  }, []);
  return factors;
}

/** The companion passive for the spirit's element, as its level x per-level amount. */
export function companionAmp(profile: ProfileV1, spirit: Spirit): { amount: number; source: string | null } {
  const amp = spirit.element ? SPIRIT_COMPANION_AMP[spirit.element] : undefined;
  if (!amp) return { amount: 0, source: null };
  const level = clampLevel(companionState(profile, amp.companion).skills[amp.skill] ?? 0, amp.maxLevel);
  return { amount: level * amp.perLevel, source: `${amp.companion} · ${amp.skill} Lv ${level}` };
}

/**
 * A spirit's stat as a fraction at its awakening and effective level, with the
 * Fountain of Circulation and companion amplifiers. `null` when not owned;
 * `undefined` while the factors are loading.
 */
export function spiritStatValue(
  profile: ProfileV1,
  spirit: Spirit,
  key: SpiritStatKey,
  factors: SpiritFactors | null,
): number | null | undefined {
  const state = spiritState(profile, spirit.name, spirit.maxLevel);
  if (!state.awakening) return null;
  const matrix = key === "atk" || key === "hp" ? "atkHp" : "goldExp";
  const factor = factors?.[matrix][state.awakening]?.[effectiveSpiritLevel(profile, spirit.name, spirit.maxLevel)];
  if (factor === undefined) return undefined;
  const fountain = profile.fountainEffects[spirit.fountainSlots[key] - 1] ?? 0;
  return amplifiedSpiritStat(spiritStat(spirit.ratios[key], factor), fountain, companionAmp(profile, spirit).amount);
}
