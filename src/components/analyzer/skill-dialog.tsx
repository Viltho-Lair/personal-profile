"use client";

import { useEffect, useId, useRef } from "react";
import { skillPower } from "@/lib/game/formulas";
import { effectiveSkillLevel } from "@/lib/profile/rules";
import type { ProfileV1 } from "@/lib/profile/types";
import type { Skill } from "./data";
import { LevelInput } from "./level-input";
import { Sprite } from "./sprite";
import { ELEMENT_TEXT, TIER_TEXT } from "./tiers";

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-ink tabular-nums">{value ?? "—"}</dd>
    </div>
  );
}

/** Skill details and its level, drawn over the settings side of the section. */
export function SkillDialog({
  skill,
  profile,
  onLevelChange,
  onClose,
  className = "",
}: {
  skill: Skill;
  profile: ProfileV1;
  onLevelChange: (level: number) => void;
  onClose: () => void;
  className?: string;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const level = effectiveSkillLevel(profile, skill.name, skill.maxLevel);
  const power =
    skill.baseValue === null || skill.upgradeValue === null
      ? null
      : skillPower(skill.baseValue, skill.upgradeValue, level);

  useEffect(() => {
    closeRef.current?.focus();
  }, [skill.name]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      className={`z-20 flex flex-col gap-4 overflow-auto border-ink/15 bg-ground p-4 shadow-2xl md:border-l ${className}`}
    >
      <header className="flex items-start gap-3">
        {skill.icon && skill.iconSize ? (
          <Sprite
            src={skill.icon}
            native={skill.iconSize}
            size={64}
            className="rounded-md border border-ink/15"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 id={titleId} className="text-base leading-tight font-medium">
            {skill.name}
          </h3>
          <p className="flex flex-wrap gap-x-2 font-mono text-[10px] tracking-[0.08em] uppercase">
            <span className={TIER_TEXT[skill.grade] ?? "text-dim"}>{skill.grade}</span>
            {skill.element ? (
              <span className={ELEMENT_TEXT[skill.element] ?? "text-dim"}>{skill.element}</span>
            ) : null}
            {skill.category === "seasonal" ? <span className="text-dim">Seasonal</span> : null}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md border border-ink/25 px-2 py-0.5 font-mono text-xs text-dim outline-none hover:border-ink hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
        >
          ✕
        </button>
      </header>

      <div className="flex flex-col gap-2">
        <LevelInput
          value={level}
          min={0}
          max={skill.maxLevel}
          label="Level"
          disabled={profile.skillsAtMax}
          onChange={onLevelChange}
        />
        {profile.skillsAtMax ? (
          <p className="text-[11px] text-dim">Max skills is on, so this skill counts as level {skill.maxLevel}.</p>
        ) : null}
        <p className="font-mono text-xs text-element-earth tabular-nums">
          {level === 0
            ? "Not learned"
            : power === null
              ? "Power: —"
              : `Power at level ${level}: ${power.toLocaleString("en")}%`}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        <Stat label="MP" value={skill.mpCost} />
        <Stat label="Cooldown" value={skill.cooldown} />
        <Stat label="Range" value={skill.range} />
        <Stat label="Duration" value={skill.duration} />
        <Stat label="Base" value={skill.baseValue} />
        <Stat label="+ per level" value={skill.upgradeValue} />
      </dl>

      {skill.description.basic || skill.description.specific ? (
        <div className="flex flex-col gap-1 text-xs leading-snug text-dim">
          {skill.description.basic ? <p>{skill.description.basic}</p> : null}
          {skill.description.specific ? <p>{skill.description.specific}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
