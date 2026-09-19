"use client";

import Image from "next/image";
import { Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fightStatsOf, nextEvery, type FightInput, type FightSkill, type FightState, type SkillStatus } from "@/lib/game/battle";
import { useProfile } from "@/lib/profile/use-profile";
import { MAX_FIGHT_SECONDS } from "@/lib/profile/types";
import { formatValue, SKILL_BY_NAME, SPIRITS } from "./data";
import { ELEMENTS } from "@/lib/game/stats";
import { BeastArt } from "./beast-panel";
import { ELEMENT_BORDER, ELEMENT_TEXT } from "./tiers";
import { FamiliarArt } from "./skill-familiars";
import { FARM_WAVES, MOVE_SPEED, type FarmStage } from "@/lib/game/farm";
import type { Element } from "@/lib/game/stats";
import { BattleRender, type SingleEnemy } from "./farm-render";
import { DamageChart, type ChartLevel } from "./damage-chart";
import { rarityGroup } from "@/lib/game/formulas";
import { spiritState } from "@/lib/profile/rules";
import { FAMILIAR_SKILL, FARM_STAGES, FIGHT_SECONDS, promotionFight, PROMOTION_SECONDS, PROMOTION_STAGES, STAGE_COUNT, stageBossHp, stagesCleared } from "./promotion-fight";
import { UpgradePlans } from "./upgrade-plans";
import { segment, SEGMENTS } from "./nav-styles";
import { EquipSuggestions, LowestEquip } from "./equip-suggestions";
import { castInFightRun, retuneFightRun, setManualInFightRun, startFightRun, stopFightRun, useFightRun } from "./fight-run";
import { useSpiritFactors, type SpiritFactors } from "./spirit-stats";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";
const BUTTON =
  "rounded-md border px-3 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

const BLINK_SECONDS = 0.45;

type Phase = "idle" | "running" | "done";

/**
 * The fight, rendered in real time: damage over the fight against the chosen
 * promotion boss's HP (Boss monster ticked) or through the stages' boss HP, the
 * skill preset as a 5 x 2 grid that lights up as skills go, and the verdict
 * once the fight's over.
 */
