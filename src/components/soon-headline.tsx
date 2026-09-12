"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { LogoMark } from "./logo-mark";

export function SoonHeadline() {
  const markRef = useRef<SVGSVGElement>(null);

  // The mark opens up as the pointer approaches it.
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

  return (
    <h1
      aria-label="Soon™"
      className="m-0 flex items-baseline font-display text-[clamp(4.25rem,21vw,17.5rem)] leading-[0.9] font-semibold tracking-[-0.045em] whitespace-nowrap"
    >
      <span aria-hidden className="reveal inline-block" style={{ "--i": 1 } as CSSProperties}>
        SO
      </span>
      <LogoMark
        ref={markRef}
        className="h-[0.8em] w-[calc(0.8em*519/599)] shrink-0 translate-y-[-0.055em] self-end overflow-visible mr-[0.04em] ml-[0.025em]"
      />
      <span aria-hidden className="reveal inline-block" style={{ "--i": 2 } as CSSProperties}>
        N
      </span>
      <span
        aria-hidden
        className="reveal mt-[0.3em] ml-[0.25em] inline-block self-start text-[0.17em] tracking-normal text-dim"
        style={{ "--i": 3 } as CSSProperties}
      >
        ™
      </span>
    </h1>
  );
}
