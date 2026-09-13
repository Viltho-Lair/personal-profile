"use client";

import { useEffect, useState } from "react";
import { rarityGroup, spiritStat } from "@/lib/game/formulas";
import { spiritState } from "@/lib/profile/rules";
import { MAX_SPIRIT_ENHANCE, MIN_SPIRIT_ENHANCE } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { SPIRIT_TIERS, SPIRITS, type Spirit } from "./data";
import { InlineLevel } from "./level-input";
import { Sprite } from "./sprite";
import { ELEMENT_BORDER, ELEMENT_TEXT, TIER_TEXT } from "./tiers";

type SpiritFactors = {
  tiers: string[];
  atkHp: Record<string, number[]>;
  goldExp: Record<string, number[]>;
};

/** The factor matrices are large (23 tiers x 1,001 levels), so they load only when this screen opens. */
function useSpiritFactors() {
  const [factors, setFactors] = useState<SpiritFactors | null>(null);
  useEffect(() => {
    let active = true;
    import("@/data/optimizer/spirit-factors.json").then((module) => {
      if (active) setFactors(module.default as unknown as SpiritFactors);
    });
    return () => {
      active = false;
    };
  }, []);
  return factors;
}

const pct = (value: number) => `${(value * 100).toLocaleString("en", { maximumFractionDigits: 2 })}%`;

const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";

function SpiritRow({ spirit, factors }: { spirit: Spirit; factors: SpiritFactors | null }) {
  const { profile, setSpiritAwakening, setSpiritLevel, setSpiritEnhance } = useProfile();
  const state = spiritState(profile, spirit.name, spirit.maxLevel);
  const group = state.awakening ? rarityGroup(state.awakening) : "Common";
  const art = spirit.art[group] ?? spirit.art.Common;
  const skillLevel = spirit.skill?.levels.find((entry) => entry.level === state.enhance);

  const stat = (ratio: number, matrix: "atkHp" | "goldExp") => {
    if (!state.awakening) return "—";
    const factor = factors?.[matrix][state.awakening]?.[state.level];
    return factor === undefined ? "…" : pct(spiritStat(ratio, factor));
  };

  return (
    <li
      className={`grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-lg border p-2 sm:grid-cols-[3rem_minmax(8rem,1fr)_auto] ${
        (spirit.element && ELEMENT_BORDER[spirit.element]) || "border-ink/15"
      } ${state.owned ? "" : "bg-ink/[0.02]"}`}
    >
      <span className="row-span-2 flex size-12 items-center justify-center rounded-md bg-ink/[0.05] sm:row-span-1">
        {art ? (
          <Sprite
            src={art.icon}
            native={art.iconSize}
            size={64}
            className={`size-12 ${state.owned ? "" : "opacity-40 grayscale"}`}
          />
        ) : null}
      </span>

      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-sm leading-tight font-medium">{spirit.name}</h3>
          <span className={`font-mono text-[10px] tracking-[0.08em] uppercase ${(spirit.element && ELEMENT_TEXT[spirit.element]) || "text-dim"}`}>
            {[spirit.element, spirit.skill?.type].filter(Boolean).join(" · ")}
          </span>
        </div>
        {spirit.skill ? (
          <p className="text-xs leading-snug text-dim">
            <span className="text-ink">{spirit.skill.name}</span>
            {skillLevel ? ` · Lv ${skillLevel.level}: ${skillLevel.effect}` : null}
          </p>
        ) : null}
      </div>

      <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-2 sm:col-span-1 sm:justify-end">
        <label className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
          Awakening
          <select
            aria-label={`${spirit.name} awakening`}
            value={state.awakening ?? ""}
            onChange={(event) => setSpiritAwakening(spirit.name, event.target.value || null)}
            className={`${SELECT} ${state.awakening ? (TIER_TEXT[group] ?? "") : ""}`}
          >
            <option value="">Not owned</option>
            {SPIRIT_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier.replace(/ A(\d)$/, " ★$1")}
              </option>
            ))}
          </select>
        </label>
        <InlineLevel
          value={state.level}
          min={0}
          max={spirit.maxLevel}
          name={spirit.name}
          onChange={(level) => setSpiritLevel(spirit.name, level, spirit.maxLevel)}
        />
        <label className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
          Enhance
          <select
            aria-label={`${spirit.name} enhance`}
            value={state.enhance}
            onChange={(event) => setSpiritEnhance(spirit.name, Number(event.target.value))}
            className={SELECT}
          >
            {Array.from({ length: MAX_SPIRIT_ENHANCE - MIN_SPIRIT_ENHANCE + 1 }, (_, i) => MIN_SPIRIT_ENHANCE + i).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="col-span-2 grid grid-cols-4 gap-2 font-mono text-[10px] tracking-[0.06em] uppercase sm:col-span-3">
        {[
          ["ATK", stat(spirit.ratios.atk, "atkHp")],
          ["HP", stat(spirit.ratios.hp, "atkHp")],
          ["Gold", stat(spirit.ratios.gold, "goldExp")],
          ["EXP", stat(spirit.ratios.exp, "goldExp")],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col rounded-md bg-ink/[0.04] px-2 py-1">
            <dt className="text-dim">{label}</dt>
            <dd className="text-ink tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

export function SpiritGrid() {
  const factors = useSpiritFactors();

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Pick each spirit&apos;s awakening. Stats follow awakening and level; the skill follows enhance (1-5).
      </p>
      <ul className="grid gap-2 xl:grid-cols-2">
        {SPIRITS.map((spirit) => (
          <SpiritRow key={spirit.id} spirit={spirit} factors={factors} />
        ))}
      </ul>
    </div>
  );
}
