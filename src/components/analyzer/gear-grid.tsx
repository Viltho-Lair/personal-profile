"use client";

import Image from "next/image";
import { useState } from "react";
import { formatValue, type Gear } from "./equipment";
import { TIER_BORDER, TIER_TEXT } from "./tiers";

/** The game lays a tier out as one row of four tiles, grade 4 through grade 1. */
function byTier(items: Gear[]) {
  const rows = new Map<string, Gear[]>();
  for (const item of items) {
    const row = rows.get(item.tier) ?? [];
    row.push(item);
    rows.set(item.tier, row);
  }
  for (const row of rows.values()) {
    row.sort((a, b) => (b.grade ?? 0) - (a.grade ?? 0));
  }
  return [...rows.entries()];
}

function GearTile({
  gear,
  selected,
  onSelect,
}: {
  gear: Gear;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative aspect-square w-full rounded-md border bg-ink/[0.04] transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected
          ? "border-ink ring-1 ring-ink"
          : `${TIER_BORDER[gear.tier] ?? "border-ink/20"} hover:brightness-125`
      }`}
    >
      {gear.icon ? (
        <Image
          src={gear.icon}
          alt=""
          width={128}
          height={128}
          className="absolute inset-0 m-auto size-3/5 object-contain"
        />
      ) : null}
      <span className="absolute top-1 right-1.5 font-mono text-[9px] text-dim">
        {gear.dropProbability}%
      </span>
      {gear.grade ? (
        <span
          className={`absolute bottom-1 left-1.5 font-mono text-[9px] ${TIER_TEXT[gear.tier] ?? "text-dim"}`}
        >
          G{gear.grade}
        </span>
      ) : null}
    </button>
  );
}

function GearDetail({ gear }: { gear: Gear | null }) {
  if (!gear) {
    return (
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Pick an item to see its details.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {gear.icon ? (
          <Image
            src={gear.icon}
            alt=""
            width={128}
            height={128}
            className={`size-14 rounded-md border object-contain ${TIER_BORDER[gear.tier] ?? "border-ink/20"}`}
          />
        ) : null}
        <div>
          <p
            className={`font-mono text-[10px] tracking-[0.08em] uppercase ${TIER_TEXT[gear.tier] ?? "text-dim"}`}
          >
            {gear.tier}
          </p>
          <h3 className="text-base leading-tight font-medium">{gear.rarity}</h3>
        </div>
      </div>

      <dl className="grid gap-y-1 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        <div className="flex items-baseline justify-between gap-2">
          <dt>Grade</dt>
          <dd className="text-ink">{formatValue(gear.grade)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt>Drop rate</dt>
          <dd className="text-ink">{gear.dropProbability}%</dd>
        </div>
      </dl>

      <p className="border-t border-ink/15 pt-2 font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Equip and owned effects are not in the wiki data yet.
      </p>
    </div>
  );
}

export function GearGrid({ items }: { items: Gear[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {byTier(items).map(([tier, row]) => (
          <section key={tier} className="flex flex-col gap-2">
            <h3
              className={`font-mono text-[10px] tracking-[0.12em] uppercase ${TIER_TEXT[tier] ?? "text-dim"}`}
            >
              {tier}
            </h3>
            <div className="grid grid-cols-4 gap-2 sm:max-w-md">
              {row.map((gear) => (
                <GearTile
                  key={gear.id}
                  gear={gear}
                  selected={gear.id === selectedId}
                  onSelect={() =>
                    setSelectedId(gear.id === selectedId ? null : gear.id)
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="shrink-0 rounded-lg border border-ink/15 p-3 lg:sticky lg:top-0 lg:w-64">
        <GearDetail gear={selected} />
      </aside>
    </div>
  );
}
