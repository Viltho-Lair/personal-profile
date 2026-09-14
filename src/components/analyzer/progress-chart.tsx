"use client";

import Image from "next/image";
import { Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFight, type Fight, type FightInput, type FightSkill, type FightState, type SkillStatus } from "@/lib/game/battle";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue, SKILL_BY_NAME } from "./data";
import { FIGHT_SECONDS, promotionFight, PROMOTION_STAGES, promotionSuggestions, STAGE_COUNT, stageBossHp, stagesCleared } from "./promotion-fight";
import { publishLiveFight } from "./live-fight";
import { useSpiritFactors } from "./spirit-stats";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";
const BUTTON =
  "rounded-md border px-3 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

const W = 400;
const H = 220;
const LEFT = 8;
const BOTTOM = 16;
/** Frames are ~30 a second; a throttled background tab still catches up to real time, a second at most per frame. */
const FRAME_MS = 33;
const MAX_FRAME_SECONDS = 1;
const BLINK_SECONDS = 0.45;

type Phase = "idle" | "running" | "done";

/**
 * The fight, rendered in real time: damage over the fight against the chosen
 * promotion boss's HP (Boss monster ticked) or through the stages' boss HP, the
 * skill preset as a 5 x 2 grid that lights up as skills go, and the verdict
 * once the fight's over.
 */
