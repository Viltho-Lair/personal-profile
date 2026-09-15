"use client";

import { useState } from "react";

function clampTo(min: number, max: number) {
  return (level: number) =>
    Number.isNaN(level) ? min : Math.min(max, Math.max(min, level));
}

/** The "set every item at once" control at the top of a panel. */
export function LevelInput({
  value,
  min = 1,
  max,
  onChange,
  label = "Level",
  disabled = false,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (level: number) => void;
  label?: string;
  disabled?: boolean;
}) {
  const clamp = clampTo(min, max);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
        {label}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) => onChange(clamp(event.target.valueAsNumber))}
          className="w-16 disabled:opacity-50 rounded-md border border-ink/20 bg-transparent px-2 py-1 text-right font-mono text-xs text-ink tabular-nums outline-none focus-visible:border-ink"
        />
      </label>

      <input
        type="range"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onChange(clamp(event.target.valueAsNumber))}
        aria-label={`${label} slider`}
        className="h-1 disabled:opacity-50 min-w-32 flex-1 accent-ink sm:max-w-64"
      />

      <span className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
        Max {max}
      </span>
    </div>
  );
}

/**
 * One level for every item in a list: type it, then press Set all (or Enter). Nothing changes while you type, so a
 * half-typed number never overwrites your levels.
 */
export function SetAllLevels({ max, name, onApply }: { max: number; name: string; onApply: (level: number) => void }) {
  const [draft, setDraft] = useState("");
  const level = Math.floor(Number(draft));
  const valid = draft.trim() !== "" && Number.isFinite(level) && level >= 0;
  const apply = () => {
    if (!valid) return;
    onApply(Math.min(max, level));
    setDraft("");
  };
  return (
    <div className="flex w-fit items-center gap-2 rounded-lg border border-ink/15 px-3 py-1.5 font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
      <label className="flex items-center gap-2 whitespace-nowrap">
        Set all levels
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          min={0}
          max={max}
          placeholder={String(max)}
          aria-label={`Level for every ${name}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") apply();
          }}
          className="w-16 rounded border border-ink/20 bg-transparent px-1 py-0.5 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink"
        />
      </label>
      <button
        type="button"
        onClick={apply}
        disabled={!valid}
        className="whitespace-nowrap rounded border border-ink/25 px-2 py-0.5 text-ink hover:border-ink disabled:opacity-40"
      >
        Set all
      </button>
    </div>
  );
}

/** The per-item level box that sits inside a card or row. */
export function InlineLevel({
  value,
  min = 1,
  max,
  onChange,
  name,
  wide = false,
  disabled = false,
  title,
  prefix = "Lv",
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (level: number) => void;
  name: string;
  /** Room for 7+ digit levels. */
  wide?: boolean;
  disabled?: boolean;
  title?: string;
  /** The word before the box: "Lv" unless the number isn't a level. */
  prefix?: string;
}) {
  const clamp = clampTo(min, max);

  return (
    <label title={title} className="flex items-center gap-1 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
      {prefix}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={`${name} level`}
        onChange={(event) => onChange(clamp(event.target.valueAsNumber))}
        className={`${wide ? "w-20" : "w-12"} rounded border disabled:opacity-60 border-ink/20 bg-transparent px-1 py-0.5 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink`}
      />
    </label>
  );
}
