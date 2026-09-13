"use client";

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