export function ProgressChart() {
  const { profile, setPromotionTarget } = useProfile();
  const factors = useSpiritFactors();
  const [logScale, setLogScale] = useState(false);
  const [manual, setManual] = useState<string[]>([]);
  const [run, setRun] = useState<{ for: unknown; phase: Phase; snap: FightState | null } | null>(null);
  const fightRef = useRef<Fight | null>(null);
  const frameRef = useRef<number | null>(null);
  const setupRef = useRef<unknown>(null);

  const current = profile.character.promotion;
  const index = profile.promotionTarget.promotion ?? Math.min(current, PROMOTION_STAGES.length - 1);
  const duration = FIGHT_SECONDS;
  const setup = useMemo(() => promotionFight(profile, factors, index, duration, manual), [profile, factors, index, duration, manual]);
  const { boss } = setup;
  const stagesMode = setup.mode === "stages";
  // A changed profile, promotion or auto setting makes the last render stale.
  const phase: Phase = run && run.for === setup ? run.phase : "idle";
  const snap = run && run.for === setup ? run.snap : null;

  const stop = useCallback(() => {
    if (frameRef.current !== null) window.clearTimeout(frameRef.current);
    frameRef.current = null;
    fightRef.current = null;
    publishLiveFight(null);
  }, []);

  useEffect(() => {
    setupRef.current = setup;
  }, [setup]);
  useEffect(() => stop, [stop]);

  const render = () => {
    stop();
    const fight = createFight(setup.input);
    const owner = setup;
    fightRef.current = fight;
    setRun({ for: owner, phase: "running", snap: fight.state() });
    let last = performance.now();
    const frame = () => {
      const now = performance.now();
      if (fightRef.current !== fight) return;
      if (setupRef.current !== owner) {
        stop();
        return;
      }
      fight.advance(Math.min(MAX_FRAME_SECONDS, (now - last) / 1000));
      last = now;
      const state = fight.state();
      if (state.done) {
        frameRef.current = null;
        fightRef.current = null;
        publishLiveFight(null);
        setRun({ for: owner, phase: "done", snap: state });
      } else {
        // The Stats Summary shows Attack with the buffs that are on as the fight plays.
        publishLiveFight({ atkBonus: state.atkBonus, speedBonus: state.speedBonus });
        setRun({ for: owner, phase: "running", snap: state });
        frameRef.current = window.setTimeout(frame, FRAME_MS);
      }
    };
    frameRef.current = window.setTimeout(frame, FRAME_MS);
  };

  const toggleAuto = (name: string) =>
    setManual((list) => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]));
  const castByHand = (name: string) => {
    fightRef.current?.cast(name);
  };

  const total = snap?.total ?? 0;
  // Stages: the chart follows the next stage's boss as the damage passes each one.
  const cleared = stagesMode ? (snap ? stagesCleared(total) : 0) : 0;
  const nextStage = stagesMode ? (snap ? (cleared < STAGE_COUNT ? cleared + 1 : null) : (boss?.stage ?? null)) : null;
  const nextHp = nextStage ? stageBossHp(nextStage) : 0;
  const top = Math.max(total, stagesMode ? nextHp : (boss?.maxHp ?? 0), 1) * 1.08;
  const scaleY = (value: number) => {
    const ratio = logScale ? Math.log10(1 + Math.max(0, value)) / Math.log10(1 + top) : value / top;
    return H - BOTTOM - ratio * (H - BOTTOM - 8);
  };
  const scaleX = (t: number) => LEFT + (t / duration) * (W - LEFT - 8);
  const path = snap ? snap.points.map((p, i) => `${i ? "L" : "M"} ${scaleX(p.t).toFixed(1)} ${scaleY(p.damage).toFixed(1)}`).join(" ") : "";
  const last = snap?.points[snap.points.length - 1];

  return (
    <section aria-label={stagesMode ? "Stages chart" : "Promotion chart"} className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-sm font-semibold">{stagesMode ? "Stages" : "Promotion"}</h2>
        {stagesMode ? null : (
          <select
            aria-label="Desired promotion"
            value={index}
            onChange={(event) => setPromotionTarget({ promotion: Number(event.target.value) })}
            className={SELECT}
          >
            {PROMOTION_STAGES.map((promotion, i) => (
              <option key={promotion.name} value={i}>
                {i + 1}. {promotion.name} · stage {Math.max(1, promotion.stage)}
              </option>
            ))}
          </select>
        )}
        <label className={`flex items-center gap-1 ${LABEL}`}>
          <input type="checkbox" checked={logScale} onChange={(event) => setLogScale(event.target.checked)} className="accent-ink" />
          Log scale
        </label>
        <span className="ml-auto flex items-center gap-1.5">
          {phase === "running" ? (
            <button
              type="button"
              onClick={() => {
                stop();
                setRun(null);
              }}
              className={`${BUTTON} border-ink/25 text-dim hover:border-ink/60 hover:text-ink`}
            >
              Stop
            </button>
          ) : null}
          <button
            type="button"
            onClick={render}
            disabled={phase === "running" || (!stagesMode && !boss)}
            className={`${BUTTON} border-ink bg-ink text-ground enabled:hover:brightness-110`}
          >
            {phase === "done" ? "Render again" : "Render"}
          </button>
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full shrink-0 md:h-[34svh]" preserveAspectRatio="none" role="img" aria-label="Damage over the fight against the boss HP">
        {stagesMode ? (
          <>
            {cleared > 0 ? (
              <>
                <line x1={LEFT} x2={W - 8} y1={scaleY(stageBossHp(cleared))} y2={scaleY(stageBossHp(cleared))} className="stroke-emerald-500" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                <text x={LEFT + 4} y={scaleY(stageBossHp(cleared)) - 3} className="fill-emerald-500 font-mono" fontSize="9">
                  Stage {cleared} cleared
                </text>
              </>
            ) : null}
            {nextStage ? (
              <>
                <line x1={LEFT} x2={W - 8} y1={scaleY(nextHp)} y2={scaleY(nextHp)} className="stroke-red-500" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                <text x={W - 10} y={scaleY(nextHp) - 3} textAnchor="end" className="fill-red-500 font-mono" fontSize="9">
                  Stage {nextStage} boss HP
                </text>
              </>
            ) : null}
          </>
        ) : boss ? (
          <>
            <rect x={LEFT} y={scaleY(boss.maxHp)} width={W - LEFT - 8} height={Math.max(0, scaleY(boss.minHp) - scaleY(boss.maxHp))} className="fill-red-500/10" />
            <line x1={LEFT} x2={W - 8} y1={scaleY(boss.hp)} y2={scaleY(boss.hp)} className="stroke-red-500" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            <text x={W - 10} y={scaleY(boss.hp) - 3} textAnchor="end" className="fill-red-500 font-mono" fontSize="9">
              Boss HP · stage {boss.stage}
            </text>
          </>
        ) : null}
        <line x1={LEFT} y1={8} x2={LEFT} y2={H - BOTTOM} className="stroke-ink/60" vectorEffect="non-scaling-stroke" />
        <line x1={LEFT} y1={H - BOTTOM} x2={W - 8} y2={H - BOTTOM} className="stroke-ink/60" vectorEffect="non-scaling-stroke" />
        {snap ? (
          <>
            <path d={path} fill="none" className="stroke-sky-500" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <line x1={scaleX(snap.clock)} x2={scaleX(snap.clock)} y1={8} y2={H - BOTTOM} className="stroke-ink/20" vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-dim font-mono" fontSize="10">
            Press Render to play the {duration}s fight
          </text>
        )}
        {snap?.releases.map((release) => (
          <g key={`${release.t}-${release.damage}`}>
            <circle cx={scaleX(release.t)} cy={scaleY(release.damage)} r="3.5" className="fill-fuchsia-500 stroke-ground" vectorEffect="non-scaling-stroke" />
            <text x={scaleX(release.t) + 5} y={scaleY(release.damage) + 10} className="fill-fuchsia-400 font-mono" fontSize="9">
              Rave
            </text>
          </g>
        ))}
        {last ? (
          <rect x={scaleX(last.t) - 3} y={scaleY(last.damage) - 3} width="6" height="6" transform={`rotate(45 ${scaleX(last.t)} ${scaleY(last.damage)})`} className="fill-ground stroke-ink" vectorEffect="non-scaling-stroke" />
        ) : null}
        {[0, 0.5, 1].map((f) => (
          <text key={f} x={scaleX(duration * f)} y={H - 4} textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"} className="fill-dim font-mono" fontSize="9">
            {Math.round(duration * f)}s
          </text>
        ))}
      </svg>

      {stagesMode ? (
        nextStage ? (
          <HealthBar
            hp={nextHp}
            damage={total}
            label={`Stage ${nextStage} boss HP · stages ${snap ? "cleared" : "this fight clears"}: ${formatValue(snap ? cleared : (setup.stages?.reached ?? 0))}`}
          />
        ) : (
          <p className="shrink-0 font-mono text-[10px] text-dim">Every stage cleared</p>
        )
      ) : boss ? (
        <HealthBar hp={boss.hp} damage={total} label={`${boss.name} boss HP · stage ${boss.stage}`} />
      ) : null}

      <LiveReadout snap={snap} input={setup.input} duration={duration} />

      <SkillGrid
        profileSlots={profile.skillPresets[profile.activeSkillPreset] ?? []}
        fightSkills={setup.skills}
        skipped={setup.skipped}
        includeSkills={profile.includeSkills}
        manual={manual}
        phase={phase}
        snap={snap}
        onToggleAuto={toggleAuto}
        onCast={castByHand}
      />

      <p className="shrink-0 text-[10px] leading-snug text-dim">
        {profile.bossMonster ? "Against a boss monster" : "Against a normal monster"} · Spirit skills:{" "}
        {setup.spirits.active.length ? setup.spirits.active.join(", ") : "none in the spirit preset"}
        {setup.spirits.unknown.length ? ` · no value for ${setup.spirits.unknown.join(", ")}` : ""}.
      </p>

      {phase === "done" && snap ? (
        stagesMode ? (
          <StageResults setup={setup} total={snap.total} duration={duration} manual={manual} breakdown={snap} />
        ) : boss ? (
          <Results setup={setup} total={snap.total} duration={duration} manual={manual} breakdown={snap} />
        ) : null
      ) : null}
    </section>
  );
}

