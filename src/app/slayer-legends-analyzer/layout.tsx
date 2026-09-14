import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Slayer Legends Analyzer",
  description:
    "Free Slayer Legends build planner. Enter your character, skills, equipment and companions to see every stat source added up the way the game does.",
  alternates: { canonical: "/slayer-legends-analyzer" },
  openGraph: {
    title: "Slayer Legends Analyzer",
    description: "Plan a Slayer Legends build, one tab at a time.",
  },
};

export default function AnalyzerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col md:h-svh md:overflow-hidden bg-ground text-ink">
      {children}
    </div>
  );
}
