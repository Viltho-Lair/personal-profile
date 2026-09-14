"use client";

import Image from "next/image";
import { beastSkillText, beastTotals, beastValue, MAX_BEAST_AWAKEN, maxAffection, type Beast } from "@/lib/game/beasts";
import { mountedBeast, presetBeast } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue } from "./data";
import { InlineLevel } from "./level-input";
import { PresetPicker } from "./preset-picker";
import { BEASTS } from "./stat-sources";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";
const FAMILIES = ["Wolf", "Boar", "Bat", "Golem", "Draco"] as const;
const FAMILY_LABEL: Record<(typeof FAMILIES)[number], string> = { Wolf: "Wolves", Boar: "Boars", Bat: "Bats", Golem: "Golems", Draco: "Dracos" };
const MOUNTED_LABEL = { atk: "Increased Attack", mspd: "Increased MSPD", affection: "Increased Affection" } as const;

const pct = (value: number) => `${formatValue(Math.round(value * 100) / 100)}%`;
const PIXEL = "[image-rendering:pixelated]";

/** The beast's picture as COMPANIONS picks it: the egg until owned, Icon 2 at awaken 6, Icon 1 below. */
export function BeastArt({ beast, awaken, size }: { beast: Beast; awaken: number | null; size: number }) {
  const owned = awaken !== null;
  const src = !owned ? beast.art.egg : awaken >= MAX_BEAST_AWAKEN ? (beast.art.sprite2 ?? beast.art.sprite) : beast.art.sprite;
  return (
    <span className="flex shrink-0 items-center justify-center rounded-md bg-ink/[0.05]" style={{ width: size, height: size }}>
      {src ? (
        <Image
          src={src}
          alt=""
          width={owned ? size : size / 2}
          height={owned ? size : size / 2}
          className={`object-contain ${PIXEL}`}
          style={{ width: owned ? size : size / 2, height: owned ? size : size / 2 }}
        />
      ) : null}
    </span>
  );
}

