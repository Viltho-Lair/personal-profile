"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile/use-profile";
import { RESOURCES, type ProfileV1 } from "@/lib/profile/types";
import { formatValue } from "./data";
import type { SpiritFactors } from "./spirit-stats";
import { type Plan, type PlanStep, type PlanTarget, type UpgradeCost, type UpgradePlans } from "./upgrade-planner";

const LABEL = "font-mono text-[9px] tracking-[0.08em] text-dim uppercase";
const pct = (damage: number, hp: number) => `${formatValue(Math.floor((damage / Math.max(1, hp)) * 1000) / 10)}%`;
const times = (value: number) => `×${formatValue(Math.round(value * 100) / 100)}`;

/** Runs the planner in a worker whenever the profile or the target changes. */
function usePlans(profile: ProfileV1, factors: SpiritFactors | null, target: PlanTarget) {
  const [state, setState] = useState<{ key: string; progress: number; result: UpgradePlans | null }>({ key: "", progress: 0, result: null });
  const key = JSON.stringify(target);
  useEffect(() => {
    const worker = new Worker(new URL("./upgrade-planner.worker.ts", import.meta.url), { type: "module" });
    const id = Date.now();
    worker.onmessage = (event: MessageEvent<{ id: number; progress?: number; result?: UpgradePlans }>) => {
      if (event.data.id !== id) return;
      if (event.data.result) setState({ key, progress: 1, result: event.data.result });
      else if (event.data.progress !== undefined) setState({ key, progress: event.data.progress, result: null });
    };
    worker.postMessage({ id, profile, factors, target: JSON.parse(key) as PlanTarget });
    return () => worker.terminate();
  }, [profile, factors, key]);
  return state.key === key ? state : { key, progress: 0, result: null };
}

/** A cost as chips, one per resource; units the workbook doesn't name are grey. */
function CostChips({ cost }: { cost: UpgradeCost }) {
  const resources = RESOURCES.filter((r) => (cost.resources[r.key] ?? 0) > 0);
  if (cost.unpriced && !resources.length && !cost.other.length) return <span className="font-mono text-[9px] text-dim">Cost not in the workbook</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {resources.map((r) => (
        <span key={r.key} className="rounded-sm border border-ink/25 px-1 font-mono text-[9px] text-ink tabular-nums">
          {formatValue(cost.resources[r.key] ?? 0)} {r.label}
        </span>
      ))}
      {cost.other.map((o) => (
        <span key={o.label} title="The workbook prices this without naming its unit" className="rounded-sm border border-ink/20 px-1 font-mono text-[9px] text-dim tabular-nums">
          {formatValue(Math.ceil(o.amount))} {o.label}
        </span>
      ))}
      {cost.unpriced ? <span className="font-mono text-[9px] text-dim">+ upgrades the workbook doesn&apos;t price</span> : null}
    </span>
  );
}

/** Where an upgrade goes, the way its levels read: levels, stars, a skill swapped in, or more soul weapons. */
function levelText(upgrade: PlanStep["upgrade"], level: number): string {
  if (upgrade.id === "soul-weapon") return `${formatValue(level - upgrade.current)} more soul weapon${level - upgrade.current === 1 ? "" : "s"}`;
  if (upgrade.unit === "swap") return "Swap it into the preset";
  if (upgrade.unit === "stars") return `${upgrade.current < 0 ? "Not owned" : `★${upgrade.current}`} → ★${level}`;
  return `Lv ${formatValue(upgrade.current)} → ${formatValue(level)}`;
}

