"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ANCIENT,
  ANCIENT_STEP,
  SPIRIT_BONUS_OPTIONS,
  combineAll,
  emptySim,
  EPIC,
  estimateSpirits,
  goalsReached,
  nextStep,
  rankAtLeast,
  rankIndex,
  rankLabel,
  SPIRIT_BATCH,
  SPIRIT_BONUS_EVERY,
  SPIRIT_GRADES,
  SPIRIT_RANKS,
  SPIRIT_SUMMON_CHANCES,
  SPIRIT_SUMMON_COSTS,
  SUMMON_GRADES,
  SWITCH_COST,
  settleMains,
  summonSpirits,
  switchElement,
  takeBonus,
  upgradeAll,
  upgradeGoal,
  type Rank,
  type SpiritGoal,
  type SpiritSim,
  type Upgrade,
} from "@/lib/game/spirit-summon";
import { formatValue, SPIRITS, type Spirit } from "./data";
import { Sprite } from "./sprite";
import { ELEMENT_TEXT, TIER_BORDER, TIER_TEXT } from "./tiers";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const FIELD =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";
const BUTTON =
  "rounded-md border px-3 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";
const QUIET = `${BUTTON} border-ink/25 text-dim enabled:hover:border-ink/60 enabled:hover:text-ink`;
const LOUD = `${BUTTON} border-ink bg-ink text-ground enabled:hover:brightness-110`;

/** Auto summoning: this many bundles of 11 every tick, raising the goals as it goes. */
const AUTO_BATCHES = 50;
const AUTO_INTERVAL_MS = 100;

const ROSTER = SPIRITS.map((spirit) => ({ name: spirit.name, element: spirit.element }));
const BY_NAME = new Map(SPIRITS.map((spirit) => [spirit.name, spirit]));
const ELEMENTS = [...new Set(ROSTER.map((spirit) => spirit.element).filter((element): element is string => !!element))];
const ANCIENT_RANK: Rank = { grade: ANCIENT, star: 0 };
const ANCIENT_SHARDS = ANCIENT_STEP.shards;

const art = (spirit: Spirit | undefined, grade: number) => spirit?.art[SPIRIT_GRADES[grade]!] ?? spirit;

/** A spirit's art in its grade's colour, with a label underneath. */
function SpiritTile({ name, grade, label, count }: { name: string; grade: number; label?: string; count?: number }) {
  const spirit = BY_NAME.get(name);
  const picture = art(spirit, grade);
  const tier = SPIRIT_GRADES[grade]!;
  return (
    <span
      title={`${name} · ${label ?? tier}${count ? ` x${formatValue(count)}` : ""}`}
      className={`relative flex aspect-square w-full items-center justify-center rounded-md border-[3px] bg-ink/[0.04] ${TIER_BORDER[tier] ?? "border-ink/20"}`}
    >
      {picture?.icon && picture.iconSize ? (
        <Sprite src={picture.icon} native={picture.iconSize} size={picture.iconSize / 4} className="size-4/5" />
      ) : null}
      <span className={`absolute inset-x-0 bottom-0 truncate text-center font-mono text-[7px] leading-tight ${TIER_TEXT[tier] ?? "text-dim"}`}>
        {label ?? name}
      </span>
      {count && count > 1 ? (
        <span className="absolute top-0 right-0 rounded-sm bg-black/70 px-0.5 font-mono text-[8px] leading-tight text-white tabular-nums">
          {formatValue(count)}
        </span>
      ) : null}
    </span>
  );
}

/** The last summon's best pulls, best first: "Legendary Ark, Epic Bo x2". */
function lastText(drawn: Record<string, number[]>): string {
  return Object.entries(drawn)
    .flatMap(([name, counts]) => counts.map((count, grade) => ({ name, count, grade })))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.grade - a.grade)
    .slice(0, 12)
    .map((entry) => `${SPIRIT_GRADES[entry.grade]} ${entry.name}${entry.count > 1 ? ` x${entry.count}` : ""}`)
    .join(", ");
}

