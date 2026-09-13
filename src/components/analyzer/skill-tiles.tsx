"use client";

import { effectiveSkillLevel } from "@/lib/profile/rules";
import type { ProfileV1 } from "@/lib/profile/types";
import { ELEMENTS, GRADE_ORDER, type Skill } from "./data";
import { Sprite } from "./sprite";
import { ELEMENT_TEXT, TIER_BORDER } from "./tiers";

const GRID = "grid grid-cols-4 gap-x-1 gap-y-3 sm:gap-x-2";

/** Within an element the game runs lowest grade first, then by id. */
function byGrade(a: Skill, b: Skill) {
  const rank = (skill: Skill) => GRADE_ORDER.indexOf(skill.grade as (typeof GRADE_ORDER)[number]);
  return rank(a) - rank(b) || a.id - b.id;
}

function SkillTile({
  skill,
  level,
  slot,
  onClick,
}: {
  skill: Skill;
  level: number;
  /** Position in the preset being edited, if the skill is in it. */
  slot: number | null;
  onClick: () => void;
}) {
  const learned = level > 0;
  const label = learned ? (level === skill.maxLevel ? "Max" : `Lv ${level}`) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${skill.name}, ${learned ? `level ${level}` : "not learned"}${slot === null ? "" : `, preset slot ${slot + 1}`}`}
      className="group flex min-w-0 flex-col items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={`relative block aspect-square w-full max-w-20 rounded-md border bg-ink/[0.04] transition-all group-hover:brightness-125 ${
          slot === null ? (TIER_BORDER[skill.grade] ?? "border-ink/20") : "border-ink ring-1 ring-ink"
        }`}
      >
        {skill.icon && skill.iconSize ? (
          <Sprite
            src={skill.icon}
            native={skill.iconSize}
            size={64}
            className={`absolute inset-[10%] h-[80%] w-[80%] ${learned ? "" : "opacity-40 grayscale"}`}
          />
        ) : null}
        {label ? (
          <span className="absolute top-0.5 right-1 font-mono text-[9px] text-ink tabular-nums">
            {label}
          </span>
        ) : null}
        {slot !== null ? (
          <span className="absolute top-0.5 left-0.5 rounded bg-ink px-1 font-mono text-[9px] text-ground tabular-nums">
            {slot + 1}
          </span>
        ) : null}
      </span>
      <span
        className={`line-clamp-2 w-full text-center text-[8px] leading-tight [overflow-wrap:anywhere] sm:text-xs ${learned ? "text-ink" : "text-dim"}`}
      >
        {skill.name}
      </span>
    </button>
  );
}

const SCROLL = "min-h-0 flex-1 overflow-auto p-3 [scrollbar-gutter:stable] sm:p-4";

/**
 * Skill tiles, four to a row, scrolling under a fixed element header.
 * Elemental skills get a column per element; skills without an element
 * (the immortals) simply flow in order.
 */
export function SkillTiles({
  skills,
  profile,
  editingPreset,
  onSkillClick,
}: {
  skills: Skill[];
  profile: ProfileV1;
  editingPreset: (string | null)[] | null;
  onSkillClick: (skill: Skill) => void;
}) {
  const tile = (skill: Skill) => {
    const slot = editingPreset ? editingPreset.indexOf(skill.name) : -1;
    return (
      <SkillTile
        key={skill.id}
        skill={skill}
        level={effectiveSkillLevel(profile, skill.name, skill.maxLevel)}
        slot={slot === -1 ? null : slot}
        onClick={() => onSkillClick(skill)}
      />
    );
  };

  const elemental = skills.some((skill) => skill.element !== null);
  if (!elemental) {
    return (
      <div className={SCROLL}>
        <div className={GRID}>{[...skills].sort(byGrade).map(tile)}</div>
      </div>
    );
  }

  const columns = ELEMENTS.map((element) =>
    skills.filter((skill) => skill.element === element).sort(byGrade),
  );
  const rows = Math.max(...columns.map((column) => column.length));

  return (
    <>
      <div
        className={`${GRID} shrink-0 border-b border-ink/10 px-3 py-2 font-mono text-[10px] tracking-[0.12em] uppercase [overflow-y:hidden] [scrollbar-gutter:stable] sm:px-4 sm:text-xs`}
      >
        {ELEMENTS.map((element) => (
          <span key={element} className={`text-center ${ELEMENT_TEXT[element]}`}>
            {element}
          </span>
        ))}
      </div>
      <div className={SCROLL}>
        <div className="flex flex-col gap-3">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className={GRID}>
              {columns.map((column, index) =>
                column[row] ? tile(column[row]) : <div key={`${index}-${row}`} />,
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
