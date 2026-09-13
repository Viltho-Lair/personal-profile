"use client";

import type { SkillStone, SkillStoneSet } from "@/lib/game/battle";
import { ELEMENTS, type Element } from "@/lib/game/stats";
import { activeSkillStones } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import { PresetPicker } from "./preset-picker";
import { ELEMENT_TEXT } from "./tiers";

const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";

const STONES: { key: keyof SkillStoneSet; name: string; effect: (amount: number) => string }[] = [
  { key: "cooldown", name: "Cooldown Stone", effect: (n) => `-${n}% skill cooldown` },
  { key: "time", name: "Time Stone", effect: (n) => `+${n}% skill duration` },
  { key: "heat", name: "Heat Stone", effect: (n) => `-${n}% skill's required attacks` },
];

const stoneValue = (stone: SkillStone | null) => (stone ? `${stone.grade}:${stone.element}` : "");

/** One cooldown, time and heat stone per preset; each works on skills of its element. */
export function SkillStoneSettings() {
  const { profile, selectPreset, updateSkillStones } = useProfile();
  const stones = activeSkillStones(profile);

  return (
    <section aria-label="Skill stones" className="mt-5 flex max-w-md flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">Skill Stones</h3>
        <PresetPicker label="Skill Stone preset" active={profile.activePresets.skillStones} onSelect={(index) => selectPreset("skillStones", index)} />
      </div>
      <ul className="flex flex-col gap-2">
        {STONES.map((type) => {
          const stone = stones[type.key];
          return (
            <li key={type.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ink/15 p-2">
              <span className="flex flex-col">
                <span className="text-xs font-medium">{type.name}</span>
                <span className={`font-mono text-[10px] ${stone ? (ELEMENT_TEXT[stone.element] ?? "") : "text-dim"}`}>
                  {stone ? `${stone.element} · ${type.effect(stone.grade === "B" ? 7 : 4)}` : "None"}
                </span>
              </span>
              <select
                aria-label={type.name}
                value={stoneValue(stone)}
                onChange={(event) => {
                  const [grade, element] = event.target.value.split(":");
                  const next = event.target.value ? { grade: grade as SkillStone["grade"], element: element as Element } : null;
                  updateSkillStones((set) => ({ ...set, [type.key]: next }));
                }}
                className={SELECT}
              >
                <option value="">None</option>
                {(["B", "A"] as const).flatMap((grade) =>
                  ELEMENTS.map((element) => (
                    <option key={`${grade}:${element}`} value={`${grade}:${element}`}>
                      Type {grade} · {element} ({type.effect(grade === "B" ? 7 : 4)})
                    </option>
                  )),
                )}
              </select>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] leading-snug text-dim">
        Stones only change skills of their element. They count in the promotion chart when Include Skills is ticked.
      </p>
    </section>
  );
}
