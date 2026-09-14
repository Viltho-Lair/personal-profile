"use client";

import { activeFamiliars } from "@/lib/profile/rules";
import { PresetPicker } from "./preset-picker";
import { useState } from "react";
import { altarStars, manaAltar, proficiencyBonuses } from "@/lib/game/familiars";
import { familiarStars } from "@/lib/profile/rules";
import { FAMILIAR_GROUPS, MAX_FAMILIAR_STARS, type FamiliarGroup } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { FAMILIARS, MANA_ALTAR, type Familiar } from "./data";
import { InlineLevel } from "./level-input";
import { EquippedBadge } from "./profile-controls";
import { SideDialog } from "./side-dialog";
import { Sprite } from "./sprite";
import { ELEMENT_TEXT, TIER_BORDER, TIER_TEXT } from "./tiers";

const GROUP_LABEL: Record<FamiliarGroup, string> = {
  weapon: "Weapon",
  attribute: "Attribute",
  battle: "Battle",
};

const pct = (value: number) => `${(value * 100).toLocaleString("en", { maximumFractionDigits: 2 })}%`;

/** The art for a star count; unowned familiars show their first art. */
function artFor(familiar: Familiar, stars: number | null) {
  const star = stars ?? 0;
  return familiar.art.find((band) => band.from <= star && star <= band.to) ?? familiar.art[0];
}

const rarityOf = (familiar: Familiar, stars: number | null) =>
  stars === null ? null : (familiar.stars.find((s) => s.star === stars)?.rarity ?? null);

export function FamiliarArt({ familiar, stars, size }: { familiar: Familiar; stars: number | null; size: number }) {
  const art = artFor(familiar, stars);
  return art?.icon && art.iconSize ? (
    <Sprite
      src={art.icon}
      native={art.iconSize}
      size={size}
      className={stars === null ? "opacity-40 grayscale" : ""}
    />
  ) : null;
}

