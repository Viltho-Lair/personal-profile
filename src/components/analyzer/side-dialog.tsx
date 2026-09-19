"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * A details panel drawn over the settings half of a section. Escape or the
 * close button dismisses it; focus moves to the close button when it opens.
 */
export function SideDialog({
  title,
  subtitle,
  art,
  openKey,
  onClose,
  children,
  className = "fixed inset-x-0 top-0 bottom-14 md:absolute md:inset-0 md:left-1/2",
}: {
  title: string;
  subtitle?: ReactNode;
  art?: ReactNode;
  /** Changes when the dialog shows something else, to move focus again. */
  openKey: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [openKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      className={`z-20 flex flex-col gap-4 overflow-auto border-ink/15 bg-ground p-4 shadow-2xl md:border-l ${className}`}
    >
      <header className="flex items-start gap-3">
        {art}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 id={titleId} className="text-base leading-tight font-medium">
            {title}
          </h3>
          {subtitle ? (
            <p className="flex flex-wrap gap-x-2 font-mono text-[10px] tracking-[0.08em] uppercase">
              {subtitle}
            </p>
          ) : null}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md border border-ink/25 px-2 py-0.5 font-mono text-xs text-dim outline-none hover:border-ink hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
        >
          ✕
        </button>
      </header>
      {children}
    </div>
  );
}
