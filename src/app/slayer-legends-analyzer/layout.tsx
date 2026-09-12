import type { Metadata } from "next";
import type { ReactNode } from "react";

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
      {children}
    </div>
  );
}