function FamiliarTile({
  familiar,
  stars,
  equipped,
  onClick,
}: {
  familiar: Familiar;
  stars: number | null;
  equipped: boolean;
  onClick: () => void;
}) {
  const rarity = rarityOf(familiar, stars);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${familiar.name}, ${stars === null ? "not owned" : `${stars} stars`}${equipped ? ", equipped" : ""}`}
      className="group flex min-w-0 flex-col items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={`relative flex aspect-square w-full max-w-20 items-center justify-center overflow-hidden rounded-md border bg-ink/[0.04] group-hover:brightness-125 ${
          rarity ? (TIER_BORDER[rarity] ?? "border-ink/20") : "border-ink/20"
        }`}
      >
        <span className="absolute inset-[8%] flex items-center justify-center [&_img]:h-full [&_img]:w-full">
          <FamiliarArt familiar={familiar} stars={stars} size={64} />
        </span>
        {equipped ? <EquippedBadge /> : null}
        {stars !== null ? (
          <span className="absolute top-0.5 right-1 font-mono text-[9px] text-ink tabular-nums">★{stars}</span>
        ) : null}
      </span>
      <span className={`text-center text-[10px] leading-tight sm:text-xs ${stars === null ? "text-dim" : "text-ink"}`}>
        {familiar.name}
      </span>
    </button>
  );
}

const PROFICIENCIES = [
  { kind: "attribute", label: "Attribute" },
  { kind: "weapon", label: "Weapon" },
  { kind: "battle", label: "Battle" },
] as const;

function ProficiencySettings() {
  const { profile, setFamiliarProficiency } = useProfile();
  const bonuses = proficiencyBonuses(profile.familiarProficiency);
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-ink/15 p-3">
      <h3 className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">Familiar Proficiency</h3>
      <div className="flex flex-wrap gap-3">
        {PROFICIENCIES.map(({ kind, label }) => (
          <div key={kind} className="flex items-center gap-1.5 text-xs">
            <span className="text-dim">{label}</span>
            <InlineLevel
              value={profile.familiarProficiency[kind]}
              min={0}
              max={1_000_000}
              name={`${label} familiar proficiency`}
              onChange={(level) => setFamiliarProficiency(kind, level)}
            />
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
        <dt className="text-dim">ATK increase</dt>
        <dd className="text-right text-ink tabular-nums">+{pct(bonuses.atk)}</dd>
        <dt className="text-dim">HP increase</dt>
        <dd className="text-right text-ink tabular-nums">+{pct(bonuses.hp)}</dd>
        <dt className="text-dim">All Attribute DMG</dt>
        <dd className="text-right text-ink tabular-nums">+{pct(bonuses.allAttributeDamage)}</dd>
        <dt className="text-dim">Slayer DMG</dt>
        <dd className="text-right text-ink tabular-nums">+{pct(bonuses.slayerDamage)}</dd>
        <dt className="text-dim">Familiar DMG</dt>
        <dd className="text-right text-ink tabular-nums">+{pct(bonuses.familiarDamage)}</dd>
      </dl>
    </section>
  );
}

export function SkillFamiliars() {
  const { profile, setFamiliarStars, equipFamiliar, selectPreset } = useProfile();
  const equipped = activeFamiliars(profile);
  const [openName, setOpenName] = useState<string | null>(null);
  const open = FAMILIARS.find((familiar) => familiar.name === openName) ?? null;

  const owned = FAMILIARS.map((familiar) => familiarStars(profile, familiar.name)).filter(
    (stars): stars is number => stars !== null,
  );
  const stars = altarStars(owned);
  const altar = manaAltar(stars, MANA_ALTAR);

  return (
    <div className="relative flex flex-col md:grid md:h-full md:min-h-0 md:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-4 overflow-auto border-b border-ink/15 p-3 sm:p-4 md:border-r md:border-b-0">
        {FAMILIAR_GROUPS.map((group) => (
          <section key={group} className="flex flex-col gap-2">
            <h3 className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">{GROUP_LABEL[group]}</h3>
            <div className="grid grid-cols-4 gap-x-1 gap-y-3 sm:gap-x-2">
              {FAMILIARS.filter((familiar) => familiar.group === group).map((familiar) => (
                <FamiliarTile
                  key={familiar.id}
                  familiar={familiar}
                  stars={familiarStars(profile, familiar.name)}
                  equipped={equipped[group] === familiar.name}
                  onClick={() => setOpenName(familiar.name)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flex min-h-0 flex-col gap-5 overflow-auto p-3 sm:p-4">
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">Equipped · preset</h3>
            <PresetPicker
              label="Familiar preset"
              active={profile.activePresets.familiars}
              onSelect={(index) => selectPreset("familiars", index)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {FAMILIAR_GROUPS.map((group) => {
              const name = equipped[group];
              const familiar = FAMILIARS.find((f) => f.name === name);
              return (
                <button
                  key={group}
                  type="button"
                  disabled={!familiar}
                  onClick={() => familiar && setOpenName(familiar.name)}
                  aria-label={`${GROUP_LABEL[group]} familiar: ${familiar?.name ?? "empty"}`}
                  className="flex flex-col items-center gap-1 rounded-md border border-dashed border-ink/20 p-1.5 outline-none enabled:border-solid enabled:hover:border-ink focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex aspect-square w-full max-w-16 items-center justify-center [&_img]:h-full [&_img]:w-full">
                    {familiar ? (
                      <FamiliarArt familiar={familiar} stars={familiarStars(profile, familiar.name)} size={64} />
                    ) : null}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.06em] text-dim uppercase">{GROUP_LABEL[group]}</span>
                  <span className="text-[10px] text-ink">{familiar?.name ?? "—"}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-lg border border-ink/15 p-3">
          <h3 className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">Mana Altar</h3>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
            <dt className="text-dim">Stars (best 6)</dt>
            <dd className="text-right text-ink tabular-nums">{stars}</dd>
            <dt className="text-dim">Altar level</dt>
            <dd className="text-right text-ink tabular-nums">
              {altar.level} / {MANA_ALTAR.length}
            </dd>
            <dt className="text-dim">Skill DMG</dt>
            <dd className="text-right text-ink tabular-nums">+{pct(altar.skillDamage)}</dd>
            <dt className="text-dim">Soul Marble</dt>
            <dd className="text-right text-ink tabular-nums">+{pct(altar.soul)}</dd>
          </dl>
          <p className="text-[11px] text-dim">
            {altar.nextStars === null ? "Mana Altar is at its max level." : `Next level at ${altar.nextStars} stars.`}
          </p>
        </section>

        <ProficiencySettings />
      </div>

      {open ? (
        <FamiliarDialog
          familiar={open}
          stars={familiarStars(profile, open.name)}
          equipped={equipped[open.group] === open.name}
          onStars={(value) => setFamiliarStars(open.name, open.group, value)}
          onEquip={(on) => equipFamiliar(open.group, on ? open.name : null)}
          onClose={() => setOpenName(null)}
        />
      ) : null}
    </div>
  );
}

function FamiliarDialog({
  familiar,
  stars,
  equipped,
  onStars,
  onEquip,
  onClose,
}: {
  familiar: Familiar;
  stars: number | null;
  equipped: boolean;
  onStars: (stars: number | null) => void;
  onEquip: (equipped: boolean) => void;
  onClose: () => void;
}) {
  const current = familiar.stars.find((s) => s.star === (stars ?? 0));
  const rarity = rarityOf(familiar, stars);

  return (
    <SideDialog
      title={familiar.name}
      subtitle={
        <>
          <span className="text-dim">{GROUP_LABEL[familiar.group]}</span>
          {familiar.element ? (
            <span className={ELEMENT_TEXT[familiar.element] ?? "text-dim"}>{familiar.element}</span>
          ) : null}
          {rarity ? <span className={TIER_TEXT[rarity] ?? "text-dim"}>{rarity}</span> : null}
        </>
      }
      art={
        <span className="flex size-16 shrink-0 items-center justify-center rounded-md border border-ink/15">
          <FamiliarArt familiar={familiar} stars={stars} size={64} />
        </span>
      }
      openKey={familiar.name}
      onClose={onClose}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
          Stars
          <select
            value={stars === null ? "none" : String(stars)}
            onChange={(event) => onStars(event.target.value === "none" ? null : Number(event.target.value))}
            className="rounded-md border border-ink/20 bg-ground px-2 py-1 font-mono text-xs text-ink outline-none focus-visible:border-ink"
          >
            <option value="none">Not owned</option>
            {familiar.stars
              .filter((s) => s.star <= MAX_FAMILIAR_STARS)
              .map((s) => (
                <option key={s.star} value={s.star}>
                  {s.star}★ {s.rarity ?? ""}
                </option>
              ))}
          </select>
        </label>
        <button
          type="button"
          aria-pressed={equipped}
          aria-label={`Equip ${familiar.name}`}
          onClick={() => onEquip(!equipped)}
          className={`rounded-md border px-2 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            equipped ? "border-ink bg-ink text-ground" : "border-ink/25 text-dim hover:border-ink hover:text-ink"
          }`}
        >
          {equipped ? "Equipped" : "Equip"}
        </button>
      </div>

      <dl className="flex flex-col gap-1.5 text-xs">
        {familiar.stats.map((stat) => {
          const value = current?.values[stat.label] ?? null;
          return (
            <div key={stat.label} className="flex justify-between gap-3">
              <dt className="text-dim">
                {stat.label}
                {familiar.element && stat.label === "Damage" ? ` (${familiar.element})` : ""}
              </dt>
              <dd className="text-ink tabular-nums">
                {value === null ? "—" : stat.percent ? pct(value) : value.toLocaleString("en")}
              </dd>
            </div>
          );
        })}
      </dl>
      {stars === null ? <p className="text-[11px] text-dim">Values shown at 0 stars.</p> : null}

      {familiar.special ? (
        <div className={`flex flex-col gap-1 rounded-md border border-ink/15 p-2 text-xs ${stars === MAX_FAMILIAR_STARS ? "text-ink" : "text-dim"}`}>
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase">
            {stars === MAX_FAMILIAR_STARS ? "11★ effect" : "Unlocks at 11★"}
          </span>
          <span>{familiar.special}</span>
        </div>
      ) : null}
    </SideDialog>
  );
}
