"use client";

import Image from "next/image";
import { everyGem, GEM_RARITIES, GEM_SHAPES, GEM_SLOTS, gemSoulWeaponAtk, gemTotals, shapeOf, type SoulGem } from "@/lib/game/engraving";
import { equippedKey, soulWeaponOwned } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue, SOUL_WEAPONS, type SoulWeapon } from "./data";
import { EquipButton, EquippedBadge, OwnedToggle } from "./profile-controls";
import { Sprite } from "./sprite";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";
const INPUT =
  "w-16 rounded-md border border-ink/20 bg-transparent px-1.5 py-1 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink";
const BUTTON =
  "rounded-md border border-ink/25 px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-dim uppercase outline-none enabled:hover:border-ink/60 enabled:hover:text-ink focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

/** Grade colours matching the soul gem art: White, Green, Orange, Purple, Red, Aqua. */
const RARITY_COLOUR = ["#d1d5db", "#10b981", "#f97316", "#a855f7", "#ef4444", "#22d3ee"];

const gemArt = (gem: SoulGem) => `/art/soul-gems/gem-${gem.rarity}-${gem.shape}.png`;
const typeArt = (shape: number) => `/art/soul-gems/type-${shape}.png`;

/* --------------------------------------------------------------- list */

function SoulWeaponRow({ weapon }: { weapon: SoulWeapon }) {
  const { profile, setOwned, equip, setPlateCompleted } = useProfile();
  const owned = soulWeaponOwned(profile, weapon.name);
  const equipped = equippedKey(profile, "soulWeapons") === weapon.name;
  const complete = profile.soulEngraving.completed[weapon.name] === true;
  const stage = weapon.stage.name ?? (weapon.stage.number ? `Stage ${weapon.stage.number}` : null);

  return (
    <li className={`relative flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-ink/15 p-2 ${owned ? "" : "opacity-60"}`}>
      {equipped ? <EquippedBadge /> : null}
      {weapon.icon && weapon.iconSize ? (
        <Sprite src={weapon.icon} native={weapon.iconSize} size={64} className="size-12 rounded-md border border-ink/15" />
      ) : (
        <span className="size-12" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-tight font-medium">
          {weapon.name} <span className="font-mono text-[10px] text-dim">#{weapon.id}</span>
        </p>
        <p className={LABEL}>{[stage, weapon.soulColor].filter(Boolean).join(" · ")}</p>
        <p className="font-mono text-[10px] text-dim tabular-nums">
          ATK {formatValue(weapon.attack)} · Souls {formatValue(weapon.cost)}
          {weapon.requirement.item ? ` · Needs ${[weapon.requirement.item, weapon.requirement.grade].filter(Boolean).join(" ")}` : ""}
        </p>
        <p className={`font-mono text-[10px] tabular-nums ${complete ? "text-emerald-500" : "text-dim"}`}>
          Completion ATK {formatValue(weapon.engraving.atk)}% / HP {formatValue(weapon.engraving.hp)}%
        </p>
      </div>
      <div className="flex items-center gap-2">
        <OwnedToggle owned={owned} name={weapon.name} onChange={(on) => setOwned("soulWeapons", weapon.name, on)} />
        <EquipButton equipped={equipped} name={weapon.name} onToggle={() => equip("soulWeapons", equipped ? null : weapon.name)} />
        <label className={`flex items-center gap-1 ${LABEL}`}>
          <input
            type="checkbox"
            checked={complete}
            onChange={(event) => setPlateCompleted(weapon.name, event.target.checked)}
            aria-label={`${weapon.name} engraving completed`}
            className="size-3.5 accent-ink"
          />
          Completed
        </label>
      </div>
    </li>
  );
}

/* --------------------------------------------------------------- settings */

function GemEditor({ index }: { index: number }) {
  const { profile, setSoulGem } = useProfile();
  const gem = profile.soulEngraving.gems[index];
  if (!gem) {
    return (
      <li className="flex items-center justify-between gap-2 rounded-md border border-dashed border-ink/20 p-2">
        <span className={LABEL}>Gem {index + 1} · empty</span>
        <button type="button" className={BUTTON} onClick={() => setSoulGem(index, { shape: 1, rarity: 0, level: 1, value: 0, soulWeaponAtk: 0 })}>
          Add gem
        </button>
      </li>
    );
  }
  const shape = shapeOf(gem.shape);
  const set = (change: Partial<SoulGem>) => setSoulGem(index, { ...gem, ...change });
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-ink/15 p-2">
      <span className="relative flex size-12 shrink-0 items-center justify-center rounded bg-zinc-950">
        <Image src={gemArt(gem)} alt="" width={79} height={123} className="h-10 w-auto object-contain" draggable={false} />
        <Image src={typeArt(gem.shape)} alt="" width={64} height={64} className="absolute -top-1 -left-1 size-5" draggable={false} />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <select aria-label={`Gem ${index + 1} shape`} value={gem.shape} onChange={(e) => set({ shape: Number(e.target.value) })} className={SELECT}>
          {GEM_SHAPES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.label}
            </option>
          ))}
        </select>
        <select
          aria-label={`Gem ${index + 1} rarity`}
          value={gem.rarity}
          onChange={(e) => set({ rarity: Number(e.target.value) })}
          className={SELECT}
          style={{ color: RARITY_COLOUR[gem.rarity] }}
        >
          {GEM_RARITIES.map((r, i) => (
            <option key={r} value={i}>
              {r}
            </option>
          ))}
        </select>
        <label className={`flex items-center gap-1 ${LABEL}`}>
          Lv
          <input
            type="number"
            min={1}
            value={gem.level}
            aria-label={`Gem ${index + 1} level`}
            onChange={(e) => set({ level: Math.max(1, Math.floor(e.target.valueAsNumber || 1)) })}
            className={INPUT}
          />
        </label>
        <label className={`flex items-center gap-1 ${LABEL}`}>
          {shape?.label}
          <input
            type="number"
            min={0}
            step={0.1}
            value={gem.value}
            aria-label={`Gem ${index + 1} ${shape?.label} value`}
            onChange={(e) => set({ value: Math.max(0, e.target.valueAsNumber || 0) })}
            className={INPUT}
          />
          {shape?.percent ? "%" : ""}
        </label>
        <label className={`flex items-center gap-1 ${LABEL}`}>
          Soul Weapon ATK
          <input
            type="number"
            min={0}
            step={0.01}
            value={gem.soulWeaponAtk}
            aria-label={`Gem ${index + 1} Soul Weapon ATK engraving effect`}
            onChange={(e) => set({ soulWeaponAtk: Math.max(0, e.target.valueAsNumber || 0) })}
            className={INPUT}
          />
          %
        </label>
      </div>
      <button type="button" className={BUTTON} onClick={() => setSoulGem(index, null)} aria-label={`Remove gem ${index + 1}`}>
        ✕
      </button>
    </li>
  );
}

