"use client";

import Image from "next/image";
import { useState } from "react";
import constellationData from "@/data/optimizer/constellation.json";
import {
  constellationTotals,
  MATCHING_STAR,
  matchingStarName,
  NO_STAR,
  nodeBuff,
  nodeStar,
  OTHER_STAR,
  signOpen,
  starEnergy,
  type Constellation,
} from "@/lib/game/constellation";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue } from "./data";

type ArtEntry = { icon: string; iconSize: number };
const DATA = constellationData as unknown as Constellation & { art: Record<string, ArtEntry> };

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const BUTTON =
  "rounded-md border border-ink/25 px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-dim uppercase outline-none hover:border-ink/60 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring";
const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";

/** The workbook's nebula art per element ("geen" is the sheet's spelling). */
const NEBULA: Record<string, string> = { Fire: "red-nebula", Water: "blue-nebula", Wind: "geen-nebula", Earth: "yellow-nebula" };
const ELEMENT_TEXT: Record<string, string> = {
  Fire: "text-element-fire",
  Water: "text-element-water",
  Wind: "text-element-wind",
  Earth: "text-element-earth",
};

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const artOf = (stem: string | null | undefined) => (stem ? DATA.art[stem] : undefined);

function Art({ stem, className, alt = "" }: { stem: string | null | undefined; className: string; alt?: string }) {
  const art = artOf(stem);
  return art ? (
    <Image src={art.icon} alt={alt} width={art.iconSize} height={art.iconSize} draggable={false} className={`shrink-0 object-contain ${className}`} />
  ) : (
    <span className={`shrink-0 ${className}`} />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 p-2">
      <dt className="font-mono text-[10px] text-dim uppercase">{label}</dt>
      <dd className="font-mono text-sm text-ink tabular-nums">{value}</dd>
    </div>
  );
}

