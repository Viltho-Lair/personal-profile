"use client";

import type { ReactNode } from "react";
import type { SkillStone } from "@/lib/game/battle";
import { rarityGroup } from "@/lib/game/formulas";
import { activeAbilityPreset, activeFamiliars, activeSkillStones, activeSpiritPreset, familiarStars, mountedBeast, presetBeast, spiritState } from "@/lib/profile/rules";
import { FAMILIAR_GROUPS, LOADOUT_COUNT, type PresetKind } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { BeastArt } from "./beast-panel";
import { FAMILIARS, formatValue, SKILL_BY_NAME, SPIRITS } from "./data";
import { PresetPicker } from "./preset-picker";
import { FamiliarArt } from "./skill-familiars";
import { Sprite } from "./sprite";
import { APPEARANCE, BEASTS } from "./stat-sources";
import { sweatsuitMultiplier } from "@/lib/game/appearance";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const EMPTY = "rounded-md border border-dashed border-ink/15";

const STONE_TYPES = [
  { key: "cooldown", name: "Cooldown" },
  { key: "time", name: "Time" },
  { key: "heat", name: "Heat" },
] as const;

/** A preset kind: what the chosen preset holds, with its five buttons underneath. */
function PresetCard({ title, children, picker }: { title: string; children: ReactNode; picker: ReactNode }) {
  return (
    <section aria-label={`${title} preset`} className="flex flex-col items-center gap-2 rounded-lg border border-ink/15 p-2">
      <h4 className={`self-start ${LABEL}`}>{title}</h4>
      <div className="flex w-full flex-1 items-center justify-center">{children}</div>
      {picker}
    </section>
  );
}

/** A triangle with rounded corners, filled with the stone's element colour. */
function StoneTriangle({ stone }: { stone: SkillStone | null }) {
  const colour = stone ? `var(--element-${stone.element.toLowerCase()})` : "none";
  return (
    <svg viewBox="0 0 40 36" className="h-9 w-10" aria-hidden>
      <path
        d="M20 5 L35 31 L5 31 Z"
        fill={colour}
        stroke={stone ? colour : "currentColor"}
        strokeWidth={stone ? 8 : 2}
        strokeLinejoin="round"
        className={stone ? "" : "text-ink/30"}
        strokeDasharray={stone ? undefined : "3 3"}
      />
      {stone ? (
        <text x="20" y="27" textAnchor="middle" fontSize="11" fontWeight="700" className="fill-white font-mono">
          {stone.grade}
        </text>
      ) : null}
    </svg>
  );
}

/**
 * Presets: five loadouts under the title, each saving which preset of every kind is on, then what
 * the chosen presets hold (skills, spirits, skill stones, beast, familiars, promotion ability).
 */