export function ProgressChart() {
  const { profile, setPromotionTarget, setBossMonster, setNormalMonster, setEnemyElement, setStageFarming, toggleManualSkill, setManualSkills } = useProfile();
  const factors = useSpiritFactors();
  const [logScale, setLogScale] = useState(false);
  const [view, setView] = useState<"analysis" | "render">("render");
  // Which skills are on auto is saved with the skill preset.
  const manual = profile.skillPresetManual[profile.activeSkillPreset] ?? NO_MANUAL;

  const current = profile.character.promotion;
  const index = profile.promotionTarget.promotion ?? Math.min(current, PROMOTION_STAGES.length - 1);
  // A promotion boss fight lasts longer than a stage's, unless a custom length is set for every fight.
  const gameSeconds = profile.bossMonster && !profile.stageFarming.on ? PROMOTION_SECONDS : FIGHT_SECONDS;
  const seconds = profile.promotionTarget.customDuration ? profile.promotionTarget.duration : gameSeconds;
  const next = useMemo(() => promotionFight(profile, factors, index, seconds, manual), [profile, factors, index, seconds, manual]);
  // The Analysis and Render views both show the rendered fight, as it was set up when it started, until a new
  // render or a reload; before any render they show what a render would play now. Picking another enemy (fight
  // type, promotion or farming stage) or fight length clears it, so a result never shows under a fight it wasn't.
  const rendered = useFightRun();
  const sameFight = rendered !== null && fightKey(rendered.setup) === fightKey(next);
  useEffect(() => {
    if (rendered && !sameFight) stopFightRun(true);
  }, [rendered, sameFight]);
  // Equipping or unequipping while the fight plays changes it from there on: the life pool grows or shrinks around
  // the life already in it, so dropping HP gear for Rage and putting it back plays out as it does in the game.
  useEffect(() => {
    retuneFightRun(fightStatsOf(next.input));
  }, [next.input]);
  const run = sameFight ? rendered : null;
  const setup = run?.setup ?? next;
  const phase: Phase = run?.phase ?? "idle";
  const snap = run?.snap ?? null;
  const duration = setup.input.duration;
  const { boss } = setup;
  const stagesMode = setup.mode === "stages";
  const farmMode = setup.mode === "farm";
  const monsterMode = setup.mode === "monster";
  // What the controls set up for the next render.
  const nextFarm = next.mode === "farm";
  const nextStages = next.mode === "stages";

  // Every skill that can be pressed, and whether auto is off for all of them: the Auto button switches the lot,
  // during a fight as well as before it.
  const castableNames = useMemo(
    () => [...setup.skills.filter((skill) => skill.kind !== "passive").map((skill) => skill.name), ...(setup.familiar.skill ? [FAMILIAR_SKILL] : [])],
    [setup],
  );
  const autoOff = castableNames.length > 0 && castableNames.every((name) => manual.includes(name));
  // Turning auto off or on reaches the fight that's playing, so its skills stop or start casting themselves.
  useEffect(() => {
    setManualInFightRun(manual);
  }, [manual]);

  const render = () => startFightRun(next);
  const toggleAuto = (name: string) => toggleManualSkill(name);
  const castByHand = (name: string) => castInFightRun(name);

  const total = snap?.total ?? 0;
  // Stages: the chart follows the next stage's boss as the damage passes each one.
  const cleared = stagesMode ? (snap ? stagesCleared(total) : 0) : 0;
  const nextStage = stagesMode ? (snap ? (cleared < STAGE_COUNT ? cleared + 1 : null) : (boss?.stage ?? null)) : null;
  const nextHp = nextStage ? stageBossHp(nextStage) : 0;
  const top = Math.max(total, farmMode ? 0 : stagesMode ? nextHp : (boss?.maxHp ?? 0), 1) * 1.08;
  const levels: ChartLevel[] = farmMode
    ? []
    : stagesMode
      ? [
          ...(cleared > 0 ? [{ value: stageBossHp(cleared), label: `Stage ${cleared} cleared`, tone: "green" as const, align: "start" as const }] : []),
          ...(nextStage ? [{ value: nextHp, label: `Stage ${nextStage} boss HP`, tone: "red" as const, align: "end" as const }] : []),
        ]
      : boss
        ? [{ value: boss.hp, label: `${monsterMode ? "Monster" : "Boss"} HP · stage ${boss.stage}`, tone: "red", align: "end" }]
        : [];
  // The one enemy the render shows outside stage farming: the promotion boss, a normal monster, or the next stage's boss.
  const enemy: SingleEnemy | null = farmMode
    ? null
    : monsterMode
      ? boss
        ? { maxHp: boss.hp, boss: false, title: `${boss.name} monster`, subtitle: `Normal monster · stage ${boss.stage}` }
        : null
      : stagesMode
      ? nextStage
        ? { maxHp: nextHp, boss: Boolean(setup.input.bossMonster), title: `Stage ${nextStage} boss`, subtitle: `${formatValue(cleared)} stages cleared` }
        : null
      : boss
        ? { maxHp: boss.hp, boss: Boolean(setup.input.bossMonster), title: boss.name, subtitle: `Promotion boss · stage ${boss.stage}` }
        : null;
  // Each spirit shows in its awakening's art when its skill kicks in.
  const spiritArt = useMemo(
    () =>
      Object.fromEntries(
        SPIRITS.flatMap((spirit) => {
          if (!spirit.skill) return [];
          const awakening = spiritState(profile, spirit.name, spirit.maxLevel).awakening;
          const art = spirit.art[awakening ? rarityGroup(awakening) : "Common"] ?? spirit.art.Common;
          return art ? [[spirit.skill.name, art.icon]] : [];
        }),
      ) as Record<string, string>,
    [profile],
  );

  return (
    <section
      aria-label={farmMode ? "Stage farming" : stagesMode ? "Stages chart" : monsterMode ? "Monster chart" : "Promotion chart"}
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-sm font-semibold">
          {nextFarm ? "Stage farming" : nextStages ? "Stages" : next.mode === "monster" ? "Normal monster" : "Promotion"}
        </h2>
        <div className={SEGMENTS} role="group" aria-label="Fight view">
          {(["analysis", "render"] as const).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={segment(view === id)}
            >
              {id === "analysis" ? "Analysis" : "Render"}
            </button>
          ))}
        </div>
        {nextStages || nextFarm ? null : (
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
        {view === "analysis" ? (
          <label className={`flex items-center gap-1 ${LABEL}`}>
            <input type="checkbox" checked={logScale} onChange={(event) => setLogScale(event.target.checked)} className="accent-ink" />
            Log scale
          </label>
        ) : null}
        <div className="flex basis-full flex-wrap items-center gap-x-3 gap-y-1">
          <label className={`flex items-center gap-1 ${LABEL} ${nextFarm ? "opacity-40" : ""}`} title={nextFarm ? "Stage farming fights normal monsters" : "The promotion's boss; with neither ticked, the stages analysis"}>
            <input type="checkbox" checked={profile.bossMonster && !nextFarm} disabled={nextFarm} onChange={(event) => setBossMonster(event.target.checked)} className="accent-ink" />
            Boss monster
          </label>
          <label className={`flex items-center gap-1 ${LABEL} ${nextFarm ? "opacity-40" : ""}`} title={nextFarm ? "Stage farming fights normal monsters" : "A normal monster of the promotion's stage; with neither ticked, the stages analysis"}>
            <input type="checkbox" checked={profile.normalMonster && !nextFarm} disabled={nextFarm} onChange={(event) => setNormalMonster(event.target.checked)} className="accent-ink" />
            Normal monster
          </label>
          <label className={`flex items-center gap-1 ${LABEL}`} title="Walk through a stage's 10 waves and its box">
            <input type="checkbox" checked={profile.stageFarming.on} onChange={(event) => setStageFarming({ on: event.target.checked })} className="accent-ink" />
            Stage farming
          </label>
          {nextFarm && next.farm ? (
            <label className={`flex items-center gap-1 ${LABEL}`}>
              Stage
              <input
                type="number"
                min={1}
                max={FARM_STAGES.length}
                value={profile.stageFarming.stage}
                aria-label="Stage to farm"
                onChange={(event) => setStageFarming({ stage: Math.min(FARM_STAGES.length, Math.max(1, Math.floor(event.target.valueAsNumber || 1))) })}
                className="w-16 rounded-md border border-ink/20 bg-transparent px-1.5 py-0.5 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink"
              />
              <span className="normal-case tracking-normal text-ink">{next.farm.name}</span>
            </label>
          ) : null}
          <label className={`flex items-center gap-1 ${LABEL}`} title="x2 from the element that beats it, x0.7 from the one it beats">
            <input
              type="checkbox"
              checked={profile.enemyElement !== null}
              onChange={(event) => setEnemyElement(event.target.checked ? "Fire" : null)}
              className="accent-ink"
            />
            Element restricted
          </label>
          {profile.enemyElement ? (
            <select
              aria-label="Enemy element"
              value={profile.enemyElement}
              onChange={(event) => setEnemyElement(event.target.value as NonNullable<typeof profile.enemyElement>)}
              className={`${SELECT} ${ELEMENT_TEXT[profile.enemyElement] ?? ""}`}
            >
              {ELEMENTS.map((element) => (
                <option key={element} value={element}>
                  {element}
                </option>
              ))}
            </select>
          ) : null}
          <FightLength
            custom={profile.promotionTarget.customDuration}
            seconds={profile.promotionTarget.duration}
            gameSeconds={gameSeconds}
            onChange={setPromotionTarget}
          />
        </div>
        <span className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setManualSkills(autoOff ? [] : castableNames)}
            disabled={!castableNames.length}
            aria-pressed={!autoOff}
            title={
              autoOff
                ? "Auto is off: every skill waits for a press. Turn it back on."
                : "Auto is on: skills cast themselves. Turn it off to press them yourself."
            }
            className={`${BUTTON} ${autoOff ? "border-ink/25 text-dim hover:border-ink/60 hover:text-ink" : "border-ink text-ink hover:brightness-110"}`}
          >
            Auto {autoOff ? "off" : "on"}
          </button>
          {phase === "running" ? (
            <button
              type="button"
              onClick={() => stopFightRun(true)}
              className={`${BUTTON} border-ink/25 text-dim hover:border-ink/60 hover:text-ink`}
            >
              Stop
            </button>
          ) : null}
          <button
            type="button"
            onClick={render}
            disabled={phase === "running" || (!nextStages && !nextFarm && !next.boss)}
            className={`${BUTTON} border-ink bg-ink text-ground enabled:hover:brightness-110`}
          >
            {phase === "done" ? "Render again" : "Render"}
          </button>
        </span>
      </div>

      {view === "render" ? (
        <div className="relative shrink-0">
          <BattleRender
            stage={farmMode ? setup.farm : null}
            enemy={enemy}
            snap={snap}
            element={mainElement(setup.skills)}
            baseMoveSpeed={MOVE_SPEED * (setup.input.movementSpeed ?? 1)}
            spiritArt={spiritArt}
          />
          <EquipSuggestions />
        </div>
      ) : (
        <DamageChart
          points={snap ? snap.points : null}
          clock={snap?.clock ?? 0}
          duration={duration}
          top={top}
          logScale={logScale}
          levels={levels}
          band={!farmMode && !stagesMode && boss ? { from: boss.minHp, to: boss.maxHp } : null}
          releases={snap?.releases ?? []}
          placeholder={`Press Render to play the ${duration}s fight`}
          label={farmMode ? "Damage over the stage farming run" : "Damage over the fight against the boss HP"}
        />
      )}

      {farmMode && setup.farm ? (
        <FarmHealth stage={setup.farm} snap={snap} />
      ) : stagesMode ? (
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
        <HealthBar hp={boss.hp} damage={total} label={`${boss.name} ${monsterMode ? "monster" : "boss"} HP · stage ${boss.stage}`} />
      ) : null}

      <LiveReadout snap={snap} input={setup.input} duration={duration} />

      <SkillGrid
        beast={setup.beast}
        familiar={setup.familiar}
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
        {farmMode ? "Stage farming normal monsters" : monsterMode ? "Against a normal monster" : stagesMode ? "Through the stages' bosses" : "Against a boss monster"} · Spirit skills:{" "}
        {setup.spirits.active.length ? setup.spirits.active.join(", ") : "none in the spirit preset"}
        {setup.spirits.unknown.length ? ` · no value for ${setup.spirits.unknown.join(", ")}` : ""}.
      </p>

      {phase === "done" && snap ? (
        farmMode && setup.farm ? (
          <FarmResults stage={setup.farm} snap={snap} duration={duration} />
        ) : stagesMode ? (
          <StageResults setup={setup} total={snap.total} duration={duration} manual={manual} breakdown={snap} factors={factors} />
        ) : monsterMode && boss ? (
          <MonsterResults name={boss.name} stage={boss.stage} hp={boss.hp} snap={snap} duration={duration} manual={manual} factors={factors} />
        ) : boss ? (
          <Results setup={setup} total={snap.total} duration={duration} manual={manual} breakdown={snap} factors={factors} />
        ) : null
      ) : null}
    </section>
  );
}

