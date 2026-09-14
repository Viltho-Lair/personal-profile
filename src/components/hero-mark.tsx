"use client";

import { useEffect, useRef } from "react";
import { LogoMark } from "./logo-mark";

/** The logo mark, which opens up as the pointer approaches it. */
export function HeroMark({ className }: { className?: string }) {
  const markRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    let frame = 0;

    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = mark.getBoundingClientRect();
        const distance = Math.hypot(
          event.clientX - (rect.left + rect.width / 2),
          event.clientY - (rect.top + rect.height / 2),
        );
        const nearness = Math.max(0, 1 - distance / (rect.width * 2.4));
        mark.style.setProperty("--hover", (nearness * nearness * 1.5).toFixed(3));
      });
    };

    const onLeave = () => mark.style.setProperty("--hover", "0");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <LogoMark ref={markRef} className={className} />;
}
