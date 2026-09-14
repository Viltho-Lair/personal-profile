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

/** Colours the game gives some skills instead of their element's: Fulgurous's gold, Supersonic's cyan, Red Lightning's red. */
const SKILL_TINT: Record<string, string> = {
  Fulgurous: "#ffc53d",
  Supersonic: "#4ce8e0",
  Blizzard: "#8fdcff",
  "Lightning Body": "#4ce8e0",
  "Red Lightning": "#ff3b3b",
  Rave: RAVE,
};
const tintOf = (name: string, element: Element | null) => SKILL_TINT[name] ?? colourOf(element);

/**
 * Skills whose cast takes over the screen in the game: a white flash, the field darkening while the name types
 * in, and a beam dropping onto the slayer. Nothing stops meanwhile.
 */
const CUT_INS = new Set(["Rave", "Red Lightning", "Supersonic", "Blizzard", "Lightning Body"]);
const CUT_IN_SECONDS = 0.5;
/** How dark the field is `age` seconds into a cut-in: in fast, held, then back. */
const cutInDarkness = (age: number) => (age < 0.05 ? age / 0.05 : age < 0.33 ? 1 : Math.max(0, (CUT_IN_SECONDS - age) / (CUT_IN_SECONDS - 0.33)));

/** How each skill looks when it lands, by what it does; anything unlisted draws by its element. */
type Style = "slash" | "burst" | "wave" | "pillar" | "meteor" | "shards" | "vortex" | "bolt" | "quake" | "impact" | "cuts" | "beam" | "blizzard";
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
  Blizzard: "blizzard",
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
  charge: 0.45,
  buff: 0.6,
  breath: 0.6,
  rave: 0.55,
  kill: 1.1,
  familiar: 0.42,
  spirit: 1,
};
/** Styles that rain strikes one after another take longer on screen. */
const STRIKE_STYLES = new Set<Style>(["meteor", "shards", "bolt"]);
/** Red Lightning's bolts rain for about a second and a half, Lightning Stroke's a little less. */
const STRIKE_SECONDS: Record<string, number> = { "Red Lightning": 1.5, "Lightning Stroke": 1.2 };
const lifeOf = (event: FightEvent) =>
  event.seconds ??
  (event.kind === "familiar"
    ? familiarSeconds(event.count, event.gap)
    : event.kind === "sweep" && STRIKE_STYLES.has(styleOf(event)) && event.count > 1
      ? (STRIKE_SECONDS[event.name] ?? 0.9)
      : event.kind === "kill" && event.name === "Box"
        ? 1.5
        : LIFE[event.kind]);

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

