"use client";

import { useMemo } from "react";
import { CHARGE_SECONDS, type FightEvent, type FightState } from "@/lib/game/battle";
import { BASIC_RANGE, createField, FARM_WAVES, type FarmStage, type FieldEnemy, type FieldState } from "@/lib/game/farm";
import type { Element } from "@/lib/game/stats";
import { SKILL_BY_NAME } from "./data";

/**
 * A fight as a small side-on battlefield: stage farming's waves and box, or the one boss or monster of a
 * promotion or stages fight. The floor is laid in one tile per range, so every reach can be read off it; the
 * slayer wears its preset's element, monsters share one horned shape, bosses one crowned brute and the box
 * one chest; skills draw in their element's colour with a bracket on the floor over the range they cover.
 */

const W = 400;
const H = 220;
const GROUND = 158;
/** Range the view spans, and how much of it sits behind the slayer. */
const VIEW = 24;
const BEHIND = 5;
const UNIT = W / VIEW;

const INK = "#eef1f6";
const BONE = "#e8e1cf";
const GOLD = "#d9a441";
const RAVE = "#e14ce8";

/** Element colours for the night-time field: the page's dark-theme element colours, whatever the theme. */
const ELEMENT_HEX: Record<Element, string> = { Fire: "#ff5b5e", Water: "#48c9ec", Wind: "#a99cff", Earth: "#ffb547" };
/** Rarity colours for skill names, the page's dark-theme tier colours. */
const TIER_HEX: Record<string, string> = {
  Common: "#9aa3af",
  Great: "#4ec27f",
  Rare: "#5aa9f0",
  Epic: "#b98cf0",
  Legendary: "#ffb547",
  Mythic: "#ff6b7d",
  Immortal: "#ffd75e",
};

const colourOf = (element: Element | null) => (element ? ELEMENT_HEX[element] : INK);

/** How each skill looks when it lands, by what it does; anything unlisted draws by its element. */
type Style = "slash" | "burst" | "wave" | "pillar" | "meteor" | "shards" | "vortex" | "bolt" | "quake" | "impact" | "cuts" | "beam";
const STYLES: Record<string, Style> = {
  "Fire Slash": "slash",
  "Flame Slash": "slash",
  "Hellfire Slash": "slash",
  "Water Slash": "slash",
  "Lightning Slash": "slash",
  "Thunder Slash": "slash",
  "Thunderbolt Slash": "slash",
  "Wind Sword": "slash",
  "Curved Blade": "slash",
  "Hot Blast": "burst",
  "Fire Blast": "burst",
  "Goblin Fire": "burst",
  "Flame Wave": "wave",
  "Sea Judgment": "wave",
  "Strong Current": "wave",
  "Dancing Waves": "wave",
  "Pillar of Fire": "pillar",
  Waterspout: "pillar",
  "Ice Stone": "meteor",
  "Flame Strike": "meteor",
  "Ice Shower": "shards",
  "Ice Time": "shards",
  Blizzard: "vortex",
  "Circular Sword Dance": "vortex",
  "Blast Wind": "vortex",
  "Lightning Stroke": "bolt",
  "Red Lightning": "bolt",
  "Stone Strike": "quake",
  "Power Strike": "quake",
  "Giga Strike": "quake",
  Demolition: "quake",
  "Power Impact": "impact",
  "Giga Impact": "impact",
  "Demon Hunt": "cuts",
  Predator: "cuts",
  Phantom: "cuts",
  "Heaven's Punishment": "beam",
  "Wrath of Gods": "beam",
};
const ELEMENT_STYLE: Record<Element, Style> = { Fire: "burst", Water: "wave", Wind: "vortex", Earth: "quake" };
const styleOf = (event: FightEvent): Style => STYLES[event.name] ?? (event.element ? ELEMENT_STYLE[event.element] : "slash");

/** A steady pseudo-random number in [0, 1) for an integer: the same tile always gets the same pebble. */
function noise(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  // Rounded, so the server's and the browser's Math.sin agree on every digit the page draws.
  return Math.round((x - Math.floor(x)) * 1e6) / 1e6;
}

