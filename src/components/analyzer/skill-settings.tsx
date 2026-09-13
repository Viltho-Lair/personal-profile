"use client";

import type { ProfileV1 } from "@/lib/profile/types";
import { SKILL_BY_NAME, type Skill } from "./data";
import { Sprite } from "./sprite";

const BUTTON =
  "rounded-md border px-2 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
const idle = "border-ink/25 text-dim hover:border-ink/60 hover:text-ink";
const active = "border-ink bg-ink text-ground";

export function SkillSettings({
  profile,
  editing,
  onEditingChange,
  onSkillsAtMaxChange,
  onSelectPreset,
  onClearSlot,
  onOpenSkill,
}: {
  profile: ProfileV1;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onSkillsAtMaxChange: (on: boolean) => void;
  onSelectPreset: (index: number) => void;
  onClearSlot: (slot: number) => void;
  onOpenSkill: (skill: Skill) => void;
}) {
  const slots = profile.skillPresets[profile.activeSkillPreset] ?? [];

  return (
    <div className="flex max-w-md flex-col gap-5">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={profile.skillsAtMax}
          onChange={(event) => onSkillsAtMaxChange(event.target.checked)}
          className="mt-0.5 size-4 accent-ink"
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-mono text-xs tracking-[0.08em] text-ink uppercase">Max skills</span>
          <span className="text-[11px] leading-snug text-dim">
            Every skill counts as its max level. Your typed levels come back when you uncheck it.
          </span>
        </span>
      </label>

      <section aria-label="Skill presets" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">Presets</h3>
          <button
            type="button"
            aria-pressed={editing}
            onClick={() => onEditingChange(!editing)}
            className={`${BUTTON} ${editing ? active : idle}`}
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {profile.skillPresets.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-pressed={profile.activeSkillPreset === index}
              aria-label={`Preset ${index + 1}`}
              onClick={() => onSelectPreset(index)}
              className={`${BUTTON} min-w-8 ${profile.activeSkillPreset === index ? active : idle}`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <p className="text-[11px] leading-snug text-dim">
          {editing
            ? "Click skills on the left to fill the next empty slot. Click a slot to empty it."
            : "Press Edit, then click skills to add them to this preset."}
        </p>

        <ol className="grid grid-cols-5 gap-1.5">
          {slots.map((name, slot) => {
            const skill = name ? SKILL_BY_NAME.get(name) : undefined;
            return (
              <li key={slot}>
                <button
                  type="button"
                  disabled={!name}
                  onClick={() => {
                    if (!name) return;
                    if (editing) onClearSlot(slot);
                    else if (skill) onOpenSkill(skill);
                  }}
                  aria-label={
                    name
                      ? `Slot ${slot + 1}: ${name}${editing ? ", click to empty" : ""}`
                      : `Slot ${slot + 1}: empty`
                  }
                  className={`relative block aspect-square w-full rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    name ? "border-ink/30 bg-ink/[0.04] hover:border-ink" : "border-dashed border-ink/20"
                  } ${editing && name ? "hover:opacity-60" : ""}`}
                >
                  {skill?.icon && skill.iconSize ? (
                    <Sprite
                      src={skill.icon}
                      native={skill.iconSize}
                      size={64}
                      className="absolute inset-[10%] h-[80%] w-[80%]"
                    />
                  ) : name ? (
                    <span className="absolute inset-0 flex items-center justify-center p-0.5 text-center text-[8px] leading-tight text-ink">
                      {name}
                    </span>
                  ) : null}
                  <span className="absolute bottom-0.5 left-1 font-mono text-[8px] text-dim tabular-nums">
                    {slot + 1}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
