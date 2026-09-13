"use client";

import { useState } from "react";
import { skillPower } from "@/lib/game/formulas";
import { skillLevel } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import { ELEMENTS, GRADE_ORDER, SKILLS, type Skill } from "./data";
import { InlineLevel, LevelInput } from "./level-input";
import { Sprite } from "./sprite";
import { ELEMENT_TEXT } from "./tiers";

const GRID = "grid grid-cols-[repeat(4,minmax(10rem,1fr))] gap-3";
const MAX_SKILL_LEVEL = Math.max(...SKILLS.map((skill) => skill.maxLevel));

/** Within an element the game runs lowest grade first, then by id. */
function byGrade(a: Skill, b: Skill) {
  const rank = (skill: Skill) => GRADE_ORDER.indexOf(skill.grade as (typeof GRADE_ORDER)[number]);
  return rank(a) - rank(b) || a.id - b.id;
}

const COLUMNS = ELEMENTS.map((element) =>
  SKILLS.filter((skill) => skill.element === element).sort(byGrade),
);
const ELEMENTLESS = SKILLS.filter((skill) => skill.element === null).sort(byGrade);
const ROWS = Math.max(...COLUMNS.map((column) => column.length));

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-ink">{value ?? "—"}</dd>
    </div>
  );
}

function SkillCard({
  skill,
  level,
  onLevelChange,
}: {
  skill: Skill;
  level: number;
  onLevelChange: (level: number) => void;
}) {
  const power =
    skill.baseValue === null || skill.upgradeValue === null
      ? null
      : skillPower(skill.baseValue, skill.upgradeValue, level);

  return (
    <article
      className={`flex h-full flex-col gap-2 rounded-lg border border-ink/15 p-3 transition-opacity hover:border-ink/40 ${level === 0 ? "opacity-55" : ""}`}
    >
      <header className="flex items-start gap-2.5">
        {skill.icon && skill.iconSize ? (
          <Sprite
            src={skill.icon}
            native={skill.iconSize}
            size={64}
            className="rounded-md border border-ink/15"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-sm leading-tight font-medium">{skill.name}</h3>
          <span className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
            {skill.grade}
          </span>
        </div>
      </header>

      {skill.description.specific ? (
        <p className="line-clamp-2 text-xs leading-snug text-dim">
          {skill.description.specific}
        </p>
      ) : null}

      <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        <Stat label="MP" value={skill.mpCost} />
        <Stat label="CD" value={skill.cooldown} />
        <Stat label="Base" value={skill.baseValue} />
        <Stat label="+/lv" value={skill.upgradeValue} />
      </dl>

      <div className="flex items-center justify-between gap-2 border-t border-ink/10 pt-2">
        <InlineLevel
          value={level}
          min={0}
          max={skill.maxLevel}
          onChange={onLevelChange}
          name={skill.name}
        />
        <span className="font-mono text-xs text-element-earth tabular-nums">
          {level === 0 ? "Not learned" : power === null ? "—" : `${power.toLocaleString("en")}%`}
        </span>
      </div>
    </article>
  );
}

export function SkillGrid() {
  const { profile, setSkillLevel, setAllSkillLevels } = useProfile();
  const [allLevel, setAllLevel] = useState(0);

  const card = (skill: Skill) => (
    <SkillCard
      key={skill.id}
      skill={skill}
      level={skillLevel(profile, skill.name, skill.maxLevel)}
      onLevelChange={(level) => setSkillLevel(skill.name, level, skill.maxLevel)}
    />
  );

  return (
    <div className="min-w-[46rem] p-4 sm:p-6">
      <div className="mb-4">
        <LevelInput
          value={allLevel}
          min={0}
          max={MAX_SKILL_LEVEL}
          label="Set every skill"
          onChange={(level) => {
            setAllLevel(level);
            setAllSkillLevels(SKILLS, level);
          }}
        />
      </div>

      <div className={`${GRID} sticky top-0 z-10 bg-ground pb-3 font-mono text-xs tracking-[0.12em] uppercase`}>
        {ELEMENTS.map((element) => (
          <span key={element} className={ELEMENT_TEXT[element]}>
            {element}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: ROWS }, (_, row) => (
          <div key={row} className={GRID}>
            {COLUMNS.map((column, index) =>
              column[row] ? card(column[row]) : <div key={`${index}-${row}`} />,
            )}
          </div>
        ))}
        {ELEMENTLESS.length > 0 ? <div className={GRID}>{ELEMENTLESS.map(card)}</div> : null}
      </div>

      <p className="mt-4 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        {SKILLS.length} skills. Level 0 means not learned. Power = base +
        per-level x (level - 1). Levels are saved in this browser.
      </p>
    </div>
  );
}
