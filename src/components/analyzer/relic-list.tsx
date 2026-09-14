"use client";

import { useState } from "react";
import { bandAt, relicBuff, type Band } from "@/lib/game/formulas";
import { relicLevel } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import { formatPercent, formatValue, RELICS, type Relic } from "./data";
import { InlineLevel, LevelInput } from "./level-input";
import { Sprite } from "./sprite";

const MAX_RELIC_LEVEL = Math.max(...RELICS.map((relic) => relic.maxLevel));

const bandLabel = (band: Band) => (band.to === null ? `${band.from}+` : `${band.from}-${band.to}`);

function RelicRow({
  relic,
  level,
  onLevelChange,
}: {
  relic: Relic;
  level: number;
  onLevelChange: (level: number) => void;
}) {
  const active = level > 0 ? bandAt(relic.bands, level) : null;

  return (
    <article
      className={`flex items-start gap-3 rounded-lg border border-ink/15 p-3 transition-opacity hover:border-ink/40 ${level === 0 ? "opacity-55" : ""}`}
    >
      {relic.icon && relic.iconSize ? (
        <Sprite
          src={relic.icon}
          native={relic.iconSize}
          size={64}
          className="rounded-md border border-ink/15"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h3 className="text-sm leading-tight font-medium">
            {relic.name}{" "}
            <span className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
              Max {relic.maxLevel}
            </span>
          </h3>
          <InlineLevel
            value={level}
            min={0}
            max={relic.maxLevel}
            name={relic.name}
            onChange={onLevelChange}
          />
        </header>

        <p className="font-mono text-xs text-element-earth tabular-nums">
          {level === 0
            ? "Not owned"
            : `${relic.buff} + ${(relic.percent ? formatPercent : formatValue)(relicBuff(relic.bands, level, relic.percent))}`}
        </p>

        <dl className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
          {relic.bands.map((band) => (
            <div
              key={band.from}
              className={`flex gap-1 ${band === active ? "font-bold text-ink" : ""}`}
            >
              <dt>Lv {bandLabel(band)}</dt>
              <dd className="text-ink">
                {relic.percent
                  ? `${(band.factor * 100).toLocaleString("en", { maximumFractionDigits: 2 })}%`
                  : band.factor.toLocaleString("en", { maximumFractionDigits: 2 })}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

export function RelicList() {
  const { profile, setRelicLevel, setAllRelicLevels } = useProfile();
  const [allLevel, setAllLevel] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      <LevelInput
        value={allLevel}
        min={0}
        max={MAX_RELIC_LEVEL}
        label="Set every relic"
        onChange={(level) => {
          setAllLevel(level);
          setAllRelicLevels(RELICS, level);
        }}
      />

      <div className="flex flex-col gap-2">
        {RELICS.map((relic) => (
          <RelicRow
            key={relic.id}
            relic={relic}
            level={relicLevel(profile, relic.name, relic.maxLevel)}
            onLevelChange={(level) => setRelicLevel(relic.name, level, relic.maxLevel)}
          />
        ))}
      </div>

      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Level 0 means not owned. Buff = level x the per-level factor of the
        band that level falls in; the band in use is bold. Levels are saved in
        this browser.
      </p>
    </div>
  );
}
