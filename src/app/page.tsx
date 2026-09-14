import Link from "next/link";
import type { CSSProperties } from "react";
import { GUIDES } from "@/content/guides";
import { EntrySequence } from "@/components/entry-sequence";
import { HeroMark } from "@/components/hero-mark";
import { IsoGrid } from "@/components/iso-grid";
import { LogoPiece } from "@/components/logo-mark";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

/** The three pieces of the mark are the three kinds of work. */
const DISCIPLINES = [
  {
    piece: "blue",
    verb: "Build",
    role: "Full-stack development",
    body: "Web applications from the database to the last pixel: typed APIs, data models that survive change, and interfaces people can use without a manual. I care about tests that catch real regressions and pages that load fast on a phone.",
  },
  {
    piece: "orange",
    verb: "Measure",
    role: "Data science",
    body: "Turning messy sources into numbers you can trust: extraction pipelines, clean datasets, models and simulations. The goal is always a decision someone can make with more confidence than before.",
  },
  {
    piece: "red",
    verb: "Run",
    role: "Engineering management & operations",
    body: "Leading engineering teams and the operations around them: setting priorities, removing blockers, building processes that scale, and keeping delivery predictable without burning people out.",
  },
] as const;

const cta =
  "inline-flex items-center gap-2 border px-4 py-2.5 font-mono text-xs tracking-[0.08em] uppercase transition-colors";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col gap-16 p-5 sm:gap-24 sm:p-8 lg:p-12">
      <EntrySequence />
      <IsoGrid />

      <div className="reveal" style={{ "--i": 0 } as CSSProperties}>
        <SiteHeader />
      </div>

      <main className="flex flex-col gap-20 sm:gap-28">
        <section aria-labelledby="intro" className="pt-6 sm:pt-12">
          <div className="flex items-end gap-[0.18em] font-display text-[clamp(3rem,11vw,9.5rem)] leading-[0.92] font-semibold tracking-[-0.045em]">
            <h1 id="intro" className="m-0">
              <span className="reveal block" style={{ "--i": 1 } as CSSProperties}>
                Abdullah
              </span>
              <span className="reveal block" style={{ "--i": 2 } as CSSProperties}>
                Abu Hamad
              </span>
            </h1>
            <HeroMark className="mb-[0.08em] h-[0.78em] w-[calc(0.78em*519/599)] shrink-0 overflow-visible max-sm:hidden" />
          </div>
          <p
            className="reveal mt-8 max-w-[38ch] text-[clamp(1.15rem,1.9vw,1.6rem)] leading-snug text-pretty"
            style={{ "--i": 3 } as CSSProperties}
          >
            Full-stack developer, data scientist and engineering manager.{" "}
            <span className="text-dim">
              I build software, find out what the data is saying, and run the
              teams and operations that keep both going.
            </span>
          </p>
        </section>

        <section aria-labelledby="work" className="reveal" style={{ "--i": 4 } as CSSProperties}>
          <h2 id="work" className="mb-8 font-mono text-xs tracking-[0.08em] text-dim uppercase">
            What I do
          </h2>
          <ul className="grid gap-px border border-ink/15 bg-ink/15 md:grid-cols-3">
            {DISCIPLINES.map((discipline) => (
              <li key={discipline.piece} className="flex flex-col gap-4 bg-ground p-6 sm:p-8">
                <LogoPiece name={discipline.piece} className="h-14 w-12 text-ink" />
                <div>
                  <p className="font-display text-2xl font-semibold tracking-[-0.02em]">
                    {discipline.verb}
                  </p>
                  <p className="mt-1 font-mono text-xs tracking-[0.08em] text-dim uppercase">
                    {discipline.role}
                  </p>
                </div>
                <p className="leading-relaxed text-dim">{discipline.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="project" className="grid gap-10 md:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 id="project" className="mb-6 font-mono text-xs tracking-[0.08em] text-dim uppercase">
              Project
            </h2>
            <p className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
              Slayer Legends Analyzer
            </p>
            <div className="mt-5 flex max-w-[40rem] flex-col gap-4 leading-relaxed text-dim">
              <p>
                A free build planner for the mobile idle RPG Slayer Legends. Enter your
                character, skills, equipment and companions, and the analyzer adds up every
                stat source the way the game does, so you can see which upgrade moves your
                power the most before you spend a single resource.
              </p>
              <p>
                It is also where all three kinds of work meet. A Python pipeline extracts and
                tests the game data, a typed calculation library reproduces the formulas, and
                a Next.js interface keeps your profile in your own browser.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/slayer-legends-analyzer"
                className={`${cta} border-ink bg-ink text-ground hover:bg-transparent hover:text-ink`}
              >
                Open the analyzer <span aria-hidden>&rarr;</span>
              </Link>
              <Link href="/guides" className={`${cta} border-ink/25 hover:border-ink`}>
                Read the guides
              </Link>
            </div>
          </div>

          <div>
            <h2 className="mb-6 font-mono text-xs tracking-[0.08em] text-dim uppercase">
              Guides
            </h2>
            <ul className="border-t border-ink/15">
              {GUIDES.map((guide) => (
                <li key={guide.slug} className="border-b border-ink/15">
                  <Link href={`/guides/${guide.slug}`} className="group block py-4">
                    <span className="font-medium group-hover:underline">{guide.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-dim">
                      {guide.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
