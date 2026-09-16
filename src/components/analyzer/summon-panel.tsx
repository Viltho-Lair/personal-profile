"use client";

import { useState } from "react";
import {
  awakeningCost,
  awakeningReach,
  MAX_AWAKENING_STAR,
  MAX_SUMMON_LEVEL,
  MIN_SUMMON_LEVEL,
  MYTHIC_G1,
  SUMMON_BATCH,
  SUMMON_CHANCES,
  SUMMON_RARITIES,
  summon,
  summonsToNext,
  type SummonRun,
} from "@/lib/game/summon";
import type { GearKind } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { ACCESSORIES, formatValue, WEAPONS, type Gear } from "./data";
import { Sprite } from "./sprite";
import { TIER_BORDER, TIER_TEXT } from "./tiers";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const FIELD =
  "w-24 rounded-md border border-ink/20 bg-transparent px-1.5 py-1 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink";
const BUTTON =
  "rounded-md border px-3 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

const GEAR: Record<GearKind, readonly Gear[]> = { weapons: WEAPONS, accessories: ACCESSORIES };
const gearByGrade = (kind: GearKind) => new Map(GEAR[kind].map((gear) => [gear.grade, gear]));

/** The rarity a grade name starts with ("Epic 3" -> "Epic"), for its colour. */
const rarityOf = (name: string) => name.slice(0, name.lastIndexOf(" "));

/** One summoned item: its art in its rarity's colour, with the grade underneath. */
function Drawn({ name, gear, count }: { name: string; gear: Gear | undefined; count?: number }) {
  const rarity = rarityOf(name);
  return (
    <span
      title={count ? `${name} x${formatValue(count)}` : name}
      className={`relative flex aspect-square w-full items-center justify-center rounded-md border-[3px] bg-ink/[0.04] ${TIER_BORDER[rarity] ?? "border-ink/20"}`}
    >
      {gear?.icon && gear.iconSize ? <Sprite src={gear.icon} native={gear.iconSize} size={gear.iconSize / 2} className="size-4/5" /> : null}
      <span className={`absolute inset-x-0 bottom-0 truncate text-center font-mono text-[7px] leading-tight ${TIER_TEXT[rarity] ?? "text-dim"}`}>
        {name}
      </span>
      {count && count > 1 ? (
        <span className="absolute top-0 right-0 rounded-sm bg-black/70 px-0.5 font-mono text-[8px] leading-tight text-white tabular-nums">
          {formatValue(count)}
        </span>
      ) : null}
    </span>
  );
}

/**
 * What the Mythic Grade 1 gear summoned so far, and the light shards held, awaken the Immortal weapon or accessory
 * to: most stars take one Mythic Grade 1, the three that change its look take four, and the last stars take light
 * shards, which come from breaking Mythic Grade 1 gear.
 */
function Awakening({ kind, mythicG1, shards }: { kind: GearKind; mythicG1: number; shards: number }) {
  const { profile } = useProfile();
  const from = Math.min(MAX_AWAKENING_STAR, kind === "weapons" ? profile.weaponAwakening : profile.accessoryAwakening);
  const reach = awakeningReach(from, mythicG1, shards);
  const toMax = awakeningCost(from, MAX_AWAKENING_STAR);
  const cost = (value: { mythicG1: number; shards: number }) =>
    [value.mythicG1 ? `${formatValue(value.mythicG1)} Mythic G1` : "", value.shards ? `${formatValue(value.shards)} shards` : ""]
      .filter(Boolean)
      .join(" + ") || "nothing";

  return (
    <div className="flex flex-col gap-1 rounded-md border border-ink/15 p-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={LABEL}>Awakening this {kind === "weapons" ? "weapon" : "accessory"}</h3>
        <span className="font-mono text-[11px] text-ink tabular-nums">
          {formatValue(from)}★{reach.stars > 0 ? ` → ${formatValue(reach.star)}★` : ""}{" "}
          <span className="text-[10px] text-dim">of {MAX_AWAKENING_STAR}★</span>
        </span>
      </div>
      <p className="font-mono text-[10px] text-dim">
        {formatValue(mythicG1)} Mythic Grade 1 summoned · {formatValue(shards)} light shards ·{" "}
        {reach.stars > 0 ? `${formatValue(reach.stars)} more star${reach.stars === 1 ? "" : "s"}` : "not enough for the next star"}
      </p>
      <p className="font-mono text-[10px] text-dim">
        {reach.next ? `Star ${formatValue(reach.star + 1)} takes ${cost(reach.next)}` : "Fully awakened"}
        {reach.short && (reach.short.mythicG1 || reach.short.shards) ? ` · short of ${cost(reach.short)}` : ""}
        {from < MAX_AWAKENING_STAR ? ` · ${formatValue(from)}★ to ${MAX_AWAKENING_STAR}★ takes ${cost(toMax)}` : ""}
      </p>
    </div>
  );
}

