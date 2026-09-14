"use client";

import Image from "next/image";
import { useState } from "react";
import treeData from "@/data/optimizer/memory-tree.json";
import {
  costToMax,
  mainNodeComplete,
  maxedTree,
  subNodeLevel,
  subNodeOpen,
  totalSubNodeLevels,
  treeBonuses,
  treeBuffs,
  treeLevel,
  type MemoryTree,
  type TreeMainNode,
} from "@/lib/game/memory-tree";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue } from "./data";
import { InlineLevel } from "./level-input";
import { formatNumber } from "@/lib/number-format";

const TREE = treeData as unknown as MemoryTree & { icons: Record<string, { icon: string; iconSize: number }> };

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const BUTTON =
  "rounded-md border border-ink/25 px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-dim uppercase outline-none hover:border-ink/60 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring";

const MODES: Record<string, string> = {
  RIFT: "Dimensional Rift",
  STAGE: "Stage",
  TC: "Training Cave",
  CM: "Closed Mine",
  ALL: "All modes",
  FoC: "FoC",
};
const pct = (fraction: number) => `${formatNumber(fraction * 100, 2)}%`;
const titleCase = (name: string) =>
  name === "EXP" ? name : name.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const iconFor = (name: string | null | undefined) =>
  name ? TREE.icons[name.toLowerCase().replace(/[^a-z0-9]+/g, "-")] : undefined;

function BuffIcon({ name, className = "size-6" }: { name: string | null | undefined; className?: string }) {
  const art = iconFor(name);
  return art ? (
    <Image src={art.icon} alt="" width={art.iconSize} height={art.iconSize} draggable={false} className={`shrink-0 object-contain ${className}`} />
  ) : (
    <span className={`shrink-0 ${className}`} />
  );
}

/**
 * Lays the main nodes out as a tree growing upward: leaves spread evenly in
 * depth-first order, each parent sits over the middle of its children.
 */
function layout(nodes: TreeMainNode[]) {
  const children = new Map<number, number[]>();
  for (const node of nodes) {
    for (const parent of node.requires) children.set(parent, [...(children.get(parent) ?? []), node.id]);
  }
  const roots = nodes.filter((node) => node.requires.length === 0).map((node) => node.id);
  const x = new Map<number, number>();
  const depth = new Map<number, number>();
  let leaf = 0;
  const walk = (id: number, d: number) => {
    depth.set(id, d);
    const kids = (children.get(id) ?? []).sort((a, b) => a - b);
    if (kids.length === 0) {
      x.set(id, leaf++);
      return;
    }
    kids.forEach((kid) => walk(kid, d + 1));
    x.set(id, kids.reduce((sum, kid) => sum + (x.get(kid) ?? 0), 0) / kids.length);
  };
  roots.forEach((root) => walk(root, 0));
  const maxDepth = Math.max(...depth.values());
  const width = 320;
  const height = 300;
  return {
    width,
    height,
    point: (id: number) => ({
      x: 24 + ((x.get(id) ?? 0) / Math.max(1, leaf - 1)) * (width - 48),
      y: height - 44 - ((depth.get(id) ?? 0) / Math.max(1, maxDepth)) * (height - 84),
    }),
    edges: nodes.flatMap((node) => node.requires.map((parent) => [parent, node.id] as const)),
    depthOf: (id: number) => depth.get(id) ?? 0,
  };
}

const LAYOUT = layout(TREE.mainNodes);
const MAIN_BY_ID = new Map(TREE.mainNodes.map((node) => [node.id, node]));

