"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** One responsive AdSense display unit. Renders nothing without a slot ID. */
export function AdSlot({ slot }: { slot: string | undefined }) {
  const requested = useRef(false);

  useEffect(() => {
    if (!slot || requested.current) return;
    requested.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers make the AdSense library throw; the cell just stays empty.
    }
  }, [slot]);

  if (!slot) {
    return process.env.NODE_ENV === "production" ? null : (
      <p className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
        Ad slot: set NEXT_PUBLIC_ADSENSE_SLOT_ANALYZER
      </p>
    );
  }

  return (
    <ins
      className="adsbygoogle block h-full w-full"
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