/** The enemy's HP left after the damage so far, with what it is underneath. */
function HealthBar({ hp, damage, label }: { hp: number; damage: number; label: string }) {
  const left = Math.max(0, hp - damage);
  const ratio = hp > 0 ? left / hp : 0;
  return (
    <div className="-mt-1 flex shrink-0 flex-col gap-0.5">
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 1000) / 10}
        title={`${formatValue(left)} / ${formatValue(hp)}`}
        className="relative h-4 overflow-hidden rounded-sm border border-red-500/50 bg-red-950/60"
      >
        <div className="absolute inset-y-0 left-0 bg-red-600" style={{ width: `${ratio * 100}%` }} />
        <span className="absolute inset-0 truncate px-1.5 text-center font-mono text-[9px] leading-[14px] text-white tabular-nums">
          {formatValue(left)}
        </span>
      </div>
      <p className="flex justify-between gap-2 font-mono text-[10px] text-dim">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums">{formatValue(Math.round(ratio * 1000) / 10)}% left</span>
      </p>
    </div>
  );
}

function Bar({ label, value, max, tone, text, note }: { label: string; value: number; max: number; tone: string; text: string; note: string }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="w-6 font-mono text-[9px] text-dim uppercase">{label}</span>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
          <div className={`absolute inset-y-0 left-0 ${tone}`} style={{ width: `${ratio * 100}%` }} />
        </div>
        <span className="min-w-14 text-right font-mono text-[9px] text-ink tabular-nums">{text}</span>
      </div>
      <span className="text-right font-mono text-[8px] text-dim">{note}</span>
    </div>
  );
}