function TreeCanvas({
  levels,
  treeLvl,
  selected,
  onSelect,
}: {
  levels: Record<string, number>;
  treeLvl: number;
  selected: number;
  onSelect: (id: number) => void;
}) {
  const { width, height, point, edges, depthOf } = LAYOUT;
  const root = TREE.mainNodes.find((node) => node.requires.length === 0);
  const rootPoint = root ? point(root.id) : { x: width / 2, y: height - 44 };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto w-full max-w-[26rem] rounded-lg bg-zinc-950" role="group" aria-label="Memory Tree main nodes">
      <defs>
        <radialGradient id="tree-sky" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#3b2a0a" />
          <stop offset="60%" stopColor="#140f06" />
          <stop offset="100%" stopColor="#09090b" />
        </radialGradient>
        <linearGradient id="tree-branch" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <radialGradient id="tree-dot-lit">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="45%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <radialGradient id="tree-glow">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill="url(#tree-sky)" />
      {/* trunk and roots */}
      <path
        d={`M ${rootPoint.x - 18} ${height} Q ${rootPoint.x - 4} ${height - 20} ${rootPoint.x} ${rootPoint.y} Q ${rootPoint.x + 4} ${height - 20} ${rootPoint.x + 18} ${height} Z`}
        fill="url(#tree-branch)"
        opacity={0.85}
      />
      {edges.map(([from, to]) => {
        const a = point(from);
        const b = point(to);
        const parent = MAIN_BY_ID.get(from);
        const lit = parent ? mainNodeComplete(parent, levels) : false;
        return (
          <path
            key={`${from}-${to}`}
            d={`M ${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2 + 10}, ${b.x} ${b.y}`}
            fill="none"
            stroke="url(#tree-branch)"
            strokeWidth={Math.max(1.5, 7 - depthOf(to))}
            strokeLinecap="round"
            opacity={lit ? 0.95 : 0.35}
          />
        );
      })}
      {TREE.mainNodes.map((main) => {
        const { x, y } = point(main.id);
        const spent = main.subNodes.reduce((t, n) => t + subNodeLevel(levels, n), 0);
        const max = main.subNodes.reduce((t, n) => t + n.maxLevel, 0);
        const complete = spent >= max;
        const open = main.subNodes.some((n) => subNodeOpen(TREE, main, n, levels, treeLvl));
        const r = 9;
        const circumference = 2 * Math.PI * (r + 3);
        return (
          <g
            key={main.id}
            role="button"
            tabIndex={0}
            aria-label={`Node ${main.id}: ${spent} of ${max} levels`}
            aria-pressed={selected === main.id}
            onClick={() => onSelect(main.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(main.id);
              }
            }}
            className="cursor-pointer outline-none"
          >
            {complete ? <circle cx={x} cy={y} r={r * 2.4} fill="url(#tree-glow)" /> : null}
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={complete ? "url(#tree-dot-lit)" : open || spent > 0 ? "#78350f" : "#27272a"}
              stroke={complete ? "#fef3c7" : open || spent > 0 ? "#f59e0b" : "#52525b"}
              strokeWidth={1.5}
            />
            {!complete && spent > 0 ? (
              <circle
                cx={x}
                cy={y}
                r={r + 3}
                fill="none"
                stroke="#fcd34d"
                strokeWidth={2}
                strokeDasharray={`${(spent / max) * circumference} ${circumference}`}
                transform={`rotate(-90 ${x} ${y})`}
              />
            ) : null}
            {selected === main.id ? <circle cx={x} cy={y} r={r + 6} fill="none" stroke="#ffffff" strokeWidth={1.5} /> : null}
            <text
              x={x}
              y={y + 3}
              textAnchor="middle"
              className="pointer-events-none font-mono"
              fontSize={8}
              fill={complete ? "#451a03" : "#fde68a"}
            >
              {main.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MemoryTreeTab() {
  const { profile, updateCharacter } = useProfile();
  const levels = profile.character.memoryTree;
  const [selected, setSelected] = useState(1);

  const { spent, max } = totalSubNodeLevels(TREE, levels);
  const current = treeLevel(TREE, spent);
  const bonus = treeBonuses(TREE, current.level, current.grade);
  const { buffs, rewards } = treeBuffs(TREE, levels);
  const main = TREE.mainNodes.find((node) => node.id === selected) ?? TREE.mainNodes[0];
  const progress = current.next ? (spent - current.needs) / Math.max(1, current.next.needsSubNodeLevels - current.needs) : 1;

  const setLevels = (next: Record<string, number>) => updateCharacter((c) => ({ ...c, memoryTree: next }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ink/15 p-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-semibold text-tier-legendary tabular-nums">{current.grade}</span>
          <span className={LABEL}>grade</span>
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-medium tabular-nums">Lv. {current.level}</span>
            <span className={LABEL}>
              {current.next ? `${spent} / ${current.next.needsSubNodeLevels} sub node levels` : "Max level"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next tree level">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
        </div>
        <div className="flex gap-1.5">
          <button type="button" className={BUTTON} onClick={() => setLevels(maxedTree(TREE))}>
            Max all nodes
          </button>
          <button type="button" className={BUTTON} onClick={() => setLevels({})}>
            Clear
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 font-mono text-[10px] uppercase sm:grid-cols-5">
        {[
          ["ATK", pct(bonus.atk)],
          ["HP", pct(bonus.hp)],
          ["HP Regen (VIT)", pct(bonus.vit)],
          ["ATK multiplier", pct(bonus.atkMultiplier)],
          ["HP multiplier", pct(bonus.hpMultiplier)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-ink/10 p-2">
            <dt className="text-dim">{label}</dt>
            <dd className="text-sm text-ink tabular-nums">+{value}</dd>
          </div>
        ))}
      </dl>

      <TreeCanvas levels={levels} treeLvl={current.level} selected={main.id} onSelect={setSelected} />

      <section className="flex flex-col gap-2 rounded-lg border border-ink/15 p-3">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium">Node {main.id}</h3>
          <span className={LABEL}>
            {main.subNodes.reduce((t, n) => t + subNodeLevel(levels, n), 0)} / {main.subNodes.reduce((t, n) => t + n.maxLevel, 0)} levels
            {main.requires.length ? ` · after node ${main.requires.join(", ")}` : ""}
          </span>
        </header>
        <ul className="flex flex-col gap-1.5">
          {main.subNodes.map((node) => {
            const level = subNodeLevel(levels, node);
            const open = subNodeOpen(TREE, main, node, levels, current.level);
            const name = node.reward ? node.reward.type : node.buff;
            return (
              <li
                key={node.id}
                className={`flex flex-wrap items-center gap-2 rounded-md border border-ink/10 p-2 ${open || level > 0 ? "" : "opacity-60"}`}
              >
                <span className="rounded bg-zinc-900 p-0.5">
                  <BuffIcon name={name} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-tight font-medium">
                    {node.number}.{" "}
                    {node.reward
                      ? `${node.reward.type} ×${node.reward.amount}`
                      : `${titleCase(node.buff ?? "")} +${pct((node.valuePerLevel ?? 0) * level)}`}
                    {!node.reward ? (
                      <span className="font-normal text-dim"> · {MODES[node.mode ?? ""] ?? node.mode}</span>
                    ) : null}
                  </p>
                  <p className={LABEL}>
                    {node.reward ? "Reward" : `+${pct(node.valuePerLevel ?? 0)} per level`}
                    {node.costPerLevel ? ` · ${formatValue(node.costPerLevel)} per level` : ""}
                    {!open ? ` · needs tree Lv. ${node.requiresTreeLevel}${node.requires.length ? ` and ${node.requires.join(", ")} maxed` : ""}` : ""}
                    {!open && level > 0 ? " · not open yet" : ""}
                  </p>
                </div>
                <InlineLevel
                  name={`Node ${main.id}.${node.number}`}
                  value={level}
                  min={0}
                  max={node.maxLevel}
                  onChange={(next) => setLevels({ ...levels, [node.id]: next })}
                />
                <span className="w-9 text-right font-mono text-[10px] text-dim tabular-nums">/ {node.maxLevel}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className={LABEL}>Tree buffs</h3>
          <span className={LABEL}>
            Sub nodes {spent} / {max} · {formatValue(costToMax(TREE, levels))} to max
          </span>
        </div>
        {buffs.length ? (
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {buffs.map((buff) => (
              <li key={`${buff.buff}-${buff.mode}`} className="flex items-center gap-2 rounded-md border border-ink/10 px-2 py-1">
                <span className="rounded bg-zinc-900 p-0.5">
                  <BuffIcon name={buff.buff} className="size-5" />
                </span>
                <span className="flex-1 text-xs">
                  {titleCase(buff.buff)} <span className="text-dim">· {MODES[buff.mode] ?? buff.mode}</span>
                </span>
                <span className="font-mono text-xs tabular-nums">+{pct(buff.value)}</span>
              </li>
            ))}
            {rewards.map((reward) => (
              <li key={reward.type} className="flex items-center gap-2 rounded-md border border-ink/10 px-2 py-1">
                <span className="rounded bg-zinc-900 p-0.5">
                  <BuffIcon name={reward.type} className="size-5" />
                </span>
                <span className="flex-1 text-xs">{reward.type}</span>
                <span className="font-mono text-xs tabular-nums">×{formatValue(reward.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-dim">No sub node levels yet.</p>
        )}
      </section>
    </div>
  );
}