const NO_MANUAL: string[] = [];

/**
 * Which enemy a fight is against: its type, the promotion boss or monster and its stage, or the farmed stage. The
 * stages analysis is one enemy however far it reaches.
 */
/**
 * How long fights last: the game's own length (75s for a promotion boss, 60s otherwise) or a custom one, in whole
 * seconds up to ten minutes, for every fight. The number only saves once it's a whole second or more, so clearing
 * the box to type a new one doesn't jump the fight to 1s on the way.
 */
function FightLength({
  custom,
  seconds,
  gameSeconds,
  onChange,
}: {
  custom: boolean;
  seconds: number;
  gameSeconds: number;
  onChange: (change: { duration?: number; customDuration?: boolean }) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-1.5">
      <label className={`flex items-center gap-1 ${LABEL}`} title={`Off: the game's ${gameSeconds}s. On: your own length for every fight.`}>
        <input
          type="checkbox"
          checked={custom}
          onChange={(event) => onChange({ customDuration: event.target.checked })}
          className="accent-ink"
        />
        Custom time
      </label>
      {custom ? (
        <label className={`flex items-center gap-1 ${LABEL}`}>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_FIGHT_SECONDS}
            step={1}
            value={draft ?? seconds}
            aria-label="Fight length in seconds"
            onChange={(event) => {
              setDraft(event.target.value);
              const next = Math.floor(event.target.valueAsNumber);
              if (Number.isFinite(next) && next >= 1) onChange({ duration: Math.min(MAX_FIGHT_SECONDS, next) });
            }}
            onBlur={() => setDraft(null)}
            className="w-16 rounded-md border border-ink/20 bg-transparent px-1.5 py-0.5 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink"
          />
          <span className="normal-case">s</span>
        </label>
      ) : (
        <span className={`${LABEL} normal-case`}>· {gameSeconds}s</span>
      )}
    </span>
  );
}

