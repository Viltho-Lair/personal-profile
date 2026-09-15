"use client";

import { useMemo } from "react";
import type { FightStats } from "@/lib/game/battle";
import type { ProfileV1 } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { betterEquipment, equipBetter, type BetterEquipment, type EquipKind } from "./better-equipment";
import { retuneFightRun } from "./fight-run";
import { fightInput, type FightTarget } from "./promotion-fight";
import { useSpiritFactors, type SpiritFactors } from "./spirit-stats";
import { Sprite } from "./sprite";
import { collectSources } from "./stat-sources";
import { TIER_BORDER } from "./tiers";

const TITLE: Record<EquipKind, string> = { weapons: "Better Weapon", accessories: "Better Accessories", class: "Better Class" };
/** A class card has no rarity: the game frames it in cyan. */
const CLASS_BORDER = "border-cyan-300";

/** The stats a fight reads, from a profile (skill buffs play out in the fight, so they're left out). */
function fightStats(profile: ProfileV1, factors: SpiritFactors | null, target: FightTarget): FightStats {
  const input = fightInput(collectSources(profile, factors, false), [], 0, [], undefined, target);
  return {
    attack: input.attack,
    critChance: input.critChance,
    critDamage: input.critDamage,
    deathStrikeChance: input.deathStrikeChance,
    deathStrikeDamage: input.deathStrikeDamage,
    extraDamage: input.extraDamage,
    elementAmp: input.elementAmp,
    bossDamage: input.bossDamage,
    attackSpeed: input.attackSpeed,
    movementSpeed: input.movementSpeed,
    maxHp: input.maxHp,
    hpRecovery: input.hpRecovery,
    maxMana: input.maxMana,
    manaRecovery: input.manaRecovery,
  };
}

/**
 * As in the game, a card on the right of the render for each owned weapon, accessory or class better than the one
 * equipped: Better Weapon on top, then Better Accessories, then Better Class. Equipping one takes its card away and
 * the ones below move up. In a fight that's playing, the new stats apply at once: more life grows the pool without
 * refilling what's missing.
 */
export function EquipSuggestions({ target }: { target: FightTarget }) {
  const { profile, equip, updateCharacter } = useProfile();
  const factors = useSpiritFactors();
  const items = useMemo(() => betterEquipment(profile), [profile]);
  if (!items.length) return null;

  const onEquip = (item: BetterEquipment) => {
    retuneFightRun(fightStats(equipBetter(profile, item), factors, target));
    if (item.kind === "class") updateCharacter((c) => ({ ...c, equippedClass: item.key }));
    else equip(item.kind, item.key);
  };

  return (
    <ul aria-label="Better equipment" className="pointer-events-none absolute top-1.5 right-1.5 flex flex-col gap-1">
      {items.map((item) => {
        const border = item.rarity ? (TIER_BORDER[item.rarity] ?? "border-ink/40") : CLASS_BORDER;
        return (
          <li key={item.kind} className={`pointer-events-auto flex items-center gap-1.5 rounded-md border-2 bg-black/75 p-1 pr-2 ${border}`}>
            <span className={`relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-sm border-[3px] bg-zinc-900 ${border}`}>
              {item.icon && item.iconSize ? <Sprite src={item.icon} native={item.iconSize} size={item.iconSize >= 64 ? item.iconSize / 2 : 32} className="size-full" /> : null}
              <span className="absolute inset-x-0 top-0 truncate bg-black/60 px-px text-center font-mono text-[6px] leading-tight text-white">
                {item.label}
              </span>
            </span>
            <span className="flex flex-col items-center gap-1">
              <span className="text-[11px] leading-none font-semibold whitespace-nowrap text-white">{TITLE[item.kind]}</span>
              <button
                type="button"
                onClick={() => onEquip(item)}
                aria-label={`Equip ${item.kind === "class" ? item.key : `${item.key} ${item.kind === "weapons" ? "weapon" : "accessory"}`}`}
                className="rounded-sm bg-white/15 px-2.5 py-0.5 font-mono text-[9px] tracking-[0.08em] text-white uppercase outline-none hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Equip
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
