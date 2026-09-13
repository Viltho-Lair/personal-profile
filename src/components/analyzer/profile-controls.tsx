"use client";

import { useProfile } from "@/lib/profile/use-profile";

export function OwnedToggle({
  owned,
  onChange,
  name,
}: {
  owned: boolean;
  onChange: (owned: boolean) => void;
  name: string;
}) {
  return (
    <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
      <input
        type="checkbox"
        checked={owned}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={`${name} owned`}
        className="size-3.5 accent-ink"
      />
      Owned
    </label>
  );
}

export function EquipButton({
  equipped,
  onToggle,
  name,
}: {
  equipped: boolean;
  onToggle: () => void;
  name: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={equipped}
      aria-label={`Equip ${name}`}
      className={`rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] uppercase transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        equipped ? "border-ink bg-ink text-ground" : "border-ink/25 text-ink hover:border-ink"
      }`}
    >
      {equipped ? "Equipped" : "Equip"}
    </button>
  );
}

/** The corner "E" the game puts on an equipped item. */
export function EquippedBadge({ position = "top-1 left-1" }: { position?: string }) {
  return (
    <span
      role="img"
      aria-label="Equipped"
      className={`absolute ${position} z-10 grid size-4 place-items-center rounded-sm bg-ink font-mono text-[9px] font-bold text-ground`}
    >
      E
    </span>
  );
}

/** Slayer level and the highest stage reached, beside Reset profile in the overview. */
export function SlayerProgress() {
  const { profile, updateCharacter } = useProfile();
  const { slayerLevel, highestStage } = profile.character;
  const field = (label: string, value: number, min: number, onChange: (value: number) => void) => (
    <label className="flex items-center justify-between gap-3">
      <span className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        step={1}
        value={value || ""}
        placeholder={String(min)}
        aria-label={label}
        onChange={(event) => {
          const next = Math.floor(event.target.valueAsNumber);
          onChange(Number.isFinite(next) ? Math.max(min, next) : min);
        }}
        className="w-28 rounded-md border border-ink/20 bg-transparent px-2 py-1 text-right font-mono text-xs text-ink tabular-nums outline-none focus-visible:border-ink"
      />
    </label>
  );
  return (
    <section aria-label="Slayer progress" className="flex flex-col gap-1.5">
      {field("Slayer level", slayerLevel, 1, (value) => updateCharacter((c) => ({ ...c, slayerLevel: value })))}
      {field("Highest stage reached", highestStage, 0, (value) => updateCharacter((c) => ({ ...c, highestStage: value })))}
    </section>
  );
}

export function ResetProfileButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (
          window.confirm(
            "Reset your profile? This clears every level, owned item and equipped item saved in this browser.",
          )
        ) {
          onReset();
        }
      }}
      className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase underline-offset-4 hover:text-ink hover:underline"
    >
      Reset profile
    </button>
  );
}