/**
 * Rave's stored damage as it builds up and while it waits to be unleashed (what the release will
 * deal, 110% at level 5), then what the last release dealt.
 */
function RaveReadout({ snap }: { snap: FightState | null }) {
  const rave = snap?.skills.find((s) => s.name === "Rave");
  if (!rave) return null;
  const last = snap?.releases[snap.releases.length - 1];
  const [label, value, tone] =
    rave.stored > 0
      ? rave.charged
        ? [rave.manual ? "Rave ready · tap" : "Rave releasing", rave.stored, "text-fuchsia-400"]
        : ["Rave storing", rave.stored, "text-fuchsia-300"]
      : last
        ? [`Rave dealt at ${last.t.toFixed(1)}s`, last.amount, "text-ink"]
        : ["Rave", null, "text-dim"];
  return (
    <>
      <dt className="text-dim">{label}</dt>
      <dd className={`truncate text-right tabular-nums ${tone}`} title={value === null ? undefined : formatValue(value)}>
        {value === null ? "not used yet" : formatValue(value)}
      </dd>
    </>
  );
}

/** Time, damage so far, attack speed, life as a share of max HP, and mana as points. */
function LiveReadout({ snap, input, duration }: { snap: FightState | null; input: FightInput; duration: number }) {
  const maxHp = snap?.maxHp || input.maxHp || 0;
  const hp = snap ? snap.hp : maxHp;
  const maxMana = snap?.maxMana || input.maxMana || 0;
  const mana = snap ? snap.mana : maxMana;
  const hpRecovery = input.hpRecovery ?? 0;
  const manaRecovery = snap ? snap.manaRecovery : (input.manaRecovery ?? 0);
  const recovering = snap ? snap.recovering : true;
  return (
    <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px]">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        <dt className="text-dim">Time</dt>
        <dd className="text-right tabular-nums">
          {(snap?.clock ?? 0).toFixed(1)}s / {duration}s{snap?.timeStopped ? " · time stopped" : ""}
        </dd>
        <dt className="text-dim">Damage</dt>
        <dd className="truncate text-right tabular-nums" title={formatValue(snap?.total ?? 0)}>
          {formatValue(snap?.total ?? 0)}
        </dd>
        <dt className="text-dim">Attacks / s</dt>
        <dd className="text-right tabular-nums">{formatValue(Math.round((snap?.attacksPerSecond ?? 0) * 100) / 100)}</dd>
        <RaveReadout snap={snap} />
      </dl>
      <div className="flex flex-col justify-center gap-1">
        <Bar
          label="HP"
          value={hp}
          max={maxHp}
          tone="bg-red-500"
          text={`${maxHp > 0 ? formatValue(Math.round((hp / maxHp) * 1000) / 10) : 0}%`}
          note={
            recovering
              ? `+${maxHp > 0 ? formatValue(Math.round((hpRecovery / maxHp) * 1000) / 10) : 0}% a second (HP Recovery)`
              : "Rage: no recovery, -0.5% a second"
          }
        />
        <Bar
          label="MP"
          value={mana}
          max={maxMana}
          tone="bg-sky-500"
          text={`${formatValue(Math.floor(mana))} / ${formatValue(Math.round(maxMana))}`}
          note={`+${formatValue(Math.round(manaRecovery * 100) / 100)} a second (Mana Recovery)`}
        />
      </div>
    </div>
  );
}

const SLOTS = 10;

/**
 * The skill preset as 5 x 2 tiles. Castable skills are on auto (a turning gear)
 * by default; before a render a tap turns auto off or on. While the fight
 * plays, auto skills can't be pressed, and skills with auto off are cast by
 * tapping them once ready. A tile flashes each time its skill goes.
 */