export function PresetsPanel() {
  const { profile, selectPreset, selectSkillPreset, selectLoadout, setIncludeSkills, setBeastMounted } = useProfile();
  const picker = (kind: PresetKind, label: string) => (
    <PresetPicker size="sm" label={`${label} preset`} active={profile.activePresets[kind]} onSelect={(index) => selectPreset(kind, index)} />
  );

  const skills = Array.from({ length: 10 }, (_, i) => profile.skillPresets[profile.activeSkillPreset]?.[i] ?? null);
  const spirits = activeSpiritPreset(profile);
  const stones = activeSkillStones(profile);
  const beastName = presetBeast(profile);
  const beast = BEASTS.beasts.find((b) => b.name === beastName) ?? null;
  const mounted = mountedBeast(profile) !== null;
  const familiars = activeFamiliars(profile);
  const ability = activeAbilityPreset(profile);
  const openRows = ability.rows.filter((row, i) => row.option && row.value !== null && profile.character.promotion > i);

  return (
    <section aria-labelledby="presets-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="presets-title" className="text-xs font-semibold">
          Presets
        </h3>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <label className="flex items-center gap-1.5 text-[11px] text-dim">
            <input type="checkbox" checked={profile.includeSkills} onChange={(event) => setIncludeSkills(event.target.checked)} className="accent-ink" />
            Include Skills
          </label>
        </span>
      </div>

      <div role="radiogroup" aria-label="Loadout" className="flex justify-center gap-4">
        {Array.from({ length: LOADOUT_COUNT }, (_, index) => (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={profile.activeLoadout === index}
            aria-label={`Loadout ${index + 1}`}
            title={`Loadout ${index + 1}: saves which preset of each kind is on`}
            onClick={() => selectLoadout(index)}
            className={`flex size-8 items-center justify-center rounded-md border font-mono text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              profile.activeLoadout === index ? "border-ink bg-ink text-ground" : "border-ink/30 text-dim hover:border-ink/70 hover:text-ink"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <PresetCard
          title="Skills"
          picker={<PresetPicker size="sm" label="Skill preset" active={profile.activeSkillPreset} onSelect={selectSkillPreset} />}
        >
          <div className="grid w-full max-w-60 grid-cols-5 gap-1">
            {skills.map((name, i) => {
              const data = name ? SKILL_BY_NAME.get(name) : undefined;
              return data?.icon && data.iconSize ? (
                <span key={i} title={name ?? undefined} className="aspect-square overflow-hidden rounded-md border border-ink/25 bg-zinc-900">
                  <Sprite src={data.icon} native={data.iconSize} size={40} className="size-full object-cover" />
                </span>
              ) : (
                <span key={i} className={`aspect-square ${EMPTY}`} />
              );
            })}
          </div>
        </PresetCard>

        <PresetCard title="Spirits" picker={picker("spirits", "Spirit")}>
          <div className="flex gap-2">
            {spirits.map((name, i) => {
              const spirit = name ? SPIRITS.find((s) => s.name === name) : undefined;
              const state = spirit ? spiritState(profile, spirit.name, spirit.maxLevel) : null;
              const art = spirit ? (spirit.art[state?.awakening ? rarityGroup(state.awakening) : "Common"] ?? spirit.art.Common) : null;
              return (
                <span key={i} className="flex w-12 flex-col items-center gap-0.5">
                  {spirit && art ? (
                    <span className="flex size-12 items-center justify-center rounded-md bg-ink/[0.05]" title={spirit.name}>
                      <Sprite src={art.icon} native={art.iconSize} size={40} />
                    </span>
                  ) : (
                    <span className={`size-12 ${EMPTY}`} />
                  )}
                  <span className="w-full truncate text-center font-mono text-[9px] text-dim">{spirit?.name ?? "Empty"}</span>
                </span>
              );
            })}
          </div>
        </PresetCard>

        <PresetCard title="Skill Stones" picker={picker("skillStones", "Skill Stone")}>
          <div className="flex gap-3">
            {STONE_TYPES.map((type) => {
              const stone = stones[type.key];
              return (
                <span key={type.key} className="flex flex-col items-center gap-0.5" title={stone ? `${type.name} stone · type ${stone.grade} · ${stone.element}` : `${type.name} stone · none`}>
                  <StoneTriangle stone={stone} />
                  <span className="font-mono text-[9px] text-ink">{type.name}</span>
                  <span className="font-mono text-[8px] text-dim">{stone ? `${stone.element} ${stone.grade === "B" ? 7 : 4}%` : "None"}</span>
                </span>
              );
            })}
          </div>
        </PresetCard>

        <PresetCard title="Beast" picker={picker("beasts", "Beast")}>
          <div className="flex items-center gap-2">
            {beast ? (
              <BeastArt beast={beast} awaken={profile.beasts[beast.name]?.awaken ?? null} size={48} />
            ) : (
              <span className={`size-12 ${EMPTY}`} />
            )}
            <span className="flex flex-col gap-1">
              <span className="text-[11px] text-ink">{beast?.name ?? "No beast"}</span>
              <label className={`flex items-center gap-1.5 ${LABEL}`}>
                <input type="checkbox" checked={mounted} disabled={!beast} onChange={(event) => setBeastMounted(event.target.checked)} className="size-3.5 accent-ink" />
                Mounted
              </label>
            </span>
          </div>
        </PresetCard>

        <PresetCard title="Familiars" picker={picker("familiars", "Familiar")}>
          <div className="flex gap-2">
            {FAMILIAR_GROUPS.map((group) => {
              const name = familiars[group];
              const familiar = name ? FAMILIARS.find((f) => f.name === name) : undefined;
              return (
                <span key={group} className="flex w-12 flex-col items-center gap-0.5">
                  {familiar ? (
                    <span className="flex size-12 items-center justify-center rounded-md bg-ink/[0.05]" title={familiar.name}>
                      <FamiliarArt familiar={familiar} stars={familiarStars(profile, familiar.name)} size={40} />
                    </span>
                  ) : (
                    <span className={`size-12 ${EMPTY}`} />
                  )}
                  <span className="w-full truncate text-center font-mono text-[9px] text-dim capitalize">{familiar?.name ?? group}</span>
                </span>
              );
            })}
          </div>
        </PresetCard>

        <PresetCard title="Slayer Promotion Ability" picker={picker("abilities", "Slayer Promotion Ability")}>
          <details className="w-full text-[11px]">
            <summary className="cursor-pointer text-ink">
              {ability.effect ? `${ability.effect} page` : "No page effect"} · {openRows.length} open row{openRows.length === 1 ? "" : "s"}
            </summary>
            <ul className="mt-1 flex flex-col gap-0.5 font-mono text-[10px] text-dim">
              {ability.rows.map((row, i) => {
                const locked = profile.character.promotion <= i;
                const multiplier = sweatsuitMultiplier(APPEARANCE, profile.appearance, i).multiplier;
                return (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{locked ? `Row ${i + 1} · locked` : (row.option ?? `Row ${i + 1} · empty`)}</span>
                    {!locked && row.option && row.value !== null ? (
                      <span className="shrink-0 text-ink tabular-nums">
                        {formatValue(row.value)} ×{formatValue(multiplier)}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </details>
        </PresetCard>
      </div>
    </section>
  );
}
