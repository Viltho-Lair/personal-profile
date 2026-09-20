"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  bestStar,
  combineUp,
  COMBINE_BONUS,
  COMBINE_GAUGE,
  COMBINE_SLOTS,
  copiesNeeded,
  emptyFamiliarSim,
  estimateFamiliar,
  FAMILIAR_BATCH,
  FAMILIAR_SUMMON_CHANCES,
  FAMILIAR_SUMMON_COSTS,
  fodderFor,
  MAX_COMBINE_STAR,
  MAX_FAMILIAR_STAR,
  MAX_SUMMON_STAR,
  ROSTER_SIZE,
  sameChance,
  selfChance,
  SUMMON_BONUS,
  summonFamiliars,
  type CombineMode,
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

const groupOf = (name: string) => BY_NAME.get(name)?.group ?? "attribute";
const groupNames = (name: string) => FAMILIARS.filter((familiar) => familiar.group === groupOf(name)).map((f) => f.name);

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
  const [name, setName] = useState(FAMILIARS[0]?.name ?? "Na");
  const owned = familiarStars(profile, name);
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState(MAX_COMBINE_STAR);
  const [mode, setMode] = useState<CombineMode>("self");
  const [feed, setFeed] = useState<string[] | null>(null);
  const [sim, setSim] = useState<FamiliarSim>(() => emptyFamiliarSim(NAMES));
  const [auto, setAuto] = useState<"off" | "running" | "paused">("off");
  const [last, setLast] = useState<Record<string, number[]> | null>(null);

  // The star it starts at: your profile's, until you say otherwise. Your familiars are never touched.
  const start = from ?? Math.min(MAX_COMBINE_STAR, owned ?? 0);
  const goal = Math.max(start, to);
  const group = groupOf(name);
  // The rest of the group, in the order they are fed to it. Resets when the familiar changes.
  const kin = useMemo(() => {
    const members = groupNames(name).filter((member) => member !== name);
    return feed && feed.length === members.length && feed.every((member) => members.includes(member)) ? feed : members;
  }, [name, feed]);

  const estimate = useMemo(() => estimateFamiliar(start, goal, mode), [start, goal, mode]);
  const other = useMemo(() => estimateFamiliar(start, goal, mode === "self" ? "same" : "self"), [start, goal, mode]);
  const needs = useMemo(() => copiesNeeded(goal, mode), [goal, mode]);
  const reached = bestStar(sim, name);

  const run = (count: number, diamonds: number, combine: boolean) => {
    const result = summonFamiliars(sim, count, diamonds, NAMES, name);
    const next = combine ? combineUp(result.sim, name, [name, ...kin], mode, goal) : result.sim;
    setSim(next);
    setLast(result.drawn);
    if (combine && (bestStar(next, name) ?? -1) >= goal) setAuto("off");
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

  const combine = () => setSim((current) => combineUp(current, name, [name, ...kin], mode, goal));

  /** Moves one of the group up or down the feeding order. */
  const move = (index: number, by: number) => {
    const next = [...kin];
    const [member] = next.splice(index, 1);
    next.splice(Math.max(0, Math.min(next.length, index + by)), 0, member!);
    setFeed(next);
  };

  return (
    <section aria-label="Familiar summon" className="@container flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {switcher}
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>Familiar</span>
          <select
            aria-label="Familiar to raise"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setFrom(null);
              setFeed(null);
            }}
            className={FIELD}
          >
            {FAMILIARS.map((familiar) => (
              <option key={familiar.name} value={familiar.name}>
                {familiar.name} ({GROUP_LABEL[familiar.group]})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>from</span>
          <select aria-label={`${name} starts at`} value={start} onChange={(event) => setFrom(Number(event.target.value))} className={FIELD}>
            {STARS.map((star) => (
              <option key={star} value={star}>
                {star}★{star === owned ? " · yours" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>to</span>
          <select aria-label={`${name} goal`} value={goal} onChange={(event) => setTo(Number(event.target.value))} className={FIELD}>
            {STARS.filter((star) => star >= start).map((star) => (
              <option key={star} value={star}>
                {star}★{star === MAX_COMBINE_STAR ? " · as high as combining goes" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className={SEGMENTS} role="group" aria-label="How the slots are filled">
          {(["self", "same"] as const).map((id) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={segment(mode === id)}>
              {MODE_LABEL[id]}
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
              disabled={(reached ?? -1) >= goal}
              title={`Summon ${formatValue(FAMILIAR_BATCH.summons * AUTO_BATCHES)} every ${AUTO_INTERVAL_MS} ms and combine as it goes, until ${name} reaches ${goal}★ or you stop`}
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
        {reached === null ? `No ${name} summoned yet` : `${name} is at ${reached}★ in this run`}
      </p>

      <div className="grid min-h-0 gap-3 @3xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {/* The average, from the star it starts at. */}
          <div className="flex flex-col gap-1 rounded-md border border-ink/15 p-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className={LABEL}>
                Diamonds on average · {name} {start}★ → {goal}★ · {MODE_LABEL[mode]}
              </h3>
              <span className="font-mono text-sm text-tier-immortal tabular-nums">
                {formatValue(estimate.diamonds)} <span className="text-[10px] text-dim">diamonds</span>
              </span>
            </div>
            {goal > start ? (
              <>
                <p className="font-mono text-[10px] text-dim">
                  About {formatValue(estimate.summons)} summons ({formatValue(estimate.batches)} × {FAMILIAR_BATCH.summons} at{" "}
                  {formatValue(FAMILIAR_BATCH.diamonds)}) · around {formatValue(estimate.copies)} {name} of any star among them,
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
                  {formatValue(estimate.combines)} combines. Both let you choose, so every one of them is a {name}.
                </p>
                <p className="font-mono text-[10px] text-ink">
                  {MODE_LABEL[mode === "self" ? "same" : "self"]} would cost {formatValue(other.diamonds)} —{" "}
                  {other.diamonds === estimate.diamonds
                    ? "the same"
                    : other.diamonds > estimate.diamonds
                      ? `${formatValue(Math.round((other.diamonds / Math.max(1, estimate.diamonds)) * 10) / 10)}× more`
                      : `${formatValue(Math.round((estimate.diamonds / Math.max(1, other.diamonds)) * 10) / 10)}× less`}
                </p>
                <ul className="mt-0.5 grid gap-x-3 font-mono text-[10px] text-dim @xl:grid-cols-2">
                  {STARS.slice(0, goal).map((star) => (
                    <li key={star} className={star < start ? "opacity-50" : ""}>
                      <span className="text-ink">
                        {star}★ → {star + 1}★
                      </span>{" "}
                      {fodderText(fodderFor(star, mode), name, group)}
                      {needs.own[star + 1] ? ` · ${formatValue(needs.own[star + 1]!)} to make` : ""}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] leading-snug text-dim">
                  An average, not a promise. It fills all five slots to 100% every time, so no combine ever fails and the
                  gauges&apos; failure column never comes into it. Fed nothing but its own copies and with no gauges at
                  all, {goal}★ would be {formatValue(estimate.ownCopies)} of {name} at 0★ — the picks are what make it
                  reachable.
                </p>
              </>
            ) : (
              <p className="font-mono text-[10px] text-dim">
                {name} is already at {goal}★. Pick a higher star to price the rest of the way.
              </p>
            )}
          </div>

          {/* Which of the group gets eaten first. */}
          <div className="flex flex-col gap-1.5 rounded-md border border-ink/15 p-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className={LABEL}>{GROUP_LABEL[group]} familiars · fed to {name} in this order</h3>
              <span className="font-mono text-[10px] text-dim">
                {mode === "same"
                  ? `Same type fills every slot it can, so all three are spent and raised`
                  : `Self type spends none of them — they are summoned and left`}
              </span>
            </div>
            <ul className="flex flex-col gap-1">
              {kin.map((member, index) => (
                <li key={member} className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-1">
                  <span className="w-4 text-right font-mono text-[10px] text-dim tabular-nums">{index + 1}</span>
                  <span className="w-9 shrink-0">
                    <FamiliarTile name={member} star={bestStar(sim, member) ?? 0} label={bestStar(sim, member) === null ? "none" : undefined} />
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
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || mode !== "same"}
                      className={`${QUIET} px-1.5`}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label={`Feed ${member} later`}
                      onClick={() => move(index, 1)}
                      disabled={index === kin.length - 1 || mode !== "same"}
                      className={`${QUIET} px-1.5`}
                    >
                      ▼
                    </button>
                  </span>
                </li>
              ))}
            </ul>
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
                const inGroup = familiar.group === group;
                return (
                  <li
                    key={familiar.name}
                    className={`grid grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-2 border-b border-ink/10 py-0.5 ${
                      inGroup ? "" : "opacity-45"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-ink">
                      {familiar.name}
                      {familiar.name === name ? <span className="text-tier-mythic"> ★</span> : null}{" "}
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
              Left column: summoned, the {SUMMON_BONUS.star}★ picks included. Right: what is left once combined. The
              eight familiars outside {GROUP_LABEL[group]} are no help to {name} at all.
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
                Summon one or eleven at a time, or let Auto run until {name} reaches {goal}★. Your own familiars stay
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
                  <dt className={TIER_TEXT[rarityAt(BY_NAME.get(name), star) ?? ""] ?? "text-dim"}>{star}-Star</dt>
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