function SkillGrid({
  profileSlots,
  fightSkills,
  skipped,
  includeSkills,
  manual,
  phase,
  snap,
  onToggleAuto,
  onCast,
}: {
  profileSlots: (string | null)[];
  fightSkills: FightSkill[];
  skipped: string[];
  includeSkills: boolean;
  manual: string[];
  phase: Phase;
  snap: FightState | null;
  onToggleAuto: (name: string) => void;
  onCast: (name: string) => void;
}) {
  const slots = Array.from({ length: SLOTS }, (_, i) => profileSlots[i] ?? null);
  const statusOf = (name: string): SkillStatus | undefined => snap?.skills.find((s) => s.name === name);

  return (
    <div className="flex shrink-0 flex-col gap-1">
      <div className="mx-auto grid w-3/4 max-w-72 grid-cols-5 gap-1">
        {slots.map((name, i) => {
          if (!name) return <div key={i} className="aspect-square rounded-md border border-dashed border-ink/15" />;
          const data = SKILL_BY_NAME.get(name);
          const fightSkill = fightSkills.find((s) => s.name === name);
          const status = statusOf(name);
          const castable = Boolean(fightSkill && fightSkill.kind !== "passive");
          const auto = !manual.includes(name);
          const reason = skipped.find((s) => s === name || s.startsWith(`${name} (`));
          const running = phase === "running";
          const blinking = Boolean(status && snap && status.lastCast >= 0 && snap.real - status.lastCast < BLINK_SECONDS);
          const ready = status ? status.ready : 1;
          const canPress = castable && (running ? !auto && (ready >= 1 || Boolean(status?.charged)) && !status?.queued : true);
          const stages = fightSkill?.maxStacks ?? null;
          const title = !includeSkills
            ? `${name}: Include Skills is off`
            : !fightSkill
              ? `${name}: ${reason ?? "counted through the skills it boosts"}`
              : castable
                ? `${name}: ${auto ? "auto" : "manual"}${running ? "" : " (tap to switch)"}${status?.stored ? ` · stored ${formatValue(status.stored)}` : ""}`
                : `${name}: passive`;
          return (
            <button
              key={i}
              type="button"
              title={title}
              aria-label={title}
              aria-pressed={castable ? auto : undefined}
              disabled={!includeSkills || !canPress}
              onClick={() => (running ? onCast(name) : onToggleAuto(name))}
              className={`relative aspect-square overflow-hidden rounded-md border bg-zinc-900 outline-none transition-[filter,box-shadow] focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${
                blinking ? "border-amber-300 shadow-[0_0_0_2px_rgba(252,211,77,0.9)] brightness-150" : "border-ink/25"
              } ${!includeSkills || reason ? "opacity-40" : ""}`}
            >
              {data?.icon && data.iconSize ? (
                <Image src={data.icon} alt="" width={data.iconSize} height={data.iconSize} className="size-full object-cover" draggable={false} />
              ) : (
                <span className="p-0.5 font-mono text-[7px] leading-none text-dim">{name}</span>
              )}
              {status && ready < 1 && !status.complete ? (
                <span className="absolute inset-x-0 top-0 bg-black/60" style={{ height: `${(1 - ready) * 100}%` }} />
              ) : null}
              {castable && fightSkill?.mpCost ? (
                <span
                  className={`absolute top-0 left-0 rounded-sm px-px font-mono text-[6px] leading-tight tabular-nums ${
                    status?.waitingForMana ? "bg-sky-500 text-white" : "bg-black/60 text-sky-300"
                  }`}
                >
                  {formatValue(Math.round(fightSkill.mpCost * 10) / 10)}
                </span>
              ) : null}
              {castable && auto ? (
                <Settings aria-hidden className="absolute inset-0 m-auto size-3/4 animate-[spin_4s_linear_infinite] text-white opacity-60" />
              ) : null}
              {castable && !auto && running && ready >= 1 ? (
                <span className="absolute inset-0 animate-pulse bg-white/15" />
              ) : null}
              {status?.waitingForMana ? (
                <span className="absolute right-0 bottom-0 left-0 bg-sky-600/90 text-center font-mono text-[6px] leading-tight text-white">NO MP</span>
              ) : status?.charged || (status && status.stored > 0) ? (
                <span className="absolute right-0 bottom-0 left-0 bg-fuchsia-500/85 text-center font-mono text-[6px] leading-tight text-white">
                  {status.charged ? (auto ? "RELEASE" : "TAP") : "STORING"}
                </span>
              ) : stages ? (
                <span className="absolute right-0 bottom-0 left-0 bg-black/70 text-center font-mono text-[6px] leading-tight text-white tabular-nums">
                  {status?.complete ? "MAX" : `${status?.stacks ?? 0}/${stages}`}
                </span>
              ) : status && status.active ? (
                <span className="absolute right-0 bottom-0 left-0 bg-amber-400/80 text-center font-mono text-[6px] leading-tight text-black">ON</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] leading-snug text-dim">
        {!includeSkills
          ? "Include Skills is off: basic attacks only."
          : phase === "running"
            ? "Skills with auto off light up when ready: tap to cast."
            : "Skills are on auto (turning gear). Tap one to switch it to manual before rendering. Rave stores 5 seconds of damage, then its reuse unleashes it."}
      </p>
    </div>
  );
}

/** The verdict and what would close the gap, once the fight's over. */
function Results({
  setup,
  total,
  duration,
  manual,
  breakdown,
}: {
  setup: ReturnType<typeof promotionFight>;
  total: number;
  duration: number;
  manual: string[];
  breakdown: Pick<FightState, "basic" | "bySkill">;
}) {
  const { profile } = useProfile();
  const boss = setup.boss!;
  const [analysis, setAnalysis] = useState<ReturnType<typeof promotionSuggestions> | null>(null);

  useEffect(() => {
    // The suggestions replay the fight many times; let the verdict paint first.
    const id = window.setTimeout(() => setAnalysis(promotionSuggestions(profile, setup, total, duration, manual)), 30);
    return () => window.clearTimeout(id);
  }, [profile, setup, total, duration, manual]);

  const ratio = boss.hp > 0 ? total / boss.hp : 0;
  const verdict =
    total <= 0
      ? { tone: "text-red-500", text: "No damage yet: set your Enhance ATK level first." }
      : total >= boss.maxHp
        ? { tone: "text-emerald-500", text: `High chance of success: you'd clear even stage ${boss.maxStage}'s boss in ${duration}s.` }
        : total >= boss.hp
          ? { tone: "text-emerald-500", text: `Good chance of success at stage ${boss.stage}.` }
          : total >= boss.minHp
            ? { tone: "text-amber-500", text: `Some chance: enough for stage ${boss.minStage}'s boss, short of stage ${boss.stage}.` }
            : { tone: "text-red-500", text: `Not yet: about ${formatValue(1 / Math.max(ratio, 1e-300))}× more damage needed.` };

  return (
    <div className="flex shrink-0 flex-col gap-1 border-t border-ink/10 pt-2 text-[11px] leading-snug">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 font-mono text-[10px]">
        <dt className="text-dim">Your damage in {duration}s</dt>
        <dd className="truncate text-right text-ink tabular-nums" title={formatValue(total)}>{formatValue(total)}</dd>
        <dt className="text-dim">{boss.name} boss HP</dt>
        <dd className="truncate text-right text-ink tabular-nums" title={formatValue(boss.hp)}>{formatValue(boss.hp)}</dd>
      </dl>
      <p className={`font-medium ${verdict.tone}`}>{verdict.text}</p>
      <DamageBreakdown total={total} breakdown={breakdown} />
      {analysis === null && total < boss.hp && total > 0 ? <p className="text-dim">Working out what would close the gap…</p> : null}
      {analysis?.suggestions.length ? (
        <div>
          <p className="text-dim">Each of these alone would get there:</p>
          <ul className="list-disc pl-4">
            {analysis.suggestions.map((s) => (
              <li key={s.label}>
                <span className="font-medium">{s.label}:</span> {s.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {analysis?.spread != null ? (
        <p className="text-dim">
          Or spread it: every damage source scales with ATK, so raising Weapons, Classes, Spirits, Extra ATK and Breakthrough
          each by about ×{formatValue(analysis.spread)} gets there too.
        </p>
      ) : null}
      {analysis?.withSkills != null ? (
        <p className="text-dim">
          With Include Skills ticked: {formatValue(analysis.withSkills)} ({formatValue((analysis.withSkills / Math.max(1, boss.hp)) * 100)}% of the boss HP).
        </p>
      ) : null}
      {profile.includeSkills && setup.skipped.length ? <p className="text-dim">Skills not modelled: {setup.skipped.join(", ")}.</p> : null}
      <p className="text-[10px] text-dim">
        Approximate, hit by hit: one basic attack a second before ATK SPD (the workbook has no base attack speed), skills
        cast as soon as they&apos;re ready when there&apos;s mana, casts pause basic attacks, Demon Hunt stops the clock,
        and Rave stores its duration&apos;s damage, unleashed on its reuse, which starts its cooldown. Life and mana refill by HP and Mana Recovery each second. Boss HP is estimated from the promotion&apos;s
        recommended stage.
      </p>
    </div>
  );
}

/** What stage the presets reach, once a stages fight is over. */
function StageResults({
  setup,
  total,
  duration,
  manual,
  breakdown,
}: {
  setup: ReturnType<typeof promotionFight>;
  total: number;
  duration: number;
  manual: string[];
  breakdown: Pick<FightState, "basic" | "bySkill">;
}) {
  const { profile } = useProfile();
  const cleared = stagesCleared(total);
  const next = cleared < STAGE_COUNT ? cleared + 1 : null;
  const nextHp = next ? stageBossHp(next) : 0;
  const highest = profile.character.highestStage;
  const [analysis, setAnalysis] = useState<ReturnType<typeof promotionSuggestions> | null>(null);

  useEffect(() => {
    if (!setup.boss) return;
    const id = window.setTimeout(() => setAnalysis(promotionSuggestions(profile, setup, total, duration, manual)), 30);
    return () => window.clearTimeout(id);
  }, [profile, setup, total, duration, manual]);

  return (
    <div className="flex shrink-0 flex-col gap-1 border-t border-ink/10 pt-2 text-[11px] leading-snug">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 font-mono text-[10px]">
        <dt className="text-dim">Your damage in {duration}s</dt>
        <dd className="truncate text-right text-ink tabular-nums" title={formatValue(total)}>{formatValue(total)}</dd>
        <dt className="text-dim">Stages cleared</dt>
        <dd className="text-right text-ink tabular-nums">{formatValue(cleared)}</dd>
        {cleared > 0 ? (
          <>
            <dt className="text-dim">Stage {cleared} boss HP</dt>
            <dd className="truncate text-right text-ink tabular-nums">{formatValue(stageBossHp(cleared))}</dd>
          </>
        ) : null}
        {next ? (
          <>
            <dt className="text-dim">Stage {next} boss HP</dt>
            <dd className="truncate text-right text-ink tabular-nums">{formatValue(nextHp)}</dd>
          </>
        ) : null}
      </dl>
      <DamageBreakdown total={total} breakdown={breakdown} />
      <p className={`font-medium ${cleared >= highest ? "text-emerald-500" : "text-amber-500"}`}>
        {cleared === 0
          ? "Not even stage 1's boss falls in this fight yet."
          : `With these presets you can reach stage ${formatValue(cleared)}${
              highest > 0 ? ` (${cleared >= highest ? `${formatValue(cleared - highest)} past` : `${formatValue(highest - cleared)} short of`} your highest, stage ${formatValue(highest)})` : ""
            }.`}
      </p>
      {next ? <p className="text-dim">Stage {next} needs about {formatValue(nextHp / Math.max(total, 1e-300))}× this damage.</p> : null}
      {analysis?.suggestions.length ? (
        <div>
          <p className="text-dim">Each of these alone would clear stage {next}:</p>
          <ul className="list-disc pl-4">
            {analysis.suggestions.map((s) => (
              <li key={s.label}>
                <span className="font-medium">{s.label}:</span> {s.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-[10px] text-dim">
        Against normal monsters: each stage&apos;s boss HP is passed as the damage builds up. Skills that read the enemy&apos;s HP
        (Breath of Fire, Judge&apos;s Torpedo, Thief Wind, Leveling) read stage {formatValue(Math.max(1, setup.stages?.reached ?? 1))}&apos;s boss.
      </p>
    </div>
  );
}

/** Where the fight's damage came from: every skill (Rave's release included), spirit skills and basic attacks. */
function DamageBreakdown({ total, breakdown }: { total: number; breakdown: Pick<FightState, "basic" | "bySkill"> }) {
  const rows = [...Object.entries(breakdown.bySkill), ["Basic attacks", breakdown.basic] as const]
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!rows.length) return null;
  return (
    <details className="text-[10px]">
      <summary className="cursor-pointer font-mono text-dim uppercase">Damage by source</summary>
      <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 font-mono">
        {rows.map(([name, amount]) => (
          <div key={name} className="contents">
            <dt className="text-dim">{name}</dt>
            <dd className="truncate text-right text-ink tabular-nums" title={formatValue(amount)}>{formatValue(amount)}</dd>
            <dd className="text-right text-dim tabular-nums">{formatValue(Math.round((amount / Math.max(total, 1e-300)) * 1000) / 10)}%</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
