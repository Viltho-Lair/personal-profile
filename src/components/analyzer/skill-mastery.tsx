"use client";

import Image from "next/image";
import { useState } from "react";
import { isMasteryPageComplete, masteryLevel, openMasteryPages } from "@/lib/profile/rules";
import type { ProfileV1 } from "@/lib/profile/types";
import { useProfile } from "@/lib/profile/use-profile";
import { MASTERY_PAGES, type MasteryNode, type MasteryPage } from "./data";
import { LevelInput } from "./level-input";
import { SideDialog } from "./side-dialog";

const NODE_W = 5;
const NODE_H = 4;
const LINE_ON = "var(--element-water)";

/** Every node on every page, for completing or clearing Skill Mastery in one go. */
const ALL_NODES = MASTERY_PAGES.flatMap((page) => page.nodes);

const pct = (value: number) => `${(value * 100).toLocaleString("en", { maximumFractionDigits: 2 })}%`;

/** "ACC M4" -> "Accessory Mythic 4", as the game labels the required gear. */
function gearName(value: string | null) {
  if (!value) return null;
  const match = /^(ACC|ACCESSORY|WEAPON)\s+M(\d)$/i.exec(value.trim());
  if (!match) return value;
  const kind = match[1].toUpperCase() === "WEAPON" ? "Weapon" : "Accessory";
  return `${kind} Mythic ${match[2]}`;
}

function bonusText(node: MasteryNode, level: number) {
  if (!node.bonus) return null;
  if ("text" in node.bonus) return node.bonus.text;
  const total = node.bonus.perLevel * level;
  return node.bonus.percent ? `+${pct(total)} ${node.label ?? ""}` : `+${total} ${node.label ?? ""}`;
}

function NodeArt({ node, size }: { node: MasteryNode; size: string }) {
  return node.icon && node.iconSize ? (
    <Image
      src={node.icon}
      alt=""
      width={node.iconSize}
      height={node.iconSize}
      draggable={false}
      className={`object-contain ${size}`}
    />
  ) : null;
}

