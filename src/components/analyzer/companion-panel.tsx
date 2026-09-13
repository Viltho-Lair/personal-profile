"use client";

import { useState } from "react";
import companionsData from "@/data/optimizer/companions.json";
import {
  companionEffect,
  companionLevel,
  costToMax,
  formatEffect,
  nextLevelCost,
  promotionBuff,
  type CompanionFormula,
  type CostTable,
} from "@/lib/game/companions";
import { clampLevel, companionState } from "@/lib/profile/rules";
import type { ProfileV1 } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { BeastPanel } from "./beast-panel";
import { formatValue } from "./data";
import { InlineLevel } from "./level-input";
import { Sprite } from "./sprite";
import { ELEMENT_BORDER, ELEMENT_TEXT } from "./tiers";

type CompanionSkill = {
  name: string;
  group: number;
  maxLevel: number;
  effect: string | null;
  formula: CompanionFormula;
  unlock: { advancement: number; allCompanions: boolean } | null;
  costs: CostTable;
};

type Companion = {
  id: number;
  name: string;
  element: string | null;
  skills: CompanionSkill[];
  skins: { advancement: number; name: string; icon: string | null; iconSize: number | null }[];
};

type Promotion = {
  options: string[];
  /** Options shown as plain numbers (Accuracy, Dodge, CC Resist) rather than percents. */
  flatOptions: string[];
  tiers: { colour: string; values: Record<string, number> }[];
  rankMultipliers: Record<string, number>;
  slotsByAdvancement: (string | null)[][];
};

const COMPANIONS = companionsData.companions as unknown as Companion[];
const PROMOTION = companionsData.promotion as unknown as Promotion;
const MAX_ADVANCEMENT = PROMOTION.slotsByAdvancement.length - 1;
const optionDisplay = (option: string | null) => (option && PROMOTION.flatOptions.includes(option) ? "flat" : "percent");

const GROUP_LABEL = ["", "Passive I", "Passive II", "Passive III"];
const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const TIER_COLOUR: Record<string, string> = {
  White: "text-ink",
  Green: "text-tier-great",
  Orange: "text-tier-legendary",
  Purple: "text-tier-epic",
  Red: "text-element-fire",
  Aqua: "text-element-water",
};

const cost = ([stones, emeralds]: readonly [number, number]) =>
  `${formatValue(stones)} stones · ${formatValue(emeralds)} emeralds`;

function advancementOf(profile: ProfileV1, companion: Companion) {
  return clampLevel(companionState(profile, companion.name).advancement, MAX_ADVANCEMENT);
}

function skinFor(companion: Companion, advancement: number) {
  return companion.skins.find((skin) => skin.advancement === advancement) ?? companion.skins[0];
}

function isUnlocked(skill: CompanionSkill, companion: Companion, profile: ProfileV1) {
  if (!skill.unlock) return true;
  const { advancement, allCompanions } = skill.unlock;
  return allCompanions
    ? COMPANIONS.every((c) => advancementOf(profile, c) >= advancement)
    : advancementOf(profile, companion) >= advancement;
}

function Portrait({ companion, advancement, size = 64 }: { companion: Companion; advancement: number; size?: number }) {
  const skin = skinFor(companion, advancement);
  return skin?.icon && skin.iconSize ? (
    <Sprite src={skin.icon} native={skin.iconSize} size={size} className="rounded-md" />
  ) : null;
}