/**
 * The summon screen: set the summon level, how far into it you are and the light shards you hold, then summon
 * {@link SUMMON_BATCH} at a time. Every summon draws a rarity by the level's chances and a grade inside it, counts
 * toward the level, and each milestone passed hands over Ellie's Summon Gift Box.
 */
export function SummonPanel() {
  const { profile, setSummon, setOwned } = useProfile();
  const state = profile.summon;
  const kind = state.kind;
  const [last, setLast] = useState<SummonRun | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [summons, setSummons] = useState(0);
  const [gifts, setGifts] = useState(0);

  const toNext = summonsToNext(state.level);
  const chances = SUMMON_CHANCES[state.level]!;
  const grades = gearByGrade(kind);
  const item = kind === "weapons" ? "weapon" : "accessory";

  const run = (count: number) => {
    const result = summon({ level: state.level, progress: state.progress }, count);
    setSummon({ level: result.state.level, progress: result.state.progress });
    setLast(result);
    setSummons((n) => n + result.summons);
    setGifts((n) => n + result.rewards.reduce((sum, reward) => sum + reward.mythicG1, 0));
    setTotals((current) => {
      const next = { ...current };
      for (const [name, count] of Object.entries(result.drawn)) next[name] = (next[name] ?? 0) + count;
      return next;
    });
  };

  const clear = () => {
    setLast(null);
    setTotals({});
    setSummons(0);
    setGifts(0);
  };

  const ownAll = () => {
    for (const name of Object.keys(totals)) if (grades.has(name)) setOwned(kind, name, true);
  };

  const sorted = Object.entries(totals).sort((a, b) => GEAR[kind].findIndex((g) => g.grade === b[0]) - GEAR[kind].findIndex((g) => g.grade === a[0]));

  return (
    <section aria-label="Summon" className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex gap-1" role="group" aria-label="What to summon">
          {(["weapons", "accessories"] as const).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={kind === id}
              onClick={() => setSummon({ kind: id })}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                kind === id ? "border-ink bg-ink text-ground" : "border-ink/25 text-dim hover:border-ink hover:text-ink"
              }`}
            >
              {id === "weapons" ? "Weapons" : "Accessories"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>Summon level</span>
          <select
            aria-label="Summon level"
            value={state.level}
            onChange={(event) => setSummon({ level: Number(event.target.value), progress: 0 })}
            className="rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink"
          >
            {Array.from({ length: MAX_SUMMON_LEVEL - MIN_SUMMON_LEVEL + 1 }, (_, i) => MIN_SUMMON_LEVEL + i).map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>Summons this level</span>
          <input
            type="number"
            min={0}
            max={toNext ?? undefined}
            value={state.progress}
            aria-label="Summons made at this level"
            onChange={(event) => setSummon({ progress: Math.max(0, Math.floor(event.target.valueAsNumber || 0)) })}
            className={FIELD}
          />
          <span className={LABEL}>{toNext ? `of ${formatValue(toNext)}` : "max level"}</span>
        </label>
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>Light shards</span>
          <input
            type="number"
            min={0}
            value={state.shards}
            aria-label="Light shards"
            onChange={(event) => setSummon({ shards: Math.max(0, Math.floor(event.target.valueAsNumber || 0)) })}
            className={FIELD}
          />
        </label>
        <span className="ml-auto flex items-center gap-1.5">
          {summons > 0 ? (
            <button type="button" onClick={clear} className={`${BUTTON} border-ink/25 text-dim hover:border-ink/60 hover:text-ink`}>
              Clear
            </button>
          ) : null}
          <button type="button" onClick={() => run(SUMMON_BATCH)} className={`${BUTTON} border-ink bg-ink text-ground enabled:hover:brightness-110`}>
            Summon {SUMMON_BATCH}
          </button>
        </span>
      </div>

      {/* How far this level has come, with level 7's half-way gift box marked. */}
      <div className="flex flex-col gap-1">
        <div
          role="meter"
          aria-label={`Summon level ${state.level} progress`}
          aria-valuemin={0}
          aria-valuemax={toNext ?? 0}
          aria-valuenow={state.progress}
          className="relative h-3 overflow-hidden rounded-sm border border-ink/20 bg-ink/[0.06]"
        >
          <div className="absolute inset-y-0 left-0 bg-tier-epic" style={{ width: `${toNext ? Math.min(100, (state.progress / toNext) * 100) : 100}%` }} />
          {state.level === 7 ? <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-ink/50" /> : null}
        </div>
        <p className={LABEL}>
          Level {state.level}
          {toNext
            ? ` · ${formatValue(state.progress)} / ${formatValue(toNext)} ${item}s · ${formatValue(Math.max(0, toNext - state.progress))} to level ${state.level + 1}`
            : " · the highest summon level"}
          {state.level === 7 ? ` · a gift box half way, at ${formatValue(Math.floor((toNext ?? 0) / 2))}` : ""}
        </p>
      </div>

      {last?.rewards.length ? (
        <p className="rounded-md border border-tier-mythic/60 bg-tier-mythic/10 px-2 py-1 font-mono text-[11px] text-ink">
          Ellie&apos;s Summon Gift Box:{" "}
          {last.rewards.map((reward) => `level ${reward.at} gave ${reward.mythicG1} Mythic Grade 1`).join(" · ")}
        </p>
      ) : null}
      <Awakening kind={kind} mythicG1={totals[MYTHIC_G1] ?? 0} shards={state.shards} />

      <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {last && last.summons > 0 ? (
            <div className="flex flex-col gap-1">
              <h3 className={LABEL}>Last summon · {formatValue(last.summons)}</h3>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1">
                {Object.entries(last.drawn)
                  .sort((a, b) => GEAR[kind].findIndex((g) => g.grade === b[0]) - GEAR[kind].findIndex((g) => g.grade === a[0]))
                  .map(([name, count]) => (
                    <li key={name}>
                      <Drawn name={name} gear={grades.get(name)} count={count} />
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <p className="font-mono text-[10px] text-dim">
              Set your summon level, how far into it you are and your light shards, then summon {SUMMON_BATCH} {item}s at a
              time.
            </p>
          )}

          {summons > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className={LABEL}>
                  Everything summoned · {formatValue(summons)} summons{gifts ? ` · ${formatValue(gifts)} from gift boxes` : ""}
                </h3>
                <button type="button" onClick={ownAll} className={`${BUTTON} border-ink/25 text-dim hover:border-ink/60 hover:text-ink`}>
                  Mark as owned
                </button>
              </div>
              <dl className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-3 font-mono text-[10px]">
                {sorted.map(([name, count]) => (
                  <div key={name} className="flex items-baseline justify-between gap-2 border-b border-ink/10 py-0.5">
                    <dt className={TIER_TEXT[rarityOf(name)] ?? "text-dim"}>{name}</dt>
                    <dd className="text-ink tabular-nums">{formatValue(count)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <h3 className={LABEL}>Chances at level {state.level}</h3>
          <dl className="font-mono text-[10px]">
            {SUMMON_RARITIES.map((rarity) => (
              <div key={rarity} className="flex items-baseline justify-between gap-2 border-b border-ink/10 py-0.5">
                <dt className={TIER_TEXT[rarity] ?? "text-dim"}>{rarity}</dt>
                <dd className="text-ink tabular-nums">{chances[rarity]}%</dd>
              </div>
            ))}
          </dl>
          <p className="text-[10px] leading-snug text-dim">
            Inside a rarity: Grade 4 40%, Grade 3 30%, Grade 2 20%, Grade 1 10%. The higher the summon level, the
            better the equipment.
          </p>
        </div>
      </div>
    </section>
  );
}
