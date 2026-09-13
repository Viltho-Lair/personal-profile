"use client";

import { PRESET_COUNT } from "@/lib/profile/types";

/** Five numbered buttons; one preset is active at a time. */
export function PresetPicker({
  label,
  active,
  onSelect,
  disabled = false,
  size = "md",
}: {
  label: string;
  active: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {Array.from({ length: PRESET_COUNT }, (_, index) => (
        <button
          key={index}
          type="button"
          role="radio"
          aria-checked={active === index}
          aria-label={`${label} ${index + 1}`}
          disabled={disabled}
          onClick={() => onSelect(index)}
          className={`flex items-center justify-center rounded border font-mono tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${
            size === "sm" ? "size-5 text-[10px]" : "size-7 text-xs"
          } ${active === index ? "border-ink bg-ink text-ground" : "border-ink/30 text-dim enabled:hover:border-ink/70 enabled:hover:text-ink"}`}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
}
