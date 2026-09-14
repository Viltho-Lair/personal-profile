import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/content/guides";
import { PageFrame, PageTitle } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Slayer Legends guides",
  description:
    "Plain-English explanations of Slayer Legends mechanics: how stats add up, skills, equipment, companions and promotion fights.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <PageFrame>
      <PageTitle
        eyebrow="Guides"
        title="Slayer Legends, explained"
        lede={
          <>
            How the game&rsquo;s systems actually work, written from the data and formulas behind
            the <Link href="/slayer-legends-analyzer" className="text-ink underline underline-offset-4">Slayer Legends Analyzer</Link>.
            Each guide explains what a system does, how its numbers combine, and what that means
            for where to spend your resources.
          </>
        }
      />
      <ul className="grid max-w-4xl gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2">
        {GUIDES.map((guide) => (
          <li key={guide.slug} className="bg-ground">
            <Link href={`/guides/${guide.slug}`} className="group flex h-full flex-col gap-2 p-6">
              <span className="font-display text-lg leading-snug font-semibold tracking-[-0.01em] group-hover:underline">
                {guide.title}
              </span>
              <span className="leading-relaxed text-dim">{guide.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}
