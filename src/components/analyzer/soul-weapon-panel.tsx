"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  activeCellCount,
  canPlace,
  GEM_RARITIES,
  GEM_SHAPES,
  GEM_SLOTS,
  gemTotals,
  occupancy,
  plateComplete,
  rotatedCells,
  shapeOf,
  type GemPlacement,
  type SoulGem,
} from "@/lib/game/engraving";
import { equippedKey, soulWeaponOwned } from "@/lib/profile/rules";
import { useProfile } from "@/lib/profile/use-profile";
import { formatValue, SOUL_WEAPONS, type SoulWeapon } from "./data";
import { EquipButton, EquippedBadge, OwnedToggle } from "./profile-controls";
import { SideDialog } from "./side-dialog";
import { Sprite } from "./sprite";
import { SOUL_GRIDS } from "./stat-sources";

const LABEL = "font-mono text-[10px] tracking-[0.08em] text-dim uppercase";
const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink";
const INPUT =
  "w-16 rounded-md border border-ink/20 bg-transparent px-1.5 py-1 text-right font-mono text-[11px] text-ink tabular-nums outline-none focus-visible:border-ink";
const BUTTON =
  "rounded-md border border-ink/25 px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-dim uppercase outline-none enabled:hover:border-ink/60 enabled:hover:text-ink focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

/** Grade colours matching the soul gem art: White, Green, Orange, Purple, Red, Aqua. */
const RARITY_COLOUR = ["#d1d5db", "#10b981", "#f97316", "#a855f7", "#ef4444", "#22d3ee"];

const gemArt = (gem: SoulGem) => `/art/soul-gems/gem-${gem.rarity}-${gem.shape}.png`;
const typeArt = (shape: number) => `/art/soul-gems/type-${shape}.png`;
const statText = (gem: SoulGem) => {
  const shape = shapeOf(gem.shape);
  return shape ? `${shape.label} +${formatValue(gem.value)}${shape.percent ? "%" : ""}` : "—";
};

function useEngravingState(weapon: SoulWeapon) {
  const { profile } = useProfile();
  const engraving = profile.soulEngraving;
  const grid = SOUL_GRIDS[weapon.id] ?? null;
  const plate = engraving.plates[weapon.name] ?? [];
  const complete = grid ? plateComplete(grid.rows, plate, engraving.gems) : engraving.completed[weapon.name] === true;
  return { engraving, grid, plate, complete };
}

/* --------------------------------------------------------------- list */

