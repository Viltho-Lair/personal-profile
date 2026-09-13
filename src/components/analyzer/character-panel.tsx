"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import characterData from "@/data/optimizer/character.json";
import {
  abilityRowOpen,
  awakenedClassName,
  classMaxLevel,
  enhanceMax,
  enhanceStat,
  latentMultiplier,
  latentPerLevel,
  type EnhanceStat,
  type KnowledgeGrade,
  type LatentMultiplier,
} from "@/lib/game/character";
import { awakeningStage, gearEffects } from "@/lib/game/formulas";
import { clampLevel } from "@/lib/profile/rules";
import { ABILITY_SLOTS, LATENT_SLOTS, LATENT_STATS, type CharacterState } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { AWAKENING, formatPercent, formatValue, GEAR_LEVEL_FACTORS } from "./data";
import { InlineLevel } from "./level-input";

type Icon = { icon?: string | null; iconSize?: number | null };

type Promotion = Icon & {
  number: number;
  name: string;
  atkHpBonus: number | null;
  extraAtk: number | null;
  monsterGold: number | null;
  extraExp: number | null;
  extraHp: number | null;
};

const ENHANCE = characterData.enhance as (EnhanceStat & Icon)[];
const KNOWLEDGE = characterData.growingKnowledge as KnowledgeGrade[];
const GROWTH = characterData.growth as ({ key: string; detail: string | null; perLevel: number } & Icon)[];
const LATENT = characterData.latentAwakening as { stats: LatentMultiplier[]; crit: LatentMultiplier[] };
const PROMOTIONS = characterData.promotions as Promotion[];
const ABILITY_OPTIONS = characterData.abilityOptions as { name: string; values: number[] }[];
const CLASSES = characterData.classes as ({ name: string; multiplier: number } & Icon)[];
const CLASS_ICON = new Map(CLASSES.map((cls) => [cls.name, cls]));

const MAX_LATENT_GRADE = Math.max(...LATENT.stats.map((row) => row.grade)) - 1;
const MAX_CLASS_AWAKENING = 18;
const NO_CAP = 1_000_000_000;

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";
const pct = (fraction: number | null) =>
  fraction === null ? "—" : `${(fraction * 100).toLocaleString("en", { maximumFractionDigits: 2 })}%`;

