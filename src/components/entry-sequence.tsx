"use client";

import { useEffect } from "react";

/**
 * Drives data-phase on <html>: idle → ready (fonts loaded, animation starts)
 * → settled (entry done, so the mark reacts quickly to the pointer).
 */
export function EntrySequence() {
  useEffect(() => {
    const root = document.documentElement;
    let settle: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      root.dataset.phase = "ready";
      settle = setTimeout(() => {
        root.dataset.phase = "settled";
      }, 2100);
    };

    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const timeout = new Promise((resolve) => setTimeout(resolve, 1200));

    Promise.race([fonts, timeout]).then(() => requestAnimationFrame(start));

    return () => {
      cancelled = true;
      clearTimeout(settle);
    };
  }, []);

  return null;
}
