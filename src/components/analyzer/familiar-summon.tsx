"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  bestStar,
  combineGoals,
  COMBINE_BONUS,
  COMBINE_GAUGE,
  COMBINE_SLOTS,
  COMBINE_TARGETS,
  compareFills,
  emptyFamiliarSim,
  estimateFamiliars,
  FAMILIAR_BATCH,
  FAMILIAR_SUMMON_CHANCES,
  FAMILIAR_SUMMON_COSTS,
  FULL_BAR,
  goalKey,
  MAX_COMBINE_STAR,
  MAX_FAMILIAR_STAR,
  MAX_SUMMON_STAR,
  ROSTER_SIZE,
  sameChance,
  selfChance,
  SUMMON_BONUS,
  summonFamiliars,
  type CombineMode,
  type FamiliarGoal,
  type FillComparison,
  type FamiliarSim,
  type Fodder,
} from "@/lib/game/familiar-summon";
import { familiarStars } from "@/lib/profile/rules";
import type { FamiliarGroup } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { FAMILIARS, formatValue, type Familiar } from "./data";
import { segment, SEGMENTS } from "./nav-styles";
import { FamiliarArt } from "./skill-familiars";
import { ELEMENT_TEXT, TIER_BORDER, TIER_TEXT } from "./tiers";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const FIELD =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";
const BUTTON =
  "rounded-md border px-3 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";
const QUIET = `${BUTTON} border-ink/25 text-dim enabled:hover:border-ink/60 enabled:hover:text-ink`;
const LOUD = `${BUTTON} border-ink bg-ink text-ground enabled:hover:brightness-110`;

/** Auto summoning: this many bundles of 11 every tick, combining what they give as it goes. */
const AUTO_BATCHES = 50;
const AUTO_INTERVAL_MS = 100;

const GROUP_LABEL: Record<FamiliarGroup, string> = { weapon: "Weapon", attribute: "Attribute", battle: "Battle" };
const MODE_LABEL: Record<CombineMode, string> = { self: "Self type", same: "Same type" };
const NAMES = FAMILIARS.map((familiar) => familiar.name);
const BY_NAME = new Map(FAMILIARS.map((familiar) => [familiar.name, familiar]));
const STARS = Array.from({ length: MAX_COMBINE_STAR + 1 }, (_, star) => star);


const rarityAt = (familiar: Familiar | undefined, star: number) =>
  familiar?.stars.find((entry) => entry.star === star)?.rarity ?? null;

/** What a fodder set reads as: "3 × Hi + 2 × other Attribute". */
const fodderText = (fodder: Fodder, name: string, group: FamiliarGroup) =>
  [fodder.self ? `${fodder.self} × ${name}` : "", fodder.same ? `${fodder.same} × other ${GROUP_LABEL[group]}` : ""]
    .filter(Boolean)
    .join(" + ");