function EngravingSettings() {
  const { profile, setChaos } = useProfile();
  const engraving = profile.soulEngraving;
  const equipped = SOUL_WEAPONS.find((w) => w.name === equippedKey(profile, "soulWeapons"));
  const totals = gemTotals(everyGem(engraving.gems), engraving.gems);
  const soulWeaponAtk = gemSoulWeaponAtk(engraving.gems);

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2 rounded-lg border border-ink/15 p-3">
        <h3 className={LABEL}>Chaos level</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className={`flex items-center gap-1.5 ${LABEL}`}>
            <input
              type="number"
              min={0}
              value={engraving.chaosLevel}
              aria-label="Chaos level"
              onChange={(e) => setChaos({ chaosLevel: Math.max(0, Math.floor(e.target.valueAsNumber || 0)) })}
              className={INPUT}
            />
          </label>
          <label className={`flex items-center gap-1.5 ${LABEL}`}>
            Completion bonus
            <input
              type="number"
              min={0}
              step={0.1}
              value={Number((engraving.chaosBonus * 100).toFixed(4))}
              aria-label="Chaos level completion bonus"
              onChange={(e) => setChaos({ chaosBonus: Math.max(0, e.target.valueAsNumber || 0) / 100 })}
              className={INPUT}
            />
            %
          </label>
        </div>
        <p className="text-[11px] leading-snug text-dim">
          The chaos level (raised with Chaos Souls) strengthens soul gems and the completion effect. Its table isn&apos;t in
          the workbook: enter the bonus the game shows (a completion of ATK 33.9% showing as 40.3% is +19%).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className={LABEL}>Soul gems ({engraving.gems.filter(Boolean).length}/{GEM_SLOTS})</h3>
        <ul className="flex flex-col gap-1.5">
          {Array.from({ length: GEM_SLOTS }, (_, i) => (
            <GemEditor key={i} index={i} />
          ))}
        </ul>
        <p className="text-[11px] leading-snug text-dim">
          A gem&apos;s Additional Option follows its shape. Enter it and the gem&apos;s Engraving Effect (Soul Weapon ATK) as the
          game shows them; gem stat tables aren&apos;t published.
        </p>
      </section>

      <section className="flex flex-col gap-1 rounded-lg bg-ink/[0.04] p-3">
        <h3 className={LABEL}>{equipped ? `Equipped: ${equipped.name}` : "No soul weapon equipped"}</h3>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 font-mono text-[11px]">
          <dt className="text-dim">Soul Weapon ATK (engraving effect)</dt>
          <dd className="text-right tabular-nums">+{formatValue(soulWeaponAtk * 100)}%</dd>
          {GEM_SHAPES.map((s) => (
            <div key={s.id} className="contents">
              <dt className="text-dim">{s.label}</dt>
              <dd className="text-right tabular-nums">
                +{formatValue(s.percent ? totals[s.stat] * 100 : totals[s.stat])}
                {s.percent ? "%" : ""}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- panel */

export function SoulWeaponPanel() {
  return (
    <div className="relative flex flex-col md:grid md:h-full md:min-h-0 md:grid-cols-2">
      <ul className="flex min-h-0 flex-col gap-2 overflow-auto border-b border-ink/15 p-3 pb-6 sm:p-4 md:border-r md:border-b-0">
        {SOUL_WEAPONS.map((weapon) => (
          <SoulWeaponRow key={weapon.id} weapon={weapon} />
        ))}
      </ul>
      <div className="min-h-0 overflow-auto p-3 pb-6 sm:p-4">
        <EngravingSettings />
      </div>
    </div>
  );
}
