"use client";

import { useEffect, useRef, useState } from "react";
import { parseProfile } from "@/lib/profile/storage";
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

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const ACTION = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase underline-offset-4 hover:text-ink hover:underline";

/** Slayer level and the highest stage reached. */
function SlayerProgress() {
  const { profile, updateCharacter } = useProfile();
  const { slayerLevel, highestStage } = profile.character;
  const field = (label: string, value: number, min: number, onChange: (value: number) => void) => (
    <label className="flex items-center justify-between gap-3">
      <span className={LABEL}>{label}</span>
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

type Confirm = { title: string; body: string; action: string; onConfirm: (() => void) | null };

/** A modal asking before something that can't be undone; with no `onConfirm` it only informs. */
function ConfirmDialog({ confirm, onClose }: { confirm: Confirm | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (confirm && !dialog.open) dialog.showModal();
    if (!confirm && dialog.open) dialog.close();
  }, [confirm]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="settings-dialog-title"
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-ink/20 bg-ground p-4 text-ink backdrop:bg-black/50"
    >
      {confirm ? (
        <div className="flex flex-col gap-3">
          <h2 id="settings-dialog-title" className="text-sm font-semibold">
            {confirm.title}
          </h2>
          <p className="text-xs leading-snug text-dim">{confirm.body}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-ink/25 px-3 py-1 font-mono text-[10px] tracking-[0.08em] uppercase hover:border-ink">
              {confirm.onConfirm ? "Cancel" : "OK"}
            </button>
            {confirm.onConfirm ? (
              <button
                type="button"
                autoFocus
                onClick={() => {
                  confirm.onConfirm?.();
                  onClose();
                }}
                className="rounded-md border border-red-500 bg-red-500 px-3 py-1 font-mono text-[10px] tracking-[0.08em] text-white uppercase hover:brightness-110"
              >
                {confirm.action}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

/** Settings: slayer progress, and saving, loading or resetting the profile. */
export function SettingsPanel() {
  const { profile, resetProfile, replaceProfile } = useProfile();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const exportProfile = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `slayer-legends-profile-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importProfile = async (file: File) => {
    const next = parseProfile(await file.text());
    if (!next) {
      setConfirm({ title: "Can't import this file", body: `${file.name} isn't a profile exported from this analyzer.`, action: "", onConfirm: null });
      return;
    }
    setConfirm({
      title: "Import profile?",
      body: `This replaces everything saved in this browser with ${file.name}. Export first if you want to keep your current profile.`,
      action: "Import",
      onConfirm: () => replaceProfile(next),
    });
  };

  return (
    <section aria-labelledby="settings-title" className="flex h-full flex-col justify-between gap-3">
      <div className="flex flex-col gap-2">
        <h2 id="settings-title" className="text-sm font-semibold">
          Settings
        </h2>
        <SlayerProgress />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        <button type="button" onClick={exportProfile} className={ACTION}>
          Export JSON
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={ACTION}>
          Import JSON
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label="Import profile JSON file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void importProfile(file);
          }}
        />
        <button
          type="button"
          onClick={() =>
            setConfirm({
              title: "Reset profile?",
              body: "This clears every level, owned item and equipped item saved in this browser. It can't be undone; export first to keep a copy.",
              action: "Reset",
              onConfirm: resetProfile,
            })
          }
          className={`${ACTION} hover:text-red-500`}
        >
          Reset profile
        </button>
      </div>
      <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
    </section>
  );
}