function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <nav aria-label={label} className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-ink/15 px-3 py-2 [scrollbar-width:none] sm:px-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-pressed={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`rounded-md border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.08em] whitespace-nowrap uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xs ${
            active === tab.id ? "border-ink bg-ink text-ground" : "border-ink/25 text-dim hover:border-ink/60 hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function Split({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid h-full min-h-0 grid-cols-2">
      <div className="min-h-0 overflow-auto border-r border-ink/15 p-3 sm:p-4">{left}</div>
      <div className="flex min-h-0 flex-col overflow-hidden">{right}</div>
    </div>
  );
}

function Missing({ what }: { what: string }) {
  return (
    <p className="rounded-md border border-dashed border-ink/25 p-3 text-xs leading-snug text-dim">
      Not in the Master Optimizer workbook yet: {what}. There&apos;s nothing to set here until that data is added.
    </p>
  );
}

function Art({ item, className = "size-8" }: { item: Icon | undefined; className?: string }) {
  return item?.icon && item.iconSize ? (
    <Image
      src={item.icon}
      alt=""
      width={item.iconSize}
      height={item.iconSize}
      draggable={false}
      className={`shrink-0 object-contain ${className}`}
    />
  ) : (
    <span className={`shrink-0 ${className}`} />
  );
}

function useCharacter() {
  const { profile, updateCharacter } = useProfile();
  return { character: profile.character, set: updateCharacter };
}

/* ---------------------------------------------------------------- Enhance */

function EnhanceSection() {
  const { character, set } = useCharacter();
  const knowledge = KNOWLEDGE[character.growingKnowledge];
  const superhuman = KNOWLEDGE[character.superhuman];
  const critLevel = character.enhance["CRIT %"] ?? 0;

  const left = (
    <ul className="flex flex-col gap-1.5">
      {ENHANCE.map((stat) => {
        const max = enhanceMax(stat, critLevel, knowledge, superhuman);
        const level = clampLevel(character.enhance[stat.name] ?? 0, max);
        const locked = stat.requiresCrit !== undefined && critLevel < stat.requiresCrit;
        return (
          <li key={stat.name} className={`flex items-center justify-between gap-3 rounded-md border border-ink/10 p-2 ${locked ? "opacity-60" : ""}`}>
            <Art item={stat} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight font-medium">
                {stat.name}{" "}
                <span className="text-xs font-normal text-ink tabular-nums">
                  {(() => {
                    const { value, perLevel } = enhanceStat(stat.formula, level);
                    const show = stat.formula.kind === "percent" ? pct : (n: number) => formatValue(n);
                    return `+${show(value)} (+${show(perLevel)} per level)`;
                  })()}
                </span>
              </p>
              <p className={LABEL}>
                {locked ? `Opens at CRIT % ${stat.requiresCrit}` : `Max ${formatValue(max)}`}
              </p>
            </div>
            <InlineLevel
              wide
              value={level}
              min={0}
              max={max}
              name={`Enhance ${stat.name}`}
              onChange={(value) =>
                set((c) => ({ ...c, enhance: { ...c.enhance, [stat.name]: clampLevel(value, max) } }))
              }
            />
          </li>
        );
      })}
    </ul>
  );

  const gradeSelect = (label: string, key: "growingKnowledge" | "superhuman", detail: (grade: KnowledgeGrade) => string) => (
    <label className="flex flex-col gap-1">
      <span className={LABEL}>{label}</span>
      <select
        value={character[key]}
        onChange={(event) => set((c) => ({ ...c, [key]: Number(event.target.value) }))}
        className={SELECT}
      >
        {KNOWLEDGE.map((grade, index) => (
          <option key={grade.grade} value={index}>
            {grade.grade} · {detail(grade)}
          </option>
        ))}
      </select>
    </label>
  );

  const right = (
    <div className="flex min-h-0 flex-col gap-4 overflow-auto p-3 sm:p-4">
      {gradeSelect("Growing Knowledge", "growingKnowledge", (g) => `ATK +${formatValue(g.atk)} · DS cap ${formatValue(g.maxDeathStrike)}`)}
      {gradeSelect("Superhuman", "superhuman", (g) => `+${formatValue(g.superhuman)} DS levels`)}
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
        <dt className="text-dim">Growing Knowledge ATK effect</dt>
        <dd className="text-right text-ink tabular-nums">+{formatValue(knowledge?.atk ?? 0)}</dd>
        <dt className="text-dim">Death Strike cap</dt>
        <dd className="text-right text-ink tabular-nums">
          {critLevel >= 1000 ? formatValue((knowledge?.maxDeathStrike ?? 0) + (superhuman?.superhuman ?? 0)) : "CRIT % 1000 first"}
        </dd>
      </dl>
      <Missing what="Strength, Iron Body and Strong Heart grades" />
    </div>
  );

  return <Split left={left} right={right} />;
}

/* ---------------------------------------------------------------- Growth */

const rawBase = (key: string, perLevel: number) => (key === "LUK" ? perLevel * 100 : perLevel);

function latentTotals(character: CharacterState) {
  const { grade, level } = character.latentAwakening;
  return Object.fromEntries(
    GROWTH.filter((stat) => (LATENT_STATS as readonly string[]).includes(stat.key)).map((stat) => {
      const sum = (character.latent[stat.key] ?? []).reduce((a, b) => a + b, 0);
      const perLevel = latentPerLevel(stat.key, rawBase(stat.key, stat.perLevel), character.slayerLevel, sum);
      const multiplier = latentMultiplier(stat.key === "CRI" ? LATENT.crit : LATENT.stats, grade, level);
      const growthLevel = character.growth[stat.key] ?? 0;
      const divisor = stat.key === "CRI" || stat.key === "LUK" ? 100 : 1;
      return [stat.key, { perLevel: perLevel * multiplier, total: (perLevel * multiplier * growthLevel) / divisor, sum }];
    }),
  ) as Record<string, { perLevel: number; total: number; sum: number }>;
}

function LatentPower() {
  const { character, set } = useCharacter();
  const totals = latentTotals(character);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2">
        <span className={LABEL}>Slayer level</span>
        <InlineLevel
              wide
          value={character.slayerLevel}
          min={1}
          max={NO_CAP}
          name="Slayer level"
          onChange={(value) => set((c) => ({ ...c, slayerLevel: clampLevel(value, null) || 1 }))}
        />
      </label>
      <p className="text-[11px] leading-snug text-dim">
        Latent Power adds to growth once the slayer is past level 250. Enter each slot&apos;s rolled value.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[10px] uppercase">
          <thead>
            <tr className="text-dim">
              <th className="py-1 text-left">Stat</th>
              {["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"].slice(0, LATENT_SLOTS).map((slot) => (
                <th key={slot} className="py-1">{slot}</th>
              ))}
              <th className="py-1 text-right">Sum</th>
            </tr>
          </thead>
          <tbody>
            {LATENT_STATS.map((stat) => (
              <tr key={stat} className="border-t border-ink/10">
                <td className="py-1 text-ink">{stat}</td>
                {(character.latent[stat] ?? []).map((value, slot) => (
                  <td key={slot} className="px-0.5 py-1">
                    <input
                      type="number"
                      min={0}
                      value={value}
                      aria-label={`${stat} latent slot ${slot + 1}`}
                      onChange={(event) => {
                        const next = Math.max(0, event.target.valueAsNumber || 0);
                        set((c) => ({
                          ...c,
                          latent: { ...c.latent, [stat]: (c.latent[stat] ?? []).map((v, i) => (i === slot ? next : v)) },
                        }));
                      }}
                      className="w-12 rounded border border-ink/20 bg-transparent px-1 py-0.5 text-right text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink"
                    />
                  </td>
                ))}
                <td className="py-1 text-right text-ink tabular-nums">{formatValue(totals[stat]?.sum ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>Awakened grade</span>
          <select
            value={character.latentAwakening.grade}
            onChange={(event) => set((c) => ({ ...c, latentAwakening: { ...c.latentAwakening, grade: Number(event.target.value) } }))}
            className={SELECT}
          >
            {Array.from({ length: MAX_LATENT_GRADE + 1 }, (_, g) => (
              <option key={g} value={g}>
                {g === 0 ? "Not awakened" : `Grade ${g}`}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className={LABEL}>Level / stars</span>
          <select
            value={character.latentAwakening.level}
            onChange={(event) => set((c) => ({ ...c, latentAwakening: { ...c.latentAwakening, level: Number(event.target.value) } }))}
            className={SELECT}
          >
            {[0, 1, 2, 3, 4, 5].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-[11px] leading-snug text-dim">
        The Sealed Shrine statue growth bonus isn&apos;t included yet.
      </p>
    </div>
  );
}

function GrowthSection() {
  const { character, set } = useCharacter();
  const [tab, setTab] = useState<"diary" | "latent">("latent");
  const totals = latentTotals(character);

  const left = (
    <ul className="flex flex-col gap-1.5">
      {GROWTH.map((stat) => {
        const level = character.growth[stat.key] ?? 0;
        const latent = totals[stat.key];
        return (
          <li key={stat.key} className="flex items-center justify-between gap-3 rounded-md border border-ink/10 p-2">
            <Art item={stat} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight font-medium">
                {stat.key} <span className="text-xs font-normal text-dim">{stat.detail}</span>
              </p>
              <p className={LABEL}>
                Base +{formatValue(level * stat.perLevel)}
                {latent ? ` · with latent +${formatValue(latent.total)}` : ""}
              </p>
            </div>
            <InlineLevel
              wide
              value={level}
              min={0}
              max={NO_CAP}
              name={`Growth ${stat.key}`}
              onChange={(value) => set((c) => ({ ...c, growth: { ...c.growth, [stat.key]: clampLevel(value, null) } }))}
            />
          </li>
        );
      })}
    </ul>
  );

  const right = (
    <>
      <Tabs
        label="Growth settings"
        tabs={[
          { id: "diary", label: "Training Diary" },
          { id: "latent", label: "Latent Power" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
        {tab === "diary" ? <Missing what="The Training Diary" /> : <LatentPower />}
      </div>
    </>
  );

  return <Split left={left} right={right} />;
}

/* ---------------------------------------------------------------- Promotion */

function ClassesTab() {
  const { character, set } = useCharacter();
  const max = classMaxLevel(character.classAwakening);
  const blastMultiplier = AWAKENING[character.classAwakening]?.blastMultiplier ?? 1;

  return (
    <div className="flex flex-col gap-3">
      <p className={LABEL}>
        All classes: max level {max} (200 + 50 per Blast awakening)
      </p>
      <ul className="flex flex-col gap-1">
        {CLASSES.map((cls, index) => {
          const isLast = index === CLASSES.length - 1;
          if (index >= CLASSES.length - 4 && !isLast) return null; // Blast, Tera, Seed and Nova are one class that awakens
          const displayName = isLast ? awakenedClassName(character.classAwakening) : cls.name;
          const art = isLast ? CLASS_ICON.get(displayName) : cls;
          const state = character.classes[cls.name] ?? { owned: false, level: 0 };
          const level = clampLevel(state.level, max);
          const effects = gearEffects(cls.multiplier, GEAR_LEVEL_FACTORS, level, isLast ? blastMultiplier : 1);
          const equipped = character.equippedClass === cls.name;
          const setState = (next: { owned?: boolean; level?: number }) =>
            set((c) => ({
              ...c,
              classes: { ...c.classes, [cls.name]: { ...(c.classes[cls.name] ?? { owned: false, level: 0 }), ...next } },
            }));
          return (
            <li key={cls.name} className={`flex flex-wrap items-center gap-2 rounded-md border p-1.5 ${equipped ? "border-ink" : "border-ink/10"} ${state.owned ? "" : "opacity-60"}`}>
              <Art item={art} className="size-8" />
              <span className="w-24 truncate text-xs font-medium">{displayName}</span>
              <label className="flex items-center gap-1 font-mono text-[10px] text-dim uppercase">
                <input
                  type="checkbox"
                  checked={state.owned}
                  onChange={(event) => setState({ owned: event.target.checked })}
                  aria-label={`${displayName} owned`}
                  className="size-3.5 accent-ink"
                />
                Owned
              </label>
              <InlineLevel value={level} min={0} max={max} name={displayName} onChange={(value) => setState({ level: clampLevel(value, max), owned: state.owned || value > 0 })} />
              <button
                type="button"
                aria-pressed={equipped}
                aria-label={`Equip ${displayName}`}
                onClick={() => set((c) => ({ ...c, equippedClass: equipped ? null : cls.name }))}
                className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase ${equipped ? "border-ink bg-ink text-ground" : "border-ink/25 text-dim hover:text-ink"}`}
              >
                {equipped ? "Equipped" : "Equip"}
              </button>
              <span className="ml-auto font-mono text-[10px] text-dim tabular-nums">
                Equip {formatPercent(effects.equip)} · Owned {formatPercent(effects.owned)}
              </span>
              {isLast ? (
                <div className="flex w-full flex-wrap items-center gap-2 border-t border-ink/10 pt-1.5">
                  <label className="flex items-center gap-1.5">
                    <span className={LABEL}>Awakening</span>
                    <select
                      aria-label="Blast awakening"
                      value={character.classAwakening}
                      onChange={(event) => set((c) => ({ ...c, classAwakening: Number(event.target.value) }))}
                      className={SELECT}
                    >
                      {Array.from({ length: MAX_CLASS_AWAKENING + 1 }, (_, n) => (
                        <option key={n} value={n}>
                          {n} · {awakenedClassName(n)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span aria-hidden className="font-mono text-[11px] leading-none text-tier-legendary">
                    {"★".repeat(awakeningStage(character.classAwakening).stars)}
                    <span className="text-ink/20">{"★".repeat(5 - awakeningStage(character.classAwakening).stars)}</span>
                  </span>
                  <span className="font-mono text-[10px] text-dim tabular-nums">
                    Equip multiplier ×{formatValue(blastMultiplier)}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AbilityTab() {
  const { character, set } = useCharacter();
  const totals = new Map<string, number>();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] leading-snug text-dim">
        Rows open as your promotion passes them. Pick each row&apos;s option, rolled value and its multiplier (×1 to ×4).
      </p>
      <ul className="flex flex-col gap-1.5">
        {character.abilities.slice(0, ABILITY_SLOTS).map((roll, row) => {
          const open = abilityRowOpen(character.promotion, row);
          const option = ABILITY_OPTIONS.find((o) => o.name === roll.option);
          const effective = open && roll.value !== null ? roll.value * roll.multiplier : null;
          if (effective !== null && roll.option) totals.set(roll.option, (totals.get(roll.option) ?? 0) + effective);
          const setRoll = (next: Partial<typeof roll>) =>
            set((c) => ({ ...c, abilities: c.abilities.map((r, i) => (i === row ? { ...r, ...next } : r)) }));
          return (
            <li key={row} className={`flex flex-wrap items-center gap-1.5 rounded-md border border-ink/10 p-1.5 ${open ? "" : "opacity-50"}`}>
              <span className="w-12 font-mono text-[10px] text-dim uppercase">{open ? `Row ${row + 1}` : "Locked"}</span>
              <select aria-label={`Ability row ${row + 1} option`} value={roll.option ?? ""} onChange={(e) => setRoll({ option: e.target.value || null, value: null })} className={SELECT}>
                <option value="">—</option>
                {ABILITY_OPTIONS.map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>
              <select aria-label={`Ability row ${row + 1} value`} value={roll.value ?? ""} disabled={!option} onChange={(e) => setRoll({ value: e.target.value === "" ? null : Number(e.target.value) })} className={SELECT}>
                <option value="">—</option>
                {option?.values.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select aria-label={`Ability row ${row + 1} multiplier`} value={roll.multiplier} onChange={(e) => setRoll({ multiplier: Number(e.target.value) })} className={SELECT}>
                {[1, 2, 3, 4].map((m) => (
                  <option key={m} value={m}>
                    ×{m}
                  </option>
                ))}
              </select>
              <span className="ml-auto font-mono text-[11px] text-ink tabular-nums">{effective === null ? "—" : `+${formatValue(effective)}`}</span>
            </li>
          );
        })}
      </ul>
      {totals.size > 0 ? (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 rounded-md bg-ink/[0.04] p-2 font-mono text-[10px] uppercase">
          {[...totals].map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="text-dim">{name}</dt>
              <dd className="text-right text-ink tabular-nums">+{formatValue(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function PromotionSection() {
  const { character, set } = useCharacter();
  const [tab, setTab] = useState<"classes" | "ability" | "memory" | "constellation">("classes");

  const left = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[26rem] font-mono text-[10px] uppercase">
        <thead>
          <tr className="text-dim">
            <th className="py-1 text-left">Promotion</th>
            <th className="py-1 text-right">ATK/HP ×</th>
            <th className="py-1 text-right">Extra ATK</th>
            <th className="py-1 text-right">Extra HP</th>
            <th className="py-1 text-right">Extra EXP</th>
          </tr>
        </thead>
        <tbody>
          {[{ number: 0, name: "None", atkHpBonus: null, extraAtk: null, extraExp: null, extraHp: null, monsterGold: null } as Promotion, ...PROMOTIONS].map((promotion) => {
            const current = character.promotion === promotion.number;
            return (
              <tr
                key={promotion.number}
                onClick={() => set((c) => ({ ...c, promotion: promotion.number }))}
                className={`cursor-pointer border-t border-ink/10 ${current ? "bg-ink/[0.08] text-ink" : "text-dim hover:text-ink"}`}
              >
                <td className="py-1">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input type="radio" name="promotion" checked={current} onChange={() => set((c) => ({ ...c, promotion: promotion.number }))} className="accent-ink" />
                    <Art item={promotion} className="size-6" />
                    {promotion.number ? `${promotion.number}. ` : ""}
                    {promotion.name}
                  </label>
                </td>
                <td className="py-1 text-right tabular-nums">{promotion.atkHpBonus === null ? "—" : formatValue(promotion.atkHpBonus)}</td>
                <td className="py-1 text-right tabular-nums">{pct(promotion.extraAtk)}</td>
                <td className="py-1 text-right tabular-nums">{pct(promotion.extraHp)}</td>
                <td className="py-1 text-right tabular-nums">{pct(promotion.extraExp)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const right = (
    <>
      <Tabs
        label="Promotion settings"
        tabs={[
          { id: "classes", label: "Classes" },
          { id: "ability", label: "Slayer Promotion Ability" },
          { id: "memory", label: "Memory Tree" },
          { id: "constellation", label: "Constellation" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
        {tab === "classes" ? (
          <ClassesTab />
        ) : tab === "ability" ? (
          <AbilityTab />
        ) : (
          <p className="text-xs text-dim">
            {tab === "memory" ? "Memory Tree" : "Constellation"} settings are coming next, from the workbook&apos;s{" "}
            {tab === "memory" ? "MEMORY TREE" : "CONSTELLATION"} sheet.
          </p>
        )}
      </div>
    </>
  );

  return <Split left={left} right={right} />;
}

export function CharacterPanel() {
  const [section, setSection] = useState<"enhance" | "growth" | "promotion">("enhance");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs
        label="Character sections"
        tabs={[
          { id: "enhance", label: "Enhance" },
          { id: "growth", label: "Growth" },
          { id: "promotion", label: "Promotion" },
        ]}
        active={section}
        onChange={setSection}
      />
      <div className="min-h-0 flex-1">
        {section === "enhance" ? <EnhanceSection /> : section === "growth" ? <GrowthSection /> : <PromotionSection />}
      </div>
    </div>
  );
}
