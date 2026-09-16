"use client";

import { useMemo } from "react";
import { useProfile } from "@/lib/profile/use-profile";
import { betterEquipment, lowestEquipment, type BetterEquipment, type EquipKind } from "./better-equipment";
import { Sprite } from "./sprite";
import { TIER_BORDER } from "./tiers";

const TITLE: Record<EquipKind, string> = { weapons: "Better Weapon", accessories: "Better Accessories", class: "Better Class" };
/** A class card has no rarity: the game frames it in cyan. */
const CLASS_BORDER = "border-cyan-300";

/**
 * As in the game, a card on the right of the render for each owned weapon, accessory or class better than the one
 * equipped: Better Weapon on top, then Better Accessories, then Better Class. Equipping one takes its card away and
 * the ones below move up. A fight that's playing takes the new stats at once (the chart retunes it), pool and all.
 */
export function EquipSuggestions() {
  const { profile, equip, updateCharacter } = useProfile();
  const items = useMemo(() => betterEquipment(profile), [profile]);
  if (!items.length) return null;

  const onEquip = (item: BetterEquipment) => {
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

/** One button: equip the weakest owned accessory or class, or a dim one when there's nothing to drop to. */
function LowestButton({ item, what, onEquip }: { item: BetterEquipment | null; what: string; onEquip: () => void }) {
  const title = item
    ? `Equip ${item.label}, the lowest ${what.toLowerCase()} owned: a smaller life pool leaves more life missing for Rage`
    : `No lower ${what.toLowerCase()} to equip`;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={!item}
      onClick={onEquip}
      className="flex h-full min-h-0 flex-1 items-center gap-1 overflow-hidden rounded-md border border-ink/25 bg-zinc-900 px-1 text-left outline-none hover:border-ink/60 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35"
    >
      {item?.icon && item.iconSize ? (
        <Sprite src={item.icon} native={item.iconSize} size={item.iconSize / 4} className="size-5" />
      ) : (
        <span aria-hidden className="size-5 shrink-0" />
      )}
      <span className="min-w-0 font-mono text-[7px] leading-tight tracking-[0.06em] text-white uppercase">
        Lowest
        <br />
        {what}
      </span>
    </button>
  );
}

/**
 * Right of the familiar: drop to the weakest owned accessory, and under it the weakest owned class, the gear that
 * carries the life pool. It's what players do before Rage, and in a fight that's playing the pool shrinks around
 * the life left at once.
 */
export function LowestEquip() {
  const { profile, equip, updateCharacter } = useProfile();
  const lowest = useMemo(() => lowestEquipment(profile), [profile]);
  return (
    <div className="flex w-[4.25rem] shrink-0 flex-col gap-1 self-stretch">
      <LowestButton item={lowest.accessory} what="Accessory" onEquip={() => lowest.accessory && equip("accessories", lowest.accessory.key)} />
      <LowestButton
        item={lowest.class}
        what="Class"
        onEquip={() => lowest.class && updateCharacter((c) => ({ ...c, equippedClass: lowest.class?.key ?? c.equippedClass }))}
      />
    </div>
  );
}