const fightKey = (setup: ReturnType<typeof promotionFight>) =>
  `${setup.input.duration}|${setup.mode === "stages" ? "stages" : `${setup.mode}|${setup.boss?.name ?? ""}|${setup.boss?.stage ?? ""}|${setup.farm?.stage ?? ""}`}`;

/** A normal monster's verdict: whether it went down, and how fast. */
function MonsterResults({
  name,
  stage,
  hp,
  snap,
  duration,
  manual,
  factors,
}: {
  name: string;
  stage: number;
  hp: number;
  snap: FightState;
  duration: number;
  manual: string[];
  factors: SpiritFactors | null;
}) {
  const killedAt = snap.points.find((point) => point.damage >= hp)?.t ?? null;
  const target = useMemo(
    () => ({ mode: "monster" as const, promotionIndex: Math.max(0, PROMOTION_STAGES.findIndex((p) => p.name === name)), duration, manual }),
    [name, duration, manual],
  );
  return (
    <div className="flex shrink-0 flex-col gap-1 border-t border-ink/10 pt-2 text-[11px] leading-snug">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 font-mono text-[10px]">
        <dt className="text-dim">{name} monster HP · stage {stage}</dt>
        <dd className="truncate text-right text-ink tabular-nums" title={formatValue(hp)}>{formatValue(hp)}</dd>
        <dt className="text-dim">Damage dealt</dt>
        <dd className="truncate text-right text-ink tabular-nums" title={formatValue(snap.total)}>{formatValue(snap.total)}</dd>
      </dl>
      <p className={`font-medium ${killedAt !== null ? "text-emerald-500" : "text-red-500"}`}>
        {killedAt !== null
          ? killedAt < 0.05
            ? "Down at once, on the first hits."
            : `Down in ${killedAt.toFixed(1)}s: about ${formatValue(Math.floor(60 / killedAt))} a minute.`
          : `Still standing after ${duration}s: ${formatValue(Math.round((snap.total / Math.max(1, hp)) * 1000) / 10)}% of its HP.`}
      </p>
      <DamageBreakdown total={snap.total} breakdown={snap} />
      {killedAt === null && snap.total > 0 ? <UpgradePlans title={`How to beat ${name}'s monster in ${duration}s`} target={target} factors={factors} /> : null}
    </div>
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
  beast,
  familiar,
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
  beast: ReturnType<typeof promotionFight>["beast"];
  familiar: ReturnType<typeof promotionFight>["familiar"];
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
      <div className="mx-auto flex w-full items-center justify-center gap-2">
      <BeastTile beast={beast} snap={snap} />
      <div className="grid w-3/4 max-w-72 grid-cols-5 gap-1">
        {slots.map((name, i) => {
          if (!name) return <div key={i} className="aspect-square rounded-md border border-dashed border-ink/15" />;
          const data = SKILL_BY_NAME.get(name);
          const fightSkill = fightSkills.find((s) => s.name === name);
          const status = statusOf(name);
          const castable = Boolean(fightSkill && fightSkill.kind !== "passive");
          const auto = !manual.includes(name);
          const reason = skipped.find((s) => s === name || s.startsWith(`${name} (`));
          const running = phase === "running";
          const blink = status && snap && status.lastCast >= 0 ? Math.max(0, 1 - (snap.real - status.lastCast) / BLINK_SECONDS) : 0;
          const recharging = Boolean(status && status.ready < 1 && !status.complete && !status.active && fightSkill && (fightSkill.trigger === "seconds" || fightSkill.trigger === "hits"));
          // What's left to go: seconds of cooldown, or strikes for skills that go on basic attacks.
          const left = recharging && fightSkill && status ? (1 - status.ready) * nextEvery(fightSkill, status.uses) : 0;
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
              className={`relative aspect-square overflow-hidden rounded-md border bg-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${
                blink > 0 ? "border-white" : "border-ink/25"
              } ${!includeSkills || reason ? "opacity-40" : ""}`}
            >
              {data?.icon && data.iconSize ? (
                <Image
                  src={data.icon}
                  alt=""
                  width={data.iconSize}
                  height={data.iconSize}
                  className={`size-full object-cover ${recharging ? "brightness-50 grayscale" : ""}`}
                  draggable={false}
                />
              ) : (
                <span className="p-0.5 font-mono text-[7px] leading-none text-dim">{name}</span>
              )}
              {/* Recharging, as in the game: the icon greys, a blue fill rises from the bottom and the time left counts down. */}
              {recharging ? (
                <>
                  <span className="absolute inset-x-0 bottom-0 bg-sky-500/45" style={{ height: `${ready * 100}%` }} />
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-white tabular-nums [text-shadow:0_0_3px_#000]">
                    {fightSkill?.trigger === "hits" ? Math.ceil(left) : left.toFixed(1)}
                  </span>
                </>
              ) : null}
              {blink > 0 ? <span className="absolute inset-0 bg-white" style={{ opacity: 0.85 * blink }} /> : null}
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
      <FamiliarTile
        familiar={familiar}
        snap={snap}
        auto={!manual.includes(FAMILIAR_SKILL)}
        running={phase === "running"}
        onToggleAuto={() => onToggleAuto(FAMILIAR_SKILL)}
        onCast={() => onCast(FAMILIAR_SKILL)}
      />
      <LowestEquip />
      </div>
      <p className="text-[10px] leading-snug text-dim">
        {!includeSkills
          ? "Include Skills is off: basic attacks only."
          : phase === "running"
            ? "Skills with auto off light up when ready: tap to cast."
            : "Skills are on auto (turning gear). Tap one to switch it to manual before rendering. Rave stores 5 seconds of damage, then its reuse unleashes it over 2 seconds of stopped time."}
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
  factors,
}: {
  setup: ReturnType<typeof promotionFight>;
  total: number;
  duration: number;
  manual: string[];
  breakdown: Pick<FightState, "basic" | "bySkill">;
  factors: SpiritFactors | null;
}) {
  const { profile } = useProfile();
  const boss = setup.boss!;
  const target = useMemo(
    () => ({ mode: "promotion" as const, promotionIndex: Math.max(0, PROMOTION_STAGES.findIndex((p) => p.name === boss.name)), duration, manual }),
    [boss.name, duration, manual],
  );

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
      {total < boss.hp && total > 0 ? <UpgradePlans title={`How to beat ${boss.name}`} target={target} factors={factors} /> : null}
      {profile.includeSkills && setup.skipped.length ? <p className="text-dim">Skills not modelled: {setup.skipped.join(", ")}.</p> : null}
      <p className="text-[10px] text-dim">
        Approximate, hit by hit: one basic attack a second before ATK SPD (the workbook has no base attack speed), skills
        cast as soon as they&apos;re ready when there&apos;s mana, casts pause basic attacks, Demon Hunt stops the clock,
        and Rave stores its duration&apos;s damage, unleashed on its reuse over 2 seconds while everything else stops, which starts its cooldown. Life and mana refill by HP and Mana Recovery each second. Boss HP is estimated from the promotion&apos;s
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
  factors,
}: {
  setup: ReturnType<typeof promotionFight>;
  total: number;
  duration: number;
  manual: string[];
  breakdown: Pick<FightState, "basic" | "bySkill">;
  factors: SpiritFactors | null;
}) {
  const { profile } = useProfile();
  const cleared = stagesCleared(total);
  const next = cleared < STAGE_COUNT ? cleared + 1 : null;
  const nextHp = next ? stageBossHp(next) : 0;
  const highest = profile.character.highestStage;
  // Plans aim at the first stage these presets don't clear, fought on its own.
  const planStage = setup.stages?.next ?? next;
  const target = useMemo(() => (planStage ? { mode: "stages" as const, promotionIndex: 0, stage: planStage, duration, manual } : null), [planStage, duration, manual]);

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
      {target ? <UpgradePlans title={`How to clear stage ${formatValue(target.stage)}`} target={target} factors={factors} /> : null}
      <p className="text-[10px] text-dim">
        Against each stage&apos;s boss, a boss monster: its HP is passed as the damage builds up. Skills that read the enemy&apos;s HP
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

/** The equipped beast, left of the skills: always on auto, filling toward its condition and lit while its effect lasts. */
function BeastTile({ beast, snap }: { beast: ReturnType<typeof promotionFight>["beast"]; snap: FightState | null }) {
  const { profile } = useProfile();
  const size = "w-[calc(3/4*18rem/5)] max-w-[3.4rem]";
  if (!beast.beast) return <div aria-hidden className={`${size} aspect-square shrink-0`} />;
  const status = snap?.skills.find((s) => s.name === beast.beast?.name);
  const ready = status ? status.ready : 0;
  const title = beast.note ?? `${beast.beast.name}: ${beast.beast.skill.text.replace("X", String(beast.beast.skill.x))} (always auto)`;
  return (
    <div title={title} aria-label={title} className={`relative ${size} aspect-square shrink-0 overflow-hidden rounded-md border ${status?.active ? "border-amber-300" : "border-ink/25"} bg-zinc-900`}>
      <span className="absolute inset-0 flex items-center justify-center">
        <BeastArt beast={beast.beast} awaken={profile.beasts[beast.beast.name]?.awaken ?? null} size={48} />
      </span>
      {beast.skill && status && !status.active && ready < 1 ? (
        <span className="absolute inset-x-0 top-0 bg-black/60" style={{ height: `${(1 - ready) * 100}%` }} />
      ) : null}
      {beast.note ? <span className="absolute inset-x-0 bottom-0 bg-black/70 text-center font-mono text-[6px] leading-tight text-dim">RIFT</span> : null}
      {status?.complete && !status.active ? <span className="absolute inset-x-0 bottom-0 bg-black/70 text-center font-mono text-[6px] leading-tight text-dim">USED</span> : null}
      {status?.active ? <span className="absolute inset-x-0 bottom-0 bg-amber-400/80 text-center font-mono text-[6px] leading-tight text-black">ON</span> : null}
    </div>
  );
}

/**
 * The familiar use, right of the skills: its three familiars' combined attack. Like a skill it's on auto
 * (turning gear) by default; tap it before a render to cast it by hand, then tap it when it's ready.
 */
function FamiliarTile({
  familiar,
  snap,
  auto,
  running,
  onToggleAuto,
  onCast,
}: {
  familiar: ReturnType<typeof promotionFight>["familiar"];
  snap: FightState | null;
  auto: boolean;
  running: boolean;
  onToggleAuto: () => void;
  onCast: () => void;
}) {
  const size = "w-[calc(3/4*18rem/5)] max-w-[3.4rem]";
  const { weapon, attribute, battle } = familiar.parts;
  if (!familiar.skill || !weapon || !attribute || !battle) {
    return (
      <div title="Familiar: equip an attribute, battle and weapon familiar" className={`${size} flex aspect-square shrink-0 items-center justify-center rounded-md border border-dashed border-ink/15 font-mono text-[7px] text-dim`}>
        FAMILIAR
      </div>
    );
  }
  const status = snap?.skills.find((s) => s.name === FAMILIAR_SKILL);
  const ready = status ? status.ready : 1;
  const blinking = Boolean(status && snap && status.lastCast >= 0 && snap.real - status.lastCast < BLINK_SECONDS);
  const effect = familiar.skill.effect.type === "damage" ? familiar.skill.effect : null;
  const spent = Boolean(status?.complete);
  const canPress = running ? !auto && !spent && ready >= 1 && !status?.queued : true;
  const uses = familiar.skill.maxUses ?? 1;
  const title = `Familiar (${attribute.familiar.name} + ${battle.familiar.name} + ${weapon.familiar.name}): ${effect?.hits ?? 1} hits of ${formatValue(Math.round((effect?.power ?? 0) * 10000) / 100)}% ATK${
    familiar.skill.element ? ` as ${familiar.skill.element}` : ""
  }, range ${familiar.range}, ${uses > 1 ? `${uses} uses a battle, ${formatValue(familiar.skill.every)}s apart` : "once a battle"} · ${auto ? "auto" : "manual"}${running ? "" : " (tap to switch)"}`;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={auto}
      disabled={!canPress}
      onClick={() => (running ? onCast() : onToggleAuto())}
      className={`relative ${size} aspect-square shrink-0 overflow-hidden rounded-md border bg-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${
        blinking ? "border-amber-300 shadow-[0_0_0_2px_rgba(252,211,77,0.9)] brightness-150" : familiar.skill.element ? (ELEMENT_BORDER[familiar.skill.element] ?? "border-ink/25") : "border-ink/25"
      }`}
    >
      <span className="absolute inset-0 flex items-center justify-center">
        <FamiliarArt familiar={weapon.familiar} stars={weapon.stars} size={40} />
      </span>
      {spent ? <span className="absolute inset-0 bg-black/60" /> : status && ready < 1 ? <span className="absolute inset-x-0 top-0 bg-black/60" style={{ height: `${(1 - ready) * 100}%` }} /> : null}
      {auto && !spent ? <Settings aria-hidden className="absolute inset-0 m-auto size-3/4 animate-[spin_4s_linear_infinite] text-white opacity-60" /> : null}
      {!auto && running && !spent && ready >= 1 ? <span className="absolute inset-0 animate-pulse bg-white/15" /> : null}
      <span className="absolute inset-x-0 bottom-0 bg-black/70 text-center font-mono text-[6px] leading-tight text-white">{spent ? "USED" : "FAMILIAR"}</span>
    </button>
  );
}

/** The monster in front's HP while farming, with its wave underneath. */
function FarmHealth({ stage, snap }: { stage: FarmStage; snap: FightState | null }) {
  const field = snap?.field;
  const front = field ? field.enemies.find((e) => e.hp > 0) : null;
  if (field && !front) return <p className="shrink-0 font-mono text-[10px] text-emerald-500">Box broken: stage {stage.stage} cleared</p>;
  const hp = front?.maxHp ?? stage.enemyHp;
  const lost = front ? front.maxHp - front.hp : 0;
  const label = front?.box ? "Box HP" : `Wave ${front?.wave ?? 1} / ${FARM_WAVES} · monster HP`;
  return <HealthBar hp={hp} damage={lost} label={label} />;
}

/** How the farming run went: the clear time, kills and damage. */
function FarmResults({ stage, snap, duration }: { stage: FarmStage; snap: FightState; duration: number }) {
  const field = snap.field;
  const cleared = snap.clearedAt !== null;
  return (
    <div className="flex shrink-0 flex-col gap-1 border-t border-ink/10 pt-2 text-[11px] leading-snug">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 font-mono text-[10px]">
        <dt className="text-dim">Stage</dt>
        <dd className="text-right text-ink">{stage.stage} · {stage.name}</dd>
        <dt className="text-dim">Monsters down</dt>
        <dd className="text-right text-ink tabular-nums">{field ? `${field.kills} / ${field.enemies.length}` : "—"}</dd>
        <dt className="text-dim">Damage dealt</dt>
        <dd className="truncate text-right text-ink tabular-nums" title={formatValue(snap.total)}>{formatValue(snap.total)}</dd>
        {cleared ? (
          <>
            <dt className="text-dim">Clears an hour</dt>
            <dd className="text-right text-ink tabular-nums">{formatValue(Math.floor(3600 / Math.max(0.1, snap.clearedAt ?? 1)))}</dd>
          </>
        ) : null}
      </dl>
      <p className={`font-medium ${cleared ? "text-emerald-500" : "text-red-500"}`}>
        {cleared
          ? `Cleared in ${snap.clearedAt?.toFixed(1)}s.`
          : `Not cleared in ${duration}s: ${field ? field.enemies.length - field.kills : 0} monsters still standing.`}
      </p>
      <DamageBreakdown total={snap.total} breakdown={snap} />
      <p className="text-[10px] text-dim">
        {FARM_WAVES} waves of {stage.mobs} monsters ({formatValue(stage.enemyHp)} HP each) and a box with a monster&apos;s HP, a range apart
        with 10 range between waves. The slayer walks 5 range a second; basic attacks and Rave hit the monster in front, skills and the
        familiar everything in their range.
      </p>
    </div>
  );
}

/** The element most of the preset's attack and buff skills share: the slayer wears it while farming. */
function mainElement(skills: FightSkill[]): Element | null {
  const counts = new Map<Element, number>();
  for (const skill of skills) if (skill.element && skill.kind !== "passive") counts.set(skill.element, (counts.get(skill.element) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