export function ConstellationTab() {
  const { profile, updateCharacter } = useProfile();
  const stars = profile.character.constellation;
  const [selected, setSelected] = useState(DATA.signs[0]?.name ?? "");

  const totals = constellationTotals(DATA, stars);
  const { current, next } = totals;
  const summary = totals.signs.find((s) => s.sign.name === selected) ?? totals.signs[0];
  const sign = summary.sign;
  const progress = next ? (totals.placed - current.starsNeeded) / Math.max(1, next.starsNeeded - current.starsNeeded) : 1;

  const setStars = (change: (stars: Record<string, number>) => Record<string, number>) =>
    updateCharacter((c) => ({ ...c, constellation: change(c.constellation) }));
  const setStar = (id: number, star: number) =>
    setStars((all) => {
      const nextStars = { ...all };
      if (star === NO_STAR) delete nextStars[id];
      else nextStars[id] = star;
      return nextStars;
    });
  const fill = (ids: number[], star: number) =>
    setStars((all) => {
      const nextStars = { ...all };
      for (const id of ids) {
        if (star === NO_STAR) delete nextStars[id];
        else nextStars[id] = star;
      }
      return nextStars;
    });
  const allIds = DATA.signs.flatMap((s) => s.nodes.map((node) => node.id));
  const open = signOpen(sign, current.level);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ink/15 p-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">
              Constellation of Light <span className="font-mono tabular-nums">Lv. {current.level}</span>
            </span>
            <span className={LABEL}>{next ? `${totals.placed} / ${next.starsNeeded} stars` : `${totals.placed} stars · max level`}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-ink/10"
            role="progressbar"
            aria-label="Progress to next constellation level"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
        </div>
        <div className="flex gap-1.5">
          <button type="button" className={BUTTON} onClick={() => fill(allIds, MATCHING_STAR)}>
            Complete all
          </button>
          <button type="button" className={BUTTON} onClick={() => fill(allIds, NO_STAR)}>
            Clear
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Stat label="Extra ATK" value={`+${formatValue(current.extraAtk)}%`} />
        <Stat label="Extra HP" value={`+${formatValue(current.extraHp)}%`} />
        <Stat label="Extra HP Recovery" value={`+${formatValue(current.extraHpRecovery)}%`} />
        <Stat label="Crafting time" value={`-${formatValue(current.craftingTimeReduced)}%`} />
        <Stat label="Class level cap" value={`+${formatValue(current.classLevelCap)}`} />
      </dl>

      {/* The zodiac circle around the selected sign's galaxy */}
      <div className="relative mx-auto aspect-square w-full max-w-[26rem] overflow-hidden rounded-lg bg-[radial-gradient(circle_at_center,#1e1b4b_0%,#0b0a1a_55%,#030307_100%)]">
        <div className="absolute inset-[27%] flex items-center justify-center">
          <Art stem={NEBULA[sign.element]} className="absolute size-full opacity-90" />
          <Art stem={sign.icon} className="relative size-3/4 opacity-40 mix-blend-screen" alt="" />
        </div>
        <div className="absolute inset-[12%] rounded-full border border-white/10" />
        <p className="absolute inset-x-0 top-[47%] text-center font-mono text-[11px] tracking-[0.12em] text-white/90 uppercase drop-shadow">
          {sign.name}
        </p>
        {totals.signs.map(({ sign: s, placed, complete }, index) => {
          const angle = (index / totals.signs.length) * 2 * Math.PI - Math.PI / 2;
          const x = 50 + Math.cos(angle) * 38;
          const y = 50 + Math.sin(angle) * 38;
          const isOpen = signOpen(s, current.level);
          const isSelected = s.name === sign.name;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => setSelected(s.name)}
              aria-pressed={isSelected}
              aria-label={`${s.name}: ${placed} of ${s.nodes.length} stars${isOpen ? "" : `, opens at level ${s.unlockLevel}`}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              className={`absolute flex size-[16%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                isSelected ? "border-white bg-white/15" : "border-white/15 bg-black/40 hover:border-white/50"
              }`}
            >
              <Art
                stem={s.icon}
                className={`size-3/4 ${complete ? "drop-shadow-[0_0_6px_#fde68a]" : isOpen ? "opacity-80" : "opacity-25 grayscale"}`}
              />
              <span className="absolute -bottom-3.5 font-mono text-[9px] whitespace-nowrap text-white/80 tabular-nums">
                {isOpen ? `${placed}/${s.nodes.length}` : `Lv. ${s.unlockLevel}`}
              </span>
            </button>
          );
        })}
      </div>

      <section className="flex flex-col gap-2 rounded-lg border border-ink/15 p-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">
            {sign.name} <span className={`font-mono text-[11px] ${ELEMENT_TEXT[sign.element] ?? ""}`}>{sign.element}</span>
          </h3>
          <div className="flex gap-1.5">
            <button
              type="button"
              className={BUTTON}
              disabled={!open}
              onClick={() => fill(sign.nodes.map((node) => node.id), MATCHING_STAR)}
            >
              Fill matching stars
            </button>
            <button type="button" className={BUTTON} onClick={() => fill(sign.nodes.map((node) => node.id), NO_STAR)}>
              Clear sign
            </button>
          </div>
        </header>
        {!open ? <p className="text-xs text-dim">Opens at Constellation Lv. {sign.unlockLevel}.</p> : null}
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Star energy" value={formatValue(summary.energy)} />
          <Stat label={`Amplify ${sign.element} DMG`} value={`+${formatValue(summary.amplify)}%`} />
          <Stat label="Promotion ATK/HP" value={`+${formatValue(summary.promotion)}%`} />
          <Stat label="Engraved star effect" value={`+${formatValue(summary.engraved)}%`} />
        </dl>
        {!summary.complete ? (
          <p className={LABEL}>
            {summary.placed} / {sign.nodes.length} stars · completion effects apply once every star is placed
          </p>
        ) : null}
        <fieldset disabled={!open} className="flex flex-col gap-1 disabled:opacity-60">
          <legend className="sr-only">{sign.name} stars</legend>
          {sign.nodes.map((node) => {
            const star = nodeStar(stars, node);
            const buff = nodeBuff(node, star === NO_STAR ? MATCHING_STAR : star, summary.engraved);
            return (
              <div key={node.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-ink/10 p-1.5">
                <span className="flex size-8 items-center justify-center rounded bg-zinc-950">
                  <Art
                    stem={`star-of-${slugOf(node.element)}-${slugOf(node.size)}`}
                    className={`size-7 ${star === NO_STAR ? "opacity-30 grayscale" : star === OTHER_STAR ? "opacity-60" : ""}`}
                  />
                </span>
                <div className="min-w-32 flex-1">
                  <p className="text-xs leading-tight font-medium">
                    <Art stem={slugOf(node.buff)} className="mr-1 inline-block size-4 align-[-3px]" />
                    <span className="whitespace-nowrap">
                      {node.buff} +{formatValue(buff)}%
                    </span>{" "}
                    <span className="font-normal text-dim">· {node.appliesTo}</span>
                  </p>
                  <p className={LABEL}>
                    #{node.number} {node.size} · {formatValue(starEnergy(node, star))} energy
                    {star === NO_STAR ? ` (${formatValue(node.energy * 5)} with ${matchingStarName(node)})` : ""}
                  </p>
                </div>
                <select
                  aria-label={`${sign.name} star ${node.number}`}
                  value={star}
                  onChange={(event) => setStar(node.id, Number(event.target.value))}
                  className={`${SELECT} max-w-full`}
                >
                  <option value={NO_STAR}>None</option>
                  <option value={OTHER_STAR}>Other star</option>
                  <option value={MATCHING_STAR}>{matchingStarName(node)}</option>
                </select>
              </div>
            );
          })}
        </fieldset>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className={LABEL}>Constellation totals</h3>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {["Fire", "Water", "Wind", "Earth"].map((element) => (
            <Stat key={element} label={`Amplify ${element} DMG`} value={`+${formatValue(totals.amplify[element] ?? 0)}%`} />
          ))}
          <Stat label="Promotion ATK/HP" value={`+${formatValue(totals.promotion)}%`} />
        </dl>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {totals.buffs.map((buff) => (
            <li key={`${buff.buff}-${buff.appliesTo}`} className="flex items-center gap-2 rounded-md border border-ink/10 px-2 py-1">
              <span className="rounded bg-zinc-900 p-0.5">
                <Art stem={slugOf(buff.buff)} className="size-5" />
              </span>
              <span className="flex-1 text-xs">
                {buff.buff} <span className="text-dim">· {buff.appliesTo}</span>
              </span>
              <span className="font-mono text-xs tabular-nums">+{formatValue(buff.value)}%</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
