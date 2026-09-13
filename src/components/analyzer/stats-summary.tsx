"use client";

import { useMemo } from "react";
import { computeStats, ELEMENTS } from "@/lib/game/stats";
import type { PresetKind } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue } from "./data";
import { PresetPicker } from "./preset-picker";
import { useSpiritFactors } from "./spirit-stats";
import { collectSources, skillBuffs, UNTRACKED_SOURCES } from "./stat-sources";

const pct = (fraction: number) => `${(fraction * 100).toLocaleString("en", { maximumFractionDigits: 2 })}%`;
const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";

const PRESET_ROWS: { kind: PresetKind | "skills"; label: string; note?: string }[] = [
  { kind: "skills", label: "Skills" },
  { kind: "spirits", label: "Spirits" },
  { kind: "skillStones", label: "Skill Stone", note: "Skill Stone contents aren't tracked yet" },
  { kind: "beasts", label: "Beast", note: "Beasts aren't tracked yet" },
  { kind: "familiars", label: "Familiar" },
  { kind: "abilities", label: "Slayer Promotion Ability" },
];

export function StatsSummary() {
  const { profile, selectPreset, selectSkillPreset, setIncludeSkills } = useProfile();
  const factors = useSpiritFactors();
  const stats = useMemo(
    () => computeStats(collectSources(profile, factors, profile.includeSkills)),
    [profile, factors],
  );
  const counted = profile.includeSkills ? skillBuffs(profile).counted : [];

  const rows: [string, string][] = [
    ["Attack", formatValue(stats.attack)],
    ["HP", formatValue(stats.hp)],
    ["HP Recovery", formatValue(stats.hpRecovery)],
    ["Crit %", pct(stats.critChance)],
    ["Crit Damage %", pct(stats.critDamage)],
    ["Mana", formatValue(stats.mana)],
    ["Mana Recovery", formatValue(stats.manaRecovery)],
    ["Accuracy", formatValue(stats.accuracy)],
    ["Dodge", formatValue(stats.dodge)],
    ["CC Resist", formatValue(stats.ccResist)],
    ["Extra Gold", pct(stats.extraGold)],
    ["Extra EXP", pct(stats.extraExp)],
    ...ELEMENTS.map((element): [string, string] => [`Extra ${element} Damage`, pct(stats.extraDamage[element])]),
  ];

  return (
    <section aria-label="Stats Summary" className="flex min-h-0 flex-col gap-2 p-3 md:overflow-auto">
      <h2 className="text-sm font-semibold">Stats Summary</h2>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 text-[11px] leading-snug">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="truncate text-dim">{label}</dt>
            <dd className="text-right font-mono text-ink tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between gap-2 border-t border-ink/15 pt-2">
        <h3 className="text-xs font-semibold">Presets</h3>
        <label className="flex items-center gap-1.5 text-[11px] text-dim">
          <input
            type="checkbox"
            checked={profile.includeSkills}
            onChange={(event) => setIncludeSkills(event.target.checked)}
            className="accent-ink"
          />
          Include Skills
        </label>
      </div>
      <ul className="flex flex-col gap-1.5">
        {PRESET_ROWS.map((row) => (
          <li key={row.kind} className="flex items-center justify-between gap-2" title={row.note}>
            <span className="text-[11px] text-dim">{row.label}</span>
            <PresetPicker
              size="sm"
              label={`${row.label} preset`}
              active={row.kind === "skills" ? profile.activeSkillPreset : profile.activePresets[row.kind]}
              onSelect={(index) => (row.kind === "skills" ? selectSkillPreset(index) : selectPreset(row.kind, index))}
            />
          </li>
        ))}
      </ul>
      <p className="text-[10px] leading-snug text-dim">
        {profile.includeSkills
          ? counted.length
            ? `Skill buffs from preset ${profile.activeSkillPreset + 1}: ${counted.join(", ")}.`
            : `No flat ATK or mana recovery buffs in skill preset ${profile.activeSkillPreset + 1}.`
          : "Without skill buffs."}{" "}
        Not counted yet: {UNTRACKED_SOURCES.join(", ")}.
      </p>
      <span className={`${LABEL} sr-only`}>Stats use the workbook&apos;s formulas.</span>
    </section>
  );
}
