"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile/use-profile";
import { RESOURCES, type ProfileV1 } from "@/lib/profile/types";
import { formatValue } from "./data";
import type { SpiritFactors } from "./spirit-stats";
import { affordable, type Gain, type Plan, type PlanStep, type PlanTarget, type UpgradeCost, type UpgradePlans } from "./upgrade-planner";

const LABEL = "font-mono text-[9px] tracking-[0.08em] text-dim uppercase";

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

/** A cost as chips: each resource green when it's owned, red with what's missing; unnamed units grey. */
function CostChips({ cost, owned }: { cost: UpgradeCost; owned: ProfileV1["resources"] }) {
  const { short } = affordable(cost, owned);
  const resources = RESOURCES.filter((r) => (cost.resources[r.key] ?? 0) > 0);
  if (cost.unpriced) return <span className="font-mono text-[9px] text-dim">Cost not in the workbook</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {resources.map((r) => {
        const missing = short[r.key];
        return (
          <span
            key={r.key}
            title={missing ? `${formatValue(missing)} ${r.label} short of what you own` : `You own enough ${r.label}`}
            className={`rounded-sm border px-1 font-mono text-[9px] tabular-nums ${missing ? "border-red-500/40 text-red-400" : "border-emerald-500/40 text-emerald-400"}`}
          >
            {formatValue(cost.resources[r.key] ?? 0)} {r.label}
          </span>
        );
      })}
      {cost.other.map((o) => (
        <span key={o.label} title="The workbook prices this without naming its unit" className="rounded-sm border border-ink/20 px-1 font-mono text-[9px] text-dim tabular-nums">
          {formatValue(Math.ceil(o.amount))} {o.label}
        </span>
      ))}
    </span>
  );
}

/** One upgrade: its picture, what it is, the levels, and the cost. */
function UpgradeCard({ step, owned, note }: { step: Pick<PlanStep, "upgrade" | "level" | "cost">; owned: ProfileV1["resources"]; note?: string }) {
  const { upgrade, level, cost } = step;
  const soulWeapon = upgrade.id === "soul-weapon";
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
          {soulWeapon ? `${formatValue(level - upgrade.current)} more soul weapon${level - upgrade.current === 1 ? "" : "s"}` : `Lv ${formatValue(upgrade.current)} → ${formatValue(level)}`}
          {level >= upgrade.max ? <span className="text-dim"> (max)</span> : null}
        </span>
        {note ? <span className="font-mono text-[10px] text-sky-400">{note}</span> : null}
        <CostChips cost={cost} owned={owned} />
      </span>
    </li>
  );
}

function PlanBlock({ plan, index, hp, owned }: { plan: Plan; index: number; hp: number; owned: ProfileV1["resources"] }) {
  const fits = affordable(plan.cost, owned).fits;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-ink/15 p-2">
      <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-[11px]">
        <span className="font-medium text-ink">
          Plan {index + 1} · {plan.steps.length} upgrade{plan.steps.length === 1 ? "" : "s"}
          {fits ? <span className="ml-1.5 font-mono text-[9px] text-emerald-400">affordable now</span> : null}
        </span>
        <span className="font-mono text-[10px] text-dim tabular-nums">
          deals {formatValue(plan.total)} ({formatValue(Math.floor((plan.total / Math.max(1, hp)) * 1000) / 10)}% of the HP)
        </span>
      </p>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {plan.steps.map((step) => (
          <UpgradeCard key={step.upgrade.id} step={step} owned={owned} />
        ))}
      </ul>
      {plan.steps.length > 1 ? (
        <p className="flex flex-wrap items-center gap-1.5 text-[10px] text-dim">
          Total: <CostChips cost={plan.cost} owned={owned} />
        </p>
      ) : null}
    </div>
  );
}

/**
 * How to beat the fight's enemy: single upgrades that do it alone, else the fewest together, else how far everything
 * maxed gets and which upgrades raise your own damage the most. Upgrades are compared by your own damage; spirit
 * skills (Breath of Fire) still count toward beating the HP.
 */
export function UpgradePlans({ title, target, factors }: { title: string; target: PlanTarget; factors: SpiritFactors | null }) {
  const { profile } = useProfile();
  const { progress, result } = usePlans(profile, factors, target);
  const owned = profile.resources;
  const anyOwned = RESOURCES.some((r) => owned[r.key] > 0);

  return (
    <section aria-label={title} className="flex flex-col gap-2 border-t border-ink/10 pt-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {!anyOwned ? <p className="text-[10px] text-dim">Add what you own under Settings → Owned resources to see which plans you can afford now.</p> : null}
      {!result ? (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-dim">Trying every upgrade in the fight…</p>
          <span className="h-1 overflow-hidden rounded-full bg-ink/10">
            <span className="block h-full bg-sky-500 transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </span>
        </div>
      ) : result.baseline >= result.hp ? (
        <p className="text-[11px] text-emerald-500">Already beaten with what you have.</p>
      ) : (
        <>
          {result.singles.length ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-dim">One upgrade that gets there on its own, the most affordable first:</p>
              {result.singles.slice(0, 6).map((plan, i) => (
                <PlanBlock key={plan.steps[0]!.upgrade.id} plan={plan} index={i} hp={result.hp} owned={owned} />
              ))}
            </div>
          ) : result.combos.length ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-dim">No single upgrade gets there. The fewest that do together:</p>
              {result.combos.map((plan, i) => (
                <PlanBlock key={plan.steps.map((s) => s.upgrade.id).join()} plan={plan} index={i} hp={result.hp} owned={owned} />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-red-500">
              Out of reach for now: even with every upgrade maxed the fight deals {formatValue(result.maxed)}, {formatValue(Math.floor((result.maxed / Math.max(1, result.hp)) * 1000) / 10)}% of the HP.
            </p>
          )}
          {result.gains.length ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-dim">
                The biggest boosts to your own damage ({formatValue(result.own)} now, spirit skills aside), each maxed:
              </p>
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {result.gains.map((gain: Gain) => (
                  <UpgradeCard
                    key={gain.upgrade.id}
                    step={{ upgrade: gain.upgrade, level: gain.upgrade.max, cost: gain.cost }}
                    owned={owned}
                    note={`×${formatValue(Math.round(gain.ownGain * 100) / 100)} your damage`}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
