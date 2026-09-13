"use client";

import Image from "next/image";
import { appearanceTotals, type Outfit, type OwnedAppearance } from "@/lib/game/appearance";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue } from "./data";
import { APPEARANCE } from "./stat-sources";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const FLAT = new Set(["Accuracy", "Dodge"]);

const effectText = (outfit: Outfit) =>
  FLAT.has(outfit.bonus) ? `+${formatValue(outfit.value)}` : `+${formatValue(Math.round(outfit.value * 10000) / 100)}%`;

function OutfitList({ group, items, title }: { group: keyof OwnedAppearance; items: Outfit[]; title: string }) {
  const { profile, setOutfitOwned } = useProfile();
  const owned = profile.appearance[group];
  const allOwned = items.every((item) => owned.includes(item.name));
  const totals = appearanceTotals(APPEARANCE, { clothing: [], guild: [], [group]: owned });
  const summary = [
    ["Character ATK", totals.atk, true],
    ["Character HP", totals.hp, true],
    ["Monster Gold", totals.gold, true],
    ["Extra EXP", totals.exp, true],
    ["Accuracy", totals.accuracy, false],
    ["Dodge", totals.dodge, false],
  ] as const;
  const shown = group === "guild" ? summary.slice(0, 2) : summary.slice(2);

  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={LABEL}>
          {title} · {owned.filter((name) => items.some((item) => item.name === name)).length}/{items.length} owned
        </h2>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={allOwned}
            onChange={(event) => items.forEach((item) => setOutfitOwned(group, item.name, event.target.checked))}
            className="size-3.5 accent-ink"
          />
          <span className={LABEL}>Own all</span>
        </label>
      </header>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-md bg-ink/[0.04] p-2 font-mono text-[10px] uppercase">
        {shown.map(([name, value, percent]) => (
          <div key={name} className="flex justify-between gap-2">
            <dt className="text-dim">{name}</dt>
            <dd className="text-ink tabular-nums">+{percent ? `${formatValue(Math.round(value * 10000) / 100)}%` : formatValue(value)}</dd>
          </div>
        ))}
      </dl>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2">
        {items.map((item) => {
          const isOwned = owned.includes(item.name);
          return (
            <li key={item.key}>
              <label
                className={`flex h-full cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors ${
                  isOwned ? "border-ink/40 bg-ink/[0.05]" : "border-ink/15 opacity-60 hover:opacity-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isOwned}
                  onChange={(event) => setOutfitOwned(group, item.name, event.target.checked)}
                  aria-label={`${item.name} owned`}
                  className="size-3.5 shrink-0 accent-ink"
                />
                {item.icon ? (
                  <Image src={item.icon} alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
                ) : null}
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs leading-tight">{item.name}</span>
                  <span className="font-mono text-[10px] text-dim">
                    {item.bonus} <span className="text-ink">{effectText(item)}</span>
                  </span>
                  {item.multiplier ? (
                    <span className="font-mono text-[9px] text-element-earth uppercase">
                      Promotion row {(item.promotionRow ?? 0) + 1} ×{item.multiplier}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Character → Appearance: owned clothing on the left, guild shop outfits on the right. */
export function AppearanceSection() {
  return (
    <div className="flex flex-col md:grid md:h-full md:min-h-0 md:grid-cols-2">
      <div className="min-h-0 overflow-auto border-b border-ink/15 p-3 pb-6 sm:p-4 md:border-r md:border-b-0 md:pb-20">
        <OutfitList group="clothing" items={APPEARANCE.clothing} title="Owned clothing" />
      </div>
      <div className="min-h-0 overflow-auto p-3 pb-20 sm:p-4">
        <OutfitList group="guild" items={APPEARANCE.guild} title="Guild shop outfits" />
      </div>
    </div>
  );
}
