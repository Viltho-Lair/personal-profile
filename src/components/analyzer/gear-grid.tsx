"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { awakeningStage, gearEffects } from "@/lib/game/formulas";
import { awakening, equippedKey, gearState } from "@/lib/profile/rules";
import type { GearKind } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import {
  AWAKENING,
  formatPercent,
  formatValue,
  GEAR_LEVEL_FACTORS,
  IMMORTAL_ART,
  MAX_AWAKENING,
  type AwakeningRow,
  type Gear,
} from "./data";
import { InlineLevel, SetAllLevels } from "./level-input";
import { EquipButton, EquippedBadge } from "./profile-controls";
import { Sprite } from "./sprite";
import { gearRarity, TIER_BORDER, TIER_TEXT } from "./tiers";

const SECONDARY_LABELS: Record<string, string> = {
  critHitAt0: "Crit hit at Lv 0",
  goldBonus: "Gold bonus",
  critHitIncreaseAt0: "Crit hit increase at Lv 0",
  maxManaAt0: "Max mana at Lv 0",
  expBonus: "EXP bonus",
  manaRecoveryAt0: "Mana recovery at Lv 0",
};

const AWAKEN_ITEM: Record<GearKind, string> = { weapons: "Orr", accessories: "Orb" };

function immortalArt(kind: GearKind, count: number) {
  const art = IMMORTAL_ART[kind];
  return [...art].reverse().find((entry) => count >= entry.from) ?? art[0];
}

/** Every grade's max level follows awakening; Immortal art does too. */
function awakened(kind: GearKind, gear: Gear, count: number, row: AwakeningRow): Gear {
  const withMax = { ...gear, maxLevel: row.maxLevel };
  if (gear.tier !== "Immortal") return withMax;
  const art = immortalArt(kind, count);
  return { ...withMax, icon: art.icon, iconSize: art.iconSize };
}

/** The Immortal grade's awakened multipliers and secondary stats, as Equipment Data computes them. */
function immortalStats(kind: GearKind, row: AwakeningRow, level: number) {
  if (kind === "weapons") {
    return {
      multiplier: row.weaponMultiplier,
      secondary: {
        critHitIncreaseAt0: row.weaponCritHit,
        goldBonus: level === 0 ? 0.25 : ((level + 10) * row.weaponGold) / 10,
      },
    };
  }
  return {
    multiplier: row.accessoryMultiplier,
    secondary: {
      maxManaAt0: row.accessoryMaxMana,
      expBonus: (level === 0 ? 0.05 : 0.05 + level * 0.005) * row.accessoryExp,
    },
  };
}

function Stars({ count }: { count: number }) {
  return (
    <span aria-hidden className="font-mono text-[9px] leading-none text-tier-immortal">
      {"★".repeat(count)}
      <span className="text-ink/20">{"★".repeat(5 - count)}</span>
    </span>
  );
}