function SoulWeaponRow({ weapon, onEngrave }: { weapon: SoulWeapon; onEngrave: () => void }) {
  const { profile, setOwned, equip } = useProfile();
  const owned = soulWeaponOwned(profile, weapon.name);
  const equipped = equippedKey(profile, "soulWeapons") === weapon.name;
  const { grid, plate, complete, engraving } = useEngravingState(weapon);
  const stage = weapon.stage.name ?? (weapon.stage.number ? `Stage ${weapon.stage.number}` : null);
  const covered = grid ? occupancy(plate, engraving.gems).size : 0;

  return (
    <li className={`relative flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-ink/15 p-2 ${owned ? "" : "opacity-60"}`}>
      {equipped ? <EquippedBadge /> : null}
      {weapon.icon && weapon.iconSize ? (
        <Sprite src={weapon.icon} native={weapon.iconSize} size={64} className="size-12 rounded-md border border-ink/15" />
      ) : (
        <span className="size-12" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-tight font-medium">
          {weapon.name} <span className="font-mono text-[10px] text-dim">#{weapon.id}</span>
        </p>
        <p className={LABEL}>{[stage, weapon.soulColor].filter(Boolean).join(" · ")}</p>
        <p className="font-mono text-[10px] text-dim tabular-nums">
          ATK {formatValue(weapon.attack)} · Souls {formatValue(weapon.cost)}
          {weapon.requirement.item ? ` · Needs ${[weapon.requirement.item, weapon.requirement.grade].filter(Boolean).join(" ")}` : ""}
        </p>
        <p className="font-mono text-[10px] text-dim tabular-nums">
          Completion ATK {formatValue(weapon.engraving.atk)}% / HP {formatValue(weapon.engraving.hp)}% ·{" "}
          <span className={complete ? "text-emerald-500" : ""}>
            {complete ? "Complete" : grid ? `${covered}/${activeCellCount(grid.rows)} cells` : "Plate not mapped"}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <OwnedToggle owned={owned} name={weapon.name} onChange={(on) => setOwned("soulWeapons", weapon.name, on)} />
        <EquipButton equipped={equipped} name={weapon.name} onToggle={() => equip("soulWeapons", equipped ? null : weapon.name)} />
        <button type="button" className={BUTTON} onClick={onEngrave} aria-label={`Engraving for ${weapon.name}`}>
          Engraving
        </button>
      </div>
    </li>
  );
}

/* --------------------------------------------------------------- settings */

function GemEditor({ index }: { index: number }) {
  const { profile, setSoulGem } = useProfile();
  const gem = profile.soulEngraving.gems[index];
  if (!gem) {
    return (
      <li className="flex items-center justify-between gap-2 rounded-md border border-dashed border-ink/20 p-2">
        <span className={LABEL}>Gem {index + 1} · empty</span>
        <button type="button" className={BUTTON} onClick={() => setSoulGem(index, { shape: 1, rarity: 0, level: 1, value: 0 })}>
          Add gem
        </button>
      </li>
    );
  }
  const shape = shapeOf(gem.shape);
  const set = (change: Partial<SoulGem>) => setSoulGem(index, { ...gem, ...change });
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-ink/15 p-2">
      <span className="relative flex size-12 shrink-0 items-center justify-center rounded bg-zinc-950">
        <Image src={gemArt(gem)} alt="" width={79} height={123} className="h-10 w-auto object-contain" draggable={false} />
        <Image src={typeArt(gem.shape)} alt="" width={64} height={64} className="absolute -top-1 -left-1 size-5" draggable={false} />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <select aria-label={`Gem ${index + 1} shape`} value={gem.shape} onChange={(e) => set({ shape: Number(e.target.value) })} className={SELECT}>
          {GEM_SHAPES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.label}
            </option>
          ))}
        </select>
        <select
          aria-label={`Gem ${index + 1} rarity`}
          value={gem.rarity}
          onChange={(e) => set({ rarity: Number(e.target.value) })}
          className={SELECT}
          style={{ color: RARITY_COLOUR[gem.rarity] }}
        >
          {GEM_RARITIES.map((r, i) => (
            <option key={r} value={i}>
              {r}
            </option>
          ))}
        </select>
        <label className={`flex items-center gap-1 ${LABEL}`}>
          Lv
          <input
            type="number"
            min={1}
            value={gem.level}
            aria-label={`Gem ${index + 1} level`}
            onChange={(e) => set({ level: Math.max(1, Math.floor(e.target.valueAsNumber || 1)) })}
            className={INPUT}
          />
        </label>
        <label className={`flex items-center gap-1 ${LABEL}`}>
          {shape?.label}
          <input
            type="number"
            min={0}
            step={0.1}
            value={gem.value}
            aria-label={`Gem ${index + 1} ${shape?.label} value`}
            onChange={(e) => set({ value: Math.max(0, e.target.valueAsNumber || 0) })}
            className={INPUT}
          />
          {shape?.percent ? "%" : ""}
        </label>
      </div>
      <button type="button" className={BUTTON} onClick={() => setSoulGem(index, null)} aria-label={`Remove gem ${index + 1}`}>
        ✕
      </button>
    </li>
  );
}

