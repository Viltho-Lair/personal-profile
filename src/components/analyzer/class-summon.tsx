"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import characterData from "@/data/optimizer/character.json";
import {
  bonusAt,
  bundleOf,
  CLASS_LEVELS,
  CLASS_SINGLE,
  CLASS_SUMMON_CHANCES,
  CLASS_SUMMON_GRADES,
  CLASS_TOP_LEVEL,
  CLASS_TOP_STEP,
  clampBar,
  DARK_RAIN,
  emptyClassSim,
  estimateClass,
  goalGrade,
  levelStep,
  NOVA_SHARDS,
  summonClasses,
  type ClassBar,
  type ClassGoal,
  type ClassSim,
} from "@/lib/game/class-summon";
import { formatValue } from "./data";
import { Sprite } from "./sprite";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const FIELD =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";
const BUTTON =
  "rounded-md border px-3 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";
const QUIET = `${BUTTON} border-ink/25 text-dim enabled:hover:border-ink/60 enabled:hover:text-ink`;
const LOUD = `${BUTTON} border-ink bg-ink text-ground enabled:hover:brightness-110`;

/** Auto summoning: this many bundles every tick, until the goal is summoned. */
const AUTO_BATCHES = 50;
const AUTO_INTERVAL_MS = 150;

type ClassArt = { name: string; icon: string | null; iconSize: number | null };
const CLASSES = characterData.classes as ClassArt[];
/** The summonable classes, grade 1 (Trainee) to 19 (Dark Rain). */
const SUMMONABLE = CLASSES.slice(0, CLASS_SUMMON_GRADES);
const NOVA = CLASSES.find((cls) => cls.name === "Nova");
const className = (grade: number) => SUMMONABLE[grade - 1]?.name ?? `Grade ${grade}`;

