"use client";

import { useMemo } from "react";
import { computeStats, ELEMENTS } from "@/lib/game/stats";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue } from "./data";
import { PresetsPanel } from "./presets-panel";
import { useSpiritFactors } from "./spirit-stats";
import { useLiveFight } from "./live-fight";
import { collectSources, UNTRACKED_SOURCES } from "./stat-sources";
import { formatNumber } from "@/lib/number-format";

const pct = (fraction: number) => `${formatNumber(fraction * 100, 2)}%`;
const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";


export function StatsSummary() {
  const { profile } = useProfile();
  const factors = useSpiritFactors();
  // Skill buffs don't raise the summary on their own: they show on Attack only while the fight renders and they're on.
  const stats = useMemo(() => computeStats(collectSources(profile, factors, false)), [profile, factors]);
  const live = useLiveFight();
  const liveAtk = live && profile.includeSkills ? live.atkBonus : 0;

  const rows: [string, string][] = [
    [liveAtk ? `Attack (buffs +${pct(liveAtk)})` : "Attack", formatValue(stats.attack * (1 + liveAtk))],
    ["HP", formatValue(stats.hp)],
    ["HP Recovery", formatValue(stats.hpRecovery)],
    ["Crit %", pct(stats.critChance)],
    ["Crit Damage %", pct(stats.critDamage)],
    ["Death Strike %", pct(stats.deathStrikeChance)],
    ["Death Strike Damage %", pct(stats.deathStrikeDamage)],
    ["Mana", formatValue(stats.mana)],
    ["Mana Recovery", formatValue(stats.manaRecovery)],
    ["Movement Speed", pct(stats.movementSpeed)],
    ["Accuracy", formatValue(stats.accuracy)],
    ["Dodge", formatValue(stats.dodge)],
    ["CC Resist", formatValue(stats.ccResist)],
    ["Extra Gold", pct(stats.extraGold)],
    ["Extra EXP", pct(stats.extraExp)],
    ...ELEMENTS.map((element): [string, string] => [`Extra ${element} Damage`, pct(stats.extraDamage[element])]),
  ];

  return (
    <section aria-label="Stats Summary" className="flex min-h-0 flex-col gap-2 p-3 xl:overflow-auto">
      <h2 className="text-sm font-semibold">Stats Summary</h2>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 text-[11px] leading-snug">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="truncate text-dim">{label}</dt>
            <dd className="text-right font-mono text-ink tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-ink/15 pt-2">
        <PresetsPanel />
      </div>
      <p className="text-[10px] leading-snug text-dim">
        {profile.includeSkills
          ? live
            ? `Attack shows the skill buffs on right now in the fight (preset ${profile.activeSkillPreset + 1}).`
            : `Skill buffs from preset ${profile.activeSkillPreset + 1} raise Attack as they go on during a render.`
          : "Without skill buffs."}{" "}
        {UNTRACKED_SOURCES.length ? `Not counted yet: ${UNTRACKED_SOURCES.join(", ")}.` : null}
      </p>
      <span className={`${LABEL} sr-only`}>Stats use the workbook&apos;s formulas.</span>
    </section>
  );
}