function Slayer({ x, y, element, moving, time, buffs }: { x: number; y: number; element: Element | null; moving: boolean; time: number; buffs: string[] }) {
  const r = UNIT * 0.4;
  const bob = moving ? Math.abs(Math.sin(time * 14)) * 2.2 : Math.sin(time * 3) * 0.6;
  const colour = colourOf(element);
  const icon = UNIT * 0.62;
  return (
    <g transform={`translate(${x} ${y - bob})`}>
      {/* The buffs that are on, as small icons over the head, the way the game marks them. */}
      {buffs.map((name, i) => {
        const art = SKILL_BY_NAME.get(name)?.icon;
        const bx = (i - (buffs.length - 1) / 2) * (icon + 1.5) - icon / 2;
        const by = -r * 2 - icon - 3 + Math.sin(time * 4 + i) * 0.6;
        return art ? (
          <g key={name}>
            <rect x={bx - 0.5} y={by - 0.5} width={icon + 1} height={icon + 1} rx={1.5} fill="#0b0d12" stroke={tintOf(name, SKILL_BY_NAME.get(name)?.element as Element | null)} strokeWidth="0.6" />
            <image href={art} x={bx} y={by} width={icon} height={icon} preserveAspectRatio="xMidYMid slice" />
          </g>
        ) : null;
      })}
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
      return <Strikes style={style} from={from} to={to} targets={targets} t={t} colour={colour} ground={ground} hits={hits} />;
    case "blizzard":
      return null;
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
function Strikes({ style, from, to, targets, t, colour, ground, hits }: {
  style: Style; from: number; to: number; targets: number[]; t: number; colour: string; ground: number; hits: number;
}) {
  const count = Math.min(style === "bolt" ? 40 : 30, Math.max(1, hits, targets.length));
  const fall = style === "bolt" ? 0.12 : 0.3;
  // Against one enemy every strike hits it, but they still come down all over the reach, as in the game.
  const spreadOut = targets.length <= 1 && to - from > UNIT;
  return (
    <g>
      {Array.from({ length: count }, (_, k) => {
        const start = count > 1 ? (k / count) * (1 - fall) : 0;
        const local = (t - start) / fall;
        if (local <= 0) return null;
        // Several strikes on one target spread a little around it.
        const spread = targets.length >= count ? 0 : (noise(k + 17) - 0.5) * UNIT * 0.9;
        const tx = spreadOut ? from + (to - from) * noise(k * 3 + 29) : (targets[k % Math.max(1, targets.length)] ?? 0) + spread;
        if (local >= 1) {
          if (style === "bolt") {
            // Where a bolt lands it bursts into a ball of its colour with a bright shard at the heart.
            const after = Math.min(1, (local - 1) / 3);
            if (after >= 1) return null;
            const r = UNIT * (0.45 + after * 0.45);
            return (
              <g key={k} opacity={1 - after}>
                <circle cx={tx} cy={ground - r * 0.7} r={r} fill={colour} fillOpacity="0.55" />
                <path d={`M ${tx} ${ground - r * 1.3} L ${tx + r * 0.3} ${ground - r * 0.7} L ${tx} ${ground - r * 0.1} L ${tx - r * 0.3} ${ground - r * 0.7} Z`} fill="#ffe27a" />
              </g>
            );
          }
          const after = Math.min(1, (local - 1) * 2);
          if (after >= 1) return null;
          return <ellipse key={k} cx={tx} cy={ground} rx={UNIT * (0.3 + after * 0.6)} ry={UNIT * 0.18} fill="none" stroke={colour} strokeWidth={2 * (1 - after)} opacity={1 - after} />;
        }
        if (style === "bolt") {
          // A thin zig-zag from the sky.
          return (
            <g key={k}>
              <path d={boltPath(tx, ground, k * 7)} fill="none" stroke={colour} strokeWidth="2.2" strokeOpacity="0.45" />
              <path d={boltPath(tx, ground, k * 7)} fill="none" stroke={colour} strokeWidth="0.9" />
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
const familiarSeconds = (hits: number, gap = FAMILIAR_HIT_GAP) => (Math.max(1, hits) - 1) * gap + FAMILIAR_FLIGHT + FAMILIAR_SPLASH;

/**
 * The familiar's hits, each its own attack: a shot from where it hovers to the nearest monster in its range,
 * splashing over the whole range, since every hit reaches every monster within it. A counter over the
 * target shows how many have landed.
 */
function FamiliarShots({ origin, from, to, targets, age, colour, chest, ground, count, gap = FAMILIAR_HIT_GAP }: {
  origin: { x: number; y: number }; from: number; to: number; targets: number[]; age: number; colour: string; chest: number; ground: number; count: number; gap?: number;
}) {
  const hits = Math.max(1, count);
  const tx = targets[0] ?? from + UNIT;
  const landed = Math.min(hits, Math.max(0, Math.floor((age - FAMILIAR_FLIGHT) / gap) + 1));
  return (
    <g>
      {Array.from({ length: hits }, (_, i) => {
        const local = age - i * gap;
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

/** Dust thrown up where a charge lands: puffs in the field's colour with bright shards flying out. */
function Dust({ x, y, age, life, colour, seed }: { x: number; y: number; age: number; life: number; colour: string; seed: number }) {
  const t = Math.min(1, age / life);
  return (
    <g opacity={1 - t}>
      {Array.from({ length: 5 }, (_, i) => {
        const a = -Math.PI * (0.15 + 0.7 * noise(seed + i));
        const d = UNIT * (0.3 + t * (0.8 + noise(seed + i + 9)));
        return <circle key={`p${i}`} cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d * 0.6} r={UNIT * (0.28 + t * 0.35) * (0.6 + noise(seed + i + 3))} fill={colour} fillOpacity="0.45" />;
      })}
      {Array.from({ length: 4 }, (_, i) => {
        const a = -Math.PI * (0.1 + 0.8 * noise(seed + i + 20));
        const d = UNIT * (0.4 + t * 1.8);
        const sx = x + Math.cos(a) * d;
        const sy = y - UNIT * 0.3 + Math.sin(a) * d * 0.5;
        return <path key={`s${i}`} d={`M ${sx - 3} ${sy} L ${sx} ${sy - 1.3} L ${sx + 3} ${sy} L ${sx} ${sy + 1.3} Z`} fill="#ffd24a" />;
      })}
    </g>
  );
}

/** Blizzard: a dome grows from the slayer, a beam drops into it, a white blast sweeps the field, then snow lingers. */
function BlizzardStorm({ x, ground, age, life, colour }: { x: number; ground: number; age: number; life: number; colour: string }) {
  const dome = Math.min(1, age / 0.35);
  const blast = age < 0.45 ? 0 : age < 1.4 ? Math.min(1, (age - 0.45) / 0.15, (1.4 - age) / 0.4) : 0;
  const snow = Math.max(0, Math.min(1, (age - 1) / 0.3, (life - age) / 0.4));
  const radius = UNIT * (1 + dome * 5.5);
  return (
    <g pointerEvents="none">
      {age < 0.6 ? (
        <path
          d={`M ${x - radius} ${ground} A ${radius} ${radius * 0.95} 0 0 1 ${x + radius} ${ground} Z`}
          fill="#04232b"
          fillOpacity={0.45 * Math.min(1, (0.6 - age) / 0.15)}
          stroke={colour}
          strokeWidth="1.6"
          strokeOpacity={Math.min(1, (0.6 - age) / 0.15)}
        />
      ) : null}
      {age > 0.28 && age < 0.55 ? <rect x={x - UNIT * 0.45} y={0} width={UNIT * 0.9} height={ground} fill={colour} fillOpacity={0.6 * Math.min(1, (0.55 - age) / 0.1)} /> : null}
      {blast > 0 ? (
        <g opacity={blast}>
          <rect x={x} y={ground - UNIT * 3.2} width={W - x} height={UNIT * 3.6} fill="#e9f7ff" fillOpacity="0.75" />
          {Array.from({ length: 7 }, (_, i) => {
            const lx = x + ((age * 380 + noise(i) * W) % Math.max(1, W - x));
            return <rect key={i} x={lx} y={ground - UNIT * (0.4 + noise(i + 4) * 2.8)} width={UNIT * (1.5 + noise(i + 8) * 3)} height={1.4} fill={colour} />;
          })}
          <rect x={x - UNIT * 0.4} y={ground - UNIT * 1.8} width={UNIT * 0.8} height={UNIT * 2} rx={UNIT * 0.4} fill="#ffffff" />
        </g>
      ) : null}
      {snow > 0
        ? Array.from({ length: 26 }, (_, i) => {
            const sx = x + ((noise(i) * (W - x) + age * 30 * (0.5 + noise(i + 2))) % Math.max(1, W - x));
            const sy = ((noise(i + 5) * ground + age * 22 * (0.6 + noise(i + 7))) % ground);
            return <circle key={i} cx={sx} cy={sy} r={0.7 + noise(i + 9)} fill="#ffffff" opacity={snow * 0.8} />;
          })
        : null}
    </g>
  );
}

/** Loot a monster drops as it falls: a coin and a gem that pop out and settle on the floor; the box bursts into coins. */
function Loot({ x, ground, age, life, box, seed }: { x: number; ground: number; age: number; life: number; box: boolean; seed: number }) {
  const fade = Math.min(1, (life - age) / 0.3);
  const pieces = box ? 18 : 2;
  return (
    <g opacity={Math.max(0, fade)}>
      {Array.from({ length: pieces }, (_, i) => {
        const flight = box ? 0.9 : 0.35;
        const p = Math.min(1, age / flight);
        const spread = box ? (noise(seed + i) - 0.5) * UNIT * 5 : (i === 0 ? -1 : 1) * UNIT * (0.3 + noise(seed + i) * 0.4);
        const height = UNIT * (box ? 3 + noise(seed + i + 5) * 3 : 1.2);
        const px = x + spread * p;
        const py = ground - 2 - Math.sin(p * Math.PI) * height;
        const coin = box ? i % 3 !== 0 : i === 0;
        return coin ? (
          <circle key={i} cx={px} cy={py} r={2.2} fill={GOLD} stroke="#fff3b0" strokeWidth="0.6" />
        ) : (
          <path key={i} d={`M ${px} ${py - 2.6} L ${px + 2} ${py} L ${px} ${py + 2.6} L ${px - 2} ${py} Z`} fill="#4fb6ff" stroke="#d8f0ff" strokeWidth="0.5" />
        );
      })}
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
        // The name types in, a letter at a time, over a fifth of a second.
        const typed = cast.name.slice(0, Math.max(1, Math.ceil(cast.name.length * Math.min(1, age / 0.22))));
        const cy = y - UNIT * 2.1 - i * 15 - rise * 3;
        return (
          <g key={`${cast.name}-${cast.real}`} opacity={fade} transform={`translate(${x} ${cy})`}>
            <rect x={-width / 2} y={-8} width={width} height={13} rx={2} fill="#0b0d12" fillOpacity="0.85" stroke={colour} strokeWidth="1" />
            <path d={`M ${-width / 2 - 3} -1.5 L ${-width / 2} -4.5 L ${-width / 2 + 3} -1.5 L ${-width / 2} 1.5 Z`} fill={colour} />
            <path d={`M ${width / 2 - 3} -1.5 L ${width / 2} -4.5 L ${width / 2 + 3} -1.5 L ${width / 2} 1.5 Z`} fill={colour} />
            <text x={-width / 2 + 8} y={1.5} textAnchor="start" fontSize="8" fontWeight="700" fill={colour}>
              {typed}
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

function Effect({ event, age, x, y, slayerX, time, spiritArt, spiritSlot, dust }: {
  event: FightEvent; age: number; x: (position: number) => number; y: number; slayerX: number; time: number; spiritArt: Record<string, string>; spiritSlot: number; dust: string;
}) {
  const life = lifeOf(event);
  const t = age / life;
  const fade = 1 - t;
  const colour = tintOf(event.name, event.element);
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
              <FamiliarShots origin={{ x: slayerX - UNIT * 0.7, y: chest - UNIT * 1.1 }} from={from} to={to} targets={targets} age={age} colour={colour} chest={chest} ground={y} count={event.count} gap={event.gap} />
            </>
          ) : styleOf(event) === "blizzard" ? (
            <BlizzardStorm x={from} ground={y} age={age} life={life} colour={colour} />
          ) : (
            <Styled style={styleOf(event)} from={from} to={to} targets={targets} t={t} colour={colour} chest={chest} ground={y} hits={event.count} />
          )}
          <Bracket x1={from} x2={to} colour={colour} fade={fade} label={label} />
        </g>
      );
    }
    case "charge": {
      // An upright ring where the charge set off, a streak to where it landed, a crescent cut there and dust thrown up.
      const head = from + (to - from) * Math.min(1, age / CHARGE_SECONDS);
      const landed = Math.max(0, age - CHARGE_SECONDS);
      const cut = Math.min(1, landed / 0.18);
      return (
        <g>
          <ellipse cx={from} cy={chest - UNIT * 0.35} rx={UNIT * (0.32 + t * 0.1)} ry={UNIT * 1.25} fill="none" stroke={colour} strokeWidth={3.2 * fade + 0.6} opacity={fade} />
          <ellipse cx={from} cy={chest - UNIT * 0.35} rx={UNIT * 0.16} ry={UNIT * 1.05} fill="none" stroke="#ffffff" strokeWidth={1.2 * fade} opacity={fade * 0.8} />
          <rect x={Math.min(from, head)} y={chest - 2.5} width={Math.max(2, Math.abs(head - from))} height={5} rx={2.5} fill={colour} opacity={0.7 * fade} />
          {landed > 0 && cut < 1 ? (
            <path
              d={`M ${to - UNIT * 0.4} ${chest - UNIT * 1.3} Q ${to + UNIT * 1.4} ${chest - UNIT * 0.2} ${to - UNIT * 0.2} ${chest + UNIT * 1.0}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth={4 * (1 - cut) + 0.8}
              strokeLinecap="round"
              opacity={1 - cut}
            />
          ) : null}
          {landed > 0 ? <Dust x={to + UNIT * 0.6} y={y} age={landed} life={Math.max(0.1, life - CHARGE_SECONDS)} colour={dust} seed={Math.round(event.real * 97) + event.count} /> : null}
          <Bracket x1={from} x2={Math.max(to, from + 2)} colour={colour} fade={fade} label={event.to > event.from ? `${event.name} · ${Math.round(event.to - event.from)}` : event.name} />
        </g>
      );
    }
    case "buff": {
      // A bolt from the sky onto the slayer, a splash at its feet and a ring spreading out.
      const strike = Math.min(1, age / 0.2);
      return (
        <g opacity={fade}>
          {strike < 1 ? (
            <g>
              <path d={boltPath(from, chest, Math.round(event.real * 31))} fill="none" stroke={colour} strokeWidth="3" strokeOpacity="0.5" />
              <path d={boltPath(from, chest, Math.round(event.real * 31))} fill="none" stroke="#ffffff" strokeWidth="1" />
            </g>
          ) : null}
          <ellipse cx={from} cy={y} rx={UNIT * (0.4 + t * 1.4)} ry={UNIT * (0.15 + t * 0.3)} fill={colour} fillOpacity={0.35} />
          <circle cx={from} cy={chest} r={UNIT * (0.5 + t * 1.6)} fill="none" stroke={colour} strokeWidth={2.2} />
        </g>
      );
    }
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
      const burst = Math.min(1, age / 0.4);
      return (
        <g>
          {burst < 1 ? (
            <g opacity={1 - burst}>
              {Array.from({ length: box ? 12 : 6 }, (_, i) => {
                const a = (i / (box ? 12 : 6)) * Math.PI * 2 + event.count;
                const d = UNIT * (0.2 + burst * (box ? 1.6 : 0.9));
                return <circle key={i} cx={from + Math.cos(a) * d} cy={chest + Math.sin(a) * d * 0.7} r={box ? 2.2 : 1.6} fill={box ? GOLD : BONE} />;
              })}
            </g>
          ) : null}
          <Loot x={from} ground={y} age={age} life={life} box={box} seed={event.count} />
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
  // Buffs that are on show as icons over the head.
  const buffs = (snap?.skills ?? [])
    .filter((s) => s.active && SKILL_BY_NAME.get(s.name)?.icon)
    .slice(0, 5)
    .map((s) => s.name);
  // A cut-in skill cast lately: the white flash, the darkening and the beam onto the slayer.
  const cutIn = (snap?.casts ?? []).filter((c) => CUT_INS.has(c.name) && time - c.real >= 0 && time - c.real < CUT_IN_SECONDS).at(-1) ?? null;
  const cutInAge = cutIn ? time - cutIn.real : 0;
  const dust = `hsl(${hue} 85% 52%)`;
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

      {cutIn ? (
        <>
          <rect width={W} height={H} fill="#000000" fillOpacity={0.78 * cutInDarkness(cutInAge)} pointerEvents="none" />
          {cutInAge > 0.12 && cutInAge < 0.45 ? (
            <g opacity={Math.min(1, (0.45 - cutInAge) / 0.12)}>
              <rect x={x(shown) - UNIT * 0.55 * (1 - (cutInAge - 0.12) / 0.4)} y={0} width={UNIT * 1.1 * (1 - (cutInAge - 0.12) / 0.4)} height={GROUND} fill={tintOf(cutIn.name, (SKILL_BY_NAME.get(cutIn.name)?.element ?? null) as Element | null)} fillOpacity="0.75" />
              <rect x={x(shown) - UNIT * 0.1} y={0} width={UNIT * 0.2} height={GROUND} fill="#ffffff" fillOpacity="0.85" />
            </g>
          ) : null}
        </>
      ) : null}

      <Slayer x={x(shown)} y={GROUND} element={element} moving={moving} time={time} buffs={buffs} />

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
          dust={dust}
        />
      ))}

      <SkillNames x={x(shown)} y={GROUND} casts={named} time={time} />

      {cutIn && cutInAge < 0.07 ? <rect width={W} height={H} fill="#ffffff" fillOpacity={0.85 * (1 - cutInAge / 0.07)} pointerEvents="none" /> : null}

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

