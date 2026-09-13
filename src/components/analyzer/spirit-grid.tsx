"use client";

import { useState } from "react";
import { spiritState } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import { SPIRITS, type Spirit } from "./data";
import { InlineLevel } from "./level-input";
import { OwnedToggle } from "./profile-controls";
import { Sprite } from "./sprite";
import { ELEMENT_BORDER, ELEMENT_TEXT } from "./tiers";

const elementBorder = (spirit: Spirit) =>
  (spirit.element && ELEMENT_BORDER[spirit.element]) || "border-ink/20";
const elementText = (spirit: Spirit) =>
  (spirit.element && ELEMENT_TEXT[spirit.element]) || "text-dim";

function SpiritTile({
  spirit,
  owned,
  level,
  selected,
  onSelect,
}: {
  spirit: Spirit;
  owned: boolean;
  level: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${spirit.name}${owned ? `, level ${level}` : ", not owned"}`}
      className={`relative flex aspect-square w-full flex-col items-center justify-end gap-1 rounded-md border bg-ink/[0.04] p-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected ? "border-ink ring-1 ring-ink" : `${elementBorder(spirit)} hover:brightness-125`
      }`}
    >
      {spirit.icon && spirit.iconSize ? (
        <Sprite
          src={spirit.icon}
          native={spirit.iconSize}
          size={64}
          className={`size-8 sm:size-16 ${owned ? "" : "opacity-35 grayscale"}`}
        />
      ) : null}
      <span className="w-full truncate text-center text-[11px] leading-none">{spirit.name}</span>
      {spirit.element ? (
        <span className={`absolute top-1 left-1.5 font-mono text-[9px] ${elementText(spirit)}`}>
          {spirit.element.slice(0, 2).toUpperCase()}
        </span>
      ) : null}
      {owned ? (
        <span className="absolute top-1 right-1.5 font-mono text-[9px] text-ink tabular-nums">
          Lv {level}
        </span>
      ) : null}
    </button>
  );
}

function SpiritDetail({ spirit }: { spirit: Spirit | null }) {
  const { profile, setOwned, setSpiritLevel } = useProfile();

  if (!spirit) {
    return (
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Pick a spirit to set it up.
      </p>
    );
  }

  const state = spiritState(profile, spirit.name, spirit.maxLevel);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-2">
        {spirit.icon && spirit.iconSize ? (
          <Sprite
            src={spirit.icon}
            native={spirit.iconSize}
            size={128}
            className={`rounded-md border ${elementBorder(spirit)}`}
          />
        ) : null}
        <div>
          <p className={`font-mono text-[10px] tracking-[0.08em] uppercase ${elementText(spirit)}`}>
            {[spirit.element, spirit.skill?.type].filter(Boolean).join(" · ")}
          </p>
          <h3 className="text-base leading-tight font-medium">{spirit.name}</h3>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <OwnedToggle
          owned={state.owned}
          name={spirit.name}
          onChange={(owned) => setOwned("spirits", spirit.name, owned)}
        />
        <InlineLevel
          value={state.level}
          min={0}
          max={spirit.maxLevel}
          name={spirit.name}
          onChange={(level) => setSpiritLevel(spirit.name, level, spirit.maxLevel)}
        />
      </div>

      {spirit.skill?.description ? (
        <p className="text-xs leading-snug text-dim">
          <span className="text-ink">{spirit.skill.name}.</span> {spirit.skill.description}
        </p>
      ) : null}

      {spirit.skill ? (
        <dl className="grid gap-y-1 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
          {spirit.skill.cooldown ? (
            <div className="flex items-baseline justify-between gap-2">
              <dt>Cooldown</dt>
              <dd className="text-ink">{spirit.skill.cooldown}s</dd>
            </div>
          ) : null}
          {spirit.skill.levels.map((entry) => (
            <div key={entry.level} className="flex items-baseline justify-between gap-2">
              <dt>Skill Lv {entry.level}</dt>
              <dd className="text-ink">{entry.effect}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

export function SpiritGrid() {
  const { profile } = useProfile();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="grid min-w-0 flex-1 grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {SPIRITS.map((spirit) => {
          const state = spiritState(profile, spirit.name, spirit.maxLevel);
          return (
            <SpiritTile
              key={spirit.id}
              spirit={spirit}
              owned={state.owned}
              level={state.level}
              selected={selected === spirit.name}
              onSelect={() => setSelected(selected === spirit.name ? null : spirit.name)}
            />
          );
        })}
      </div>

      <aside className="shrink-0 rounded-lg border border-ink/15 p-3 lg:sticky lg:top-0 lg:w-72">
        <SpiritDetail spirit={SPIRITS.find((spirit) => spirit.name === selected) ?? null} />
      </aside>
    </div>
  );
}
