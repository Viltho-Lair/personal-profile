"use client";

import { useState } from "react";
import {
  COMPANION_SOURCE,
  COMPANIONS,
  passiveKey,
  PROMOTION,
  skillKey,
  type Companion,
} from "./companions";
import { formatValue } from "./equipment";
import { InlineLevel } from "./level-input";
import { Sprite } from "./sprite";
import { ELEMENT_BORDER, ELEMENT_TEXT, TIER_TEXT } from "./tiers";
import { useLevels } from "./use-levels";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";

function CompanionCard({
  companion,
  levelFor,
  setLevel,
}: {
  companion: Companion;
  levelFor: (id: number) => number;
  setLevel: (id: number, level: number) => void;
}) {
  const elementText = companion.element
    ? (ELEMENT_TEXT[companion.element] ?? "text-dim")
    : "text-dim";
  const elementBorder = companion.element
    ? (ELEMENT_BORDER[companion.element] ?? "border-ink/20")
    : "border-ink/20";
  const { passive } = companion;

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-ink/15 p-3 transition-colors hover:border-ink/40">
      <header className="flex items-center gap-3">
        {companion.portrait ? (
          <div
            className={`shrink-0 overflow-hidden rounded-md border bg-ink/[0.04] ${elementBorder}`}
          >
            <Sprite src={companion.portrait} native={128} size={128} />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <p
            className={`font-mono text-[10px] tracking-[0.08em] uppercase ${elementText}`}
          >
            {[companion.element, companion.className]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h3 className="text-base leading-tight font-medium">
            {companion.name}
          </h3>
          {companion.specialty ? (
            <p className="text-xs leading-snug text-dim">
              {companion.specialty}
            </p>
          ) : null}
        </div>
      </header>

      <section className="flex flex-col gap-2 border-t border-ink/10 pt-3">
        <h4 className={LABEL}>Skills</h4>
        {companion.skills.map((skill, index) => {
          const key = skillKey(companion, index);
          return (
            <div key={skill.name} className="flex items-center gap-2.5">
              {skill.icon ? (
                <Sprite
                  src={skill.icon}
                  native={64}
                  size={32}
                  className="rounded border border-ink/15"
                />
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs leading-tight">
                  {skill.name}
                </span>
                <span className="truncate font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
                  {skill.effect}
                </span>
              </div>
              <InlineLevel
                value={levelFor(key)}
                min={0}
                max={skill.maxLevel}
                onChange={(value) => setLevel(key, value)}
                name={`${companion.name} ${skill.name}`}
              />
            </div>
          );
        })}
      </section>

      {passive.name && passive.maxLevel ? (
        <section className="flex flex-col gap-1.5 border-t border-ink/10 pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <h4 className={LABEL}>Passive</h4>
              <span className="truncate text-xs leading-tight">
                {passive.name}
              </span>
            </div>
            <InlineLevel
              value={levelFor(passiveKey(companion))}
              min={0}
              max={passive.maxLevel}
              onChange={(value) => setLevel(passiveKey(companion), value)}
              name={`${companion.name} ${passive.name}`}
            />
          </div>
          <dl className="grid gap-y-0.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
            <div className="flex items-baseline justify-between gap-2">
              <dt>Stones to max</dt>
              <dd className="text-ink">{formatValue(passive.stoneCost)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt>Emeralds to max</dt>
              <dd className="text-ink">{formatValue(passive.emeraldCost)}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {companion.lockedSkills.length > 0 ? (
        <section className="mt-auto flex flex-col gap-1 border-t border-ink/10 pt-3">
          <h4 className={LABEL}>Unlocks later</h4>
          <ul className="flex flex-col gap-0.5 text-xs leading-snug text-dim">
            {companion.lockedSkills.map((skill) => (
              <li key={skill.name}>{skill.name}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

/** Page rows multiply the rolled value, so 1.5x can land on a half. */
function scaled(value: number, multiplier: number) {
  return Math.round(value * multiplier * 10) / 10;
}

function PromotionTable() {
  const [page, setPage] = useState(PROMOTION.pages[0]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Promotion options</h3>
          <p className="text-xs leading-snug text-dim">
            Dice roll a random option at a random tier into each slot.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Option page"
          className="flex gap-1.5"
        >
          {PROMOTION.pages.map((entry) => (
            <button
              key={entry.page}
              type="button"
              role="radio"
              aria-checked={entry.page === page.page}
              onClick={() => setPage(entry)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] tracking-[0.06em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                entry.page === page.page
                  ? "border-ink bg-ink text-ground"
                  : "border-ink/25 text-dim hover:text-ink"
              }`}
            >
              Page {entry.page} · {entry.multiplier}x
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-ink/15">
        <table className="w-full min-w-[34rem] font-mono text-[11px] tabular-nums">
          <thead>
            <tr className="border-b border-ink/15">
              <th
                scope="col"
                className="px-3 py-2 text-left text-[10px] font-normal tracking-[0.08em] text-dim uppercase"
              >
                Option
              </th>
              {PROMOTION.tiers.map((tier) => (
                <th
                  key={tier.rarity}
                  scope="col"
                  className={`px-3 py-2 text-right text-[10px] font-normal tracking-[0.08em] uppercase ${TIER_TEXT[tier.rarity] ?? "text-dim"}`}
                >
                  <span className="block">{tier.rarity}</span>
                  <span className="block text-dim">{tier.probability}%</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROMOTION.options.map((option) => (
              <tr
                key={option.name}
                className="border-b border-ink/10 last:border-0"
              >
                <th
                  scope="row"
                  className="px-3 py-1.5 text-left font-sans text-xs font-normal"
                >
                  {option.name}
                </th>
                {option.values.map((value, index) => (
                  <td key={index} className="px-3 py-1.5 text-right">
                    {scaled(value, page.multiplier)}
                    {option.percent ? "%" : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        {COMPANIONS[0]?.promotionSlots ?? 7} slots per companion. More pages
        open through advancement battles, and their rows count at the page
        multiplier.
        {PROMOTION.maxRollDice
          ? ` From Ether promotion, ${PROMOTION.maxRollDice.toLocaleString("en")} dice sets every option to its top tier, permanently.`
          : ""}
      </p>
    </section>
  );
}

export function CompanionPanel() {
  const { levelFor, setLevel } = useLevels("analyzer.companionLevels", 0);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="max-w-[60ch] text-xs leading-snug text-dim">
          One companion per element. Skills level to 100 and passives to 1500
          with attribute stones and emeralds. Your levels are saved in this
          browser.
        </p>
        <a
          href={COMPANION_SOURCE.url}
          target="_blank"
          rel="noreferrer noopener"
          className="hidden shrink-0 font-mono text-[10px] tracking-[0.06em] text-dim uppercase underline-offset-4 hover:text-ink hover:underline lg:block"
        >
          Data: Slayer Legend Wiki
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {COMPANIONS.map((companion) => (
          <CompanionCard
            key={companion.id}
            companion={companion}
            levelFor={levelFor}
            setLevel={setLevel}
          />
        ))}
      </div>

      <PromotionTable />

      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        The wiki doesn&apos;t publish skill or passive values per level yet, so
        levels are tracked but not turned into stats.
      </p>
    </div>
  );
}
