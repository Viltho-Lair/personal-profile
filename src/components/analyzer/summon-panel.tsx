"use client";

import { useEffect, useRef, useState } from "react";
import {
  awakeningCost,
  awakeningReach,
  awakeningStepCost,
  DIAMONDS_PER_SUMMON,
  BREAK_SHARDS,
  breakMythic,
  EXPECTED_BREAK_SHARDS,
  MAX_AWAKENING_STAR,
  MERGE_LADDER,
  mergeUp,
  MAX_SUMMON_LEVEL,
  MIN_SUMMON_LEVEL,
  MYTHIC_G1,
  planSummons,
  SUMMON_BATCH,
  SUMMON_COSTS,
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
import { segment, SEGMENTS } from "./nav-styles";
import { ClassSummon } from "./class-summon";
import { SpiritSummon } from "./spirit-summon";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const FIELD =
  "w-24 rounded-md border border-ink/20 bg-transparent px-1.5 py-1 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink";
const BUTTON =
  "rounded-md border px-3 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

/** Auto summoning: this many batches every tick, so it moves without freezing the page. */
const AUTO_BATCHES = 10;
const AUTO_INTERVAL_MS = 200;

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

/** Grades within a rarity, as the equipment tab lays them out: Grade 4 first, Grade 1 last. */
const GRADES = [4, 3, 2, 1] as const;

/**
 * The pile, laid out like the Equipment tab: a row of four per rarity, Common Grade 4 at the top left through to
 * Mythic Grade 1. A grade with none of it left sits empty.
 */
function Pile({ tally, grades }: { tally: Record<string, number>; grades: Map<string, Gear> }) {
  return (
    <div className="flex w-full flex-col gap-2 sm:max-w-md">
      {SUMMON_RARITIES.map((rarity) => (
        <section key={rarity} className="flex flex-col gap-1">
          <h4 className={`font-mono text-[10px] tracking-[0.12em] uppercase ${TIER_TEXT[rarity] ?? "text-dim"}`}>{rarity}</h4>
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            {GRADES.map((grade) => {
              const name = `${rarity} ${grade}`;
              const count = tally[name] ?? 0;
              return (
                <span key={name} className={count > 0 ? "" : "opacity-35"}>
                  <Drawn name={name} gear={grades.get(name)} count={count} />
                </span>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * What the Mythic Grade 1 gear summoned so far, and the light shards held, awaken the Immortal weapon or accessory
 * to: most stars take one Mythic Grade 1, the three that change its look take four, and the last stars take light
 * shards, which come from breaking Mythic Grade 1 gear.
 */
function Awakening({
  kind,
  from,
  profileStar,
  mythicG1,
  shards,
  level,
  progress,
  broken,
  onBreak,
  onAwaken,
}: {
  kind: GearKind;
  /** The star this run has reached: the profile's to start with, then whatever the summoned gear has awakened. */
  from: number;
  profileStar: number;
  mythicG1: number;
  shards: number;
  level: number;
  progress: number;
  broken: { count: number; shards: number; last: number | null };
  onBreak: () => void;
  onAwaken: (all: boolean) => void;
}) {
  const [goal, setGoal] = useState(Math.min(MAX_AWAKENING_STAR, from + 1));
  const target = Math.min(MAX_AWAKENING_STAR, Math.max(from, goal));
  const reach = awakeningReach(from, mythicG1, shards);
  const next = reach.next;
  const toMax = awakeningCost(from, MAX_AWAKENING_STAR);
  const plan = planSummons({ fromStar: from, toStar: target, level, progress, shards, mythicG1 });
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
          <span className="text-[10px] text-dim">
            of {MAX_AWAKENING_STAR}★{from !== profileStar ? ` · ${formatValue(profileStar)}★ in your profile` : ""}
          </span>
        </span>
      </div>
      {/* Spending what's been summoned, for the estimate only: your profile's own awakening and gear stay as they are. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAwaken(false)}
          disabled={!next || next.mythicG1 > mythicG1 || next.shards > shards}
          title={next ? `One more star, ${formatValue(from)}★ to ${formatValue(from + 1)}★, for ${cost(next)}` : "Fully awakened"}
          className={`${BUTTON} border-ink bg-ink text-ground enabled:hover:brightness-110`}
        >
          Awaken +1★{next ? ` · ${cost(next)}` : ""}
        </button>
        <button
          type="button"
          onClick={() => onAwaken(true)}
          disabled={reach.stars < 1}
          title="Awaken as far as the gear summoned and the shards go"
          className={`${BUTTON} border-ink/25 text-dim enabled:hover:border-ink/60 enabled:hover:text-ink`}
        >
          Awaken to {formatValue(reach.star)}★
        </button>
        <span className="font-mono text-[9px] text-dim">Estimation only: it spends what you summoned here, not your profile.</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[10px] text-dim">
          {formatValue(mythicG1)} Mythic Grade 1 in hand · {formatValue(shards)} light shards ·{" "}
          {reach.stars > 0 ? `${formatValue(reach.stars)} more star${reach.stars === 1 ? "" : "s"}` : "not enough for the next star"}
        </p>
        <button
          type="button"
          onClick={onBreak}
          disabled={mythicG1 < 1}
          title={`Break one Mythic Grade 1 for light shards (${formatValue(Math.round(EXPECTED_BREAK_SHARDS))} on average)`}
          className={`${BUTTON} ml-auto border-ink/25 text-dim enabled:hover:border-ink/60 enabled:hover:text-ink`}
        >
          Break 1
        </button>
      </div>
      {broken.count > 0 ? (
        <p className="font-mono text-[10px] text-dim">
          {broken.last !== null ? (
            <>
              That break gave <span className="text-tier-mythic">+{formatValue(broken.last)}</span> light shards ·{" "}
            </>
          ) : null}
          broken {formatValue(broken.count)} for {formatValue(broken.shards)} · your average{" "}
          <span className="text-ink">{formatValue(Math.round(broken.shards / broken.count))}</span> against{" "}
          {formatValue(Math.round(EXPECTED_BREAK_SHARDS * 10) / 10)} expected
        </p>
      ) : null}
      <p className="font-mono text-[9px] text-dim">
        A break gives {BREAK_SHARDS.map((row) => `${formatValue(row.shards)} at ${row.chance}%`).join(", ")}.
      </p>
      <p className="font-mono text-[10px] text-dim">
        {reach.next ? `The star after that takes ${cost(reach.next)}` : "Fully awakened"}
        {reach.short && (reach.short.mythicG1 || reach.short.shards) ? ` · short of ${cost(reach.short)}` : ""}
        {from < MAX_AWAKENING_STAR ? ` · ${formatValue(from)}★ to ${MAX_AWAKENING_STAR}★ takes ${cost(toMax)}` : ""}
      </p>

      {from < MAX_AWAKENING_STAR ? (
        <div className="flex flex-col gap-1 border-t border-ink/10 pt-1.5">
          <label className="flex flex-wrap items-center gap-1.5">
            <span className={LABEL}>Diamonds to reach</span>
            <input
              type="number"
              min={from + 1}
              max={MAX_AWAKENING_STAR}
              value={goal}
              aria-label="Awakening stars to reach"
              onChange={(event) => setGoal(Math.max(from, Math.min(MAX_AWAKENING_STAR, Math.floor(event.target.valueAsNumber || from))))}
              className="w-16 rounded-md border border-ink/20 bg-transparent px-1.5 py-0.5 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink"
            />
            <span className={LABEL}>★ from {formatValue(from)}★</span>
            <span className="ml-auto font-mono text-sm text-tier-immortal tabular-nums">
              {formatValue(plan.diamonds)} <span className="text-[10px] text-dim">diamonds</span>
            </span>
          </label>
          <p className="font-mono text-[10px] text-dim">
            {formatValue(target)}★ takes {cost(plan.need)}
            {plan.breaks > 0
              ? ` · ${formatValue(plan.shardsShort)} shards short, about ${formatValue(plan.breaks)} Mythic G1 broken (${formatValue(Math.round(EXPECTED_BREAK_SHARDS))} shards each on average)`
              : ""}
            {` · ${formatValue(plan.mythicG1)} Mythic G1 in all, ${formatValue(plan.mythicG1Short)} still to summon`}
          </p>
          <p className="font-mono text-[10px] text-dim">
            About {formatValue(plan.summons)} summons ({formatValue(plan.batches)} × {SUMMON_BATCH}), reaching summon level{" "}
            {formatValue(plan.endLevel)}
            {plan.gifts ? ` with ${formatValue(plan.gifts)} from gift boxes` : ""} · {formatValue(SUMMON_COSTS[0].diamonds)} diamonds for{" "}
            {SUMMON_COSTS[0].summons}, {formatValue(SUMMON_COSTS[1].diamonds)} for {SUMMON_COSTS[1].summons}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The summon screen: set the summon level, how far into it you are and the light shards you hold, then summon
 * {@link SUMMON_BATCH} at a time. Every summon draws a rarity by the level's chances and a grade inside it, counts
 * toward the level, and each milestone passed hands over Ellie's Summon Gift Box.
 */
export function SummonPanel() {
  const { profile, setSummon } = useProfile();
  const state = profile.summon;
  const kind = state.kind;
  const [last, setLast] = useState<SummonRun | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [summons, setSummons] = useState(0);
  const [gifts, setGifts] = useState(0);
  const [auto, setAuto] = useState<"off" | "running" | "paused">("off");
  // Spirits and classes are runs of their own, apart from the gear run.
  const [other, setOther] = useState<"spirits" | "classes" | null>(null);
  // Diamonds this run has spent summoning, and the stars it has awakened to (null: still the profile's own).
  const [spent, setSpent] = useState(0);
  const [stars, setStars] = useState<Record<GearKind, number | null>>({ weapons: null, accessories: null });
  // Mythic Grade 1 is only broken by hand, one at a time: what's been broken, the shards they gave and the last one.
  const [broken, setBroken] = useState<{ count: number; shards: number; last: number | null }>({ count: 0, shards: 0, last: null });

  const toNext = summonsToNext(state.level);
  const chances = SUMMON_CHANCES[state.level]!;
  const grades = gearByGrade(kind);
  const item = kind === "weapons" ? "weapon" : "accessory";
  // Mythic Grade 1 in the pile right now: merging and breaking only happen when they're pressed.
  const mythicG1 = totals[MYTHIC_G1] ?? 0;
  // The star this run has awakened to, starting from the profile's own.
  const profileStar = Math.min(MAX_AWAKENING_STAR, kind === "weapons" ? profile.weaponAwakening : profile.accessoryAwakening);
  const star = stars[kind] ?? profileStar;

  const run = (count: number) => {
    const result = summon({ level: state.level, progress: state.progress }, count);
    setSummon({ level: result.state.level, progress: result.state.progress });
    setLast(result);
    setSummons((n) => n + result.summons);
    setSpent((n) => n + Math.round(result.summons * DIAMONDS_PER_SUMMON));
    setGifts((n) => n + result.rewards.reduce((sum, reward) => sum + reward.mythicG1, 0));
    setTotals((current) => {
      const next = { ...current };
      for (const [name, count] of Object.entries(result.drawn)) next[name] = (next[name] ?? 0) + count;
      return next;
    });
  };

  // Auto summoning keeps going in batches until it's paused or stopped; the ref keeps the timer on the latest state.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => {
    if (auto !== "running") return;
    const timer = window.setInterval(() => runRef.current(SUMMON_BATCH * AUTO_BATCHES), AUTO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [auto]);

  const clear = () => {
    setAuto("off");
    setLast(null);
    setTotals({});
    setSummons(0);
    setGifts(0);
    setSpent(0);
    setStars({ weapons: null, accessories: null });
    setBroken({ count: 0, shards: 0, last: null });
  };

  /**
   * Awakens a star, or as far as what's been summoned goes, spending the Mythic Grade 1 in the pile and the light
   * shards. It's the estimate's own gear: the profile's awakening and equipment aren't touched.
   */
  const awaken = (all: boolean) => {
    let current = star;
    let mythic = mythicG1;
    let left = state.shards;
    let any = false;
    while (current < MAX_AWAKENING_STAR) {
      const cost = awakeningStepCost(current + 1);
      if (cost.mythicG1 > mythic || cost.shards > left) break;
      mythic -= cost.mythicG1;
      left -= cost.shards;
      current += 1;
      any = true;
      if (!all) break;
    }
    if (!any) return;
    setTotals((pile) => ({ ...pile, [MYTHIC_G1]: mythic }));
    setSummon({ shards: left });
    setStars((reached) => ({ ...reached, [kind]: current }));
  };

  /** Merges the pile as far as it goes, five of a grade into one of the next. Nothing merges until this is pressed. */
  const mergeAll = () => setTotals((current) => mergeUp(current));

  /** Breaks one Mythic Grade 1 for light shards, as the game has you do them one at a time. */
  const breakOne = () => {
    if ((totals[MYTHIC_G1] ?? 0) < 1) return;
    const shards = breakMythic(Math.random());
    setTotals((current) => ({ ...current, [MYTHIC_G1]: (current[MYTHIC_G1] ?? 0) - 1 }));
    setBroken((current) => ({ count: current.count + 1, shards: current.shards + shards, last: shards }));
    setSummon({ shards: state.shards + shards });
  };

  // What pressing Merge would leave, so the button can say what it gives and go dim when nothing would change.
  const merged = mergeUp(totals);
  const mergeGives = Math.max(0, (merged[MYTHIC_G1] ?? 0) - mythicG1);
  const canMerge = MERGE_LADDER.some((name) => (totals[name] ?? 0) !== (merged[name] ?? 0));

  const switcher = (
    <div className={SEGMENTS} role="group" aria-label="What to summon">
      {(["weapons", "accessories"] as const).map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={!other && kind === id}
          onClick={() => {
            setOther(null);
            setSummon({ kind: id });
          }}
          className={segment(!other && kind === id)}
        >
          {id === "weapons" ? "Weapons" : "Accessories"}
        </button>
      ))}
      {(["spirits", "classes"] as const).map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={other === id}
          onClick={() => {
            setAuto("off");
            setOther(id);
          }}
          className={segment(other === id)}
        >
          {id === "spirits" ? "Spirits" : "Classes"}
        </button>
      ))}
    </div>
  );

  // Spirits and classes are their own runs, apart from the profile; the gear run above keeps its state meanwhile.
  if (other === "spirits") return <SpiritSummon switcher={switcher} />;
  if (other === "classes") return <ClassSummon switcher={switcher} />;

  return (
    <section aria-label="Summon" className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {switcher}
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
          {auto === "off" ? (
            <button
              type="button"
              onClick={() => setAuto("running")}
              title={`Summon ${formatValue(SUMMON_BATCH * AUTO_BATCHES)} every ${AUTO_INTERVAL_MS} ms until you pause or stop`}
              className={`${BUTTON} border-ink/25 text-dim hover:border-ink/60 hover:text-ink`}
            >
              Auto
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAuto(auto === "running" ? "paused" : "running")}
                className={`${BUTTON} border-ink/25 text-dim hover:border-ink/60 hover:text-ink`}
              >
                {auto === "running" ? "Pause" : "Resume"}
              </button>
              <button type="button" onClick={() => setAuto("off")} className={`${BUTTON} border-ink/25 text-dim hover:border-ink/60 hover:text-ink`}>
                Stop
              </button>
            </>
          )}
          {SUMMON_COSTS.map((batch) => (
            <button
              key={batch.summons}
              type="button"
              onClick={() => run(batch.summons)}
              title={`${formatValue(batch.diamonds)} diamonds`}
              className={`${BUTTON} ${
                batch.summons === SUMMON_BATCH ? "border-ink bg-ink text-ground enabled:hover:brightness-110" : "border-ink/25 text-dim hover:border-ink/60 hover:text-ink"
              }`}
            >
              Summon {batch.summons}
            </button>
          ))}
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
          {summons > 0 ? (
            <>
              <span className="text-tier-immortal">{formatValue(spent)} diamonds spent</span> · {formatValue(summons)} summons ·{" "}
            </>
          ) : null}
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
      <Awakening
        kind={kind}
        from={star}
        profileStar={profileStar}
        onAwaken={awaken}
        mythicG1={mythicG1}
        shards={state.shards}
        level={state.level}
        progress={state.progress}
        broken={broken}
        onBreak={breakOne}
      />

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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={LABEL}>
                  Everything summoned · {formatValue(summons)} summons{gifts ? ` · ${formatValue(gifts)} from gift boxes` : ""} ·{" "}
                  <span className="text-tier-immortal">{formatValue(spent)} diamonds spent</span>
                </h3>
                <span className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={mergeAll}
                    disabled={!canMerge}
                    title={
                      canMerge
                        ? `Merge five of a grade into one of the next, as far as it goes${mergeGives ? `: ${formatValue(mergeGives)} more Mythic Grade 1` : ""}`
                        : "Nothing left to merge"
                    }
                    className={`${BUTTON} border-ink/25 text-dim enabled:hover:border-ink/60 enabled:hover:text-ink`}
                  >
                    Merge 5 → 1{mergeGives ? ` (+${formatValue(mergeGives)} Mythic 1)` : ""}
                  </button>
                </span>
              </div>
              <Pile tally={totals} grades={grades} />
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