/** What a goal's next step takes, in words. */
function stepText(rank: Rank | null, name: string, element: string | null): string {
  if (!rank) return `Summon a ${name} first`;
  const step = nextStep(rank);
  if (!step) return "Ancient: nothing left";
  const grade = SPIRIT_GRADES[step.fodder]!;
  const parts = [
    step.spirit ? `${step.spirit} ${grade} ${name}` : "",
    step.element ? `${step.element} ${grade} ${element ?? ""}`.trim() : "",
    step.shards ? `${formatValue(step.shards)} light shards` : "",
  ].filter(Boolean);
  return `${rankLabel(step.rank)} takes ${parts.join(" + ")}`;
}

/**
 * Spirit summoning, apart from the profile: every spirit starts from nothing. Pick the spirits to raise in order of
 * priority and how far; the estimate gives the diamonds that takes on average, and the summon buttons try it out.
 */
export function SpiritSummon({ switcher }: { switcher: ReactNode }) {
  const [sim, setSim] = useState<SpiritSim>(() => emptySim(ROSTER));
  const [summons, setSummons] = useState(0);
  const [spent, setSpent] = useState(0);
  const [picks, setPicks] = useState<string[][]>([]);
  const [goals, setGoals] = useState<SpiritGoal[]>([{ name: "Loar", rank: ANCIENT_RANK }]);
  const [lowerAsFodder, setLowerAsFodder] = useState(false);
  const [auto, setAuto] = useState<"off" | "running" | "paused">("off");
  const [log, setLog] = useState<string[]>([]);
  const [last, setLast] = useState<Record<string, number[]> | null>(null);
  const [switchFrom, setSwitchFrom] = useState("");
  const [switchTo, setSwitchTo] = useState<string>("random");

  const estimate = useMemo(() => estimateSpirits(goals, ROSTER), [goals]);
  const settled = useMemo(() => settleMains(sim, goals), [sim, goals]);
  const reached = goalsReached(settled, goals);
  const options = { lowerAsFodder };

  const say = (lines: string[]) => lines.length && setLog((current) => [...lines.reverse(), ...current].slice(0, 8));
  const describe = (step: Upgrade) =>
    `${step.name} ${rankLabel(step.from)} → ${rankLabel(step.to)}${step.used.length ? ` (used ${step.used.join(", ")} as fodder)` : ""}`;

  /** The bonus pick that helps most: a goal spirit first, highest priority first, then one of a goal's element. */
  const bestPick = (choices: string[]) => {
    for (const goal of goals) if (choices.includes(goal.name)) return goal.name;
    const elements = goals.map((goal) => BY_NAME.get(goal.name)?.element);
    return choices.find((name) => elements.includes(BY_NAME.get(name)?.element)) ?? choices[0]!;
  };

  const run = (count: number, diamonds: number, raise: boolean) => {
    const result = summonSpirits(sim, count, summons, ROSTER);
    let next = result.sim;
    let waiting = [...picks, ...result.bonuses];
    const lines: string[] = [];
    if (raise) {
      // Auto takes the bonus picks itself and raises the goals as it goes.
      for (const choices of waiting) next = takeBonus(next, bestPick(choices));
      waiting = [];
      const raised = upgradeAll(next, goals, ROSTER, options);
      next = raised.sim;
      lines.push(...raised.steps.filter((step) => step.to.star === 0 || step.used.length).map(describe));
      // Auto stops by itself once every goal is there, or when light shards are all a goal is waiting on.
      if (goalsReached(next, goals)) setAuto("off");
      const stuck = goals.filter((goal) => {
        const main = next.mains[goal.name];
        const step = main ? nextStep(main) : null;
        return main && step && step.shards > next.shards && !rankAtLeast(main, goal.rank);
      });
      if (stuck.length) {
        setAuto("off");
        lines.push(`${stuck.map((goal) => goal.name).join(", ")} needs ${formatValue(ANCIENT_SHARDS)} light shards for Ancient: set your light shards above`);
      }
    }
    setSim(settleMains(next, goals));
    setPicks(waiting);
    setSummons((n) => n + count);
    setSpent((n) => n + diamonds);
    setLast(result.drawn);
    say(lines);
  };

  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => {
    if (auto !== "running") return;
    const timer = window.setInterval(
      () => runRef.current(SPIRIT_BATCH.summons * AUTO_BATCHES, SPIRIT_BATCH.diamonds * AUTO_BATCHES, true),
      AUTO_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [auto]);

  const clear = () => {
    setAuto("off");
    setSim(emptySim(ROSTER, sim.shards));
    setSummons(0);
    setSpent(0);
    setPicks([]);
    setLog([]);
    setLast(null);
  };

  const pick = (name: string) => {
    setSim((current) => settleMains(takeBonus(current, name), goals));
    setPicks((current) => current.slice(1));
  };

  const raiseOne = (index: number) => {
    const step = upgradeGoal(settled, goals, index, ROSTER, options);
    if (!step) return;
    setSim(step.sim);
    say([describe(step)]);
  };

  const raiseAll = () => {
    const raised = upgradeAll(settled, goals, ROSTER, options);
    setSim(raised.sim);
    say(raised.steps.length ? raised.steps.map(describe) : ["Nothing can go up yet"]);
  };

  const doSwitch = () => {
    const result = switchElement(settled, switchFrom, switchTo, ROSTER);
    if (!result) return;
    setSim(settleMains(result.sim, goals));
    say([`Switched ${switchTo === "random" ? SWITCH_COST.random : SWITCH_COST.chosen} Epic ${switchFrom} for an Epic ${result.got}`]);
  };

  const setGoal = (index: number, change: Partial<SpiritGoal>) =>
    setGoals((current) => current.map((goal, i) => (i === index ? { ...goal, ...change } : goal)));
  const move = (index: number, by: number) =>
    setGoals((current) => {
      const next = [...current];
      const [goal] = next.splice(index, 1);
      next.splice(Math.max(0, Math.min(next.length, index + by)), 0, goal!);
      return next;
    });
  const unpicked = SPIRITS.filter((spirit) => !goals.some((goal) => goal.name === spirit.name));

  // Lower goals that would go into a higher one of the same element, for the warning.
  const fed = goals.flatMap((goal, index) =>
    goals
      .slice(index + 1)
      .filter((lower) => BY_NAME.get(lower.name)?.element === BY_NAME.get(goal.name)?.element)
      .map((lower) => `${lower.name} (priority ${goals.indexOf(lower) + 1}) into ${goal.name} (priority ${index + 1})`),
  );

  const bonusProgress = summons % SPIRIT_BONUS_EVERY;
  const switchable = SPIRITS.filter((spirit) => (settled.inventory[spirit.name]?.[EPIC] ?? 0) > 0);
  const switchCost = switchTo === "random" ? SWITCH_COST.random : SWITCH_COST.chosen;

  return (
    <section aria-label="Spirit summon" className="@container flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {switcher}
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>Light shards</span>
          <input
            type="number"
            min={0}
            value={sim.shards}
            aria-label="Light shards for this run"
            onChange={(event) => setSim((current) => ({ ...current, shards: Math.max(0, Math.floor(event.target.valueAsNumber || 0)) }))}
            className={`${FIELD} w-24 text-right tabular-nums`}
          />
        </label>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {summons > 0 ? (
            <button type="button" onClick={clear} className={QUIET}>
              Clear
            </button>
          ) : null}
          {auto === "off" ? (
            <button
              type="button"
              onClick={() => setAuto("running")}
              disabled={reached}
              title={`Summon ${formatValue(SPIRIT_BATCH.summons * AUTO_BATCHES)} every ${AUTO_INTERVAL_MS} ms, take the bonus picks and raise the goals, until they're reached or you stop`}
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
          {SPIRIT_SUMMON_COSTS.map((cost) => (
            <button
              key={cost.summons}
              type="button"
              onClick={() => run(cost.summons, cost.diamonds, false)}
              className={cost === SPIRIT_BATCH ? LOUD : QUIET}
            >
              Spirit Summon x{cost.summons} · {formatValue(cost.diamonds)}
            </button>
          ))}
        </span>
      </div>

      {/* The bonus bar: every 300 summons, pick one of two random Epic spirits. */}
      <div className="flex flex-col gap-1">
        <div
          role="meter"
          aria-label="Summon bonus progress"
          aria-valuemin={0}
          aria-valuemax={SPIRIT_BONUS_EVERY}
          aria-valuenow={bonusProgress}
          className="relative h-3 overflow-hidden rounded-sm border border-ink/20 bg-ink/[0.06]"
        >
          <div className="absolute inset-y-0 left-0 bg-tier-epic" style={{ width: `${(bonusProgress / SPIRIT_BONUS_EVERY) * 100}%` }} />
        </div>
        <p className={LABEL}>
          {summons > 0 ? (
            <>
              <span className="text-tier-immortal">{formatValue(spent)} diamonds spent</span> · {formatValue(summons)} summons ·{" "}
            </>
          ) : null}
          Summon bonus {bonusProgress} / {SPIRIT_BONUS_EVERY}: pick one of {SPIRIT_BONUS_OPTIONS} random Epic spirits
        </p>
      </div>

      {picks.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-tier-epic/60 bg-tier-epic/10 px-2 py-1.5">
          <span className="font-mono text-[11px] text-ink">
            Summon bonus{picks.length > 1 ? ` (${picks.length} waiting)` : ""}: pick one Epic
          </span>
          {picks[0]!.map((name) => (
            <button key={name} type="button" onClick={() => pick(name)} className={`${QUIET} flex items-center gap-1.5`}>
              <span className="w-6">
                <SpiritTile name={name} grade={EPIC} label="" />
              </span>
              {name}
              <span className={ELEMENT_TEXT[BY_NAME.get(name)?.element ?? ""] ?? "text-dim"}>{BY_NAME.get(name)?.element}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              let next = sim;
              for (const choices of picks) next = takeBonus(next, bestPick(choices));
              setSim(settleMains(next, goals));
              setPicks([]);
            }}
            className={`${QUIET} ml-auto`}
          >
            Pick for my goals
          </button>
        </div>
      ) : null}

      <div className="grid min-h-0 gap-3 @3xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {/* Goals, in priority order. */}
          <div className="flex flex-col gap-1.5 rounded-md border border-ink/15 p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={LABEL}>Spirits to raise · first is top priority</h3>
              <span className="flex items-center gap-1.5">
                <select
                  aria-label="Add a spirit to raise"
                  value=""
                  onChange={(event) => event.target.value && setGoals((current) => [...current, { name: event.target.value, rank: ANCIENT_RANK }])}
                  className={FIELD}
                  disabled={!unpicked.length}
                >
                  <option value="">Add spirit…</option>
                  {unpicked.map((spirit) => (
                    <option key={spirit.name} value={spirit.name}>
                      {spirit.name} ({spirit.element})
                    </option>
                  ))}
                </select>
                <button type="button" onClick={raiseAll} disabled={!goals.length} className={LOUD}>
                  Upgrade all
                </button>
              </span>
            </div>
            {goals.length ? (
              <ul className="flex flex-col gap-1">
                {goals.map((goal, index) => {
                  const spirit = BY_NAME.get(goal.name);
                  const main = settled.mains[goal.name] ?? null;
                  const done = rankAtLeast(main, goal.rank);
                  const can = !done && auto !== "running" && upgradeGoal(settled, goals, index, ROSTER, options) !== null;
                  return (
                    <li key={goal.name} className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-1">
                      <span className="w-4 text-right font-mono text-[10px] text-dim tabular-nums">{index + 1}</span>
                      <span className="w-9">
                        <SpiritTile name={goal.name} grade={main?.grade ?? 0} label={main ? rankLabel(main) : "none"} />
                      </span>
                      <span className="flex min-w-32 flex-col">
                        <span className="font-mono text-[11px] text-ink">
                          {goal.name}{" "}
                          <span className={`text-[10px] ${ELEMENT_TEXT[spirit?.element ?? ""] ?? "text-dim"}`}>{spirit?.element}</span>
                        </span>
                        <span className={`font-mono text-[10px] ${main ? (TIER_TEXT[SPIRIT_GRADES[main.grade]!] ?? "text-dim") : "text-dim"}`}>
                          {main ? `${rankLabel(main)} · skill Lv 1` : "not owned yet"}
                        </span>
                      </span>
                      <label className="flex items-center gap-1">
                        <span className={LABEL}>to</span>
                        <select
                          aria-label={`${goal.name} goal`}
                          value={rankIndex(goal.rank)}
                          onChange={(event) => setGoal(index, { rank: SPIRIT_RANKS[Number(event.target.value)]! })}
                          className={FIELD}
                        >
                          {SPIRIT_RANKS.map((rank, i) => (
                            <option key={i} value={i}>
                              {rankLabel(rank)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="font-mono text-[10px] text-dim">
                        {done ? <span className="text-tier-mythic">Reached</span> : stepText(main, goal.name, spirit?.element ?? null)}
                      </span>
                      <span className="ml-auto flex flex-wrap items-center gap-1">
                        <button type="button" onClick={() => raiseOne(index)} disabled={!can} className={QUIET}>
                          Upgrade
                        </button>
                        <button type="button" aria-label={`Raise ${goal.name}'s priority`} onClick={() => move(index, -1)} disabled={index === 0} className={`${QUIET} px-1.5`}>
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label={`Lower ${goal.name}'s priority`}
                          onClick={() => move(index, 1)}
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
              <p className="font-mono text-[10px] text-dim">Add the spirits you want to raise, most important first.</p>
            )}
            <label className="flex items-center gap-1.5 font-mono text-[10px] text-dim">
              <input type="checkbox" checked={lowerAsFodder} onChange={(event) => setLowerAsFodder(event.target.checked)} />
              Let a lower priority spirit be fodder for a higher one of its element
            </label>
            {lowerAsFodder && fed.length ? (
              <p role="alert" className="rounded-md border border-tier-legendary/60 bg-tier-legendary/10 px-2 py-1 font-mono text-[10px] text-ink">
                Heads up: {fed.join(", ")}. Those spirits are goals too, so what they give up slows them down.
              </p>
            ) : null}
            {log.length ? (
              <ul className="flex flex-col font-mono text-[10px] text-dim">
                {log.map((line, i) => (
                  <li key={i} className={i === 0 ? "text-ink" : ""}>
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* The average, from nothing. */}
          {goals.length ? (
            <div className="flex flex-col gap-1 rounded-md border border-ink/15 p-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className={LABEL}>Diamonds on average, from nothing</h3>
                <span className="font-mono text-sm text-tier-immortal tabular-nums">
                  {formatValue(estimate.diamonds)} <span className="text-[10px] text-dim">diamonds</span>
                </span>
              </div>
              <p className="font-mono text-[10px] text-dim">
                About {formatValue(estimate.summons)} summons ({formatValue(estimate.batches)} × {SPIRIT_BATCH.summons} at{" "}
                {formatValue(SPIRIT_BATCH.diamonds)})
                {estimate.shards ? ` · ${formatValue(estimate.shards)} light shards` : ""}
                {estimate.limit ? ` · ${estimate.limit} runs out last` : ""}
              </p>
              <ul className="font-mono text-[10px] text-dim">
                {estimate.goals.map((goal) => (
                  <li key={goal.name}>
                    {goal.name} to {rankLabel(goal.rank)}: {formatValue(Math.round(goal.need.spirit * 100) / 100)} Legendary {goal.name}
                    {goal.need.element ? ` + ${formatValue(Math.round(goal.need.element * 100) / 100)} Legendary ${goal.element ?? ""}` : ""}
                    {" "}(Commons count as 1/256, four of a grade make one of the next)
                  </li>
                ))}
              </ul>
              <p className="text-[10px] leading-snug text-dim">
                An average, not a promise: your own summons will land differently. Stars are paid in spirits of
                the grade being starred (Mythic stars in Mythics, Immortal stars in Immortals, each raised from
                Legendaries first), the steps between grades in Legendaries, and it assumes every bonus pick goes to a
                goal spirit or its element when one is offered.
              </p>
            </div>
          ) : null}

          {/* What's been summoned and not used. */}
          {summons > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={LABEL}>Spare spirits</h3>
                <button type="button" onClick={() => setSim((current) => combineAll(current))} className={QUIET}>
                  Combine 4 → 1
                </button>
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                {SPIRITS.map((spirit) => {
                  const counts = settled.inventory[spirit.name] ?? [];
                  return (
                    <li key={spirit.name} className="flex flex-col gap-0.5 border-b border-ink/10 pb-1">
                      <span className="font-mono text-[10px] text-ink">
                        {spirit.name} <span className={ELEMENT_TEXT[spirit.element ?? ""] ?? "text-dim"}>{spirit.element}</span>
                      </span>
                      <span className="flex flex-wrap gap-x-1.5 font-mono text-[9px] tabular-nums">
                        {counts.every((count) => !count) ? <span className="text-dim">none</span> : null}
                        {counts.map((count, grade) =>
                          count ? (
                            <span key={grade} className={TIER_TEXT[SPIRIT_GRADES[grade]!] ?? "text-dim"}>
                              {SPIRIT_GRADES[grade]} {formatValue(count)}
                            </span>
                          ) : null,
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {last ? (
                <p className="font-mono text-[10px] text-dim">
                  Last summon:{" "}
                  {lastText(last)}
                </p>
              ) : null}

              {/* The bad kind of fodder, there for completeness. */}
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-ink/15 p-1.5">
                <span className={LABEL}>Switch element</span>
                <select aria-label="Epic spirit to switch" value={switchFrom} onChange={(event) => setSwitchFrom(event.target.value)} className={FIELD}>
                  <option value="">Epic spirit…</option>
                  {switchable.map((spirit) => (
                    <option key={spirit.name} value={spirit.name}>
                      {spirit.name} ({formatValue(settled.inventory[spirit.name]![EPIC]!)})
                    </option>
                  ))}
                </select>
                <select aria-label="Element to switch to" value={switchTo} onChange={(event) => setSwitchTo(event.target.value)} className={FIELD}>
                  <option value="random">Random element · {SWITCH_COST.random} Epic</option>
                  {ELEMENTS.map((element) => (
                    <option key={element} value={element}>
                      {element} · {SWITCH_COST.chosen} Epic
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={doSwitch}
                  disabled={!switchFrom || (settled.inventory[switchFrom]?.[EPIC] ?? 0) < switchCost}
                  className={QUIET}
                >
                  Switch
                </button>
              </div>
            </div>
          ) : (
            <p className="font-mono text-[10px] text-dim">
              Every spirit starts from nothing here and your profile&apos;s spirits stay as they are. Summon one or eleven at a
              time, or let Auto run until the goals are reached.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h3 className={LABEL}>Probability of Summon Spirit</h3>
            <dl className="font-mono text-[10px]">
              {SUMMON_GRADES.map((grade, i) => (
                <div key={grade} className="flex items-baseline justify-between gap-2 border-b border-ink/10 py-0.5">
                  <dt className={TIER_TEXT[grade] ?? "text-dim"}>{grade}</dt>
                  <dd className="text-ink tabular-nums">{SPIRIT_SUMMON_CHANCES[i]}%</dd>
                </div>
              ))}
            </dl>
            <p className="text-[10px] leading-snug text-dim">Per spirit summoned, any of the {SPIRITS.length} spirits alike.</p>
          </div>
          <div className="flex flex-col gap-1 text-[10px] leading-snug text-dim">
            <h3 className={LABEL}>Raising a spirit</h3>
            <p>Common to Legendary: four of the same spirit make one of the next grade.</p>
            <p>
              Legendary, Mythic and Immortal stars A0 to A5: 1 of the same spirit, 2 of its element, 1 spirit, 2 element, 1
              spirit. Then 3 of its element for the next grade; Immortal A5 to Ancient takes 1 of the same spirit and 1,000
              light shards instead. Stars take spirits of the grade being starred: Mythic stars need Mythics, Immortal
              stars Immortals. The steps between grades take Legendaries.
            </p>
            <h3 className={`${LABEL} mt-1`}>Fodder</h3>
            <p>
              <span className="text-ink">Good fodder:</span> another spirit of the same element, so a top priority spirit
              moves up sooner instead of waiting on its own copies. Feeding it a lower priority spirit (Noah into Loar, say)
              is allowed with the box above, and it warns you, since that one falls behind.
            </p>
            <p>
              <span className="text-ink">Bad fodder:</span> switching a spirit to another element costs {SWITCH_COST.chosen}{" "}
              Epic for an element you pick or {SWITCH_COST.random} for a random one, and gives back one Epic, so it sets
              progress back. The estimate never switches, and it&apos;s best skipped.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