function BeastCard({ beast }: { beast: Beast }) {
  const { profile, setBeast, setMountedBeast, setBeastMounted } = useProfile();
  const state = profile.beasts[beast.name] ?? { awaken: null, affection: 1 };
  const owned = state.awaken !== null;
  const cap = maxAffection(state.awaken ?? 0);
  const mounted = mountedBeast(profile) === beast.name;
  const combat = beastValue(BEASTS, beast, state, beast.family === "Draco" ? "dracoCombat" : "combat");

  return (
    <article
      className={`flex flex-col gap-1.5 rounded-lg border p-2.5 ${mounted ? "border-ink" : "border-ink/15"} ${owned ? "" : "opacity-60"} ${
        beast.tier === "Unique" ? "bg-amber-400/[0.06]" : ""
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <BeastArt beast={beast} awaken={state.awaken} size={56} />
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-sm leading-tight font-medium">
              {beast.name} <span className={`${LABEL} ${beast.tier === "Unique" ? "text-amber-500" : ""}`}>{beast.tier}</span>
            </h3>
            <span className="flex items-center gap-1.5">
              {beast.art.type ? (
                <Image
                  src={beast.art.type}
                  alt={beast.mounted.map((effect) => MOUNTED_LABEL[effect]).join(", ")}
                  title={beast.mounted.map((effect) => MOUNTED_LABEL[effect]).join(", ")}
                  width={40}
                  height={20}
                  className={`h-5 w-auto ${PIXEL}`}
                />
              ) : null}
              {state.awaken ? (
                BEASTS.awakenIcons[state.awaken - 1] ? (
                  <Image
                    src={BEASTS.awakenIcons[state.awaken - 1]!}
                    alt={`Awaken ${state.awaken}`}
                    title={`Awaken ${state.awaken}`}
                    width={80}
                    height={16}
                    className={`h-4 w-auto ${PIXEL}`}
                  />
                ) : null
              ) : null}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
        <label className={`flex items-center gap-1 ${LABEL}`}>
          <input
            type="checkbox"
            checked={owned}
            onChange={(event) => setBeast(beast.name, { awaken: event.target.checked ? (state.awaken ?? 0) : null })}
            aria-label={`${beast.name} owned`}
            className="size-3.5 accent-ink"
          />
          Owned
        </label>
        <button
          type="button"
          disabled={!owned}
          aria-pressed={mounted}
          onClick={() => (mounted ? setBeastMounted(false) : setMountedBeast(beast.name))}
          className={`rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${
            mounted ? "border-ink bg-ink text-ground" : "border-ink/25 text-dim enabled:hover:border-ink/60 enabled:hover:text-ink"
          }`}
        >
          {mounted ? "Mounted" : "Mount"}
        </button>
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>Awaken</span>
          <select
            aria-label={`${beast.name} awaken`}
            value={state.awaken ?? 0}
            disabled={!owned}
            onChange={(event) => setBeast(beast.name, { awaken: Number(event.target.value) })}
            className={`${SELECT} disabled:opacity-50`}
          >
            {Array.from({ length: MAX_BEAST_AWAKEN + 1 }, (_, a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <span className="flex items-center gap-1.5">
          <span className={LABEL}>Affection</span>
          <InlineLevel
            value={Math.min(state.affection, cap)}
            min={1}
            max={cap}
            name={`${beast.name} affection`}
            disabled={!owned}
            onChange={(affection) => setBeast(beast.name, { affection })}
          />
        </span>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 font-mono text-[10px]">
        <dt className="text-dim">ATK / HP / HP Recovery</dt>
        <dd className="text-right text-ink tabular-nums">+{pct(combat)}</dd>
        {beast.mounted.map((effect) => (
          <div key={effect} className="contents">
            <dt className="text-dim">{MOUNTED_LABEL[effect]} (mounted)</dt>
            <dd className="text-right text-ink tabular-nums">
              +{pct(beastValue(BEASTS, beast, state, effect === "mspd" ? "mspd" : "atkAffection"))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] leading-snug text-dim">{beastSkillText(beast, state.awaken)}</p>
    </article>
  );
}

/** Companion → Beasts: every beast on the left, the mounted beast and totals on the right. */
export function BeastPanel() {
  const { profile, selectPreset, setPresetBeast, setBeastMounted } = useProfile();
  const mounted = mountedBeast(profile);
  const picked = presetBeast(profile);
  const totals = beastTotals(BEASTS, profile.beasts, mounted !== null);
  const ownedBeasts = BEASTS.beasts.filter((b) => (profile.beasts[b.name]?.awaken ?? null) !== null);
  const mountedData = BEASTS.beasts.find((b) => b.name === picked);

  return (
    <div className="flex flex-col md:grid md:h-full md:min-h-0 md:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-4 overflow-auto border-b border-ink/15 p-3 pb-6 sm:p-4 md:border-r md:border-b-0 md:pb-20">
        {FAMILIES.map((family) => (
          <section key={family} aria-label={FAMILY_LABEL[family]} className="flex flex-col gap-2">
            <h2 className={LABEL}>{FAMILY_LABEL[family]}</h2>
            <div className="grid gap-2 lg:grid-cols-2">
              {BEASTS.beasts
                .filter((b) => b.family === family)
                .map((beast) => (
                  <BeastCard key={beast.name} beast={beast} />
                ))}
            </div>
          </section>
        ))}
      </div>
      <div className="flex min-h-0 flex-col gap-3 overflow-auto p-3 pb-20 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={LABEL}>Beast preset</span>
          <PresetPicker label="Beast preset" active={profile.activePresets.beasts} onSelect={(index) => selectPreset("beasts", index)} />
        </div>
        <label className="flex items-center gap-2">
          <span className={LABEL}>Beast</span>
          <select
            aria-label="Preset beast"
            value={picked ?? ""}
            onChange={(event) => setPresetBeast(event.target.value || null)}
            className={SELECT}
          >
            <option value="">None</option>
            {ownedBeasts.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`flex items-center gap-2 ${LABEL}`}>
          <input
            type="checkbox"
            checked={mounted !== null}
            disabled={!picked}
            onChange={(event) => setBeastMounted(event.target.checked)}
            className="size-3.5 accent-ink"
          />
          Mounted
        </label>
        {mountedData ? (
          <div className="flex items-center gap-3 rounded-md border border-ink/15 p-2 text-xs leading-snug">
          <BeastArt beast={mountedData} awaken={profile.beasts[mountedData.name]?.awaken ?? null} size={96} />
          <p>
            <span className={LABEL}>Mounted skill · </span>
            {beastSkillText(mountedData, profile.beasts[mountedData.name]?.awaken ?? null)}
            {mountedData.family === "Wolf" ? (
              <span className="block text-[11px] text-dim">Counted in the promotion fight when Include Skills is ticked.</span>
            ) : (
              <span className="block text-[11px] text-dim">Not part of the promotion fight.</span>
            )}
          </p>
          </div>
        ) : null}
        <section aria-label="Beast totals" className="flex flex-col gap-1.5">
          <h2 className={LABEL}>Totals</h2>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 rounded-md bg-ink/[0.04] p-2 font-mono text-[11px]">
            <dt className="text-dim">Owned effect: ATK / HP / HP Recovery</dt>
            <dd className="text-right text-ink tabular-nums">+{pct(totals.combat * 100)}</dd>
            <dt className="text-dim">Mounted: Increased Attack</dt>
            <dd className="text-right text-ink tabular-nums">+{pct(totals.mountedAtk * 100)}</dd>
            <dt className="text-dim">Mounted: Increased MSPD</dt>
            <dd className="text-right text-ink tabular-nums">+{pct(totals.mspd * 100)}</dd>
            <dt className="text-dim">Mounted: Increased Affection</dt>
            <dd className="text-right text-ink tabular-nums">+{pct(totals.affection * 100)}</dd>
          </dl>
          <p className="text-[11px] leading-snug text-dim">
            The owned effect of every owned beast multiplies ATK, HP and HP Recovery. As in the workbook, the Increased Attack of
            every owned wolf and boar counts while any beast is mounted. Affection is capped at 10 levels per awaken step.
          </p>
        </section>
      </div>
    </div>
  );
}
