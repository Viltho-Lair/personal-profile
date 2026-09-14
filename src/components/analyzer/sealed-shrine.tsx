"use client";

import Image from "next/image";
import { statueValues, type ShrineStatue } from "@/lib/game/shrine";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue } from "./data";
import { InlineLevel } from "./level-input";
import { SHRINE } from "./stat-sources";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";

const percent = (value: number) => `${formatValue(Math.round(value * 10000) / 100)}%`;

function StatueCard({ statue }: { statue: ShrineStatue }) {
  const { profile, setShrineLevel } = useProfile();
  const max = statue.levels.length;
  const level = Math.min(profile.sealedShrine[statue.key], max);
  const current = statueValues(statue, level);
  const next = level < max ? statueValues(statue, level + 1) : null;

  return (
    <article className={`flex gap-3 rounded-lg border border-ink/15 p-3 ${level === 0 ? "opacity-70" : ""}`}>
      {statue.icon && statue.iconSize ? (
        <Image
          src={statue.icon}
          alt=""
          width={80}
          height={80}
          className="size-20 shrink-0 rounded-md border border-ink/15 object-contain p-1"
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h3 className="text-sm leading-tight font-medium">
            {statue.name} <span className={LABEL}>Max {max}</span>
          </h3>
          <InlineLevel value={level} min={0} max={max} name={statue.name} onChange={(l) => setShrineLevel(statue.key, l, max)} />
        </header>
        <table className="w-full font-mono text-[11px] tabular-nums">
          <thead>
            <tr className={LABEL}>
              <th className="text-left font-normal">Effect</th>
              <th className="text-right font-normal">Current</th>
              <th className="text-right font-normal">Next</th>
            </tr>
          </thead>
          <tbody>
            {statue.stats.map((stat, i) => (
              <tr key={stat}>
                <td className="py-0.5 pr-2 text-dim">{stat}</td>
                <td className="text-right text-ink">+{percent(current[i] ?? 0)}</td>
                <td className="text-right text-dim">
                  {next ? (
                    <span className={(next[i] ?? 0) > (current[i] ?? 0) ? "text-element-earth" : ""}>+{percent(next[i] ?? 0)}</span>
                  ) : (
                    "Max"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

/** The four Sealed Shrine statues with their levels, beside the relic list. */
export function SealedShrine() {
  return (
    <section aria-label="Sealed Shrine" className="flex flex-col gap-3">
      <h2 className={LABEL}>Sealed Shrine</h2>
      {SHRINE.statues.map((statue) => (
        <StatueCard key={statue.key} statue={statue} />
      ))}
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Level 0 means not unlocked. Dragon amplifies latent power growth, Order amplifies element damage, Chaos adds soul weapon
        and character ATK, Demon adds character HP and skill damage.
      </p>
    </section>
  );
}
