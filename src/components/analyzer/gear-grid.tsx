"use client";

import { useState } from "react";
import { gearEffects } from "@/lib/game/formulas";
import { equippedKey, gearState } from "@/lib/profile/rules";
import type { GearKind } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { formatPercent, formatValue, GEAR_LEVEL_FACTORS, type Gear } from "./data";
import { InlineLevel } from "./level-input";
import { EquipButton, EquippedBadge, OwnedToggle } from "./profile-controls";
import { Sprite } from "./sprite";
import { TIER_BORDER, TIER_TEXT } from "./tiers";

const SECONDARY_LABELS: Record<string, string> = {
  critHitAt0: "Crit hit at Lv 0",
  goldBonus: "Gold bonus",
  critHitIncreaseAt0: "Crit hit increase at Lv 0",
  maxManaAt0: "Max mana at Lv 0",
  expBonus: "EXP bonus",
  manaRecoveryAt0: "Mana recovery at Lv 0",
};

/** The game lays a tier out as one row, grade 4 through grade 1. */
function byTier(items: Gear[]) {
  const rows = new Map<string, Gear[]>();
  for (const item of items) {
    rows.set(item.tier, [...(rows.get(item.tier) ?? []), item]);
  }
  for (const row of rows.values()) {
    row.sort((a, b) => (b.gradeNumber ?? 0) - (a.gradeNumber ?? 0));
  }
  return [...rows.entries()];
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function GearTile({
  gear,
  owned,
  level,
  equipped,
  selected,
  onSelect,
}: {
  gear: Gear;
  owned: boolean;
  level: number;
  equipped: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${gear.grade}${owned ? `, level ${level}` : ", not owned"}${equipped ? ", equipped" : ""}`}
      className={`relative aspect-square w-full rounded-md border bg-ink/[0.04] transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected
          ? "border-ink ring-1 ring-ink"
          : `${TIER_BORDER[gear.tier] ?? "border-ink/20"} hover:brightness-125`
      }`}
    >
      {gear.icon && gear.iconSize ? (
        <Sprite
          src={gear.icon}
          native={gear.iconSize}
          size={64}
          className={`absolute inset-0 m-auto ${owned ? "" : "opacity-35 grayscale"}`}
        />
      ) : null}
      {equipped ? <EquippedBadge /> : null}
      {owned ? (
        <span className="absolute top-1 right-1.5 font-mono text-[9px] text-ink tabular-nums">
          Lv {level}
        </span>
      ) : null}
      {gear.gradeNumber ? (
        <span className={`absolute bottom-1 left-1.5 font-mono text-[9px] ${TIER_TEXT[gear.tier] ?? "text-dim"}`}>
          G{gear.gradeNumber}
        </span>
      ) : null}
    </button>
  );
}

function GearDetail({ kind, gear }: { kind: GearKind; gear: Gear | null }) {
  const { profile, setGearLevel, setOwned, equip } = useProfile();

  if (!gear) {
    return (
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Pick a grade to set it up.
      </p>
    );
  }

  const state = gearState(profile, kind, gear.grade, gear.maxLevel);
  const equipped = equippedKey(profile, kind) === gear.grade;
  const effects = gearEffects(gear.multiplier, GEAR_LEVEL_FACTORS, state.level);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-2">
        {gear.icon && gear.iconSize ? (
          <Sprite
            src={gear.icon}
            native={gear.iconSize}
            size={128}
            className={`rounded-md border ${TIER_BORDER[gear.tier] ?? "border-ink/20"}`}
          />
        ) : null}
        <div>
          <p className={`font-mono text-[10px] tracking-[0.08em] uppercase ${TIER_TEXT[gear.tier] ?? "text-dim"}`}>
            {gear.tier}
          </p>
          <h3 className="text-base leading-tight font-medium">{gear.grade}</h3>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <OwnedToggle
          owned={state.owned}
          name={gear.grade}
          onChange={(owned) => setOwned(kind, gear.grade, owned)}
        />
        <InlineLevel
          value={state.level}
          min={0}
          max={gear.maxLevel}
          name={gear.grade}
          onChange={(level) => setGearLevel(kind, gear.grade, level, gear.maxLevel)}
        />
        <EquipButton
          equipped={equipped}
          name={gear.grade}
          onToggle={() => equip(kind, equipped ? null : gear.grade)}
        />
      </div>

      <dl className="grid gap-y-1 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        <Row label={`Equip effect at Lv ${state.level}`} value={formatPercent(effects.equip)} />
        <Row label={`Owned effect at Lv ${state.level}`} value={formatPercent(effects.owned)} />
        <Row label="Multiplier" value={formatValue(gear.multiplier)} />
        <Row label="Max level before awakening" value={formatValue(gear.baseMaxLevel)} />
        {Object.entries(gear.secondary).map(([key, value]) => (
          <Row key={key} label={SECONDARY_LABELS[key] ?? key} value={formatValue(value)} />
        ))}
      </dl>

      {kind === "weapons" && gear.tier === "Immortal" ? (
        <p className="border-t border-ink/15 pt-2 font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
          Weapon awakening also multiplies this grade. Awakening isn&apos;t
          modelled yet.
        </p>
      ) : null}
    </div>
  );
}

export function GearGrid({ kind, items }: { kind: GearKind; items: Gear[] }) {
  const { profile } = useProfile();
  const [selected, setSelected] = useState<string | null>(null);
  const equipped = equippedKey(profile, kind);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {byTier(items).map(([tier, row]) => (
          <section key={tier} className="flex flex-col gap-2">
            <h3 className={`font-mono text-[10px] tracking-[0.12em] uppercase ${TIER_TEXT[tier] ?? "text-dim"}`}>
              {tier}
            </h3>
            <div className="grid grid-cols-4 gap-2 sm:max-w-md">
              {row.map((gear) => {
                const state = gearState(profile, kind, gear.grade, gear.maxLevel);
                return (
                  <GearTile
                    key={gear.grade}
                    gear={gear}
                    owned={state.owned}
                    level={state.level}
                    equipped={equipped === gear.grade}
                    selected={selected === gear.grade}
                    onSelect={() => setSelected(selected === gear.grade ? null : gear.grade)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <aside className="shrink-0 rounded-lg border border-ink/15 p-3 lg:sticky lg:top-0 lg:w-72">
        <GearDetail kind={kind} gear={items.find((gear) => gear.grade === selected) ?? null} />
      </aside>
    </div>
  );
}