/** A stage's area picks the sky's hue, so Red Twilight and Frozen Daybreak don't look alike. */
function areaHue(name: string) {
  const area = name.split(" - ")[0] ?? name;
  let hash = 0;
  for (const ch of area) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

/** A hill line across the view for a parallax layer: `depth` scales how far it scrolls with the camera. */
function ridge(camera: number, depth: number, base: number, height: number, seed: number) {
  const offset = camera * depth;
  const step = 2;
  const first = Math.floor(offset / step) - 1;
  const points: string[] = [];
  for (let i = first; i <= first + VIEW / step + 3; i += 1) {
    const x = (i * step - offset) * UNIT;
    const y = base - height * (0.35 + 0.65 * noise(i * 3 + seed));
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M ${points[0]?.split(",")[0]},${H} L ${points.join(" L ")} L ${W + UNIT * 3},${H} Z`;
}

/** Seconds each kind of event stays on screen. */
const LIFE: Record<FightEvent["kind"], number> = {
  basic: 0.18,
  sweep: 0.45,
  charge: 0.32,
  buff: 0.6,
  breath: 0.6,
  rave: 0.55,
  kill: 0.55,
  familiar: 0.42,
  spirit: 1,
};
/** Styles that rain strikes one after another take longer on screen. */
const STRIKE_STYLES = new Set<Style>(["meteor", "shards", "bolt"]);
const lifeOf = (event: FightEvent) =>
  event.seconds ??
  (event.kind === "familiar" ? familiarSeconds(event.count) : event.kind === "sweep" && STRIKE_STYLES.has(styleOf(event)) && event.count > 1 ? 0.9 : LIFE[event.kind]);

function Monster({ x, y, enemy, flash }: { x: number; y: number; enemy: FieldEnemy; flash: boolean }) {
  const s = UNIT * 0.42;
  const hp = enemy.hp / Math.max(1e-300, enemy.maxHp);
  return (
    <g transform={`translate(${x} ${y}) scale(${flash ? 1.12 : 1})`}>
      {/* A horned blob: every monster wears it. */}
      <path
        d={`M ${-s} 0 C ${-s} ${-s * 1.1} ${-s * 0.55} ${-s * 1.25} ${-s * 0.35} ${-s * 1.15} L ${-s * 0.55} ${-s * 1.7} L ${-s * 0.05} ${-s * 1.25} C ${s * 0.1} ${-s * 1.3} ${s * 0.3} ${-s * 1.3} ${s * 0.45} ${-s * 1.2} L ${s * 0.75} ${-s * 1.65} L ${s * 0.7} ${-s * 1.0} C ${s * 1.05} ${-s * 0.7} ${s} ${-s * 0.2} ${s} 0 Z`}
        fill={flash ? "#ffffff" : BONE}
        fillOpacity={0.35 + 0.65 * hp}
      />
      <circle cx={-s * 0.35} cy={-s * 0.6} r={s * 0.12} fill="#16120c" />
      <circle cx={s * 0.25} cy={-s * 0.6} r={s * 0.12} fill="#16120c" />
      <rect x={-s} y={s * 0.25} width={s * 2} height={1.6} fill="#000" fillOpacity="0.5" />
      <rect x={-s} y={s * 0.25} width={s * 2 * hp} height={1.6} fill={hp > 0.5 ? BONE : "#ff5b5e"} />
    </g>
  );
}

function Box({ x, y, enemy, flash }: { x: number; y: number; enemy: FieldEnemy; flash: boolean }) {
  const s = UNIT * 0.62;
  const hp = enemy.hp / Math.max(1e-300, enemy.maxHp);
  return (
    <g transform={`translate(${x} ${y}) scale(${flash ? 1.08 : 1})`}>
      {/* A crowned chest: the one shape every stage's end takes. */}
      <rect x={-s} y={-s * 1.3} width={s * 2} height={s * 1.3} rx={2} fill="#2a1d0c" stroke={flash ? "#fff" : GOLD} strokeWidth="1.5" />
      <path d={`M ${-s} ${-s * 1.3} L ${-s * 0.75} ${-s * 1.85} L ${-s * 0.35} ${-s * 1.5} L 0 ${-s * 2.05} L ${s * 0.35} ${-s * 1.5} L ${s * 0.75} ${-s * 1.85} L ${s} ${-s * 1.3}`} fill="none" stroke={GOLD} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x={-s * 0.18} y={-s * 0.95} width={s * 0.36} height={s * 0.45} fill={GOLD} />
      <rect x={-s} y={s * 0.2} width={s * 2} height={2} fill="#000" fillOpacity="0.5" />
      <rect x={-s} y={s * 0.2} width={s * 2 * hp} height={2} fill={GOLD} />
    </g>
  );
}

function Boss({ x, y, enemy, flash }: { x: number; y: number; enemy: FieldEnemy; flash: boolean }) {
  const s = UNIT * 0.95;
  const hp = enemy.hp / Math.max(1e-300, enemy.maxHp);
  const body = flash ? "#ffffff" : "#b9423f";
  return (
    // Its front stands at its position, so the slayer a range away isn't hidden inside it.
    <g transform={`translate(${x + s * 1.1} ${y}) scale(${flash ? 1.05 : 1})`}>
      {/* A hulking horned brute under a spiked crown: every boss wears it. */}
      <ellipse cx={0} cy={1} rx={s * 1.1} ry={2.5} fill="#000" fillOpacity="0.5" />
      <path d={`M ${-s * 1.05} 0 C ${-s * 1.25} ${-s * 0.9} ${-s * 0.95} ${-s * 1.75} ${-s * 0.2} ${-s * 1.8} L ${s * 0.25} ${-s * 1.8} C ${s * 0.95} ${-s * 1.75} ${s * 1.25} ${-s * 0.9} ${s * 1.05} 0 Z`} fill={body} stroke="#1a0808" strokeWidth="1.2" />
      <path d={`M ${-s * 0.55} ${-s * 1.6} C ${-s * 1.1} ${-s * 1.8} ${-s * 1.3} ${-s * 2.3} ${-s * 1.05} ${-s * 2.75} C ${-s * 0.95} ${-s * 2.25} ${-s * 0.7} ${-s * 2.0} ${-s * 0.25} ${-s * 1.8} Z`} fill={BONE} />
      <path d={`M ${s * 0.55} ${-s * 1.6} C ${s * 1.1} ${-s * 1.8} ${s * 1.3} ${-s * 2.3} ${s * 1.05} ${-s * 2.75} C ${s * 0.95} ${-s * 2.25} ${s * 0.7} ${-s * 2.0} ${s * 0.25} ${-s * 1.8} Z`} fill={BONE} />
      <path d={`M ${-s * 0.4} ${-s * 1.78} L ${-s * 0.3} ${-s * 2.2} L ${-s * 0.12} ${-s * 1.95} L 0 ${-s * 2.35} L ${s * 0.12} ${-s * 1.95} L ${s * 0.3} ${-s * 2.2} L ${s * 0.4} ${-s * 1.78} Z`} fill={GOLD} />
      <path d={`M ${-s * 0.5} ${-s * 1.2} L ${-s * 0.15} ${-s * 1.05}`} stroke="#ffe08a" strokeWidth="2.2" strokeLinecap="round" />
      <path d={`M ${s * 0.5} ${-s * 1.2} L ${s * 0.15} ${-s * 1.05}`} stroke="#ffe08a" strokeWidth="2.2" strokeLinecap="round" />
      <path d={`M ${-s * 0.35} ${-s * 0.6} L ${-s * 0.2} ${-s * 0.42} L 0 ${-s * 0.6} L ${s * 0.2} ${-s * 0.42} L ${s * 0.35} ${-s * 0.6}`} fill="none" stroke="#1a0808" strokeWidth="1.4" />
      <rect x={-s * 1.1} y={s * 0.25} width={s * 2.2} height={2.4} fill="#000" fillOpacity="0.5" />
      <rect x={-s * 1.1} y={s * 0.25} width={s * 2.2 * hp} height={2.4} fill="#ff5b5e" />
    </g>
  );
}

/** A familiar hovering at the slayer's shoulder while it attacks. */
function FamiliarBody({ x, y, colour, time }: { x: number; y: number; colour: string; time: number }) {
  const bob = Math.sin(time * 6) * 1.5;
  return (
    <g transform={`translate(${x} ${y + bob})`}>
      <circle r={UNIT * 0.32} fill={colour} fillOpacity="0.25" />
      <circle r={UNIT * 0.18} fill={colour} stroke={INK} strokeWidth="0.8" />
      <path d={`M ${-UNIT * 0.18} 0 L ${-UNIT * 0.42} ${-UNIT * 0.2} L ${-UNIT * 0.3} ${UNIT * 0.08} Z`} fill={INK} fillOpacity="0.7" />
    </g>
  );
}

/** A spirit showing itself for the second its skill kicks in. */
function SpiritVisit({ x, y, art, name, age, slot }: { x: number; y: number; art: string | undefined; name: string; age: number; slot: number }) {
  const size = UNIT * 1.7;
  const fade = Math.min(1, age / 0.15, (1 - age) / 0.25);
  const lift = Math.min(1, age / 0.2) * 6 + Math.sin(age * 9) * 1.2;
  const sx = x - UNIT * (1.4 + slot * 1.5);
  const sy = y - UNIT * 2.4 - lift;
  return (
    <g opacity={Math.max(0, fade)}>
      <circle cx={sx} cy={sy} r={size * 0.55} fill="#ffffff" fillOpacity="0.08" stroke={INK} strokeOpacity="0.35" strokeWidth="0.8" />
      {art ? (
        <image href={art} x={sx - size / 2} y={sy - size / 2} width={size} height={size} preserveAspectRatio="xMidYMid meet" />
      ) : (
        <circle cx={sx} cy={sy} r={size * 0.3} fill={INK} fillOpacity="0.5" />
      )}
      <text x={sx} y={sy + size * 0.72} textAnchor="middle" fontSize="6" fill={INK} className="font-mono">
        {name}
      </text>
    </g>
  );
}

/** Rave's release: a pillar rising from the ground under the enemy, dealing the stored damage while it stands. */
function RavePillar({ x, ground, age, life }: { x: number; ground: number; age: number; life: number }) {
  const rise = Math.min(1, age / 0.35);
  const fade = Math.min(1, (life - age) / 0.3);
  const height = (ground - 6) * rise;
  const pulse = 0.8 + 0.2 * Math.sin(age * 18);
  const w = UNIT * 1.2 * pulse;
  return (
    <g opacity={Math.max(0, fade)}>
      <ellipse cx={x} cy={ground} rx={UNIT * 1.3} ry={UNIT * 0.35} fill={RAVE} fillOpacity="0.35" />
      <rect x={x - w / 2} y={ground - height} width={w} height={height} fill={RAVE} fillOpacity="0.45" />
      <rect x={x - w * 0.18} y={ground - height} width={w * 0.36} height={height} fill="#ffe6ff" fillOpacity="0.8" />
      {Array.from({ length: 6 }, (_, i) => {
        const p = (age * 1.4 + i / 6) % 1;
        return <rect key={i} x={x + (noise(i) - 0.5) * w} y={ground - height * p} width={2} height={5} fill="#ffe6ff" opacity={rise * (1 - p)} />;
      })}
    </g>
  );
}

function Slayer({ x, y, element, moving, time, auras }: { x: number; y: number; element: Element | null; moving: boolean; time: number; auras: (Element | null)[] }) {
  const r = UNIT * 0.4;
  const bob = moving ? Math.abs(Math.sin(time * 14)) * 2.2 : Math.sin(time * 3) * 0.6;
  const colour = colourOf(element);
  return (
    <g transform={`translate(${x} ${y - bob})`}>
      {auras.map((aura, i) => (
        <circle
          key={i}
          r={r * (1.55 + i * 0.35)}
          cy={-r}
          fill="none"
          stroke={colourOf(aura)}
          strokeOpacity="0.7"
          strokeWidth="1.2"
          strokeDasharray="3 4"
          transform={`rotate(${(time * 120 * (i % 2 ? -1 : 1)) % 360} 0 ${-r})`}
        />
      ))}
      <ellipse cx={0} cy={bob + 1} rx={r * 0.9} ry={2} fill="#000" fillOpacity="0.45" />
      {/* The blade, held forward. */}
      <path d={`M ${r * 0.4} ${-r * 1.15} L ${r * 2.1} ${-r * 1.55} L ${r * 0.5} ${-r * 0.8} Z`} fill="#dfe6f0" stroke={colour} strokeWidth="1" />
      <circle cy={-r} r={r} fill={colour} stroke={INK} strokeWidth="1.4" />
      <circle cx={r * 0.35} cy={-r * 1.15} r={r * 0.18} fill={INK} />
    </g>
  );
}

/** The bracket a skill leaves on the floor over the range it covered. */
function Bracket({ x1, x2, colour, fade, label }: { x1: number; x2: number; colour: string; fade: number; label: string }) {
  const y = GROUND + 12;
  return (
    <g opacity={fade}>
      <path d={`M ${x1} ${y - 4} L ${x1} ${y} L ${x2} ${y} L ${x2} ${y - 4}`} fill="none" stroke={colour} strokeWidth="1.6" />
      <text x={(x1 + x2) / 2} y={y + 9} textAnchor="middle" fontSize="7" fill={colour} className="font-mono">
        {label}
      </text>
    </g>
  );
}

/** Zigzag lightning from the sky to a point. */
function boltPath(x: number, bottom: number, seed: number) {
  const points = [`${x + (noise(seed) - 0.5) * UNIT},0`];
  for (let i = 1; i < 6; i += 1) points.push(`${x + (noise(seed + i) - 0.5) * UNIT * 1.2},${(bottom * i) / 6}`);
  points.push(`${x},${bottom}`);
  return `M ${points.join(" L ")}`;
}

/** A skill landing, drawn by its style over the monsters it reached. `t` runs 0..1 over its time on screen. */
function Styled({ style, from, to, targets, t, colour, chest, ground, hits }: {
  style: Style; from: number; to: number; targets: number[]; t: number; colour: string; chest: number; ground: number; hits: number;
}) {
  const fade = 1 - t;
  const first = targets[0] ?? from + UNIT;
  switch (style) {
    case "slash": {
      // Crescent cuts across the nearest monster, one after another for multi-hit slashes.
      const cuts = Math.min(3, Math.max(1, hits));
      return (
        <g>
          {Array.from({ length: cuts }, (_, k) => {
            const local = Math.min(1, Math.max(0, t * cuts * 1.2 - k * 0.9));
            if (local <= 0 || local >= 1) return null;
            const cx = first - UNIT * 0.2;
            const lift = (k % 2 ? -1 : 1) * UNIT * 0.25;
            return (
              <g key={k} opacity={1 - local}>
                <path d={`M ${cx - UNIT * 0.9} ${chest - UNIT * 1.2 + lift} Q ${cx + UNIT * 1.1} ${chest + lift} ${cx - UNIT * 0.7} ${chest + UNIT * 0.9 + lift}`} fill="none" stroke={colour} strokeWidth={5 * (1 - local) + 1} strokeLinecap="round" />
                <path d={`M ${cx - UNIT * 0.7} ${chest - UNIT * 0.9 + lift} Q ${cx + UNIT * 0.8} ${chest + lift} ${cx - UNIT * 0.55} ${chest + UNIT * 0.7 + lift}`} fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      );
    }
    case "burst":
      // A blast on every monster in reach.
      return (
        <g opacity={fade}>
          {targets.slice(0, 8).map((tx, i) => (
            <g key={i}>
              <circle cx={tx} cy={chest} r={UNIT * (0.3 + t * 1.1)} fill={colour} fillOpacity={0.35} />
              <circle cx={tx} cy={chest} r={UNIT * (0.15 + t * 0.6)} fill={INK} fillOpacity={0.6 * fade} />
            </g>
          ))}
        </g>
      );
    case "wave": {
      // A wave rolling out to the edge of the skill's reach.
      const crest = from + (to - from) * Math.min(1, t * 1.4);
      const h = UNIT * 1.8;
      return (
        <g opacity={fade}>
          <path d={`M ${from} ${ground} Q ${(from + crest) / 2} ${ground - h * 0.35} ${crest - UNIT * 0.6} ${ground - h} Q ${crest + UNIT * 0.4} ${ground - h * 0.9} ${crest + UNIT * 0.3} ${ground} Z`} fill={colour} fillOpacity="0.45" />
          <path d={`M ${crest - UNIT * 0.6} ${ground - h} Q ${crest + UNIT * 0.4} ${ground - h * 0.9} ${crest + UNIT * 0.3} ${ground}`} fill="none" stroke={INK} strokeWidth="1.5" />
        </g>
      );
    }
    case "pillar":
      // Columns rising under each monster.
      return (
        <g opacity={fade}>
          {targets.slice(0, 8).map((tx, i) => {
            const height = UNIT * 3.2 * Math.min(1, t * 3);
            return (
              <g key={i}>
                <rect x={tx - UNIT * 0.28} y={ground - height} width={UNIT * 0.56} height={height} rx={UNIT * 0.28} fill={colour} fillOpacity="0.7" />
                <rect x={tx - UNIT * 0.1} y={ground - height} width={UNIT * 0.2} height={height} rx={UNIT * 0.1} fill={INK} fillOpacity="0.7" />
              </g>
            );
          })}
        </g>
      );
    case "meteor":
    case "shards":
    case "bolt":
      return <Strikes style={style} targets={targets} t={t} colour={colour} ground={ground} hits={hits} />;
    case "vortex": {
      // A whirlwind over the middle of the reach.
      const mid = (from + to) / 2;
      return (
        <g opacity={fade}>
          {[0, 1, 2].map((k) => (
            <ellipse
              key={k}
              cx={mid}
              cy={chest - UNIT * (0.2 + k * 0.6)}
              rx={(to - from) * (0.25 + k * 0.12) * Math.min(1, t * 2)}
              ry={UNIT * 0.35}
              fill="none"
              stroke={colour}
              strokeWidth={2 - k * 0.4}
              strokeDasharray="10 6"
              transform={`rotate(${(t * 360 * (k % 2 ? -1 : 1)) % 360} ${mid} ${chest - UNIT * (0.2 + k * 0.6)})`}
            />
          ))}
        </g>
      );
    }
    case "quake": {
      // The floor cracks along the reach and rocks jump out of it.
      const reach = from + (to - from) * Math.min(1, t * 2);
      const crack: string[] = [];
      for (let px = from, i = 0; px <= reach; px += UNIT * 0.5, i += 1) crack.push(`${px},${ground + 2 + (noise(i) - 0.5) * 5}`);
      return (
        <g opacity={fade}>
          {crack.length > 1 ? <path d={`M ${crack.join(" L ")}`} fill="none" stroke={colour} strokeWidth="2.2" /> : null}
          {targets.slice(0, 8).map((tx, i) => (
            <rect key={i} x={tx - 2} y={ground - UNIT * 1.2 * Math.sin(Math.min(1, t * 2) * Math.PI)} width={4} height={4} fill={colour} transform={`rotate(${t * 200 + i * 40} ${tx} ${ground})`} />
          ))}
        </g>
      );
    }
    case "impact":
      // A shockwave ring spreading along the floor.
      return (
        <g opacity={fade}>
          <ellipse cx={from} cy={ground} rx={Math.max(1, (to - from) * Math.min(1, t * 1.5))} ry={UNIT * 0.45} fill="none" stroke={colour} strokeWidth={4 * fade + 1} />
          <ellipse cx={from} cy={ground} rx={Math.max(1, (to - from) * Math.min(1, t * 1.5) * 0.7)} ry={UNIT * 0.3} fill="none" stroke={INK} strokeWidth="1" />
        </g>
      );
    case "cuts":
      // Rapid crossing cuts over the monsters in reach, one after another.
      return (
        <g stroke={colour} strokeWidth="2.5" strokeLinecap="round">
          {Array.from({ length: Math.min(7, Math.max(2, hits)) }, (_, k) => {
            const local = Math.min(1, Math.max(0, t * 8 - k));
            if (local <= 0 || local >= 1) return null;
            const tx = targets[k % Math.max(1, targets.length)] ?? first;
            const r = UNIT * 0.9;
            return (
              <g key={k} opacity={1 - local}>
                <line x1={tx - r} y1={chest - r} x2={tx + r} y2={chest + r} />
                <line x1={tx + r} y1={chest - r} x2={tx - r} y2={chest + r} stroke={INK} strokeWidth="1.2" />
              </g>
            );
          })}
        </g>
      );
    case "beam":
      // A shaft of light down onto the monsters.
      return (
        <g opacity={fade}>
          {targets.slice(0, 4).map((tx, i) => (
            <g key={i}>
              <rect x={tx - UNIT * 0.6} y={0} width={UNIT * 1.2} height={ground} fill={colour} fillOpacity={0.25 + 0.2 * Math.sin(t * 20)} />
              <rect x={tx - UNIT * 0.15} y={0} width={UNIT * 0.3} height={ground} fill={INK} fillOpacity="0.7" />
            </g>
          ))}
        </g>
      );
  }
}

/**
 * Strikes falling one after another, each on its own tile: meteors, icicles or lightning. Farming, the tiles
 * are where they landed at random within reach; against one enemy, every strike lands on it.
 */
function Strikes({ style, targets, t, colour, ground, hits }: { style: Style; targets: number[]; t: number; colour: string; ground: number; hits: number }) {
  const count = Math.min(30, Math.max(1, hits, targets.length));
  const fall = 0.3;
  return (
    <g>
      {Array.from({ length: count }, (_, k) => {
        const start = count > 1 ? (k / count) * (1 - fall) : 0;
        const local = (t - start) / fall;
        if (local <= 0) return null;
        // Several strikes on one target spread a little around it.
        const spread = targets.length >= count ? 0 : (noise(k + 17) - 0.5) * UNIT * 0.9;
        const tx = (targets[k % Math.max(1, targets.length)] ?? 0) + spread;
        if (local >= 1) {
          const after = Math.min(1, (local - 1) * 2);
          if (after >= 1) return null;
          return <ellipse key={k} cx={tx} cy={ground} rx={UNIT * (0.3 + after * 0.6)} ry={UNIT * 0.18} fill="none" stroke={colour} strokeWidth={2 * (1 - after)} opacity={1 - after} />;
        }
        if (style === "bolt") {
          return (
            <g key={k} opacity={0.6 + 0.4 * noise(k + Math.floor(t * 30))}>
              <path d={boltPath(tx, ground, k * 7)} fill="none" stroke={colour} strokeWidth="3.5" strokeOpacity="0.5" />
              <path d={boltPath(tx, ground, k * 7)} fill="none" stroke={INK} strokeWidth="1.1" />
            </g>
          );
        }
        const y = -UNIT + (ground + UNIT) * local;
        const drift = UNIT * 1.4 * (1 - local);
        if (style === "shards") return <line key={k} x1={tx + drift + 3} y1={y - UNIT * 0.9} x2={tx + drift} y2={y} stroke={colour} strokeWidth="2.2" strokeLinecap="round" />;
        return (
          <g key={k}>
            <line x1={tx + drift + UNIT} y1={y - UNIT * 1.4} x2={tx + drift} y2={y} stroke={colour} strokeWidth="3" strokeOpacity="0.45" />
            <polygon points={`${tx + drift},${y - UNIT * 0.4} ${tx + drift + UNIT * 0.35},${y} ${tx + drift},${y + UNIT * 0.4} ${tx + drift - UNIT * 0.35},${y}`} fill={colour} stroke={INK} strokeWidth="0.8" />
          </g>
        );
      })}
    </g>
  );
}

/** Seconds between the familiar's hits on screen, how long a shot flies, and how long its splash lingers. */
const FAMILIAR_HIT_GAP = 0.12;
const FAMILIAR_FLIGHT = 0.16;
const FAMILIAR_SPLASH = 0.2;
/** Every hit plays its own attack, one after another, so a use shows for as long as its hits take. */
const familiarSeconds = (hits: number) => (Math.max(1, hits) - 1) * FAMILIAR_HIT_GAP + FAMILIAR_FLIGHT + FAMILIAR_SPLASH;

/**
 * The familiar's hits, each its own attack: a shot from where it hovers to the nearest monster in its range,
 * splashing over the whole range, since every hit reaches every monster within it. A counter over the
 * target shows how many have landed.
 */
function FamiliarShots({ origin, from, to, targets, age, colour, chest, ground, count }: {
  origin: { x: number; y: number }; from: number; to: number; targets: number[]; age: number; colour: string; chest: number; ground: number; count: number;
}) {
  const hits = Math.max(1, count);
  const tx = targets[0] ?? from + UNIT;
  const landed = Math.min(hits, Math.max(0, Math.floor((age - FAMILIAR_FLIGHT) / FAMILIAR_HIT_GAP) + 1));
  return (
    <g>
      {Array.from({ length: hits }, (_, i) => {
        const local = age - i * FAMILIAR_HIT_GAP;
        if (local <= 0 || local >= FAMILIAR_FLIGHT + FAMILIAR_SPLASH) return null;
        if (local < FAMILIAR_FLIGHT) {
          const lead = local / FAMILIAR_FLIGHT;
          const px = origin.x + (tx - origin.x) * lead;
          const py = origin.y + (chest - origin.y) * lead - Math.sin(lead * Math.PI) * UNIT * 0.6;
          return <circle key={i} cx={px} cy={py} r={2.4} fill={colour} stroke={INK} strokeWidth="0.6" />;
        }
        const after = (local - FAMILIAR_FLIGHT) / FAMILIAR_SPLASH;
        return (
          <g key={i}>
            <rect x={from} y={ground - UNIT * 0.9} width={Math.max(1, to - from)} height={UNIT * 0.9} rx={UNIT * 0.3} fill={colour} fillOpacity={0.3 * (1 - after)} />
            <circle cx={tx} cy={chest} r={UNIT * (0.2 + after * 0.5)} fill="none" stroke={colour} strokeWidth={2 * (1 - after)} />
          </g>
        );
      })}
      {landed > 0 ? (
        <text x={tx} y={chest - UNIT * 1.6} textAnchor="middle" fontSize="8" fontWeight="700" fill={colour} stroke="#0b0d12" strokeWidth="2" paintOrder="stroke" className="font-mono">
          {landed} / {hits}
        </text>
      ) : null}
    </g>
  );
}

/** The skill names over the slayer's head as they're used, framed and coloured by the skill's rarity. */
function SkillNames({ x, y, casts, time }: { x: number; y: number; casts: { name: string; real: number; grade: string | null }[]; time: number }) {
  return (
    <g className="font-mono">
      {casts.map((cast, i) => {
        const age = time - cast.real;
        const fade = Math.min(1, (NAME_SECONDS - age) / 0.25);
        const rise = Math.min(1, age / 0.15);
        const colour = TIER_HEX[cast.grade ?? ""] ?? INK;
        const width = cast.name.length * 5.2 + 16;
        const cy = y - UNIT * 2.1 - i * 15 - rise * 3;
        return (
          <g key={`${cast.name}-${cast.real}`} opacity={fade} transform={`translate(${x} ${cy})`}>
            <rect x={-width / 2} y={-8} width={width} height={13} rx={2} fill="#0b0d12" fillOpacity="0.85" stroke={colour} strokeWidth="1" />
            <path d={`M ${-width / 2 - 3} -1.5 L ${-width / 2} -4.5 L ${-width / 2 + 3} -1.5 L ${-width / 2} 1.5 Z`} fill={colour} />
            <path d={`M ${width / 2 - 3} -1.5 L ${width / 2} -4.5 L ${width / 2 + 3} -1.5 L ${width / 2} 1.5 Z`} fill={colour} />
            <text x={0} y={1.5} textAnchor="middle" fontSize="8" fontWeight="700" fill={colour}>
              {cast.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** While Rave's pillar deals its damage, time stands still: the field dims to violet and a clock ring turns around the slayer. */
function TimeStop({ x, y, time }: { x: number; y: number; time: number }) {
  const hand = (time * 90) % 360;
  return (
    <g pointerEvents="none">
      <rect width={W} height={H} fill="#2a0b35" fillOpacity="0.38" />
      <circle cx={x} cy={y - UNIT * 0.4} r={UNIT * 1.5} fill="none" stroke={RAVE} strokeWidth="1.2" strokeDasharray="2 3" />
      <line x1={x} y1={y - UNIT * 0.4} x2={x} y2={y - UNIT * 1.7} stroke={RAVE} strokeWidth="1.4" transform={`rotate(${hand} ${x} ${y - UNIT * 0.4})`} />
      <text x={W / 2} y={H * 0.36} textAnchor="middle" fontSize="11" fontWeight="700" fill={RAVE} className="font-mono" letterSpacing="3">
        TIME STOP
      </text>
    </g>
  );
}

/** Seconds a skill's name stays over the slayer's head. */
const NAME_SECONDS = 0.9;

function Effect({ event, age, x, y, slayerX, time, spiritArt, spiritSlot }: {
  event: FightEvent; age: number; x: (position: number) => number; y: number; slayerX: number; time: number; spiritArt: Record<string, string>; spiritSlot: number;
}) {
  const life = lifeOf(event);
  const t = age / life;
  const fade = 1 - t;
  const colour = colourOf(event.element);
  const from = x(event.from);
  const to = x(event.to);
  const chest = y - UNIT * 0.45;
  switch (event.kind) {
    case "basic": {
      const cx = (from + to) / 2 + UNIT * 0.2;
      return <path d={`M ${cx - UNIT * 0.2} ${chest - UNIT * 0.5} Q ${cx + UNIT * 0.45} ${chest} ${cx - UNIT * 0.1} ${chest + UNIT * 0.45}`} fill="none" stroke={INK} strokeWidth={2.4 * fade + 0.4} opacity={fade} strokeLinecap="round" />;
    }
    case "sweep":
    case "familiar": {
      const targets = (event.targets?.length ? event.targets : [event.from + 1]).map(x);
      const label = `${event.kind === "familiar" ? "Familiar" : event.name} · ${Math.round(event.to - event.from)}`;
      return (
        <g>
          {event.kind === "familiar" ? (
            <>
              <FamiliarBody x={slayerX - UNIT * 0.7} y={chest - UNIT * 1.1} colour={colour} time={time} />
              <FamiliarShots origin={{ x: slayerX - UNIT * 0.7, y: chest - UNIT * 1.1 }} from={from} to={to} targets={targets} age={age} colour={colour} chest={chest} ground={y} count={event.count} />
            </>
          ) : (
            <Styled style={styleOf(event)} from={from} to={to} targets={targets} t={t} colour={colour} chest={chest} ground={y} hits={event.count} />
          )}
          <Bracket x1={from} x2={to} colour={colour} fade={fade} label={label} />
        </g>
      );
    }
    case "charge": {
      // A streak from where the charge began to where it landed, with afterimages along it.
      const head = from + (to - from) * Math.min(1, age / CHARGE_SECONDS);
      return (
        <g>
          <rect x={Math.min(from, head)} y={chest - 3} width={Math.max(2, Math.abs(head - from))} height={6} rx={3} fill={colour} opacity={0.75 * fade} />
          {[0.25, 0.5, 0.75].map((k) => (
            <circle key={k} cx={from + (head - from) * k} cy={chest} r={UNIT * 0.36} fill="none" stroke={colour} strokeWidth="1.2" opacity={fade * k} />
          ))}
          <Bracket x1={from} x2={Math.max(to, from + 2)} colour={colour} fade={fade} label={event.to > event.from ? `${event.name} · ${Math.round(event.to - event.from)}` : event.name} />
        </g>
      );
    }
    case "buff":
      return <circle cx={from} cy={chest} r={UNIT * (0.5 + t * 1.8)} fill="none" stroke={colour} strokeWidth={2.5 * fade} opacity={fade} />;
    case "breath":
      return (
        <g opacity={fade}>
          {[-0.35, 0, 0.35].map((k, i) => (
            <path
              key={k}
              d={`M ${to + k * UNIT - 3} ${y} Q ${to + k * UNIT} ${y - UNIT * (1.4 + i * 0.3) * (0.4 + t)} ${to + k * UNIT + 3} ${y} Z`}
              fill={colourOf("Fire")}
            />
          ))}
        </g>
      );
    case "rave":
      return <RavePillar x={to} ground={y} age={age} life={life} />;
    case "spirit":
      return <SpiritVisit x={slayerX} y={y} art={spiritArt[event.name]} name={event.name} age={age} slot={spiritSlot} />;
    case "kill": {
      const box = event.name === "Box";
      return (
        <g opacity={fade}>
          {Array.from({ length: box ? 12 : 6 }, (_, i) => {
            const a = (i / (box ? 12 : 6)) * Math.PI * 2 + event.count;
            const d = UNIT * (0.2 + t * (box ? 1.6 : 0.9));
            return <circle key={i} cx={from + Math.cos(a) * d} cy={chest + Math.sin(a) * d * 0.7} r={box ? 2.2 : 1.6} fill={box ? GOLD : BONE} />;
          })}
        </g>
      );
    }
  }
}

/** The one enemy of a promotion or stages fight: its HP and whether it's a boss. */
export type SingleEnemy = { maxHp: number; boss: boolean; title: string; subtitle: string };

export function BattleRender({ stage, enemy, snap, element, baseMoveSpeed, spiritArt }: {
  stage: FarmStage | null;
  enemy: SingleEnemy | null;
  snap: FightState | null;
  element: Element | null;
  baseMoveSpeed: number;
  spiritArt: Record<string, string>;
}) {
  const initial = useMemo(() => (stage ? createField(stage).state() : null), [stage]);
  const lost = snap?.total ?? 0;
  const single: FieldState | null = enemy
    ? {
        position: 0,
        enemies: [{ id: 0, position: BASIC_RANGE, hp: Math.max(0, enemy.maxHp - lost), maxHp: enemy.maxHp, wave: 1, box: false }],
        kills: enemy.maxHp - lost > 0 ? 0 : 1,
        cleared: enemy.maxHp - lost <= 0,
        total: lost,
      }
    : null;
  const field = (stage ? (snap?.field ?? initial) : single) ?? { position: 0, enemies: [], kills: 0, cleared: false, total: 0 };
  const time = snap?.real ?? 0;
  const events = snap?.events ?? [];
  const recent = events.filter((e) => time - e.real >= 0 && time - e.real <= lifeOf(e));
  // A charge carries the slayer along it rather than jumping: follow the batch in flight, or wait at the start of the next.
  const inFlight = stage ? events.find((e) => e.kind === "charge" && e.real > time - CHARGE_SECONDS) : undefined;
  const shown = inFlight
    ? inFlight.real > time
      ? inFlight.from
      : inFlight.from + (inFlight.to - inFlight.from) * Math.min(1, (time - inFlight.real) / CHARGE_SECONDS)
    : field.position;
  const camera = shown - BEHIND;
  const x = (position: number) => (position - camera) * UNIT;
  const hue = areaHue(stage?.name ?? enemy?.title ?? "");
  const front = field.enemies.find((e) => e.hp > 0) ?? null;
  const moving = Boolean(snap && stage && front && (front.position - field.position > 1.01 || inFlight));
  const boss = enemy?.boss ?? false;
  // A monster flashes for a moment when something reaches it.
  const flashing = (target: FieldEnemy) =>
    recent.some((e) => {
      if (time - e.real > 0.12) return false;
      if (e.kind === "basic" || e.kind === "breath" || e.kind === "rave") return target === front;
      if (e.kind === "sweep" || e.kind === "familiar" || e.kind === "charge") return target.position >= e.from - 0.5 && target.position <= Math.max(e.to, e.from + 1) + 0.5;
      return false;
    });
  const auras = (snap?.skills ?? [])
    .filter((s) => s.active)
    .slice(0, 3)
    .map((s) => events.find((e) => e.kind === "buff" && e.name === s.name)?.element ?? null);
  const visible = field.enemies.filter((e) => e.hp > 0 && x(e.position) > -UNIT && x(e.position) < W + UNIT);
  // The latest skills used, newest nearest the head: named skills (and the familiar), not beasts or specials.
  const named = (snap?.casts ?? [])
    .filter((c) => time - c.real >= 0 && time - c.real <= NAME_SECONDS && (SKILL_BY_NAME.has(c.name) || c.name === "Familiar"))
    .slice(-3)
    .reverse()
    .map((c) => ({ ...c, grade: SKILL_BY_NAME.get(c.name)?.grade ?? (c.name === "Familiar" ? "Epic" : null) }));
  const wave = front ? (front.box ? FARM_WAVES : front.wave) : FARM_WAVES;
  const speed = snap ? snap.moveSpeed : baseMoveSpeed;
  const firstTile = Math.floor(camera) - 1;
  const spirits = recent.filter((e) => e.kind === "spirit");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-56 w-full shrink-0 overflow-hidden rounded-md md:h-[34svh]"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={stage ? `Stage ${stage.stage} farming: wave ${wave} of ${FARM_WAVES}, ${field.kills} of ${field.enemies.length} down` : `${enemy?.title ?? "Fight"}: ${enemy?.subtitle ?? ""}`}
    >
      <defs>
        <linearGradient id="farm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 38% 7%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 25) % 360} 42% 17%)`} />
        </linearGradient>
        <linearGradient id="farm-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 14% 13%)`} />
          <stop offset="1" stopColor={`hsl(${hue} 18% 5%)`} />
        </linearGradient>
      </defs>

      {/* Sky, a few fixed stars, then two hill lines scrolling slower than the floor. */}
      <rect width={W} height={H} fill="url(#farm-sky)" />
      {Array.from({ length: 22 }, (_, i) => (
        <circle key={i} cx={((noise(i) * W - camera * 0.04 * UNIT) % W + W) % W} cy={noise(i + 50) * GROUND * 0.55} r={noise(i + 99) * 0.9 + 0.2} fill={INK} opacity={0.25 + noise(i + 7) * 0.5} />
      ))}
      <path d={ridge(camera, 0.18, GROUND - 38, 44, 1)} fill={`hsl(${hue} 30% 12%)`} />
      <path d={ridge(camera, 0.45, GROUND - 8, 30, 9)} fill={`hsl(${hue} 26% 9%)`} />

      {/* The floor: one tile per range, a number every 10. */}
      <rect y={GROUND} width={W} height={H - GROUND} fill="url(#farm-floor)" />
      <line x1={0} x2={W} y1={GROUND} y2={GROUND} stroke={`hsl(${hue} 30% 38%)`} strokeOpacity="0.55" />
      {Array.from({ length: VIEW + 3 }, (_, i) => {
        const tile = firstTile + i;
        const tx = x(tile);
        return (
          <g key={tile}>
            {tile % 2 === 0 ? <rect x={tx} y={GROUND} width={UNIT} height={H - GROUND} fill="#ffffff" opacity="0.025" /> : null}
            <line x1={tx} x2={tx} y1={GROUND} y2={GROUND + (tile % 10 === 0 ? 7 : 3)} stroke={INK} strokeOpacity={tile % 10 === 0 ? 0.45 : 0.18} />
            {tile % 10 === 0 && tile >= 0 ? (
              <text x={tx + 2} y={GROUND + 30} fontSize="6.5" fill={INK} fillOpacity="0.35" className="font-mono">
                {tile}
              </text>
            ) : null}
            {noise(tile) > 0.72 ? <ellipse cx={tx + noise(tile + 3) * UNIT} cy={GROUND + 4 + noise(tile + 5) * 22} rx={1.2 + noise(tile + 8) * 1.6} ry={0.9} fill={`hsl(${hue} 12% 26%)`} /> : null}
          </g>
        );
      })}

      {/* Wave markers where each wave begins. */}
      {stage && field.enemies
        .filter((e, i, all) => i === 0 || all[i - 1].wave !== e.wave)
        .filter((e) => x(e.position) > -UNIT * 4 && x(e.position) < W)
        .map((e) => (
          <text key={`w${e.wave}`} x={x(e.position) - UNIT * 0.4} y={GROUND - UNIT * 2.1} fontSize="7" fill={INK} fillOpacity="0.45" className="font-mono">
            {e.box ? "BOX" : `WAVE ${e.wave}`}
          </text>
        ))}

      {visible.map((foe, i) => {
        const below = visible.slice(0, i).filter((o) => o.position === foe.position).length;
        if (below >= 3) return null;
        const ex = x(foe.position);
        const ey = GROUND - below * UNIT * 0.9;
        const onSpot = visible.filter((o) => o.position === foe.position).length;
        return (
          <g key={foe.id}>
            {foe.box ? <Box x={ex} y={ey} enemy={foe} flash={flashing(foe)} /> : single && boss ? <Boss x={ex} y={ey} enemy={foe} flash={flashing(foe)} /> : <Monster x={ex} y={ey} enemy={foe} flash={flashing(foe)} />}
            {below === 2 && onSpot > 3 ? (
              <text x={ex} y={ey - UNIT * 1.3} textAnchor="middle" fontSize="7" fill={INK} className="font-mono">
                +{onSpot - 3}
              </text>
            ) : null}
          </g>
        );
      })}

      {snap?.raveStopping ? <TimeStop x={x(shown)} y={GROUND} time={time} /> : null}

      <Slayer x={x(shown)} y={GROUND} element={element} moving={moving} time={time} auras={auras} />

      {recent.map((event, i) => (
        <Effect
          key={`${event.kind}-${event.real}-${i}`}
          event={event}
          age={time - event.real}
          x={x}
          y={GROUND}
          slayerX={x(shown)}
          time={time}
          spiritArt={spiritArt}
          spiritSlot={Math.max(0, spirits.indexOf(event))}
        />
      ))}

      <SkillNames x={x(shown)} y={GROUND} casts={named} time={time} />

      {/* What to read at a glance: where the run is and how fast the slayer walks. */}
      <g className="font-mono" fill={INK}>
        <text x={22} y={16} fontSize="9" fillOpacity="0.9">
          {stage ? `Stage ${stage.stage} · ${stage.name}` : enemy?.title}
        </text>
        <text x={22} y={27} fontSize="7.5" fillOpacity="0.6">
          {stage ? `Wave ${wave} / ${FARM_WAVES} · ${field.kills} / ${field.enemies.length} down${field.cleared ? " · cleared" : ""}` : enemy?.subtitle}
        </text>
        {stage ? (
          <>
            <text x={W - 22} y={16} fontSize="8" textAnchor="end" fillOpacity="0.8">
              MSPD {speed.toFixed(1)} range/s
            </text>
            <text x={W - 22} y={27} fontSize="7" textAnchor="end" fillOpacity="0.5">
              {front ? `next ${Math.max(0, front.position - field.position).toFixed(1)} range ahead` : "stage clear"}
            </text>
          </>
        ) : snap ? (
          <text x={W - 22} y={16} fontSize="8" textAnchor="end" fillOpacity="0.8">
            {snap.clock.toFixed(1)}s
          </text>
        ) : null}
      </g>
    </svg>
  );
}

