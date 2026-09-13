"use client";

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

/** The per-item level box that sits inside a card or row. */
export function InlineLevel({
  value,
  min = 1,
  max,
  onChange,
  name,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (level: number) => void;
  name: string;
}) {
  const clamp = clampTo(min, max);

  return (
    <label className="flex items-center gap-1 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
      Lv
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        aria-label={`${name} level`}
        onChange={(event) => onChange(clamp(event.target.valueAsNumber))}
        className="w-12 rounded border border-ink/20 bg-transparent px-1 py-0.5 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink"
      />
    </label>
  );
}
