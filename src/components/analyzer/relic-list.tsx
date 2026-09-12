"use client";

import Image from "next/image";
import { useState } from "react";
import { RELICS, type Relic } from "./equipment";
import { InlineLevel, LevelInput } from "./level-input";
import { useLevels } from "./use-levels";

const MAX_LEVEL = 100;

/** Parse a band label such as "10-19" or "100" into its bounds. */
function bandBounds(band: string): [number, number] {
  const [from, to] = band.split("-");
  const start = Number(from);
  return [start, to === undefined ? start : Number(to)];
}

/**
 * A relic's buff is its band factor times the level: Strength Gloves at level
 * 100 has factor 22, and the game reads "Extra Dmg + 2200%".
 *
 * The sheet's bands overlap at 70-89 and 80-99, so a level in the 80s matches
 * two of them. First match wins, which keeps the sheet's own order.
 */
function factorAt(relic: Relic, level: number) {
  for (const factor of relic.factors) {
    const [from, to] = bandBounds(factor.band);
    if (level >= from && level <= to) return factor;
  }
  return null;
}

function buffAt(relic: Relic, level: number): number | null {
  const factor = factorAt(relic, level);
  if (!factor || factor.value === null) return null;
  return Math.round(factor.value * level * 100) / 100;
}

function RelicRow({
  relic,
  level,
  onLevelChange,
}: {
  relic: Relic;
  level: number;
  onLevelChange: (level: number) => void;
}) {
  const factor = factorAt(relic, level);
  const buff = buffAt(relic, level);

  return (
    <article className="flex items-start gap-3 rounded-lg border border-ink/15 p-3 transition-colors hover:border-ink/40">
      {relic.icon ? (
        <Image
          src={relic.icon}
          alt=""
          width={128}
          height={128}
          className="size-12 shrink-0 rounded-md border border-ink/15 object-contain"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h3 className="text-sm leading-tight font-medium">{relic.name}</h3>
          <InlineLevel
            value={level}
            max={MAX_LEVEL}
            onChange={onLevelChange}
            name={relic.name}
          />
        </header>

        <p className="font-mono text-xs text-element-earth tabular-nums">
          {relic.buff} + {buff === null ? "—" : buff.toLocaleString("en")}%
        </p>

        <dl className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] tracking-[0.06em] text-dim uppercase">
          {relic.factors.map((entry) => (
            <div
              key={entry.band}
              className={`flex gap-1 ${entry.band === factor?.band ? "text-ink" : ""}`}
            >
              <dt>{entry.band}</dt>
              <dd className={entry.band === factor?.band ? "" : "text-ink"}>
                {entry.value ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

export function RelicList() {
  const { levelFor, setLevel, setAll } = useLevels(
    "analyzer.relicLevels",
    MAX_LEVEL,
  );
  const [allLevel, setAllLevel] = useState(MAX_LEVEL);

  return (
    <div className="flex flex-col gap-3">
      <LevelInput
        value={allLevel}
        max={MAX_LEVEL}
        onChange={(value) => {
          setAllLevel(value);
          setAll(
            RELICS.map((relic) => relic.id),
            value,
          );
        }}
        label="Set every relic"
      />

      <div className="flex flex-col gap-2">
        {RELICS.map((relic) => (
          <RelicRow
            key={relic.id}
            relic={relic}
            level={levelFor(relic.id)}
            onLevelChange={(value) => setLevel(relic.id, value)}
          />
        ))}
      </div>

      <p className="font-mono text-[10px] leading-relaxed tracking-[0.06em] text-dim uppercase">
        Each relic keeps its own level, saved in this browser. Buff = band
        factor x level, and the band in use is highlighted. Levels 80 to 89 sit
        in two bands because the source sheet labels them 70-89 and 80-99; the
        earlier band wins.
      </p>
    </div>
  );
}