/** A familiar's art in its star's rarity colour, with a label underneath. */
function FamiliarTile({ name, star, label }: { name: string; star: number; label?: string }) {
  const familiar = BY_NAME.get(name);
  const rarity = rarityAt(familiar, star);
  return (
    <span
      title={`${name} · ${label ?? `${star}★`}`}
      className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-[3px] bg-ink/[0.04] ${
        rarity ? (TIER_BORDER[rarity] ?? "border-ink/20") : "border-ink/20"
      }`}
    >
      <span className="absolute inset-[10%] flex items-center justify-center [&_img]:h-full [&_img]:w-full">
        {familiar ? <FamiliarArt familiar={familiar} stars={star} size={64} /> : null}
      </span>
      <span
        className={`absolute inset-x-0 bottom-0 truncate bg-ground/70 text-center font-mono text-[7px] leading-tight ${
          rarity ? (TIER_TEXT[rarity] ?? "text-dim") : "text-dim"
        }`}
      >
        {label ?? `${star}★`}
      </span>
    </span>
  );
}

/** One of the two gauges, as the game draws them. */
function Gauge({ at, full, label }: { at: number; full: number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={full}
        aria-valuenow={at}
        className="relative h-3 overflow-hidden rounded-sm border border-ink/20 bg-ink/[0.06]"
      >
        <div className="absolute inset-y-0 left-0 bg-tier-epic" style={{ width: `${Math.min(100, (at / full) * 100)}%` }} />
      </div>
      <p className={LABEL}>
        {label} {formatValue(at)} / {formatValue(full)}
      </p>
    </div>
  );
}

/** A familiar's copies by star, as "0★ 12 · 3★ 1". */
function StarRow({ row, familiar }: { row: readonly number[]; familiar: Familiar | undefined }) {
  if (row.every((count) => !count)) return <span className="text-dim">none</span>;
  return (
    <>
      {row.map((count, star) =>
        count ? (
          <span key={star} className={TIER_TEXT[rarityAt(familiar, star) ?? ""] ?? "text-dim"}>
            {star}★ {formatValue(count)}
          </span>
        ) : null,
      )}
    </>
  );
}

/**
 * Familiar summoning, apart from the profile: pick a familiar, say what star it is at and what star you want, and
 * the estimate gives the diamonds that takes on average. The summon buttons try it out, and nothing here changes
 * the familiars you actually own.
 */
export function FamiliarSummon({ switcher }: { switcher: ReactNode }) {
  const { profile } = useProfile();
  const [goals, setGoals] = useState<FamiliarGoal[]>(() => [
    { name: FAMILIARS[0]!.name, group: FAMILIARS[0]!.group, from: 0, to: MAX_COMBINE_STAR },
  ]);
  const [mode, setMode] = useState<CombineMode>("self");
  const [target, setTarget] = useState<number>(FULL_BAR);
  const [feed, setFeed] = useState<Record<string, string[]>>({});
  const [sim, setSim] = useState<FamiliarSim>(() => emptyFamiliarSim(NAMES));
  const [auto, setAuto] = useState<"off" | "running" | "paused">("off");
  const [last, setLast] = useState<Record<string, number[]> | null>(null);
  // Pricing every fill is hundreds of runs, so it lands after the panel has drawn rather than holding it up.
  const [comparison, setComparison] = useState<FillComparison | null>(null);

  const key = goalKey(goals);
  const groups = useMemo(() => [...new Set(goals.map((goal) => goal.group))], [goals]);
  /** Each group's members that aren't goals, in the order they are fed. Another goal is never eaten. */
  const spares = useMemo(() => {
    const byGroup: Record<string, string[]> = {};
    for (const group of groups) {
      const members = FAMILIARS.filter(
        (familiar) => familiar.group === group && !goals.some((goal) => goal.name === familiar.name),
      ).map((familiar) => familiar.name);
      const order = feed[group];
      byGroup[group] =
        order && order.length === members.length && order.every((member) => members.includes(member)) ? order : members;
    }
    return byGroup;
  }, [groups, goals, feed]);

  const estimate = useMemo(() => estimateFamiliars(goals, mode, target), [goals, mode, target]);
  const other = useMemo(
    () => estimateFamiliars(goals, mode === "self" ? "same" : "self", target),
    [goals, mode, target],
  );
  /** The goal highest up the list that this run hasn't got to yet: where both gauges send their familiar. */
  const wanting = goals.find((goal) => (bestStar(sim, goal.name) ?? -1) < goal.to) ?? goals[0];
  const reached = goals.every((goal) => (bestStar(sim, goal.name) ?? -1) >= goal.to);

  // Every fill priced against the others, worked out once the panel is on screen rather than holding it up.
  useEffect(() => {
    const timer = window.setTimeout(() => setComparison(compareFills(goals, mode)), 0);
    return () => window.clearTimeout(timer);
  }, [goals, mode]);
  // The one in hand belongs to an older list until the next lands.
  const fills = comparison && goalKey(comparison.best.goals) === key && comparison.best.mode === mode ? comparison : null;

  const run = (count: number, diamonds: number, combine: boolean) => {
    const result = summonFamiliars(sim, count, diamonds, NAMES, wanting?.name ?? NAMES[0]!);
    const next = combine ? combineGoals(result.sim, goals, spares, mode, target) : result.sim;
    setSim(next);
    setLast(result.drawn);
    if (combine && goals.every((goal) => (bestStar(next, goal.name) ?? -1) >= goal.to)) setAuto("off");
  };

  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => {
    if (auto !== "running") return;
    const timer = window.setInterval(
      () => runRef.current(FAMILIAR_BATCH.summons * AUTO_BATCHES, FAMILIAR_BATCH.diamonds * AUTO_BATCHES, true),
      AUTO_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [auto]);

  const clear = () => {
    setAuto("off");
    setSim(emptyFamiliarSim(NAMES));
    setLast(null);
  };

  const combine = () => setSim((current) => combineGoals(current, goals, spares, mode, target));

  /** Moves one of a group's spares up or down its feeding order. */
  const moveSpare = (group: string, index: number, by: number) => {
    const next = [...(spares[group] ?? [])];
    const [member] = next.splice(index, 1);
    next.splice(Math.max(0, Math.min(next.length, index + by)), 0, member!);
    setFeed((current) => ({ ...current, [group]: next }));
  };

  /** Moves a goal up or down the priority list, which is what the two gauges follow. */
  const movePriority = (index: number, by: number) =>
    setGoals((current) => {
      const next = [...current];
      const [goal] = next.splice(index, 1);
      next.splice(Math.max(0, Math.min(next.length, index + by)), 0, goal!);
      return next;
    });

  const setGoal = (index: number, change: Partial<FamiliarGoal>) =>
    setGoals((current) => current.map((goal, i) => (i === index ? { ...goal, ...change } : goal)));

  const unpicked = FAMILIARS.filter((familiar) => !goals.some((goal) => goal.name === familiar.name));

  return (
    <section aria-label="Familiar summon" className="@container flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {switcher}
        <div className={SEGMENTS} role="group" aria-label="How the slots are filled">
          {(["self", "same"] as const).map((id) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={segment(mode === id)}>
              {MODE_LABEL[id]}
            </button>
          ))}
        </div>
        <div className={SEGMENTS} role="group" aria-label="How far the combine bar is filled">
          {COMBINE_TARGETS.map((fill) => (
            <button
              key={fill}
              type="button"
              aria-pressed={target === fill}
              onClick={() => setTarget(fill)}
              title={`Press each combine once the bar reaches ${fill}%`}
              className={segment(target === fill)}
            >
              {fill}%
            </button>
          ))}
        </div>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {sim.summons > 0 ? (
            <button type="button" onClick={clear} className={QUIET}>
              Clear
            </button>
          ) : null}
          {auto === "off" ? (
            <button
              type="button"
              onClick={() => setAuto("running")}
              disabled={reached || !goals.length}
              title={`Summon ${formatValue(FAMILIAR_BATCH.summons * AUTO_BATCHES)} every ${AUTO_INTERVAL_MS} ms and combine as it goes, until every goal is there or you stop`}
              className={QUIET}
            >
              Auto
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setAuto(auto === "running" ? "paused" : "running")} className={QUIET}>
                {auto === "running" ? "Pause" : "Resume"}
              </button>
              <button type="button" onClick={() => setAuto("off")} className={QUIET}>
                Stop
              </button>
            </>
          )}
          {FAMILIAR_SUMMON_COSTS.map((cost) => (
            <button
              key={cost.summons}
              type="button"
              onClick={() => run(cost.summons, cost.diamonds, false)}
              className={cost === FAMILIAR_BATCH ? LOUD : QUIET}
            >
              Summon Familiar {cost.summons} · {formatValue(cost.diamonds)}
            </button>
          ))}
        </span>
      </div>

      <div className="grid gap-3 @xl:grid-cols-2">
        <Gauge
          at={sim.summons % SUMMON_BONUS.full}
          full={SUMMON_BONUS.full}
          label={`Summon Bonus Select ${SUMMON_BONUS.star}-star Familiar +1`}
        />
        <Gauge at={sim.gauge} full={COMBINE_BONUS.full} label={`Combine Bonus Select ${COMBINE_BONUS.star}-star Familiar +1`} />
      </div>
      <p className={LABEL}>
        {sim.summons > 0 ? (
          <>
            <span className="text-tier-immortal">{formatValue(sim.diamonds)} diamonds spent</span> ·{" "}
            {formatValue(sim.summons)} summons · {formatValue(sim.combines)} combines ·{" "}
            {formatValue(sim.picks.summon)} × {SUMMON_BONUS.star}★ and {formatValue(sim.picks.combine)} ×{" "}
            {COMBINE_BONUS.star}★ picked ·{" "}
          </>
        ) : null}
        {reached
          ? "Every goal is there in this run"
          : wanting
            ? `Both gauges are going to ${wanting.name}, the highest goal still short of its star`
            : "Add a familiar to raise"}
      </p>

      <div className="grid min-h-0 gap-3 @3xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {/* The familiars to raise, in the order the gauges serve them. */}
          <div className="flex flex-col gap-1.5 rounded-md border border-ink/15 p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={LABEL}>Familiars to raise · first is top priority</h3>
              <select
                aria-label="Add a familiar to raise"
                value=""
                onChange={(event) => {
                  const familiar = FAMILIARS.find((entry) => entry.name === event.target.value);
                  if (!familiar) return;
                  setGoals((current) => [
                    ...current,
                    {
                      name: familiar.name,
                      group: familiar.group,
                      from: Math.min(MAX_COMBINE_STAR, familiarStars(profile, familiar.name) ?? 0),
                      to: MAX_COMBINE_STAR,
                    },
                  ]);
                }}
                className={FIELD}
                disabled={!unpicked.length}
              >
                <option value="">Add familiar…</option>
                {unpicked.map((familiar) => (
                  <option key={familiar.name} value={familiar.name}>
                    {familiar.name} ({GROUP_LABEL[familiar.group]})
                  </option>
                ))}
              </select>
            </div>
            {goals.length ? (
              <ul className="flex flex-col gap-1">
                {goals.map((goal, index) => {
                  const at = bestStar(sim, goal.name);
                  const owned = familiarStars(profile, goal.name);
                  return (
                    <li key={goal.name} className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-1">
                      <span className="w-4 text-right font-mono text-[10px] text-dim tabular-nums">{index + 1}</span>
                      <span className="w-9 shrink-0">
                        <FamiliarTile name={goal.name} star={at ?? goal.from} label={at === null ? "none" : undefined} />
                      </span>
                      <span className="flex min-w-24 flex-col">
                        <span className="font-mono text-[11px] text-ink">
                          {goal.name} <span className="text-[10px] text-dim">{GROUP_LABEL[goal.group as FamiliarGroup]}</span>
                        </span>
                        <span className="font-mono text-[10px] text-dim">
                          {at === null ? "none in this run" : `${at}★ in this run`}
                        </span>
                      </span>
                      <label className="flex items-center gap-1">
                        <span className={LABEL}>from</span>
                        <select
                          aria-label={`${goal.name} starts at`}
                          value={goal.from}
                          onChange={(event) => setGoal(index, { from: Number(event.target.value) })}
                          className={FIELD}
                        >
                          {STARS.map((star) => (
                            <option key={star} value={star}>
                              {star}★{star === owned ? " · yours" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-1">
                        <span className={LABEL}>to</span>
                        <select
                          aria-label={`${goal.name} goal`}
                          value={goal.to}
                          onChange={(event) => setGoal(index, { to: Number(event.target.value) })}
                          className={FIELD}
                        >
                          {STARS.filter((star) => star >= goal.from).map((star) => (
                            <option key={star} value={star}>
                              {star}★
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="font-mono text-[10px] text-dim">
                        {estimate.finished[index]
                          ? `done by ~${formatValue(estimate.finished[index]!)} summons`
                          : goal.to <= goal.from
                            ? "already there"
                            : ""}
                      </span>
                      <span className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Raise ${goal.name}'s priority`}
                          onClick={() => movePriority(index, -1)}
                          disabled={index === 0}
                          className={`${QUIET} px-1.5`}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label={`Lower ${goal.name}'s priority`}
                          onClick={() => movePriority(index, 1)}
                          disabled={index === goals.length - 1}
                          className={`${QUIET} px-1.5`}
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          aria-label={`Stop raising ${goal.name}`}
                          onClick={() => setGoals((current) => current.filter((_, i) => i !== index))}
                          className={`${QUIET} px-1.5`}
                        >
                          ✕
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="font-mono text-[10px] text-dim">Add the familiars you want to raise, most important first.</p>
            )}
            <p className="text-[10px] leading-snug text-dim">
              Both gauges let you choose, so their familiars go to the highest goal that still wants one — which is what
              priority buys. A goal is never fed to another goal, whatever group it is in.
            </p>
          </div>

          {/* The average for the whole list. */}
          <div className="flex flex-col gap-1 rounded-md border border-ink/15 p-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className={LABEL}>
                Diamonds on average · {goals.length === 1 ? `${goals[0]!.name} to ${goals[0]!.to}★` : `${goals.length} familiars`} ·{" "}
                {MODE_LABEL[mode]} at {target}%
              </h3>
              <span className="font-mono text-sm text-tier-immortal tabular-nums">
                {formatValue(estimate.diamonds)} <span className="text-[10px] text-dim">diamonds</span>
              </span>
            </div>
            {estimate.summons > 0 ? (
              <>
                <p className="font-mono text-[10px] text-dim">
                  About {formatValue(estimate.summons)} summons ({formatValue(estimate.batches)} × {FAMILIAR_BATCH.summons} at{" "}
                  {formatValue(FAMILIAR_BATCH.diamonds)}) · around {formatValue(estimate.copies)} of any one familiar among them,
                  one summon in {ROSTER_SIZE}
                </p>
                <p className="font-mono text-[10px] text-dim">
                  Half the runs were done by {formatValue(estimate.median.summons)} summons (
                  {formatValue(estimate.median.diamonds)}), nine in ten by {formatValue(estimate.likely.summons)} (
                  {formatValue(estimate.likely.diamonds)}) · over {formatValue(estimate.runs)} runs
                </p>
                <p className="font-mono text-[10px] text-dim">
                  The gauges do most of it: {formatValue(estimate.summonPicks)} × {SUMMON_BONUS.star}★ from{" "}
                  {formatValue(estimate.summons)} summons, and {formatValue(estimate.combinePicks)} × {COMBINE_BONUS.star}★ from{" "}
                  {formatValue(estimate.combines)} combines. Both let you choose, so each one goes to the goal highest up the list that still wants it.
                </p>
                <p className="font-mono text-[10px] text-ink">
                  {MODE_LABEL[mode === "self" ? "same" : "self"]} at {target}% would cost {formatValue(other.diamonds)} —{" "}
                  {other.diamonds === estimate.diamonds
                    ? "the same"
                    : other.diamonds > estimate.diamonds
                      ? `${formatValue(Math.round((other.diamonds / Math.max(1, estimate.diamonds)) * 10) / 10)}× more`
                      : `${formatValue(Math.round((estimate.diamonds / Math.max(1, other.diamonds)) * 10) / 10)}× less`}
                </p>
                {/* What each step costs and earns at this fill: the whole of the 25% argument is this table. */}
                <table className="mt-0.5 w-full font-mono text-[10px] text-dim tabular-nums">
                  <thead>
                    <tr className="border-b border-ink/10 text-left">
                      <th className="font-normal">Step</th>
                      <th className="font-normal">In the slots</th>
                      <th className="pr-2 text-right font-normal">Chance</th>
                      <th className="pr-2 text-right font-normal">Tries</th>
                      <th className="pr-2 text-right font-normal">Materials</th>
                      <th className="text-right font-normal">Gauge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.odds.map((step) => {
                      const spent = step.materials.self + step.materials.same;
                      return (
                        <tr key={step.star} className="border-b border-ink/5">
                          <td className="text-ink">
                            {step.star}★ → {step.star + 1}★
                          </td>
                          <td>{fodderText(step.fodder, "the familiar", (goals[0]?.group ?? "attribute") as FamiliarGroup)}</td>
                          <td className="pr-2 text-right">{step.bar}%</td>
                          <td className="pr-2 text-right">{formatValue(Math.round(step.attempts * 10) / 10)}</td>
                          <td className="pr-2 text-right">{formatValue(Math.round(spent * 10) / 10)}</td>
                          <td className={`text-right ${step.gauge ? "text-ink" : ""}`}>
                            {step.gauge ? formatValue(Math.round(step.gauge)) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-[10px] leading-snug text-dim">
                  Materials is what one star costs on average, and it does not move with the fill: half the chance is
                  twice the tries on half the materials. What moves is the gauge, because a miss pays out as well as a
                  hit — so a lower bar earns more {COMBINE_BONUS.star}★ for the same materials, and only at the stars
                  whose combines count for it.
                </p>
                <p className="text-[10px] leading-snug text-dim">
                  An average, not a promise. Fed nothing but its own copies and with no gauges at all, one 10★ alone
                  would be {formatValue(estimate.ownCopies)} copies of it at 0★ — the picks are what make it reachable. A
                  combine that misses loses its materials and leaves the familiar on the star it was already on.
                </p>
              </>
            ) : (
              <p className="font-mono text-[10px] text-dim">
                Every familiar on the list is already at the star it is after. Add one, or aim one higher.
              </p>
            )}
          </div>

          {/* Every fill priced against the others, which is the whole of the "is 25% faster" question. */}
          {estimate.summons > 0 ? (
            <div className="flex flex-col gap-1.5 rounded-md border border-ink/15 p-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className={LABEL}>Which fill is cheapest · {MODE_LABEL[mode]}</h3>
                {fills ? (
                  <span className="font-mono text-[11px] text-ink">
                    {fills.matters.length === 0 ? (
                      <span className="text-dim">Nothing here reaches a star the gauge counts, so the fill is free</span>
                    ) : fills.saved > 0 ? (
                      <>
                        <span className="text-tier-mythic">{fills.best.target}%</span> wins by{" "}
                        {formatValue(fills.saved)} diamonds
                      </>
                    ) : (
                      <>
                        <span className="text-tier-mythic">{FULL_BAR}%</span> wins: nothing lower pays for itself here
                      </>
                    )}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-dim">Working the fills out…</span>
                )}
              </div>
              {fills ? (
                <>
                  <ul className="flex flex-col gap-0.5">
                    {fills.fills.map((fill) => {
                      const best = fill.target === fills.best.target;
                      return (
                        <li
                          key={fill.target}
                          className={`grid grid-cols-[4rem_minmax(0,1fr)_auto] items-baseline gap-2 border-b border-ink/5 py-0.5 font-mono text-[10px] tabular-nums ${
                            best ? "text-ink" : "text-dim"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setTarget(fill.target)}
                            aria-pressed={target === fill.target}
                            className={`text-left outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              target === fill.target ? "text-ink underline" : "hover:text-ink"
                            }`}
                          >
                            {fill.target}%{best ? " ★" : ""}
                          </button>
                          <span>
                            {formatValue(fill.summons)} summons, half by {formatValue(fill.median.summons)} ·{" "}
                            {formatValue(fill.combines)} combines · {formatValue(fill.combinePicks)} ×{" "}
                            {COMBINE_BONUS.star}★
                          </span>
                          <span className={best ? "text-tier-immortal" : ""}>{formatValue(fill.diamonds)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-[10px] leading-snug text-dim">
                    {fills.matters.length === 0
                      ? `No combine on the way to these stars moves the combine gauge, so every fill costs the same and the only difference is how many times you press it.`
                      : `Only ${fills.matters.map((star) => `${star}★`).join(" and ")} care: those are the steps whose combines move the gauge, and the only ones where the bar can be set lower. Everything below them costs the same however you fill it.`}
                    {fills.best.target < FULL_BAR
                      ? ` A low bar is also a far swingier run — that is what the gap between the average and the halfway mark is telling you.`
                      : ""}
                  </p>
                </>
              ) : null}
            </div>
          ) : null}

          {/* Which of each group's spares get eaten first. */}
          <div className="flex flex-col gap-1.5 rounded-md border border-ink/15 p-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className={LABEL}>Spare familiars · fed to the goals in this order</h3>
              <span className="font-mono text-[10px] text-dim">
                {mode === "same"
                  ? "Same type fills every slot it can, so the spares are spent and raised"
                  : "Self type spends none of them — they are summoned and left"}
              </span>
            </div>
            {groups.map((group) => (
              <div key={group} className="flex flex-col gap-1">
                <h4 className={LABEL}>{GROUP_LABEL[group as FamiliarGroup]}</h4>
                {(spares[group] ?? []).length ? (
                  <ul className="flex flex-col gap-1">
                    {(spares[group] ?? []).map((member, index) => (
                      <li key={member} className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-1">
                        <span className="w-4 text-right font-mono text-[10px] text-dim tabular-nums">{index + 1}</span>
                        <span className="w-9 shrink-0">
                          <FamiliarTile
                            name={member}
                            star={bestStar(sim, member) ?? 0}
                            label={bestStar(sim, member) === null ? "none" : undefined}
                          />
                        </span>
                        <span className="flex min-w-24 flex-col">
                          <span className="font-mono text-[11px] text-ink">
                            {member}{" "}
                            <span className={`text-[10px] ${ELEMENT_TEXT[BY_NAME.get(member)?.element ?? ""] ?? "text-dim"}`}>
                              {BY_NAME.get(member)?.element}
                            </span>
                          </span>
                          <span className="flex flex-wrap gap-x-1.5 font-mono text-[9px] tabular-nums">
                            <StarRow row={sim.copies[member] ?? []} familiar={BY_NAME.get(member)} />
                          </span>
                        </span>
                        <span className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Feed ${member} sooner`}
                            onClick={() => moveSpare(group, index, -1)}
                            disabled={index === 0 || mode !== "same"}
                            className={`${QUIET} px-1.5`}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            aria-label={`Feed ${member} later`}
                            onClick={() => moveSpare(group, index, 1)}
                            disabled={index === (spares[group] ?? []).length - 1 || mode !== "same"}
                            className={`${QUIET} px-1.5`}
                          >
                            ▼
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-mono text-[10px] text-dim">
                    Every {GROUP_LABEL[group as FamiliarGroup]} familiar is a goal, so this group has no spares to feed
                    anyone.
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Everything summoned, and what is left once it has been combined. */}
          <div className="flex flex-col gap-1.5 rounded-md border border-ink/15 p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={LABEL}>Every familiar · summoned, and what is left after combining</h3>
              <button type="button" onClick={combine} disabled={!sim.summons} className={LOUD}>
                Combine
              </button>
            </div>
            <ul className="flex flex-col gap-0.5">
              {FAMILIARS.map((familiar) => {
                const inGroup = groups.includes(familiar.group);
                const isGoal = goals.some((goal) => goal.name === familiar.name);
                return (
                  <li
                    key={familiar.name}
                    className={`grid grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-2 border-b border-ink/10 py-0.5 ${
                      inGroup ? "" : "opacity-45"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-ink">
                      {familiar.name}
                      {isGoal ? <span className="text-tier-mythic"> ★</span> : null}{" "}
                      <span className="text-[9px] text-dim">{GROUP_LABEL[familiar.group]}</span>
                    </span>
                    <span className="flex flex-wrap gap-x-1.5 font-mono text-[9px] tabular-nums">
                      <StarRow row={sim.drawn[familiar.name] ?? []} familiar={familiar} />
                    </span>
                    <span className="flex flex-wrap gap-x-1.5 font-mono text-[9px] tabular-nums">
                      <StarRow row={sim.copies[familiar.name] ?? []} familiar={familiar} />
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="font-mono text-[9px] text-dim">
              Left column: summoned, the {SUMMON_BONUS.star}★ picks included. Right: what is left once combined. A
              familiar outside every goal&apos;s group is no help to any of them at all.
            </p>
            {last ? (
              <p className="font-mono text-[10px] text-dim">
                Last summon:{" "}
                {Object.entries(last)
                  .flatMap(([member, row]) => row.map((count, star) => ({ member, star, count })))
                  .filter((entry) => entry.count > 0)
                  .sort((a, b) => b.star - a.star)
                  .slice(0, 12)
                  .map((entry) => `${entry.star}★ ${entry.member}${entry.count > 1 ? ` x${entry.count}` : ""}`)
                  .join(", ")}
              </p>
            ) : (
              <p className="font-mono text-[10px] text-dim">
                Summon one or eleven at a time, or let Auto run until every goal is there. Your own familiars stay
                exactly as they are.
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h3 className={LABEL}>Familiar Summon Rate</h3>
            <dl className="font-mono text-[10px]">
              {FAMILIAR_SUMMON_CHANCES.map((chance, star) => (
                <div key={star} className="flex items-baseline justify-between gap-2 border-b border-ink/10 py-0.5">
                  <dt className={TIER_TEXT[rarityAt(BY_NAME.get(goals[0]?.name ?? ""), star) ?? ""] ?? "text-dim"}>{star}-Star</dt>
                  <dd className="text-ink tabular-nums">{chance}%</dd>
                </div>
              ))}
            </dl>
            <p className="text-[10px] leading-snug text-dim">
              Per summon, and then any of the {ROSTER_SIZE} familiars alike. {MAX_SUMMON_STAR}★ is the best a summon
              gives.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className={LABEL}>Combine gauge, by material</h3>
            <dl className="font-mono text-[10px]">
              <div className="flex items-baseline justify-between gap-2 border-b border-ink/10 py-0.5 text-dim">
                <dt>Used as material</dt>
                <dd className="flex gap-3">
                  <span className="w-8 text-right">Fail</span>
                  <span className="w-10 text-right">Success</span>
                </dd>
              </div>
              {COMBINE_GAUGE.map((row, star) =>
                row.fail || row.success ? (
                  <div key={star} className="flex items-baseline justify-between gap-2 border-b border-ink/10 py-0.5">
                    <dt className="text-ink">{star} stars</dt>
                    <dd className="flex gap-3 tabular-nums">
                      <span className="w-8 text-right text-dim">{row.fail}</span>
                      <span className="w-10 text-right text-ink">{row.success}</span>
                    </dd>
                  </div>
                ) : null,
              )}
            </dl>
            <p className="text-[10px] leading-snug text-dim">
              Nothing below 7★ moves this gauge, so the {COMBINE_BONUS.star}★ picks only start once the goal is deep in.
              Every {COMBINE_BONUS.full} gives one.
            </p>
          </div>

          <div className="flex flex-col gap-1 text-[10px] leading-snug text-dim">
            <h3 className={LABEL}>Combining</h3>
            <p>
              The familiar goes in with up to {COMBINE_SLOTS} others at the same star. Each one fills the bar by its own
              chance, and the combine goes through once the bar reaches 100%.
            </p>
            <dl className="font-mono">
              <div className="flex items-baseline justify-between gap-2 border-b border-ink/10 py-0.5 text-dim">
                <dt>Step</dt>
                <dd className="flex gap-3">
                  <span>Self</span>
                  <span>Same type</span>
                </dd>
              </div>
              {STARS.slice(0, MAX_COMBINE_STAR).map((star) => (
                <div key={star} className="flex items-baseline justify-between gap-2 border-b border-ink/10 py-0.5">
                  <dt className="text-ink">
                    {star}★ → {star + 1}★
                  </dt>
                  <dd className="flex gap-3 tabular-nums">
                    <span className="w-10 text-right text-ink">{selfChance(star)}%</span>
                    <span className="w-12 text-right">{sameChance(star)}%</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p>
              <span className="text-ink">Self type</span> is another copy of the same familiar.{" "}
              <span className="text-ink">Same type</span> is any other familiar of its group, and it is worth half as
              much. Nothing outside the group counts.
            </p>
            <p>
              7★ and 8★ are the wall: five same type familiars only reach 62.5%, so those two steps take three of its
              own and two of the group whichever mode you pick.
            </p>
            <p>
              {MAX_COMBINE_STAR}★ is as far as combining goes. The {MAX_FAMILIAR_STAR}th star takes a special awakening,
              which isn&apos;t priced here.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
