"use client";

import { useEffect, useRef, useState } from "react";
import { formatValue } from "./data";

/** A level drawn across the chart: a boss's HP or a stage cleared. */
export type ChartLevel = { value: number; label: string; tone: "red" | "green"; align: "start" | "end" };

const TONE = { red: "stroke-red-500", green: "stroke-emerald-500" } as const;
const TONE_TEXT = { red: "fill-red-500", green: "fill-emerald-500" } as const;
const PAD = { left: 10, right: 12, top: 14, bottom: 22 };
const TIME_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];

/** A round step near `raw`: 1, 2 or 5 times a power of ten. */
function niceStep(raw: number) {
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-300)));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

/**
 * Damage over the fight, drawn at the size it's shown: the chart measures its box and lays the line out in
 * real pixels, so strokes stay crisp and round at any width instead of stretching with the page.
 */
export function DamageChart({
  points,
  clock,
  duration,
  top,
  logScale,
  levels,
  band,
  releases,
  placeholder,
  label,
}: {
  points: { t: number; damage: number }[] | null;
  clock: number;
  duration: number;
  top: number;
  logScale: boolean;
  levels: ChartLevel[];
  /** A shaded HP range (the boss's lowest to highest HP). */
  band: { from: number; to: number } | null;
  releases: { t: number; damage: number }[];
  placeholder: string;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = Math.max(1, height - PAD.top - PAD.bottom);
  const ratio = (value: number) =>
    logScale ? Math.log10(1 + Math.max(0, value)) / Math.log10(1 + top) : Math.max(0, value) / top;
  const y = (value: number) => PAD.top + plotH * (1 - Math.min(1, ratio(value)));
  const x = (t: number) => PAD.left + (Math.min(Math.max(t, 0), duration) / Math.max(duration, 1e-9)) * plotW;
  const bottom = PAD.top + plotH;

  // One point per pixel column: damage only grows, so a column's last point is its highest.
  const line: [number, number][] = [];
  for (const point of points ?? []) {
    const px = x(point.t);
    const py = y(point.damage);
    const last = line[line.length - 1];
    if (last && px - last[0] < 1) last[1] = py;
    else line.push([px, py]);
  }
  const path = line.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`).join("");
  const end = line[line.length - 1];
  const area = end ? `${path}L${end[0].toFixed(2)},${bottom}L${PAD.left},${bottom}Z` : "";

  // Gridlines: round values on a linear scale, whole powers of ten on a log scale.
  const grid: number[] = [];
  if (logScale) {
    const decades = Math.floor(Math.log10(Math.max(1, top)));
    const every = Math.max(1, Math.ceil(decades / 4));
    for (let k = every; k <= decades; k += every) grid.push(10 ** k);
  } else {
    const step = niceStep(top / 4);
    for (let v = step; v < top; v += step) grid.push(v);
  }
  const timeStep = TIME_STEPS.find((step) => (duration / step) * 56 <= plotW) ?? TIME_STEPS[TIME_STEPS.length - 1]!;
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 1e-9; t += timeStep) ticks.push(t);

  return (
    <div ref={box} className="relative h-56 w-full shrink-0 md:h-[34svh]">
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 text-sky-500"
          shapeRendering="geometricPrecision"
          role="img"
          aria-label={label}
        >
          <defs>
            <linearGradient id="damage-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          {grid.map((value) => (
            <g key={value}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(value)} y2={y(value)} className="stroke-ink/10" />
              <text x={PAD.left + 3} y={y(value) - 3} className="fill-dim font-mono" fontSize="9">
                {formatValue(value)}
              </text>
            </g>
          ))}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={bottom} y2={bottom + 4} className="stroke-ink/40" />
              <text x={x(t)} y={height - 6} textAnchor={t === 0 ? "start" : x(t) > width - 20 ? "end" : "middle"} className="fill-dim font-mono" fontSize="9">
                {t}s
              </text>
            </g>
          ))}

          {band ? <rect x={PAD.left} y={y(band.to)} width={plotW} height={Math.max(0, y(band.from) - y(band.to))} className="fill-red-500/10" /> : null}
          {levels.map((level) => (
            <g key={`${level.label}-${level.value}`}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(level.value)} y2={y(level.value)} className={TONE[level.tone]} strokeDasharray="5 4" strokeWidth="1.25" />
              <text
                x={level.align === "end" ? PAD.left + plotW - 2 : PAD.left + 3}
                y={y(level.value) - 4}
                textAnchor={level.align}
                className={`${TONE_TEXT[level.tone]} font-mono`}
                fontSize="10"
              >
                {level.label}
              </text>
            </g>
          ))}

          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={bottom} className="stroke-ink/50" />
          <line x1={PAD.left} y1={bottom} x2={PAD.left + plotW} y2={bottom} className="stroke-ink/50" />

          {points ? (
            <>
              <path d={area} fill="url(#damage-area)" />
              <path d={path} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
              <line x1={x(clock)} x2={x(clock)} y1={PAD.top} y2={bottom} className="stroke-ink/25" strokeDasharray="2 3" />
              {end ? <circle cx={end[0]} cy={end[1]} r="4" className="fill-ground" stroke="currentColor" strokeWidth="2" /> : null}
            </>
          ) : (
            <text x={width / 2} y={height / 2} textAnchor="middle" className="fill-dim font-mono" fontSize="11">
              {placeholder}
            </text>
          )}
          {releases.map((release) => (
            <g key={`${release.t}-${release.damage}`}>
              <circle cx={x(release.t)} cy={y(release.damage)} r="4" className="fill-fuchsia-500 stroke-ground" strokeWidth="1.5" />
              <text x={x(release.t) + 6} y={y(release.damage) + 12} className="fill-fuchsia-400 font-mono" fontSize="10">
                Rave
              </text>
            </g>
          ))}
        </svg>
      ) : null}
    </div>
  );
}
