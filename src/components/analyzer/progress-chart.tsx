"use client";

import { useMemo, useState } from "react";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue } from "./data";
import { promotionFight, PROMOTION_STAGES } from "./promotion-fight";
import { useSpiritFactors } from "./spirit-stats";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";

const W = 400;
const H = 200;
const LEFT = 8;
const BOTTOM = 18;

/**
 * The promotion chart: damage dealt over the fight (X time, Y cumulative
 * damage) against the chosen promotion boss's HP.
 */
export function ProgressChart() {
  const { profile, setPromotionTarget } = useProfile();
  const factors = useSpiritFactors();
  const [logScale, setLogScale] = useState(false);

  const current = profile.character.promotion;
  const index = profile.promotionTarget.promotion ?? Math.min(current, PROMOTION_STAGES.length - 1);
  const duration = profile.promotionTarget.duration;
  const fight = useMemo(() => promotionFight(profile, factors, index, duration), [profile, factors, index, duration]);
  const { boss, result } = fight;

  const top = Math.max(result.total, boss?.maxHp ?? 0, 1) * 1.08;
  const scaleY = (value: number) => {
    const ratio = logScale ? Math.log10(1 + Math.max(0, value)) / Math.log10(1 + top) : value / top;
    return H - BOTTOM - ratio * (H - BOTTOM - 8);
  };
  const scaleX = (t: number) => LEFT + (t / duration) * (W - LEFT - 8);
  const path = result.points.map((p, i) => `${i ? "L" : "M"} ${scaleX(p.t).toFixed(1)} ${scaleY(p.damage).toFixed(1)}`).join(" ");
  const last = result.points[result.points.length - 1];

  const ratio = boss && boss.hp > 0 ? result.total / boss.hp : 0;
  const verdict = !boss
    ? null
    : result.total <= 0
      ? { tone: "text-red-500", text: "No damage yet: set your Enhance ATK level first." }
      : result.total >= boss.maxHp
      ? { tone: "text-emerald-500", text: `High chance of success: you'd clear even stage ${boss.maxStage}'s boss in ${duration}s.` }
      : result.total >= boss.hp
        ? { tone: "text-emerald-500", text: `Good chance of success at stage ${boss.stage}.` }
        : result.total >= boss.minHp
          ? { tone: "text-amber-500", text: `Some chance: enough for stage ${boss.minStage}'s boss, short of stage ${boss.stage}.` }
          : { tone: "text-red-500", text: `Not yet: about ${formatValue(1 / Math.max(ratio, 1e-300))}× more damage needed.` };

  return (
    <section aria-label="Promotion chart" className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-sm font-semibold">Promotion</h2>
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
        <label className={`flex items-center gap-1.5 ${LABEL}`}>
          Fight
          <input
            type="number"
            min={1}
            value={duration}
            aria-label="Fight duration in seconds"
            onChange={(event) => setPromotionTarget({ duration: Math.max(1, Math.floor(event.target.valueAsNumber || 1)) })}
            className="w-14 rounded-md border border-ink/20 bg-transparent px-1.5 py-1 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink"
          />
          s
        </label>
        <label className={`flex items-center gap-1 ${LABEL}`}>
          <input type="checkbox" checked={logScale} onChange={(event) => setLogScale(event.target.checked)} className="accent-ink" />
          Log scale
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="min-h-32 w-full flex-1" preserveAspectRatio="none" role="img" aria-label="Damage over the fight against the boss HP">
        {boss ? (
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
        <path d={path} fill="none" className="stroke-sky-500" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {last ? (
          <rect x={scaleX(last.t) - 3} y={scaleY(last.damage) - 3} width="6" height="6" transform={`rotate(45 ${scaleX(last.t)} ${scaleY(last.damage)})`} className="fill-ground stroke-ink" vectorEffect="non-scaling-stroke" />
        ) : null}
        {[0, 0.5, 1].map((f) => (
          <text key={f} x={scaleX(duration * f)} y={H - 5} textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"} className="fill-dim font-mono" fontSize="9">
            {Math.round(duration * f)}s
          </text>
        ))}
      </svg>

      {boss ? (
        <div className="flex flex-col gap-1 text-[11px] leading-snug">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 font-mono text-[10px]">
            <dt className="text-dim">Your damage in {duration}s</dt>
            <dd className="truncate text-right text-ink tabular-nums" title={formatValue(result.total)}>{formatValue(result.total)}</dd>
            <dt className="text-dim">{boss.name} boss HP</dt>
            <dd className="truncate text-right text-ink tabular-nums" title={formatValue(boss.hp)}>{formatValue(boss.hp)}</dd>
          </dl>
          {verdict ? <p className={`font-medium ${verdict.tone}`}>{verdict.text}</p> : null}
          {fight.suggestions.length ? (
            <div>
              <p className="text-dim">Each of these alone would get there:</p>
              <ul className="list-disc pl-4">
                {fight.suggestions.map((s) => (
                  <li key={s.label}>
                    <span className="font-medium">{s.label}:</span> {s.detail}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {verdict && result.total > 0 && result.total < boss.hp ? (
            <p className="text-dim">
              Or spread it: every damage source scales with ATK, so raising Weapons, Classes, Spirits, Extra ATK and
              Breakthrough each by about ×{formatValue(Math.pow(boss.hp / result.total, 1 / 5))} gets there too.
            </p>
          ) : null}
          {fight.withSkills !== null ? (
            <p className="text-dim">
              With Include Skills ticked: {formatValue(fight.withSkills)} ({formatValue((fight.withSkills / Math.max(1, boss.hp)) * 100)}% of the boss HP).
            </p>
          ) : null}
          {profile.includeSkills && fight.skipped.length ? (
            <p className="text-dim">Skills not modelled: {fight.skipped.join(", ")}.</p>
          ) : null}
          <p className="text-[10px] text-dim">
            Approximate: one basic attack a second (ATK SPD buffs raise it), skills cast on cooldown, no mana or timing. Boss HP is
            the recommended stage&apos;s boss from Stage Data; the fight length is yours to set.
          </p>
        </div>
      ) : null}
    </section>
  );
}
