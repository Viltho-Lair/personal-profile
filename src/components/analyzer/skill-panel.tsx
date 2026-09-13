"use client";

import { useState } from "react";
import { proficiencyLevel } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import {
  MAX_PROFICIENCY_LEVEL,
  PROFICIENCY_BONUSES,
  SKILL_BY_NAME,
  skillsIn,
  type Skill,
} from "./data";
import { LevelInput } from "./level-input";
import { SkillDialog } from "./skill-dialog";
import { SkillFamiliars } from "./skill-familiars";
import { SkillMastery } from "./skill-mastery";
import { SkillSettings } from "./skill-settings";
import { SkillTiles } from "./skill-tiles";

type Section = "core" | "familiars" | "proficiency" | "mastery" | "immortals" | "seasonal";

const SECTIONS: { id: Exclude<Section, "core">; label: string }[] = [
  { id: "familiars", label: "Familiars" },
  { id: "proficiency", label: "Skill Proficiency" },
  { id: "mastery", label: "Skill Mastery" },
  { id: "immortals", label: "Immortals" },
  { id: "seasonal", label: "Seasonal" },
];

const SKILL_SECTIONS: Record<"core" | "immortals" | "seasonal", Skill[]> = {
  core: skillsIn("core"),
  immortals: skillsIn("immortal"),
  seasonal: skillsIn("seasonal"),
};

const percent = (fraction: number) =>
  `${(fraction * 100).toLocaleString("en", { maximumFractionDigits: 2 })}%`;

function SkillWorkspace({ skills }: { skills: Skill[] }) {
  const {
    profile,
    setSkillLevel,
    setSkillsAtMax,
    selectSkillPreset,
    addToSkillPreset,
    clearSkillPresetSlot,
  } = useProfile();
  const [editing, setEditing] = useState(false);
  const [openName, setOpenName] = useState<string | null>(null);
  const open = openName ? SKILL_BY_NAME.get(openName) : undefined;
  const preset = profile.activeSkillPreset;

  return (
    <div className="relative grid h-full min-h-0 grid-cols-2">
      <div className="flex min-h-0 flex-col border-r border-ink/15">
        <SkillTiles
          skills={skills}
          profile={profile}
          editingPreset={editing ? profile.skillPresets[preset] : null}
          onSkillClick={(skill) => {
            if (editing) addToSkillPreset(preset, skill.name);
            else setOpenName(skill.name);
          }}
        />
      </div>

      <div className="min-h-0 overflow-auto p-3 sm:p-4">
        <SkillSettings
          profile={profile}
          editing={editing}
          onEditingChange={(next) => {
            setEditing(next);
            if (next) setOpenName(null);
          }}
          onSkillsAtMaxChange={setSkillsAtMax}
          onSelectPreset={selectSkillPreset}
          onClearSlot={(slot) => clearSkillPresetSlot(preset, slot)}
          onOpenSkill={(skill) => setOpenName(skill.name)}
        />
      </div>

      {open ? (
        <SkillDialog
          skill={open}
          profile={profile}
          onLevelChange={(level) => setSkillLevel(open.name, level, open.maxLevel)}
          onClose={() => setOpenName(null)}
          // Over the settings half; on a phone the halves are too narrow, so it covers both.
          className="absolute inset-0 sm:left-1/2"
        />
      ) : null}
    </div>
  );
}

function ProficiencySection() {
  const { profile, setProficiencyLevel } = useProfile();
  const level = proficiencyLevel(profile, MAX_PROFICIENCY_LEVEL);
  const next = level < MAX_PROFICIENCY_LEVEL ? PROFICIENCY_BONUSES[level + 1] : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-auto p-4 sm:p-6">
      <div className="flex max-w-xl flex-col gap-4">
        <LevelInput
          value={level}
          min={0}
          max={MAX_PROFICIENCY_LEVEL}
          label="Proficiency level"
          onChange={(value) => setProficiencyLevel(value, MAX_PROFICIENCY_LEVEL)}
        />
        <div className="flex flex-col gap-1 rounded-lg border border-ink/15 p-4">
          <span className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">
            All Attribute DMG
          </span>
          <span className="text-2xl font-medium text-ink tabular-nums">
            +{percent(PROFICIENCY_BONUSES[level])}
          </span>
          <span className="font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
            {next === null ? "Max proficiency level" : `Next level: +${percent(next)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SkillPanel() {
  const [section, setSection] = useState<Section>("core");
  const skills =
    section === "core" || section === "immortals" || section === "seasonal"
      ? SKILL_SECTIONS[section]
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="Skill sections" className="shrink-0 overflow-x-auto border-b border-ink/15 [scrollbar-width:none]">
        <div className="flex w-max gap-1.5 px-3 py-2 sm:px-4">
          <button
            type="button"
            aria-pressed={section === "core"}
            aria-label="Core skills"
            title="Core skills"
            onClick={() => setSection("core")}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.08em] whitespace-nowrap uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:text-xs ${
              section === "core"
                ? "border-ink bg-ink text-ground"
                : "border-ink/40 text-ink hover:border-ink"
            }`}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11.5 12 4l9 7.5" />
              <path d="M5.5 10v10h13V10" />
              <path d="M10 20v-5h4v5" />
            </svg>
            Core
          </button>
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={section === id}
              onClick={() => setSection(id)}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.08em] whitespace-nowrap uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:text-xs ${
                section === id
                  ? "border-ink bg-ink text-ground"
                  : "border-ink/25 text-dim hover:border-ink/60 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div className="min-h-0 flex-1">
        {skills ? (
          <SkillWorkspace skills={skills} />
        ) : section === "proficiency" ? (
          <ProficiencySection />
        ) : section === "mastery" ? (
          <SkillMastery />
        ) : (
          <SkillFamiliars />
        )}
      </div>
    </div>
  );
}
