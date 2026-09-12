"use client";

import Image from "next/image";
import { useState } from "react";
import { SPIRITS, type Spirit } from "./equipment";
import { ELEMENT_BORDER, ELEMENT_TEXT } from "./tiers";

function SpiritTile({
  spirit,
  selected,
  onSelect,
}: {
  spirit: Spirit;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative flex aspect-square w-full flex-col items-center justify-end gap-1 rounded-md border bg-ink/[0.04] p-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected
          ? "border-ink ring-1 ring-ink"
          : `${spirit.element ? (ELEMENT_BORDER[spirit.element] ?? "border-ink/20") : "border-ink/20"} hover:brightness-125`
      }`}
    >
      {spirit.icon ? (
        <Image
          src={spirit.icon}
          alt=""
          width={128}
          height={128}
          className="min-h-0 flex-1 object-contain"
        />
      ) : null}
      <span className="w-full truncate text-center text-[11px] leading-none">
        {spirit.name}
      </span>
      {spirit.element ? (
        <span
          className={`absolute top-1 left-1.5 font-mono text-[9px] ${ELEMENT_TEXT[spirit.element] ?? "text-dim"}`}
        >
          {spirit.element.slice(0, 2).toUpperCase()}
        </span>
      ) : null}
    </button>
  );
}

function SpiritDetail({ spirit }: { spirit: Spirit | null }) {
  if (!spirit) {
    return (
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Pick a spirit to see its skill.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {spirit.icon ? (
          <Image
            src={spirit.icon}
            alt=""
            width={128}
            height={128}
            className={`size-14 rounded-md border object-contain ${spirit.element ? (ELEMENT_BORDER[spirit.element] ?? "border-ink/20") : "border-ink/20"}`}
          />
        ) : null}
        <div>
          <p
            className={`font-mono text-[10px] tracking-[0.08em] uppercase ${spirit.element ? (ELEMENT_TEXT[spirit.element] ?? "text-dim") : "text-dim"}`}
          >
            {[spirit.element, spirit.skill.type].filter(Boolean).join(" · ")}
          </p>
          <h3 className="text-base leading-tight font-medium">{spirit.name}</h3>
        </div>
      </div>

      {spirit.skill.description ? (
        <p className="text-xs leading-snug text-dim">
          <span className="text-ink">{spirit.skill.name}.</span>{" "}
          {spirit.skill.description}
        </p>
      ) : null}

      <dl className="grid gap-y-1 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
        {spirit.skill.cooldown ? (
          <div className="flex items-baseline justify-between gap-2">
            <dt>Cooldown</dt>
            <dd className="text-ink">{spirit.skill.cooldown}s</dd>
          </div>
        ) : null}
        {spirit.skill.levels.map((level) => (
          <div
            key={level.level}
            className="flex items-baseline justify-between gap-2"
          >
            <dt>Lv {level.level}</dt>
            <dd className="text-ink">{level.effect}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function SpiritGrid() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = SPIRITS.find((spirit) => spirit.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="grid min-w-0 flex-1 grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {SPIRITS.map((spirit) => (
          <SpiritTile
            key={spirit.id}
            spirit={spirit}
            selected={spirit.id === selectedId}
            onSelect={() =>
              setSelectedId(spirit.id === selectedId ? null : spirit.id)
            }
          />
        ))}
      </div>

      <aside className="shrink-0 rounded-lg border border-ink/15 p-3 lg:sticky lg:top-0 lg:w-64">
        <SpiritDetail spirit={selected} />
      </aside>
    </div>
  );
}