function ClassTile({ art, count }: { art: ClassArt | undefined; count?: number }) {
  return (
    <span className="relative flex aspect-square w-full items-center justify-center rounded-md border border-ink/20 bg-ink/[0.04]">
      {art?.icon && art.iconSize ? <Sprite src={art.icon} native={art.iconSize} size={art.iconSize / 4} className="size-4/5" /> : null}
      {count && count > 1 ? (
        <span className="absolute top-0 right-0 rounded-sm bg-black/70 px-0.5 font-mono text-[8px] leading-tight text-white tabular-nums">
          {formatValue(count)}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Class summoning, apart from the profile: the classes owned there stay as they are. Pick a class to aim for; the
 * estimate gives the diamonds that takes on average, and the summon buttons try it out.
 */
export function ClassSummon({ switcher }: { switcher: ReactNode }) {
  const [goal, setGoal] = useState<ClassGoal>("nova");
  const [startBar, setStartBar] = useState<ClassBar>({ level: 1, progress: 0 });
  const [sim, setSim] = useState<ClassSim>(() => emptyClassSim());
  const [auto, setAuto] = useState<"off" | "running" | "paused">("off");
  const [last, setLast] = useState<{ drawn: number[]; rewards: number[] } | null>(null);

  // The x10 bonus follows the summon level: +1 a level, +10 from level 10.
  const bonus = bonusAt(sim.bar.level);
  const bundle = bundleOf(sim.bar.level);
  const grade = goalGrade(goal);
  const goalName = goal === "nova" ? "Nova" : className(goal);
  // The estimate counts from where the bar is now: the starting value before summoning, the run's after.
  const estimate = useMemo(() => estimateClass(goal, sim.bar), [goal, sim.bar]);
  const reached = (sim.owned[grade - 1] ?? 0) > 0;
  const pityLeft = estimate.cap?.summons ?? Infinity;
  const step = levelStep(sim.bar.level);
  const setBar = (change: Partial<ClassBar>) => {
    const bar = clampBar({ ...startBar, ...change });
    setStartBar(bar);
    setSim(emptyClassSim(bar));
  };

  const run = (count: number, diamonds: number) => {
    const result = summonClasses(sim, count, diamonds);
    setSim(result.sim);
    setLast({ drawn: result.drawn, rewards: result.rewards });
    if ((result.sim.owned[grade - 1] ?? 0) > 0) setAuto("off");
  };

  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => {
    if (auto !== "running") return;
    const timer = window.setInterval(
      () => runRef.current(bundle.summons * AUTO_BATCHES, bundle.diamonds * AUTO_BATCHES),
      AUTO_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [auto, bundle.summons, bundle.diamonds]);

  const clear = () => {
    setAuto("off");
    setSim(emptyClassSim(startBar));
    setLast(null);
  };

  const lastText = last
    ? last.drawn
        .map((count, i) => ({ count, grade: i + 1 }))
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.grade - a.grade)
        .slice(0, 8)
        .map((entry) => `${entry.grade} ${className(entry.grade)}${entry.count > 1 ? ` x${formatValue(entry.count)}` : ""}`)
        .join(", ")
    : "";

  return (
    <section aria-label="Class summon" className="@container flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {switcher}
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>Goal</span>
          <select
            aria-label="Class to aim for"
            value={goal}
            onChange={(event) => setGoal(event.target.value === "nova" ? "nova" : Number(event.target.value))}
            className={FIELD}
          >
            <option value="nova">Nova (max)</option>
            {SUMMONABLE.map((cls, i) => (
              <option key={cls.name} value={i + 1}>
                {i + 1} grade · {cls.name}
              </option>
            )).reverse()}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>Summon level</span>
          <select
            aria-label="Class summon level"
            value={Math.min(sim.bar.level, CLASS_TOP_LEVEL)}
            disabled={sim.summons > 0}
            title={sim.summons > 0 ? "Clear the run to change where the bar starts" : "Your class summon level now"}
            onChange={(event) => setBar({ level: Number(event.target.value) })}
            className={FIELD}
          >
            {Array.from({ length: CLASS_TOP_LEVEL }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1 === CLASS_TOP_LEVEL ? `${i + 1}+` : i + 1}
              </option>
            ))}
          </select>
          <span
            className="font-mono text-[10px] text-dim tabular-nums"
            title="Class Summon x10 gives one bonus summon a summon level, up to +10 from level 10"
          >
            x10 +{bonus}
          </span>
        </label>
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>Reward bar</span>
          <input
            type="number"
            min={0}
            max={step.summons - 1}
            value={sim.bar.progress}
            disabled={sim.summons > 0}
            title={sim.summons > 0 ? "Clear the run to change where the bar starts" : "Where your class summon reward bar is now"}
            aria-label="Class summon reward bar progress"
            onChange={(event) => setBar({ progress: event.target.valueAsNumber })}
            className={`${FIELD} w-20 text-right tabular-nums`}
          />
          <span className="font-mono text-[10px] text-dim">/ {formatValue(step.summons)}</span>
        </label>
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
              disabled={reached}
              title={`Summon ${formatValue(bundle.summons * AUTO_BATCHES)} every ${AUTO_INTERVAL_MS} ms until ${goal === "nova" ? className(DARK_RAIN) : goalName} is summoned, or you stop`}
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
          <button type="button" onClick={() => run(CLASS_SINGLE.summons, CLASS_SINGLE.diamonds)} className={QUIET}>
            Class Summon x1 · {formatValue(CLASS_SINGLE.diamonds)}
          </button>
          <button type="button" onClick={() => run(bundle.summons, bundle.diamonds)} className={LOUD}>
            Class Summon x10{bonus ? ` +${bonus}` : ""} · {formatValue(bundle.diamonds)}
          </button>
        </span>
      </div>

      {/* The class summon reward bar: each level up gives a class. */}
      <div className="flex flex-col gap-1">
        <div
          role="meter"
          aria-label="Class summon reward progress"
          aria-valuemin={0}
          aria-valuemax={step.summons}
          aria-valuenow={sim.bar.progress}
          className="relative h-3 overflow-hidden rounded-sm border border-ink/20 bg-ink/[0.06]"
        >
          <div className="absolute inset-y-0 left-0 bg-tier-epic" style={{ width: `${(sim.bar.progress / step.summons) * 100}%` }} />
        </div>
        <p className={LABEL}>
          {sim.summons > 0 ? (
            <>
              <span className="text-tier-immortal">{formatValue(sim.diamonds)} diamonds spent</span> · {formatValue(sim.summons)} summons ·{" "}
            </>
          ) : null}
          Level {sim.bar.level} · class summon reward {formatValue(sim.bar.progress)} / {formatValue(step.summons)}: a{" "}
          {step.reward} grade {className(step.reward)}
        </p>
      </div>

      <div className="grid min-h-0 gap-3 @3xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="flex min-w-0 flex-col gap-3">
          {/* The average, from where the bar is. */}
          <div className="flex flex-col gap-1.5 rounded-md border border-ink/15 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-9">
                <ClassTile art={goal === "nova" ? NOVA : SUMMONABLE[grade - 1]} />
              </span>
              <span className="flex flex-col">
                <span className="font-mono text-[11px] text-ink">{goalName}</span>
                <span className="font-mono text-[10px] text-dim">
                  {reached ? (
                    <span className="text-tier-mythic">
                      {goal === "nova" ? `${className(DARK_RAIN)} summoned: the rest isn't priced yet` : "Summoned"}
                    </span>
                  ) : goal === "nova" ? (
                    `Summon ${className(DARK_RAIN)}, raise it to Seed 5★, then ${formatValue(NOVA_SHARDS)} shards`
                  ) : (
                    `${grade} grade · ${CLASS_SUMMON_CHANCES[grade - 1]}% a summon`
                  )}
                </span>
              </span>
              <span className="ml-auto text-right font-mono text-sm text-tier-immortal tabular-nums">
                {formatValue(Math.round(estimate.diamonds))} <span className="text-[10px] text-dim">diamonds on average</span>
              </span>
            </div>
            <p className="font-mono text-[10px] text-dim">
              About {formatValue(Math.round(estimate.summons))} summons in x10 bundles at {formatValue(bundle.diamonds)}, +{bonus} now
              {bonus < CLASS_TOP_LEVEL ? `, rising with the summon level to +${CLASS_TOP_LEVEL}` : ""}
              {/* With the reward bar close, both odds are just the bar: say that once. */}
              {estimate.median.summons < pityLeft ? ` · half of runs by ${formatValue(Math.round(estimate.median.diamonds))}` : ""}
              {estimate.likely.summons < pityLeft ? `, 9 in 10 by ${formatValue(Math.round(estimate.likely.diamonds))}` : ""}
              {estimate.cap
                ? ` · never more than ${formatValue(Math.round(estimate.cap.diamonds))}, when the reward bar gives it`
                : ""}
            </p>
            {goal === "nova" ? (
              <ul className="font-mono text-[10px] text-dim">
                <li>
                  1. {className(DARK_RAIN)} ({DARK_RAIN} grade): {formatValue(Math.round(estimate.diamonds))} diamonds, counted above
                </li>
                <li>2. {className(DARK_RAIN)} to Blast, then awakening up to Seed 5★: not priced yet</li>
                <li>3. Seed 5★ to Nova: {formatValue(NOVA_SHARDS)} shards</li>
              </ul>
            ) : null}
            <p className="text-[10px] leading-snug text-dim">
              An average, not a promise: your own summons will land differently. It counts the summons to the first copy of
              the class, bought as x10 bundles, with the reward bar where it is now. Your profile&apos;s classes stay as they
              are.
            </p>
          </div>

          {/* What's been summoned. */}
          {sim.summons > 0 ? (
            <div className="flex flex-col gap-1">
              <h3 className={LABEL}>Summoned classes</h3>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5">
                {SUMMONABLE.map((cls, i) => {
                  const count = sim.owned[i] ?? 0;
                  return (
                    <li
                      key={cls.name}
                      title={`${i + 1} grade · ${cls.name}${count ? ` x${formatValue(count)}` : ""}`}
                      className={`flex flex-col items-center gap-0.5 ${count ? "" : "opacity-40"} ${i + 1 === grade ? "rounded-md ring-1 ring-tier-immortal" : ""}`}
                    >
                      <span className="w-10">
                        <ClassTile art={cls} count={count} />
                      </span>
                      <span className="w-full truncate text-center font-mono text-[9px] text-ink">{cls.name}</span>
                      <span className="font-mono text-[9px] text-dim tabular-nums">{formatValue(count)}</span>
                    </li>
                  );
                })}
              </ul>
              {last ? (
                <p className="font-mono text-[10px] text-dim">
                  Last summon: {lastText}
                  {last.rewards.length
                    ? ` · level up rewards: ${last.rewards.map((reward) => `${reward} ${className(reward)}`).join(", ")}`
                    : ""}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="font-mono text-[10px] text-dim">
              Every class starts from nothing here. Summon one or a bundle at a time, or let Auto run until the goal is
              summoned. Set the reward bar to where yours is in the game first.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h3 className={LABEL}>Class Summon Probability</h3>
            <dl className="font-mono text-[10px]">
              {CLASS_SUMMON_CHANCES.map((chance, i) => (
                <div key={i} className="flex items-baseline justify-between gap-2 border-b border-ink/10 py-0.5">
                  <dt className="text-dim">
                    {i + 1} grade <span className="text-ink">{CLASSES[i]?.name}</span>
                  </dt>
                  <dd className="text-ink tabular-nums">{chance}%</dd>
                </div>
              ))}
            </dl>
            <p className="text-[10px] leading-snug text-dim">
              Each grade is one class. Class Summon x10 gives one bonus summon a summon level: +1 at level 1, +9 at level 9, +10
              from level 10 on.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className={LABEL}>Summon level rewards</h3>
            <dl className="font-mono text-[10px]">
              {[...CLASS_LEVELS, CLASS_TOP_STEP].map((levelUp, i) => {
                const current = Math.min(sim.bar.level, CLASS_TOP_LEVEL) === i + 1;
                return (
                  <div
                    key={i}
                    className={`flex items-baseline justify-between gap-2 border-b border-ink/10 py-0.5 ${current ? "text-ink" : "text-dim"}`}
                  >
                    <dt>
                      {i + 1 === CLASS_TOP_LEVEL ? `Lv ${i + 1}+, every` : `Lv ${i + 1} → ${i + 2}`}{" "}
                      <span className="tabular-nums">{formatValue(levelUp.summons)}</span>
                    </dt>
                    <dd>
                      {levelUp.reward} <span className="text-ink">{className(levelUp.reward)}</span>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