function SkillRow({ companion, skill }: { companion: Companion; skill: CompanionSkill }) {
  const { profile, setCompanionSkillLevel } = useProfile();
  const level = clampLevel(companionState(profile, companion.name).skills[skill.name] ?? 0, skill.maxLevel);
  const unlocked = isUnlocked(skill, companion, profile);
  const next = nextLevelCost(skill.costs, level, skill.maxLevel);

  return (
    <li className={`flex flex-col gap-1 rounded-md border border-ink/10 p-2 ${unlocked ? "" : "opacity-50"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs leading-tight font-medium">{skill.name}</p>
          <p className="text-[11px] leading-tight text-dim">
            {skill.effect}{" "}
            <span className="text-ink tabular-nums">
              {formatEffect(skill.formula.display, companionEffect(skill.formula, level))}
            </span>
          </p>
        </div>
        <InlineLevel
          value={level}
          min={0}
          max={skill.maxLevel}
          name={`${companion.name} ${skill.name}`}
          onChange={(value) => unlocked && setCompanionSkillLevel(companion.name, skill.name, value, skill.maxLevel)}
        />
      </div>
      <p className="font-mono text-[9px] leading-snug tracking-[0.04em] text-dim uppercase">
        {!unlocked && skill.unlock
          ? `Unlocks at advancement ${skill.unlock.advancement}${skill.unlock.allCompanions ? " (all companions)" : ""}`
          : next
            ? `Next: ${cost(next)}`
            : "Max level"}
      </p>
      <p className="font-mono text-[9px] leading-snug tracking-[0.04em] text-dim uppercase">
        Max Lv {formatValue(skill.maxLevel)} · to max: {cost(costToMax(skill.costs, level, skill.maxLevel))}
      </p>
    </li>
  );
}

function CompanionColumn({
  companion,
  selected,
  onSelect,
}: {
  companion: Companion;
  selected: boolean;
  onSelect: () => void;
}) {
  const { profile } = useProfile();
  const state = companionState(profile, companion.name);
  const advancement = advancementOf(profile, companion);
  const levels = companion.skills.map((skill) => clampLevel(state.skills[skill.name] ?? 0, skill.maxLevel));
  const total = companion.skills.reduce<[number, number]>(
    (sum, skill, i) => {
      const [s, e] = costToMax(skill.costs, levels[i], skill.maxLevel);
      return [sum[0] + s, sum[1] + e];
    },
    [0, 0],
  );

  return (
    // On a phone only the selected companion's column shows; the picker above switches it.
    <section className={`min-w-0 flex-col gap-2 ${selected ? "flex" : "hidden md:flex"}`}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`flex items-center gap-2 rounded-lg border p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          selected
            ? "border-ink ring-1 ring-ink"
            : `${(companion.element && ELEMENT_BORDER[companion.element]) || "border-ink/20"} hover:brightness-125`
        }`}
      >
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ink/[0.05] [&_img]:size-12">
          <Portrait companion={companion} advancement={advancement} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm leading-tight font-medium">{companion.name}</span>
          <span className={`font-mono text-[9px] tracking-[0.06em] uppercase ${(companion.element && ELEMENT_TEXT[companion.element]) || "text-dim"}`}>
            {companion.element} · Lv {companionLevel(levels.reduce((a, b) => a + b, 0))}
          </span>
          <span className="truncate font-mono text-[9px] tracking-[0.04em] text-dim uppercase">
            Adv {String(advancement).padStart(3, "0")} · {skinFor(companion, advancement)?.name}
          </span>
        </span>
      </button>

      {[1, 2, 3].map((group) => (
        <div key={group} className="flex flex-col gap-1">
          <h4 className={LABEL}>{GROUP_LABEL[group]}</h4>
          <ul className="flex flex-col gap-1">
            {companion.skills
              .filter((skill) => skill.group === group)
              .map((skill) => (
                <SkillRow key={skill.name} companion={companion} skill={skill} />
              ))}
          </ul>
        </div>
      ))}

      <p className="rounded-md bg-ink/[0.04] p-2 font-mono text-[9px] leading-snug tracking-[0.04em] text-dim uppercase">
        All skills to max: <span className="text-ink">{cost(total)}</span>
      </p>
    </section>
  );
}

function AdvancementTab({ companion }: { companion: Companion }) {
  const { profile, setCompanionAdvancement } = useProfile();
  const advancement = advancementOf(profile, companion);
  const ranks = PROMOTION.slotsByAdvancement[advancement] ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-20 shrink-0 items-center justify-center rounded-md bg-ink/[0.05]">
          <Portrait companion={companion} advancement={advancement} size={64} />
        </span>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Advancement</span>
          <select
            value={advancement}
            onChange={(event) => setCompanionAdvancement(companion.name, Number(event.target.value), MAX_ADVANCEMENT)}
            className="rounded-md border border-ink/20 bg-ground px-2 py-1 font-mono text-xs text-ink outline-none focus-visible:border-ink"
          >
            {companion.skins.map((skin) => (
              <option key={skin.advancement} value={skin.advancement}>
                {skin.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-[11px] leading-snug text-dim">
        Advancement sets each promotion row&apos;s rank: 1st ×1 up to 7th ×4. Locked rows give nothing.
      </p>
      <table className="w-full font-mono text-[10px] tracking-[0.04em] uppercase">
        <tbody>
          {ranks.map((rank, slot) => (
            <tr key={slot} className="border-t border-ink/10">
              <td className="py-1 text-dim">Row {slot + 1}</td>
              <td className="py-1 text-ink">{rank ?? "Locked"}</td>
              <td className="py-1 text-right text-ink tabular-nums">
                {rank ? `×${PROMOTION.rankMultipliers[rank]}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromotionTab({ companion }: { companion: Companion }) {
  const { profile, setCompanionPromotion } = useProfile();
  const state = companionState(profile, companion.name);
  const ranks = PROMOTION.slotsByAdvancement[advancementOf(profile, companion)] ?? [];
  const totals = new Map<string, number>();

  const rows = state.promotion.map((roll, slot) => {
    const rank = ranks[slot] ?? null;
    const value =
      roll.option !== null && roll.tier !== null ? (PROMOTION.tiers[roll.tier]?.values[roll.option] ?? null) : null;
    const buff = promotionBuff(value, rank, PROMOTION.rankMultipliers);
    if (roll.option && buff) totals.set(roll.option, (totals.get(roll.option) ?? 0) + buff);
    return { roll, slot, rank, value, buff };
  });

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {rows.map(({ roll, slot, rank, buff }) => (
          <li key={slot} className={`flex flex-wrap items-center gap-2 rounded-md border border-ink/10 p-1.5 ${rank ? "" : "opacity-50"}`}>
            <span className="w-16 font-mono text-[10px] tracking-[0.04em] text-dim uppercase">
              {rank ? `${rank} ×${PROMOTION.rankMultipliers[rank]}` : "Locked"}
            </span>
            <select
              aria-label={`Row ${slot + 1} option`}
              value={roll.option ?? ""}
              onChange={(event) => setCompanionPromotion(companion.name, slot, { option: event.target.value || null })}
              className="rounded-md border border-ink/20 bg-ground px-1.5 py-0.5 font-mono text-[11px] text-ink outline-none"
            >
              <option value="">—</option>
              {PROMOTION.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              aria-label={`Row ${slot + 1} tier`}
              value={roll.tier ?? ""}
              onChange={(event) =>
                setCompanionPromotion(companion.name, slot, {
                  tier: event.target.value === "" ? null : Number(event.target.value),
                })
              }
              className={`rounded-md border border-ink/20 bg-ground px-1.5 py-0.5 font-mono text-[11px] outline-none ${
                roll.tier !== null ? (TIER_COLOUR[PROMOTION.tiers[roll.tier]?.colour] ?? "") : "text-ink"
              }`}
            >
              <option value="">—</option>
              {PROMOTION.tiers.map((tier, index) => (
                <option key={tier.colour} value={index}>
                  {tier.colour}
                  {roll.option ? ` ${formatEffect(optionDisplay(roll.option), tier.values[roll.option] ?? 0)}` : ""}
                </option>
              ))}
            </select>
            <span className="ml-auto font-mono text-[11px] text-ink tabular-nums">
              {buff ? formatEffect(optionDisplay(roll.option), buff) : "—"}
            </span>
          </li>
        ))}
      </ul>
      {totals.size > 0 ? (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 rounded-md bg-ink/[0.04] p-2 font-mono text-[10px] tracking-[0.04em] uppercase">
          {[...totals].map(([option, value]) => (
            <div key={option} className="contents">
              <dt className="text-dim">{option}</dt>
              <dd className="text-right text-ink tabular-nums">{formatEffect(optionDisplay(option), value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function CompanionSection() {
  const { profile } = useProfile();
  const [selectedName, setSelectedName] = useState(COMPANIONS[0]?.name ?? "");
  const [tab, setTab] = useState<"advancement" | "promotion">("advancement");
  const selected = COMPANIONS.find((c) => c.name === selectedName) ?? COMPANIONS[0];

  const everything = COMPANIONS.reduce<[number, number]>(
    (sum, companion) => {
      const state = companionState(profile, companion.name);
      for (const skill of companion.skills) {
        const [s, e] = costToMax(skill.costs, clampLevel(state.skills[skill.name] ?? 0, skill.maxLevel), skill.maxLevel);
        sum[0] += s;
        sum[1] += e;
      }
      return sum;
    },
    [0, 0],
  );

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
        <p className="mb-2 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
          All companions to max: <span className="text-ink">{cost(everything)}</span>
        </p>
        <div role="radiogroup" aria-label="Companion" className="mb-2 grid grid-cols-4 gap-1 md:hidden">
          {COMPANIONS.map((companion) => (
            <button
              key={companion.id}
              type="button"
              role="radio"
              aria-checked={companion.name === selected.name}
              onClick={() => setSelectedName(companion.name)}
              className={`flex flex-col items-center gap-0.5 rounded-md border p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                companion.name === selected.name ? "border-ink bg-ink/[0.08]" : "border-ink/20"
              }`}
            >
              <span className="flex size-9 items-center justify-center overflow-hidden [&_img]:size-9">
                <Portrait companion={companion} advancement={advancementOf(profile, companion)} />
              </span>
              <span className={`text-[10px] ${(companion.element && ELEMENT_TEXT[companion.element]) || "text-dim"}`}>{companion.name}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 md:grid md:min-w-[52rem] md:grid-cols-4">
          {COMPANIONS.map((companion) => (
            <CompanionColumn
              key={companion.id}
              companion={companion}
              selected={companion.name === selected.name}
              onSelect={() => setSelectedName(companion.name)}
            />
          ))}
        </div>
      </div>

      <aside className="flex min-h-0 shrink-0 flex-col border-t border-ink/15 md:max-h-[45%] lg:max-h-none lg:w-[22rem] lg:border-t-0 lg:border-l">
        <div className="flex shrink-0 items-center gap-2 border-b border-ink/10 px-3 py-2">
          <span className="text-sm font-medium">{selected.name}</span>
          <div className="ml-auto flex gap-1">
            {(["advancement", "promotion"] as const).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={`rounded-md border px-2 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  tab === id ? "border-ink bg-ink text-ground" : "border-ink/25 text-dim hover:border-ink hover:text-ink"
                }`}
              >
                {id === "advancement" ? "Advancement" : "Promotion"}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {tab === "advancement" ? <AdvancementTab companion={selected} /> : <PromotionTab companion={selected} />}
        </div>
      </aside>
    </div>
  );
}

export function CompanionPanel() {
  const [section, setSection] = useState<"companion" | "beasts">("companion");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="Companion sections" className="flex shrink-0 gap-1.5 border-b border-ink/15 px-3 py-2 sm:px-4">
        {(["companion", "beasts"] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={section === id}
            onClick={() => setSection(id)}
            className={`rounded-md border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xs ${
              section === id ? "border-ink bg-ink text-ground" : "border-ink/25 text-dim hover:border-ink/60 hover:text-ink"
            }`}
          >
            {id === "companion" ? "Companion" : "Beasts"}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1">
        {section === "companion" ? (
          <CompanionSection />
        ) : (
          <BeastPanel />
        )}
      </div>
    </div>
  );
}
