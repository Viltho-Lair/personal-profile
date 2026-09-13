import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { ADSENSE_CLIENT } from "@/lib/adsense";

export const metadata: Metadata = {
  title: "Slayer Legends Analyzer",
  description:
    "Plan a Slayer Legends build: character, skills, equipment, companion, adventure and shop.",
  openGraph: {
    title: "Slayer Legends Analyzer",
    description: "Plan a Slayer Legends build, one tab at a time.",
  },
};

export default function AnalyzerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-ground text-ink">
      {/* Google AdSense, loaded after the page is interactive so it never blocks the app. */}
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      {children}
    </div>
  );
}
