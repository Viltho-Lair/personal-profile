/** A panel's own sections: underlined tabs along its top edge. */
export const SECTION_NAV =
  "flex shrink-0 gap-5 overflow-x-auto border-b border-ink/10 px-3 [scrollbar-width:none] sm:px-4";

export const sectionTab = (active: boolean) =>
  `-mb-px flex shrink-0 items-center gap-1.5 rounded-t-sm border-b-2 py-2.5 font-mono text-[10px] tracking-[0.08em] whitespace-nowrap uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-40 sm:text-[11px] ${
    active ? "border-brand-orange text-ink" : "border-transparent text-dim enabled:hover:text-ink"
  }`;

/** A small either-or choice inside a panel. */
export const SEGMENTS = "inline-flex shrink-0 gap-0.5 rounded-lg bg-ink/[0.05] p-0.5";

export const segment = (active: boolean) =>
  `flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
    active ? "bg-ground text-ink shadow-sm ring-1 ring-ink/10" : "text-dim hover:text-ink"
  }`;
