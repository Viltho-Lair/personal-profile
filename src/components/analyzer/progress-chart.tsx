"use client";

const SELECT =
  "rounded-md border border-ink/20 bg-ground px-1.5 py-1 font-mono text-[11px] text-ink outline-none focus-visible:border-ink disabled:opacity-60";

/**
 * The progress chart. Its X and Y measures aren't decided yet, so the axes
 * show the layout only: a target line, the player's progress line and marker.
 */
export function ProgressChart() {
  return (
    <section aria-label="Progress chart" className="flex min-h-0 flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold">Progress</h2>
        {(["X", "Y"] as const).map((axis) => (
          <label key={axis} className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
            {axis} axis
            <select aria-label={`${axis} axis`} disabled className={SELECT} defaultValue="">
              <option value="">Coming soon</option>
            </select>
          </label>
        ))}
      </div>

      <div className="relative min-h-0 flex-1">
        <svg viewBox="0 0 400 240" preserveAspectRatio="none" className="size-full" role="img" aria-label="Chart placeholder until the axes are chosen">
          <line x1="60" y1="10" x2="60" y2="215" className="stroke-ink/60" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <line x1="52" y1="215" x2="390" y2="215" className="stroke-ink/60" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <line x1="60" y1="50" x2="385" y2="50" className="stroke-ink/40" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          <line x1="60" y1="75" x2="385" y2="75" className="stroke-ink/40" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          <path d="M 60 215 C 160 180, 260 150, 350 75" fill="none" className="stroke-ink/25" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute top-[16%] left-0 flex -translate-y-1/2 items-center gap-1 font-mono text-[10px] text-dim">
          <span className="inline-block size-4 rounded-sm border border-ink/30" aria-hidden />—
        </span>
        <span className="absolute top-[31%] left-0 -translate-y-1/2 font-mono text-[10px] text-dim">You</span>
        <span className="absolute top-[31%] left-[87.5%] size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-ink bg-ground" aria-hidden />
        <p className="absolute inset-x-0 bottom-8 text-center font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
          X and Y filters arrive soon
        </p>
      </div>
    </section>
  );
}