function EngravingSettings() {
  const { profile, setChaos } = useProfile();
  const engraving = profile.soulEngraving;
  const equipped = SOUL_WEAPONS.find((w) => w.name === equippedKey(profile, "soulWeapons"));
  const totals = gemTotals(equipped ? (engraving.plates[equipped.name] ?? []) : [], engraving.gems);

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2 rounded-lg border border-ink/15 p-3">
        <h3 className={LABEL}>Chaos level</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className={`flex items-center gap-1.5 ${LABEL}`}>
            Lv
            <input
              type="number"
              min={0}
              value={engraving.chaosLevel}
              aria-label="Chaos level"
              onChange={(e) => setChaos({ chaosLevel: Math.max(0, Math.floor(e.target.valueAsNumber || 0)) })}
              className={INPUT}
            />
          </label>
          <label className={`flex items-center gap-1.5 ${LABEL}`}>
            Completion bonus
            <input
              type="number"
              min={0}
              step={0.1}
              value={Number((engraving.chaosBonus * 100).toFixed(4))}
              aria-label="Chaos level completion bonus"
              onChange={(e) => setChaos({ chaosBonus: Math.max(0, e.target.valueAsNumber || 0) / 100 })}
              className={INPUT}
            />
            %
          </label>
        </div>
        <p className="text-[11px] leading-snug text-dim">
          The chaos level (raised with Chaos Souls) strengthens soul gems and the completion effect. Its table isn&apos;t in
          the workbook: enter the bonus the game shows (a completion of ATK 33.9% showing as 40.3% is +19%).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className={LABEL}>Soul gems ({engraving.gems.filter(Boolean).length}/{GEM_SLOTS})</h3>
        <ul className="flex flex-col gap-1.5">
          {Array.from({ length: GEM_SLOTS }, (_, i) => (
            <GemEditor key={i} index={i} />
          ))}
        </ul>
        <p className="text-[11px] leading-snug text-dim">
          A gem&apos;s stat follows its shape. Enter each gem&apos;s value as the game shows it; gem stat tables aren&apos;t
          published.
        </p>
      </section>

      <section className="flex flex-col gap-1 rounded-lg bg-ink/[0.04] p-3">
        <h3 className={LABEL}>{equipped ? `Equipped: ${equipped.name}` : "No soul weapon equipped"}</h3>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 font-mono text-[11px]">
          {GEM_SHAPES.map((s) => (
            <div key={s.id} className="contents">
              <dt className="text-dim">{s.label}</dt>
              <dd className="text-right tabular-nums">
                +{formatValue(s.percent ? totals[s.stat] * 100 : totals[s.stat])}
                {s.percent ? "%" : ""}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- board */

type Held = { gem: number; rotation: number; moved: boolean };

function GemCell({ gem, links }: { gem: SoulGem; links: { up: boolean; down: boolean; left: boolean; right: boolean } }) {
  const colour = RARITY_COLOUR[gem.rarity];
  const bar = "absolute bg-current";
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ color: colour }}>
      {links.up ? <span className={`${bar} top-0 left-1/2 h-1/2 w-1.5 -translate-x-1/2`} /> : null}
      {links.down ? <span className={`${bar} bottom-0 left-1/2 h-1/2 w-1.5 -translate-x-1/2`} /> : null}
      {links.left ? <span className={`${bar} top-1/2 left-0 h-1.5 w-1/2 -translate-y-1/2`} /> : null}
      {links.right ? <span className={`${bar} top-1/2 right-0 h-1.5 w-1/2 -translate-y-1/2`} /> : null}
      <span
        className="relative size-3/5 rotate-45 rounded-sm border border-white/60 shadow-[0_0_10px_currentColor]"
        style={{ background: `linear-gradient(135deg, #ffffff 0%, ${colour} 45%, #111827 120%)` }}
      />
    </span>
  );
}

function EngravingBoard({ weapon }: { weapon: SoulWeapon }) {
  const { placeSoulGem, removeSoulGem, setPlateCompleted } = useProfile();
  const { engraving, grid, plate, complete } = useEngravingState(weapon);
  const gems = engraving.gems;
  const boardRef = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState<Held | null>(null);
  // The drag listeners read the held gem here, so dropping can update the profile outside a state updater.
  const heldRef = useRef<Held | null>(null);
  useEffect(() => {
    heldRef.current = held;
  }, [held]);
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [trayRotation, setTrayRotation] = useState<Record<number, number>>({});

  const size = grid?.rows.length ?? 0;
  const placedGems = new Set(plate.map((p) => p.gem));
  const covered = occupancy(plate, gems);

  const candidate = (h: Held, cell: { row: number; col: number }): GemPlacement | null => {
    const gem = gems[h.gem];
    if (!gem) return null;
    const cells = rotatedCells(gem.shape, h.rotation);
    const height = Math.max(...cells.map(([r]) => r)) + 1;
    const width = Math.max(...cells.map(([, c]) => c)) + 1;
    // The pointer holds the middle of the gem.
    return { gem: h.gem, rotation: h.rotation, row: cell.row - Math.floor((height - 1) / 2), col: cell.col - Math.floor((width - 1) / 2) };
  };
  const preview = held && hover ? candidate(held, hover) : null;
  const previewFits = preview && grid ? canPlace(grid.rows, plate, gems, preview) : false;
  const previewCells = new Set(
    preview && gems[preview.gem]
      ? rotatedCells(gems[preview.gem]!.shape, preview.rotation).map(([r, c]) => `${r + preview.row},${c + preview.col}`)
      : [],
  );

  const cellAt = useCallback(
    (x: number, y: number) => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect || size === 0 || x < rect.left || y < rect.top || x > rect.right || y > rect.bottom) return null;
      return {
        row: Math.min(size - 1, Math.floor(((y - rect.top) / rect.height) * size)),
        col: Math.min(size - 1, Math.floor(((x - rect.left) / rect.width) * size)),
      };
    },
    [size],
  );

  const rotate = useCallback(() => setHeld((h) => (h ? { ...h, rotation: (h.rotation + 1) % 4 } : h)), []);

  const drop = useCallback(
    (h: Held, cell: { row: number; col: number } | null) => {
      if (!grid || !cell) return false;
      const gem = gems[h.gem];
      if (!gem) return false;
      const cells = rotatedCells(gem.shape, h.rotation);
      const height = Math.max(...cells.map(([r]) => r)) + 1;
      const width = Math.max(...cells.map(([, c]) => c)) + 1;
      const placement = { gem: h.gem, rotation: h.rotation, row: cell.row - Math.floor((height - 1) / 2), col: cell.col - Math.floor((width - 1) / 2) };
      if (!canPlace(grid.rows, plate, gems, placement)) return false;
      placeSoulGem(weapon.name, placement);
      return true;
    },
    [grid, gems, plate, placeSoulGem, weapon.name],
  );

  // While a gem is held: follow the pointer, rotate with R or a right click, drop on release.
  useEffect(() => {
    if (!held) return;
    const onMove = (event: PointerEvent) => {
      setPointer({ x: event.clientX, y: event.clientY });
      setHover(cellAt(event.clientX, event.clientY));
      if (heldRef.current && !heldRef.current.moved) setHeld({ ...heldRef.current, moved: true });
    };
    const onUp = (event: PointerEvent) => {
      const h = heldRef.current;
      setPointer(null);
      if (!h) return;
      if (drop(h, cellAt(event.clientX, event.clientY))) setHeld(null);
      // A tap without dragging keeps the gem in hand; tap a cell to place it.
      else setHeld(h.moved ? null : { ...h, moved: true });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "r" || event.key === "R") rotate();
      if (event.key === "Escape") setHeld(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [held, cellAt, drop, rotate]);

  const pickFromTray = (event: ReactPointerEvent, gem: number) => {
    event.preventDefault();
    setHeld({ gem, rotation: trayRotation[gem] ?? 0, moved: false });
    setPointer({ x: event.clientX, y: event.clientY });
  };

  const pickFromBoard = (event: ReactPointerEvent, row: number, col: number) => {
    const gem = covered.get(`${row},${col}`);
    if (gem === undefined || held) return;
    event.preventDefault();
    const placement = plate.find((p) => p.gem === gem);
    removeSoulGem(weapon.name, gem);
    setHeld({ gem, rotation: placement?.rotation ?? 0, moved: false });
    setHover({ row, col });
    setPointer({ x: event.clientX, y: event.clientY });
  };

  if (!grid) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs leading-snug text-dim">
          This weapon&apos;s engraving plate isn&apos;t mapped yet, so gems can&apos;t be placed here. Tick it when the plate
          is complete in the game to count its completion effect.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={complete} onChange={(e) => setPlateCompleted(weapon.name, e.target.checked)} className="accent-ink" />
          Completed in game
        </label>
      </div>
    );
  }

  const total = activeCellCount(grid.rows);
  const heldGem = held ? gems[held.gem] : null;

  return (
    <div className="flex select-none flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`font-mono text-[11px] tabular-nums ${complete ? "text-emerald-500" : "text-dim"}`}>
          {complete ? "Complete" : `${covered.size}/${total} cells`}
        </span>
        <div className="flex gap-1.5">
          <button type="button" className={BUTTON} disabled={!held} onClick={rotate}>
            Rotate (R)
          </button>
          <button type="button" className={BUTTON} disabled={plate.length === 0} onClick={() => removeSoulGem(weapon.name, null)}>
            Clear plate
          </button>
        </div>
      </div>

      <div
        ref={boardRef}
        role="grid"
        aria-label={`${weapon.name} engraving plate`}
        onContextMenu={(e) => {
          if (held) {
            e.preventDefault();
            rotate();
          }
        }}
        onPointerMove={(e) => held && setHover(cellAt(e.clientX, e.clientY))}
        onPointerLeave={() => setHover(null)}
        className={`mx-auto grid aspect-square w-full max-w-[22rem] touch-none gap-1 rounded-xl bg-zinc-950 p-2 ${
          complete ? "shadow-[0_0_24px_#22d3ee] ring-2 ring-cyan-300" : "ring-1 ring-white/10"
        }`}
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {grid.rows.flatMap((line, row) =>
          line.split("").map((ch, col) => {
            const at = `${row},${col}`;
            const gemIndex = covered.get(at);
            const gem = gemIndex !== undefined ? gems[gemIndex] : null;
            const same = (r: number, c: number) => gemIndex !== undefined && covered.get(`${r},${c}`) === gemIndex;
            const inPreview = previewCells.has(at);
            return (
              <div
                key={at}
                role="gridcell"
                aria-label={ch === "#" ? (gem ? `${statText(gem)} at row ${row + 1}, column ${col + 1}` : `Open cell ${row + 1}, ${col + 1}`) : undefined}
                onPointerDown={(e) => pickFromBoard(e, row, col)}
                onClick={() => {
                  if (held && held.moved && drop(held, { row, col })) setHeld(null);
                }}
                className={`relative rounded-md ${
                  ch === "#" ? "bg-stone-700/60 ring-1 ring-black/60" : "bg-transparent"
                } ${gem ? "cursor-grab" : ""}`}
              >
                {gem ? <GemCell gem={gem} links={{ up: same(row - 1, col), down: same(row + 1, col), left: same(row, col - 1), right: same(row, col + 1) }} /> : null}
                {inPreview ? (
                  <span className={`pointer-events-none absolute inset-0 rounded-md ${previewFits ? "bg-emerald-400/40 ring-2 ring-emerald-300" : "bg-red-500/40 ring-2 ring-red-400"}`} />
                ) : null}
              </div>
            );
          }),
        )}
      </div>

      {total % 4 !== 0 ? (
        <p className="text-[11px] text-amber-600">
          This mapped plate has {total} open cells, which four-cell gems can&apos;t fill exactly; the layout may be off.
        </p>
      ) : null}

      <p className="text-center font-mono text-xs text-cyan-600 tabular-nums">
        Completion Effect: ATK +{formatValue((weapon.engraving.atk ?? 0) * (1 + engraving.chaosBonus))}%, HP +
        {formatValue((weapon.engraving.hp ?? 0) * (1 + engraving.chaosBonus))}%
      </p>

      <div>
        <h4 className={LABEL}>Gems · drag onto the plate, R or right click to rotate</h4>
        <ul className="mt-1.5 grid grid-cols-4 gap-2">
          {gems.map((gem, index) => {
            const onPlate = placedGems.has(index);
            const inHand = held?.gem === index;
            return (
              <li key={index}>
                {gem ? (
                  <div
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-md border bg-zinc-950 ${
                      inHand ? "border-cyan-300" : "border-white/10"
                    } ${onPlate ? "opacity-35" : "cursor-grab touch-none"}`}
                    onPointerDown={(e) => !onPlate && pickFromTray(e, index)}
                    aria-label={`${GEM_RARITIES[gem.rarity]} ${shapeOf(gem.shape)?.name} gem, ${statText(gem)}${onPlate ? ", on the plate" : ""}`}
                    role="button"
                  >
                    <Image
                      src={gemArt(gem)}
                      alt=""
                      width={79}
                      height={123}
                      draggable={false}
                      className="h-3/4 w-auto object-contain transition-transform"
                      style={{ transform: `rotate(${(inHand ? held!.rotation : (trayRotation[index] ?? 0)) * 90}deg)` }}
                    />
                    <Image src={typeArt(gem.shape)} alt="" width={64} height={64} draggable={false} className="absolute top-0.5 left-0.5 size-5" />
                    <span className="absolute right-1 bottom-0.5 font-mono text-[9px] text-white/80">Lv.{gem.level}</span>
                    {!onPlate ? (
                      <button
                        type="button"
                        aria-label={`Rotate gem ${index + 1}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setTrayRotation((r) => ({ ...r, [index]: ((r[index] ?? 0) + 1) % 4 }))}
                        className="absolute top-0.5 right-0.5 rounded bg-white/10 px-1 text-[10px] text-white hover:bg-white/25"
                      >
                        ↻
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-md border border-dashed border-ink/20 font-mono text-[9px] text-dim">
                    Empty
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {gems.every((g) => !g) ? <p className="mt-2 text-[11px] text-dim">Add gems in the settings first.</p> : null}
      </div>

      {held && heldGem && pointer && held.moved ? (
        <Image
          src={gemArt(heldGem)}
          alt=""
          width={79}
          height={123}
          draggable={false}
          className="pointer-events-none fixed z-50 h-16 w-auto -translate-x-1/2 -translate-y-1/2 opacity-80"
          style={{ left: pointer.x, top: pointer.y, transform: `translate(-50%, -50%) rotate(${held.rotation * 90}deg)` }}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- panel */

export function SoulWeaponPanel() {
  const [openName, setOpenName] = useState<string | null>(null);
  const open = SOUL_WEAPONS.find((w) => w.name === openName) ?? null;

  return (
    <div className="relative flex flex-col md:grid md:h-full md:min-h-0 md:grid-cols-2">
      <ul className="flex min-h-0 flex-col gap-2 overflow-auto border-b border-ink/15 p-3 pb-20 sm:p-4 md:border-r md:border-b-0">
        {SOUL_WEAPONS.map((weapon) => (
          <SoulWeaponRow key={weapon.id} weapon={weapon} onEngrave={() => setOpenName(weapon.name)} />
        ))}
      </ul>
      <div className="min-h-0 overflow-auto p-3 pb-20 sm:p-4">
        <EngravingSettings />
      </div>
      {open ? (
        <SideDialog
          title={`${open.name} engraving`}
          subtitle={<span className="text-dim">Soul Weapon Engraving · #{open.id}</span>}
          openKey={open.name}
          onClose={() => setOpenName(null)}
        >
          <EngravingBoard weapon={open} />
        </SideDialog>
      ) : null}
    </div>
  );
}
