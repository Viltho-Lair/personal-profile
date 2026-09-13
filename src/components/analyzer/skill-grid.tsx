"use client";

import { useState } from "react";
import { InlineLevel, LevelInput } from "./level-input";
import { Sprite } from "./sprite";
import { useLevels } from "./use-levels";
import {
  buildSkillRows,
  ELEMENTS,
  MAX_SKILL_LEVEL,
  powerAtLevel,
  SKILLS,
  type Skill,
} from "./skills";

const ELEMENT_COLOR: Record<string, string> = {
  Fire: "text-element-fire",
  Water: "text-element-water",
  Wind: "text-element-wind",
  Earth: "text-element-earth",
};

const GRID_COLUMNS = "grid grid-cols-[2rem_repeat(4,minmax(10rem,1fr))] gap-3";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt>{label}</dt>
      <dd className="text-ink">{value}</dd>
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
  return (
    <article className="flex h-full flex-col gap-2 rounded-lg border border-ink/15 p-3 transition-colors hover:border-ink/40">
      <header className="flex items-start gap-2.5">
        {skill.icon ? (
          <Sprite
            src={skill.icon}
            native={128}
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
        <Stat label="Base" value={skill.baseValue} />
        <Stat label="+/lv" value={skill.upgradeValue} />
        <Stat label="Max lv" value={skill.maxLevel} />
        {skill.cooldown > 0 ? <Stat label="CD" value={skill.cooldown} /> : null}
        {skill.range > 0 ? <Stat label="Rng" value={skill.range} /> : null}
      </dl>

      <div className="flex items-center justify-between gap-2 border-t border-ink/10 pt-2">
        <InlineLevel
          value={Math.min(level, skill.maxLevel)}
          max={skill.maxLevel}
          onChange={onLevelChange}
          name={skill.name}
        />
        <span className="font-mono text-xs text-element-earth tabular-nums">
          {powerAtLevel(skill, level).toLocaleString("en")}%
        </span>
      </div>
    </article>
  );
}

export function SkillGrid() {
  const rows = buildSkillRows();
  const { levelFor, setLevel, setAll } = useLevels("analyzer.skillLevels", 1);
  const [allLevel, setAllLevel] = useState(1);

  return (
    <div className="min-w-[46rem] p-4 sm:p-6">
      <div className="mb-4">
        <LevelInput
          value={allLevel}
          max={MAX_SKILL_LEVEL}
          onChange={(value) => {
            setAllLevel(value);
            setAll(
              SKILLS.map((skill) => skill.id),
              value,
            );
          }}
          label="Set every skill"
        />
      </div>

      <div
        className={`${GRID_COLUMNS} sticky top-0 z-10 bg-ground pb-3 font-mono text-xs tracking-[0.12em] uppercase`}
      >
        <span />
        {ELEMENTS.map((element) => (
          <span
            key={element}
            className={`flex items-center gap-2 ${ELEMENT_COLOR[element] ?? "text-ink"}`}
          >
            <Sprite
              src={`/elements/${element.toLowerCase()}.png`}
              native={64}
              size={16}
            />
            {element}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {rows.map(({ row, cells }) => (
          <div key={row} className={GRID_COLUMNS}>
            <span className="pt-3 font-mono text-[10px] text-dim tabular-nums">
              {String(row).padStart(2, "0")}
            </span>
            {cells.map((skill, column) =>
              skill ? (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  level={levelFor(skill.id)}
                  onLevelChange={(value) => setLevel(skill.id, value)}
                />
              ) : (
                <div key={`${row}-${column}`} />
              ),
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        {SKILLS.length} skills. Power at level = base + per-level x (level - 1),
        capped at each skill&apos;s own max. Rows run lowest grade to highest;
        Immortal skills have no element.
      </p>
    </div>
  );
}