function AwakeningControl({ kind }: { kind: GearKind }) {
  const { profile, setAwakening } = useProfile();
  const count = awakening(profile, kind, MAX_AWAKENING);
  const stage = awakeningStage(count);
  const art = immortalArt(kind, count);

  return (
    <div className="flex h-full flex-wrap items-center gap-3 rounded-lg border border-ink/15 p-2">
      <span
        className={`relative flex size-12 shrink-0 items-center justify-center rounded-md border-[3px] bg-ink/[0.04] ${TIER_BORDER[gearRarity("Immortal", count)]}`}
      >
        <Sprite src={art.icon} native={art.iconSize} size={32} className="size-10" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
          Awakening ({AWAKEN_ITEM[kind]})
          <select
            value={count}
            onChange={(event) => setAwakening(kind, Number(event.target.value), MAX_AWAKENING)}
            className="rounded-md border border-ink/20 bg-ground px-1.5 py-0.5 font-mono text-xs text-ink tabular-nums outline-none focus-visible:border-ink"
          >
            {AWAKENING.map((row) => (
              <option key={row.awakening} value={row.awakening}>
                {row.awakening}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Stars count={stage.stars} />
          <span className="font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
            Max level {AWAKENING[count].maxLevel}
          </span>
        </div>
      </div>
    </div>
  );
}

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
  rarity,
  stars,
  onSelect,
  onOwnedChange,
}: {
  gear: Gear;
  owned: boolean;
  level: number;
  equipped: boolean;
  selected: boolean;
  /** The colour tier it shows: its grade's, or Ancient / 30★ for an awakened Immortal. */
  rarity: string;
  stars: number | null;
  onSelect: () => void;
  onOwnedChange: (owned: boolean) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${gear.grade}${owned ? `, level ${level}` : ", not owned"}${equipped ? ", equipped" : ""}`}
        className={`relative block aspect-square w-full rounded-md border-[3px] bg-ink/[0.04] transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          selected
            ? "border-ink ring-1 ring-ink"
            : `${TIER_BORDER[rarity] ?? "border-ink/20"} hover:brightness-125`
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
        {equipped ? <EquippedBadge position="top-1 left-6" /> : null}
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
        {stars !== null ? (
          <span className="absolute inset-x-0 bottom-1 flex justify-center">
            <Stars count={stars} />
          </span>
        ) : null}
      </button>
      {/* Beside the tile's button rather than inside it, so ticking it doesn't also select the tile. */}
      <input
        type="checkbox"
        checked={owned}
        onChange={(event) => onOwnedChange(event.target.checked)}
        aria-label={`${gear.grade} owned`}
        title={owned ? "Owned" : "Not owned"}
        className="absolute top-1 left-1 z-20 size-3.5 cursor-pointer accent-ink"
      />
    </div>
  );
}

const NAV =
  "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-ink/25 bg-ground text-dim outline-none enabled:hover:border-ink enabled:hover:text-ink focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30";

function GearDetail({
  kind,
  gear,
  row,
  onPrev,
  onNext,
  position,
}: {
  kind: GearKind;
  gear: Gear | null;
  row: AwakeningRow;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  position: string;
}) {
  const { profile, setGearLevel, equip } = useProfile();

  // Left and right of the card: step through the grades from Common G4 to Immortal.
  const nav = (
    <>
      <button type="button" onClick={onPrev ?? undefined} disabled={!onPrev} aria-label="Previous grade" className={`${NAV} -left-4`}>
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      <button type="button" onClick={onNext ?? undefined} disabled={!onNext} aria-label="Next grade" className={`${NAV} -right-4`}>
        <ChevronRight aria-hidden className="size-4" />
      </button>
    </>
  );

  if (!gear) {
    return (
      <>
        {nav}
        <p className="px-6 font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
          Pick a grade to set it up, or step through them with the arrows.
        </p>
      </>
    );
  }

  const state = gearState(profile, kind, gear.grade, gear.maxLevel);
  const equipped = equippedKey(profile, kind) === gear.grade;
  const immortal = gear.tier === "Immortal" ? immortalStats(kind, row, state.level) : null;
  const effects = gearEffects(gear.multiplier, GEAR_LEVEL_FACTORS, state.level, immortal?.multiplier ?? 1);
  const secondary = immortal ? { ...gear.secondary, ...immortal.secondary } : gear.secondary;
  const rarity = gearRarity(gear.tier, row.awakening);

  return (
    <div className="flex flex-col gap-4 px-6 sm:flex-row sm:items-start">
      {nav}
      <div className="flex shrink-0 flex-col items-start gap-2">
        {gear.icon && gear.iconSize ? (
          <Sprite
            src={gear.icon}
            native={gear.iconSize}
            size={128}
            className={`rounded-md border-[3px] ${TIER_BORDER[rarity] ?? "border-ink/20"}`}
          />
        ) : null}
        <div>
          <p className={`font-mono text-[10px] tracking-[0.08em] uppercase ${TIER_TEXT[rarity] ?? "text-dim"}`}>
            {rarity} · {position}
          </p>
          <h3 className="text-base leading-tight font-medium">{gear.grade}</h3>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
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

      <dl className="grid max-w-sm gap-y-1.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        <Row label={`Equip effect at Lv ${state.level}`} value={formatPercent(effects.equip)} />
        <Row label={`Owned effect at Lv ${state.level}`} value={formatPercent(effects.owned)} />
        <Row label="Multiplier" value={formatValue(gear.multiplier)} />
        {immortal ? (
          <Row label={`Awakened ${AWAKEN_ITEM[kind]} multiplier`} value={`x${formatValue(immortal.multiplier)}`} />
        ) : null}
        <Row label={`Max level (awakening ${row.awakening})`} value={formatValue(gear.maxLevel)} />
        {Object.entries(secondary).map(([key, value]) => (
          <Row key={key} label={SECONDARY_LABELS[key] ?? key} value={formatValue(value)} />
        ))}
      </dl>
      </div>
    </div>
  );
}

export function GearGrid({ kind, items: baseItems }: { kind: GearKind; items: Gear[] }) {
  const { profile, setOwned, setGearLevels } = useProfile();
  const [selected, setSelected] = useState<string | null>(null);
  const equipped = equippedKey(profile, kind);
  const count = awakening(profile, kind, MAX_AWAKENING);
  const awakeningRow = AWAKENING[count];
  const items = baseItems.map((gear) => awakened(kind, gear, count, awakeningRow));
  const tiers = byTier(items);
  // Common G4 first through Immortal last, the order the tiers are laid out in.
  const order = tiers.flatMap(([, row]) => row);
  const index = order.findIndex((gear) => gear.grade === selected);
  const allOwned = items.every((gear) => gearState(profile, kind, gear.grade, gear.maxLevel).owned);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex w-full min-w-0 flex-col gap-4 sm:max-w-md">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex w-fit items-center gap-2 rounded-lg border border-ink/15 px-3 py-2 font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
            <input
              type="checkbox"
              checked={allOwned}
              onChange={(event) => items.forEach((gear) => setOwned(kind, gear.grade, event.target.checked))}
              aria-label={`Mark every ${kind === "weapons" ? "weapon" : "accessory"} as owned`}
              className="size-3.5 accent-ink"
            />
            Mark all as owned
          </label>
          {/* Every grade shares the awakening's max level. */}
          <SetAllLevels
            max={awakeningRow.maxLevel}
            name={kind === "weapons" ? "weapon" : "accessory"}
            onApply={(level) => setGearLevels(kind, items.map((gear) => gear.grade), level, awakeningRow.maxLevel)}
          />
        </div>
        {tiers.map(([tier, row]) => (
          <section key={tier} className="flex flex-col gap-2">
            <h3 className={`font-mono text-[10px] tracking-[0.12em] uppercase ${TIER_TEXT[gearRarity(tier, count)] ?? "text-dim"}`}>
              {gearRarity(tier, count)}
            </h3>
            <div className="grid grid-cols-4 gap-2">
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
                    rarity={gearRarity(gear.tier, count)}
                    stars={gear.tier === "Immortal" ? awakeningStage(count).stars : null}
                    onSelect={() => setSelected(selected === gear.grade ? null : gear.grade)}
                    onOwnedChange={(owned) => setOwned(kind, gear.grade, owned)}
                  />
                );
              })}
              {tier === "Immortal" ? (
                <div className="col-span-3">
                  <AwakeningControl kind={kind} />
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <aside className="relative mx-4 max-w-xl min-w-0 rounded-lg border border-ink/15 py-4 lg:sticky lg:top-0 lg:mx-5 lg:w-xl lg:shrink-0">
        <GearDetail
          kind={kind}
          row={awakeningRow}
          gear={order[index] ?? null}
          position={index >= 0 ? `${index + 1} of ${order.length}` : ""}
          onPrev={index > 0 ? () => setSelected(order[index - 1].grade) : null}
          onNext={index < order.length - 1 ? () => setSelected(order[(index + 1)].grade) : null}
        />
      </aside>
    </div>
  );
}