/** One upgrade: its picture, what it is, the levels, and the cost. */
function UpgradeCard({ step }: { step: Pick<PlanStep, "upgrade" | "level" | "cost"> }) {
  const { upgrade, level, cost } = step;
  return (
    <li className="flex min-w-0 gap-2 rounded-md border border-ink/15 bg-ink/[0.03] p-2">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-black/30">
        {upgrade.icon && upgrade.iconSize ? (
          <Image src={upgrade.icon} alt="" width={upgrade.iconSize} height={upgrade.iconSize} className="size-full object-contain [image-rendering:pixelated]" draggable={false} />
        ) : (
          <span className="font-mono text-[8px] text-dim">{upgrade.kind.slice(0, 3)}</span>
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={LABEL}>{upgrade.kind}</span>
        <span className="truncate text-xs leading-tight font-medium text-ink">{upgrade.name}</span>
        <span className="font-mono text-[10px] text-ink tabular-nums">
          {levelText(upgrade, level)}
          {level >= upgrade.max && upgrade.unit !== "swap" ? <span className="text-dim"> (max)</span> : null}
        </span>
        <CostChips cost={cost} />
      </span>
    </li>
  );
}

/** The plan: its upgrades from where they are to where they go, what they cost together, and how far the fight gets. */
function PlanBlock({ plan, hp }: { plan: Plan; hp: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-ink/15 p-2">
      <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-[11px]">
        <span className="font-medium text-ink">
          {plan.steps.length} upgrade{plan.steps.length === 1 ? "" : "s"}, steepest first
        </span>
        <span className="font-mono text-[10px] text-dim tabular-nums">
          then deals {formatValue(plan.total)} ({pct(plan.total, hp)} of the HP)
        </span>
      </p>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {plan.steps.map((step) => (
          <UpgradeCard key={step.upgrade.id} step={step} />
        ))}
      </ul>
      {plan.steps.length > 1 ? (
        <p className="flex flex-wrap items-center gap-1.5 text-[10px] text-dim">
          Together: <CostChips cost={plan.cost} />
        </p>
      ) : null}
    </div>
  );
}

/**
 * How to beat the fight's enemy. The gap first (how much more of your own damage it takes), then the plan up the
 * steepest curves of the content that isn't maxed. Upgrades are compared by your own damage; spirit skills (Breath of
 * Fire) still count toward beating the HP.
 */
export function UpgradePlans({ title, target, factors }: { title: string; target: PlanTarget; factors: SpiritFactors | null }) {
  const { profile } = useProfile();
  const { progress, result } = usePlans(profile, factors, target);

  return (
    <section aria-label={title} className="flex flex-col gap-2 border-t border-ink/10 pt-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {!result ? (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-dim">Trying upgrades in the fight…</p>
          <span className="h-1 overflow-hidden rounded-full bg-ink/10">
            <span className="block h-full bg-sky-500 transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </span>
        </div>
      ) : result.baseline >= result.hp ? (
        <p className="text-[11px] text-emerald-500">
          Already beaten with what you have{result.rave ? `, pressing Rave at ${result.rave.first}s and ${result.rave.second}s` : ""}.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-0.5">
            <p className="text-[12px] text-ink">
              {result.needed === null ? (
                "Your own damage would need over a million times what it is now."
              ) : (
                <>
                  Your own damage needs <span className="font-semibold tabular-nums">{times(result.needed)}</span> to win.
                </>
              )}
            </p>
            <p className="text-[10px] text-dim">
              Now {pct(result.baseline, result.hp)} of the HP, spirit skills included
              {result.rave ? `, with Rave pressed by hand at ${result.rave.first}s and ${result.rave.second}s (its best timing here)` : ""}. Every plan below
              fights the same way.
            </p>
          </div>

          {result.checks.length ? (
            <ul className="flex flex-col gap-0.5 rounded-md border border-amber-400/40 bg-amber-400/[0.06] p-2 text-[10px] leading-snug text-amber-500">
              {result.checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] text-dim">
              The plan: every piece of content that isn&apos;t maxed is a curve from its start to its max (levels, tiers, stars, enhance). Step by step,
              the one whose next stretch lifts your damage the most moves. A stretch that costs resources counts as big as its price against what you own
              (or what you&apos;ve already spent on it) when that&apos;s more, and the plan spends at most {formatValue(result.budget)}× that.
            </p>
            {result.plan ? <PlanBlock plan={result.plan} hp={result.hp} /> : <p className="text-[11px] text-dim">No upgrade adds damage here.</p>}
            {result.won ? (
              <p className="text-[11px] text-emerald-500">That gets there.</p>
            ) : (
              <p className="text-[11px] text-red-400">
                Still short after that: your own damage needs {result.stillNeeded === null ? "over a million times" : times(result.stillNeeded)} more.{" "}
                {result.maxed >= result.hp
                  ? `Everything maxed would deal ${pct(result.maxed, result.hp)} of the HP, so it's reachable with a bigger budget.`
                  : `Even everything maxed deals only ${pct(result.maxed, result.hp)} of the HP.`}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
