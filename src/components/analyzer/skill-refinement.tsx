"use client";

import refinementData from "@/data/optimizer/skill-refinement.json";
import { optionLabel, ownedEffect, refinementOptions, tierOf, type RefinementData } from "@/lib/game/refinement";
import { ELEMENTS, type Element } from "@/lib/game/stats";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue, type Skill } from "./data";

export const REFINEMENT = refinementData as unknown as RefinementData;

const TIER_COLOUR = ["text-zinc-400", "text-emerald-500", "text-orange-500", "text-purple-500", "text-red-500", "text-cyan-400"];
const SELECT =
  "min-w-0 flex-1 rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";

type Mechanics = { type: string | null; trigger: string } | null | undefined;

/** Refinement lines and the owned effect for an attack skill, in the skill dialog. */
export function SkillRefinement({ skill }: { skill: Skill & { mechanics?: Mechanics } }) {
  const { profile, setRefinementLine } = useProfile();
  const entry = REFINEMENT.skills.find((s) => s.name === skill.name);
  if (!entry || skill.mechanics?.type !== "attack") return null;

  const trigger = skill.mechanics.trigger === "hits" ? "hits" : "seconds";
  const element = (ELEMENTS as readonly string[]).includes(skill.element ?? "") ? (skill.element as Element) : null;
  const options = refinementOptions(REFINEMENT, trigger);
  const lines = Array.from({ length: entry.lines }, (_, i) => profile.skillRefinement[skill.name]?.[i] ?? { option: null, value: null });
  const owned = ownedEffect(REFINEMENT, skill.name, lines);

  return (
    <section aria-label="Skill refinement" className="flex flex-col gap-2 rounded-lg border border-ink/15 p-3">
      <h4 className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">Refinement effect</h4>
      <ul className="flex flex-col gap-1.5">
        {lines.map((line, index) => {
          const ranges = line.option ? REFINEMENT.options[line.option] : undefined;
          const tier = tierOf(REFINEMENT, line.option, line.value);
          return (
            <li key={index} className="flex items-center gap-1.5">
              <select
                aria-label={`Refinement line ${index + 1} option`}
                value={line.option ?? ""}
                onChange={(event) => setRefinementLine(skill.name, index, { option: event.target.value || null, value: null })}
                className={SELECT}
              >
                <option value="">None</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {optionLabel(option, element)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step={0.1}
                min={ranges?.[0][0]}
                max={ranges?.[ranges.length - 1][1]}
                disabled={!ranges}
                value={line.value ?? ""}
                aria-label={`Refinement line ${index + 1} value`}
                onChange={(event) =>
                  setRefinementLine(skill.name, index, { value: Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : null })
                }
                className={`w-16 rounded-md border border-ink/20 bg-transparent px-1.5 py-1 text-right font-mono text-[11px] tabular-nums outline-none focus-visible:border-ink disabled:opacity-50 ${
                  tier !== null ? TIER_COLOUR[tier] : "text-ink"
                }`}
              />
              <span className={`w-12 font-mono text-[9px] uppercase ${tier !== null ? TIER_COLOUR[tier] : "text-dim"}`}>
                {tier !== null ? REFINEMENT.tiers[tier] : ranges ? `${ranges[0][0]}–${ranges[ranges.length - 1][1]}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
      {owned ? (
        <p className="font-mono text-[11px]">
          <span className="text-dim">Owned effect ({owned.mythic} Aqua lines): </span>
          <span className="text-ink">
            {owned.stat} +{owned.percent ? `${formatValue(owned.value * 100)}%` : formatValue(owned.value)}
          </span>
        </p>
      ) : null}
      <p className="text-[10px] leading-snug text-dim">
        Owned effect steps up at 3, 4 and 5 Aqua lines ({entry.owned.values.map((v) => (entry.owned.percent ? `${formatValue(v * 100)}%` : formatValue(v))).join(" / ")}).
      </p>
    </section>
  );
}
