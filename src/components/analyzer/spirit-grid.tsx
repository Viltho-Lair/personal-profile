"use client";

import { rarityGroup } from "@/lib/game/formulas";
import { activeSpiritPreset, effectiveSpiritLevel, spiritState } from "@/lib/profile/rules";
import { MAIN_SPIRIT_COUNT, MAX_SPIRIT_ENHANCE, MIN_SPIRIT_ENHANCE } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { SPIRIT_TIERS, SPIRITS, type Spirit } from "./data";
import { InlineLevel } from "./level-input";
import { PresetPicker } from "./preset-picker";
import { companionAmp, spiritStatValue, useSpiritFactors, type SpiritFactors, type SpiritStatKey } from "./spirit-stats";
import { Sprite } from "./sprite";
import { ELEMENT_BORDER, ELEMENT_TEXT, TIER_TEXT } from "./tiers";

const pct = (value: number) => `${(value * 100).toLocaleString("en", { maximumFractionDigits: 2 })}%`;

const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";

function SpiritRow({ spirit, factors }: { spirit: Spirit; factors: SpiritFactors | null }) {
  const { profile, setSpiritAwakening, setSpiritLevel, setSpiritEnhance, toggleMainSpirit } = useProfile();
  const isMain = profile.mainSpirits.includes(spirit.name);
  const lineupLevel = effectiveSpiritLevel(profile, spirit.name, spirit.maxLevel);
  const state = spiritState(profile, spirit.name, spirit.maxLevel);
  const group = state.awakening ? rarityGroup(state.awakening) : "Common";
  const art = spirit.art[group] ?? spirit.art.Common;
  const skillLevel = spirit.skill?.levels.find((entry) => entry.level === state.enhance);

  const amp = companionAmp(profile, spirit);
  const stat = (key: SpiritStatKey) => {
    const value = spiritStatValue(profile, spirit, key, factors);
    return value === null ? "—" : value === undefined ? "…" : pct(value);
  };

  return (
    <li
      className={`grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-lg border p-2 sm:grid-cols-[3rem_minmax(8rem,1fr)_auto] ${
        (spirit.element && ELEMENT_BORDER[spirit.element]) || "border-ink/15"
      } ${state.owned ? "" : "bg-ink/[0.02]"}`}
    >
      <span className="row-span-2 flex size-12 items-center justify-center rounded-md bg-ink/[0.05] sm:row-span-1">
        {art ? (
          <Sprite
            src={art.icon}
            native={art.iconSize}
            size={64}
            className={`size-12 ${state.owned ? "" : "opacity-40 grayscale"}`}
          />
        ) : null}
      </span>

      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-sm leading-tight font-medium">{spirit.name}</h3>
          <span className={`font-mono text-[10px] tracking-[0.08em] uppercase ${(spirit.element && ELEMENT_TEXT[spirit.element]) || "text-dim"}`}>
            {[spirit.element, spirit.skill?.type].filter(Boolean).join(" · ")}
          </span>
        </div>
        {spirit.skill ? (
          <p className="text-xs leading-snug text-dim">
            <span className="text-ink">{spirit.skill.name}</span>
            {skillLevel ? ` · Lv ${skillLevel.level}: ${skillLevel.effect}` : null}
          </p>
        ) : null}
      </div>

      <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-2 sm:col-span-1 sm:justify-end">
        <label className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
          Awakening
          <select
            aria-label={`${spirit.name} awakening`}
            value={state.awakening ?? ""}
            onChange={(event) => setSpiritAwakening(spirit.name, event.target.value || null)}
            className={`${SELECT} ${state.awakening ? (TIER_TEXT[group] ?? "") : ""}`}
          >
            <option value="">Not owned</option>
            {SPIRIT_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier.replace(/ A(\d)$/, " ★$1")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
          <input
            type="checkbox"
            checked={isMain}
            disabled={!isMain && profile.mainSpirits.length >= MAIN_SPIRIT_COUNT}
            onChange={() => toggleMainSpirit(spirit.name)}
            className="accent-ink"
          />
          Main 6
        </label>
        <InlineLevel
          value={state.level}
          min={0}
          max={spirit.maxLevel}
          name={spirit.name}
          onChange={(level) => setSpiritLevel(spirit.name, level, spirit.maxLevel)}
        />
        <label className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
          Enhance
          <select
            aria-label={`${spirit.name} enhance`}
            value={state.enhance}
            onChange={(event) => setSpiritEnhance(spirit.name, Number(event.target.value))}
            className={SELECT}
          >
            {Array.from({ length: MAX_SPIRIT_ENHANCE - MIN_SPIRIT_ENHANCE + 1 }, (_, i) => MIN_SPIRIT_ENHANCE + i).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="col-span-2 grid grid-cols-4 gap-2 font-mono text-[10px] tracking-[0.06em] uppercase sm:col-span-3">
        {[
          ["ATK", stat("atk")],
          ["HP", stat("hp")],
          ["Gold", stat("gold")],
          ["EXP", stat("exp")],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col rounded-md bg-ink/[0.04] px-2 py-1">
            <dt className="text-dim">{label}</dt>
            <dd className="text-ink tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {lineupLevel !== state.level ? (
        <p className="col-span-2 font-mono text-[9px] tracking-[0.04em] text-sky-600 uppercase sm:col-span-3">
          Counts at Lv {lineupLevel}, the lowest of the main 6
        </p>
      ) : null}
      {amp.source ? (
        <p className="col-span-2 font-mono text-[9px] tracking-[0.04em] text-dim uppercase sm:col-span-3">
          ×{(1 + amp.amount).toLocaleString("en", { maximumFractionDigits: 2 })} from {amp.source} · Fountain slots{" "}
          {Object.values(spirit.fountainSlots).join("/")}
        </p>
      ) : null}
    </li>
  );
}

function FountainSettings() {
  const { profile, setFountainEffect } = useProfile();
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-ink/15 p-2">
      <h3 className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">Awakened Fountain of Circulation</h3>
      <div className="flex flex-wrap gap-3">
        {profile.fountainEffects.map((effect, slot) => (
          <label key={slot} className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
            {["1st", "2nd", "3rd", "4th"][slot]} companion effect
            <input
              type="number"
              min={0}
              step={0.01}
              value={Number((effect * 100).toFixed(4))}
              onChange={(event) => setFountainEffect(slot, (event.target.valueAsNumber || 0) / 100)}
              className="w-20 rounded border border-ink/20 bg-transparent px-1 py-0.5 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink"
            />
            %
          </label>
        ))}
      </div>
      <p className="text-[11px] leading-snug text-dim">
        Each spirit stat is multiplied by one of these effects (its slot) and by the Spirit Stats passive of the companion with its element.
      </p>
    </section>
  );
}

function SpiritPresetSettings() {
  const { profile, selectPreset, setSpiritPresetSlot } = useProfile();
  const slots = activeSpiritPreset(profile);
  const owned = SPIRITS.filter((spirit) => spiritState(profile, spirit.name, spirit.maxLevel).owned);
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-ink/15 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">
          Spirit preset · main 6 {profile.mainSpirits.length}/{MAIN_SPIRIT_COUNT}
        </h3>
        <PresetPicker label="Spirit preset" active={profile.activePresets.spirits} onSelect={(index) => selectPreset("spirits", index)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {slots.map((name, slot) => (
          <select
            key={slot}
            aria-label={`Spirit preset slot ${slot + 1}`}
            value={name ?? ""}
            onChange={(event) => setSpiritPresetSlot(slot, event.target.value || null)}
            className={SELECT}
          >
            <option value="">Slot {slot + 1} · empty</option>
            {owned.map((spirit) => (
              <option key={spirit.id} value={spirit.name}>
                {spirit.name}
              </option>
            ))}
          </select>
        ))}
      </div>
      <p className="text-[11px] leading-snug text-dim">
        Equip up to three owned spirits per preset. Mark six spirits as main: every other spirit then counts at the lowest main level.
      </p>
    </section>
  );
}

export function SpiritGrid() {
  const factors: SpiritFactors | null = useSpiritFactors();

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Pick each spirit&apos;s awakening. Stats follow awakening and level; the skill follows enhance (1-5).
      </p>
      <SpiritPresetSettings />
      <FountainSettings />
      <ul className="grid gap-2 xl:grid-cols-2">
        {SPIRITS.map((spirit) => (
          <SpiritRow key={spirit.id} spirit={spirit} factors={factors} />
        ))}
      </ul>
    </div>
  );
}