function PageCanvas({
  page,
  profile,
  locked,
  selected,
  onSelect,
}: {
  page: MasteryPage;
  profile: ProfileV1;
  locked: boolean;
  selected: string | null;
  onSelect: (node: MasteryNode) => void;
}) {
  const levelOf = (node: MasteryNode) => masteryLevel(profile, node.id, node.maxLevel);
  const byId = new Map(page.nodes.map((node) => [node.id, node]));
  const center = (node: MasteryNode) => [node.x + NODE_W / 2, node.y + 1.6] as const;

  return (
    <div
      className={`relative mx-auto w-full max-w-[22rem] ${locked ? "opacity-40" : ""}`}
      style={{ aspectRatio: `${page.columns} / ${page.rows}` }}
    >
      <svg
        viewBox={`0 0 ${page.columns} ${page.rows}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {page.links.map((link, index) => {
          const cells = new Set(link.cells.map(([y, x]) => `${y},${x}`));
          const done = link.nodes.every((id) => {
            const node = byId.get(id);
            return node ? levelOf(node) >= node.maxLevel : false;
          });
          const segments: [number, number, number, number][] = [];
          for (const [y, x] of link.cells) {
            if (cells.has(`${y},${x + 1}`)) segments.push([x + 0.5, y + 0.5, x + 1.5, y + 0.5]);
            if (cells.has(`${y + 1},${x}`)) segments.push([x + 0.5, y + 0.5, x + 0.5, y + 1.5]);
            // Joins into a node run to its circle.
            for (const id of link.nodes) {
              const node = byId.get(id);
              if (!node) continue;
              const touches =
                (y === node.y - 1 || y === node.y + NODE_H) && x >= node.x && x < node.x + NODE_W
                  ? true
                  : (x === node.x - 1 || x === node.x + NODE_W) && y >= node.y && y < node.y + NODE_H;
              if (touches) {
                const [cx, cy] = center(node);
                segments.push([x + 0.5, y + 0.5, cx, cy]);
              }
            }
          }
          return (
            // Opacity on the group, not the colour, so overlapping segments don't darken.
            <g key={index} stroke={done ? LINE_ON : "currentColor"} opacity={done ? 1 : 0.3} className="text-ink">
              {segments.map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={0.32} strokeLinecap="round" />
              ))}
            </g>
          );
        })}
      </svg>

      {page.nodes.map((node) => {
        const level = levelOf(node);
        const done = level >= node.maxLevel;
        const [cx, cy] = center(node);
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node)}
            aria-pressed={selected === node.id}
            aria-label={`${node.label ?? "Node"}, ${level} of ${node.maxLevel}`}
            className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center outline-none"
            style={{ left: `${(cx / page.columns) * 100}%`, top: `${(cy / page.rows) * 100}%`, width: `${(NODE_W / page.columns) * 100}%` }}
          >
            <span
              className={`relative block aspect-square w-[62%] rounded-full border-2 bg-zinc-900 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring ${
                selected === node.id
                  ? "border-ink"
                  : done
                    ? "border-element-water"
                    : level > 0
                      ? "border-element-water/50"
                      : "border-ink/25"
              }`}
            >
              <NodeArt node={node} size={`absolute inset-[18%] h-[64%] w-[64%] ${level > 0 ? "" : "opacity-50 grayscale"}`} />
            </span>
            <span className="mt-0.5 rounded bg-ground px-0.5 font-mono text-[9px] leading-none text-ink tabular-nums">
              {level}/{node.maxLevel}
            </span>
          </button>
        );
      })}

      {locked ? (
        <div className="absolute inset-0 flex items-start justify-center pt-8">
          <p className="rounded-md border border-ink/25 bg-ground px-3 py-2 text-center font-mono text-[10px] tracking-[0.08em] text-ink uppercase">
            Fill page {page.page - 1} to open
          </p>
        </div>
      ) : null}
    </div>
  );
}

function NodeDetail({
  node,
  profile,
  locked,
  onLevel,
  onClose,
}: {
  node: MasteryNode;
  profile: ProfileV1;
  locked: boolean;
  onLevel: (level: number) => void;
  onClose: () => void;
}) {
  const level = masteryLevel(profile, node.id, node.maxLevel);
  const maxed = level >= node.maxLevel;
  const cost = node.cost && !maxed ? node.cost.base + node.cost.perLevel * level : null;
  const requires = gearName(node.requires);

  return (
    <SideDialog
      title={node.label ?? "Node"}
      subtitle={<span className="text-dim">{node.kind === "level" ? `Level ${level} / ${node.maxLevel}` : maxed ? "Obtained" : "Not obtained"}</span>}
      art={
        <span className="relative block size-14 shrink-0 rounded-full border border-ink/20 bg-zinc-900">
          <NodeArt node={node} size="absolute inset-[18%] h-[64%] w-[64%]" />
        </span>
      }
      openKey={node.id}
      onClose={onClose}
    >
      {locked ? <p className="text-xs text-dim">This page opens once the page before it is filled.</p> : null}

      {node.kind === "level" ? (
        <LevelInput value={level} min={0} max={node.maxLevel} label="Level" disabled={locked} onChange={onLevel} />
      ) : (
        <label className="flex items-center gap-2 font-mono text-xs tracking-[0.08em] uppercase">
          <input
            type="checkbox"
            checked={maxed}
            disabled={locked}
            onChange={(event) => onLevel(event.target.checked ? 1 : 0)}
            className="size-4 accent-ink"
          />
          {node.reward ? "Claimed" : "Obtained"}
        </label>
      )}

      <dl className="flex flex-col gap-1.5 text-xs">
        {bonusText(node, node.kind === "level" ? level : 1) ? (
          <div className="flex justify-between gap-3">
            <dt className="text-dim">Bonus</dt>
            <dd className="text-right text-ink">{bonusText(node, node.kind === "level" ? level : 1)}</dd>
          </div>
        ) : null}
        {node.bonus && "perLevel" in node.bonus ? (
          <div className="flex justify-between gap-3">
            <dt className="text-dim">Per level</dt>
            <dd className="text-ink">
              +{node.bonus.percent ? pct(node.bonus.perLevel) : node.bonus.perLevel}
            </dd>
          </div>
        ) : null}
        {cost !== null ? (
          <div className="flex justify-between gap-3">
            <dt className="text-dim">{node.kind === "level" ? "Next level costs" : "Costs"}</dt>
            <dd className="text-ink tabular-nums">{cost.toLocaleString("en")}</dd>
          </div>
        ) : null}
        {requires ? (
          <div className="flex justify-between gap-3">
            <dt className="text-dim">Requires</dt>
            <dd className="text-right text-ink">{requires}</dd>
          </div>
        ) : null}
        {node.reward ? (
          <div className="flex justify-between gap-3">
            <dt className="text-dim">Reward</dt>
            <dd className="text-right text-ink">{gearName(node.reward)}</dd>
          </div>
        ) : null}
      </dl>
    </SideDialog>
  );
}

/** Level-node bonuses added up across every page, by stat. */
function totals(profile: ProfileV1) {
  const sums = new Map<string, number>();
  for (const page of MASTERY_PAGES) {
    for (const node of page.nodes) {
      if (node.kind !== "level" || !node.bonus || !("perLevel" in node.bonus) || !node.label) continue;
      const value = node.bonus.perLevel * masteryLevel(profile, node.id, node.maxLevel);
      sums.set(node.label, (sums.get(node.label) ?? 0) + value);
    }
  }
  return [...sums].sort(([a], [b]) => a.localeCompare(b));
}

export function SkillMastery() {
  const { profile, setMasteryLevel, setMasteryPage } = useProfile();
  const open = openMasteryPages(profile, MASTERY_PAGES);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allComplete = isMasteryPageComplete(profile, ALL_NODES);
  const page = MASTERY_PAGES.find((p) => p.page === pageNumber) ?? MASTERY_PAGES[0];
  const index = MASTERY_PAGES.indexOf(page);
  const locked = index >= open;
  const selected = page.nodes.find((node) => node.id === selectedId) ?? null;
  const filled = page.nodes.filter((node) => masteryLevel(profile, node.id, node.maxLevel) >= node.maxLevel).length;

  return (
    <div className="relative flex flex-col md:grid md:h-full md:min-h-0 md:grid-cols-2">
      <div className="flex min-h-0 flex-col border-b border-ink/15 md:border-r md:border-b-0">
        <div className="flex shrink-0 flex-wrap gap-1 border-b border-ink/10 px-3 py-2 sm:px-4">
          {MASTERY_PAGES.map((p, i) => {
            const pageLocked = i >= open;
            const complete = isMasteryPageComplete(profile, p.nodes);
            return (
              <button
                key={p.page}
                type="button"
                aria-pressed={p.page === page.page}
                aria-label={`Page ${p.page}${pageLocked ? ", locked" : complete ? ", filled" : ""}`}
                onClick={() => {
                  setPageNumber(p.page);
                  setSelectedId(null);
                }}
                className={`min-w-7 rounded-md border px-1.5 py-1 font-mono text-[10px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  p.page === page.page
                    ? "border-ink bg-ink text-ground"
                    : complete
                      ? "border-element-water/60 text-element-water"
                      : pageLocked
                        ? "border-ink/15 text-dim/60"
                        : "border-ink/25 text-dim hover:text-ink"
                }`}
              >
                {pageLocked ? "🔒" : p.page}
              </button>
            );
          })}
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto p-3 sm:p-4">
          <div className="sticky top-0 z-10 flex justify-end">
            <button
              type="button"
              onClick={() => setMasteryPage(ALL_NODES, !allComplete)}
              className={`rounded-md border px-2 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                allComplete
                  ? "border-ink/25 bg-ground text-dim hover:border-ink hover:text-ink"
                  : "border-element-water bg-ground text-element-water hover:bg-element-water hover:text-ground"
              }`}
            >
              {allComplete ? "Clear all pages" : "Complete all pages"}
            </button>
          </div>
          <PageCanvas
            page={page}
            profile={profile}
            locked={locked}
            selected={selectedId}
            onSelect={(node) => setSelectedId(node.id)}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-4 overflow-auto p-3 sm:p-4">
        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">Page {page.page}</h3>
          <p className="text-xs text-ink">
            {filled} of {page.nodes.length} nodes filled
          </p>
          <p className="text-[11px] leading-snug text-dim">
            {locked
              ? `Fill page ${page.page - 1} to open this page.`
              : "Click a node to set its level. The next page opens once every node here is filled."}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={locked}
              onClick={() => setMasteryPage(page.nodes, true)}
              className="rounded-md border border-ink/25 px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-dim uppercase hover:border-ink hover:text-ink disabled:opacity-40"
            >
              Fill page
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => setMasteryPage(page.nodes, false)}
              className="rounded-md border border-ink/25 px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-dim uppercase hover:border-ink hover:text-ink disabled:opacity-40"
            >
              Clear page
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-mono text-[10px] tracking-[0.12em] text-dim uppercase">All pages</h3>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.06em] uppercase">
            {totals(profile).map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-dim">{label}</dt>
                <dd className="text-right text-ink tabular-nums">+{pct(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {selected ? (
        <NodeDetail
          node={selected}
          profile={profile}
          locked={locked}
          onLevel={(level) => setMasteryLevel(selected.id, level, selected.maxLevel)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}
