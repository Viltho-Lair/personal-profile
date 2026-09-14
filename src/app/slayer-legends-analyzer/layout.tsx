import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JsonLd, PERSON, PERSON_REF } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";

const TITLE = "Slayer Legends Analyzer";
const DESCRIPTION =
  "Free Slayer Legends build planner and calculator. Enter your character, skills, equipment and companions to see every stat source added up the way the game does, test promotion fights, and get an upgrade plan.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["Slayer Legends", "Slayer Legends analyzer", "Slayer Legends calculator", "Slayer Legends build planner", "Slayer Legends promotion", "Slayer Legends upgrade guide"],
  alternates: { canonical: "/slayer-legends-analyzer" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/slayer-legends-analyzer`,
    title: TITLE,
    description: "Plan a Slayer Legends build, test promotion fights, and see what to upgrade next.",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: "Plan a Slayer Legends build, test promotion fights, and see what to upgrade next." },
};

export default function AnalyzerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col md:h-svh md:overflow-hidden bg-ground text-ink">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            PERSON,
            {
              "@type": "WebApplication",
              name: TITLE,
              url: `${SITE_URL}/slayer-legends-analyzer`,
              description: DESCRIPTION,
              applicationCategory: "GameApplication",
              operatingSystem: "Any (web browser)",
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              author: PERSON_REF,
            },
          ],
        }}
      />
      {children}
    </div>
  );
}
