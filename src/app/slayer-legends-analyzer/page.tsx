import Image from "next/image";
import Link from "next/link";
import { AnalyzerShell } from "@/components/analyzer/analyzer-shell";
import { DEFAULT_TAB, isTabId } from "@/components/analyzer/tabs";
import { VisitorCounter } from "@/components/analyzer/visitor-counter";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function SlayerLegendsAnalyzerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  const requested = typeof tab === "string" ? tab : null;

  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 md:px-4">
        <Link
          href="/"
          aria-label="Home"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink/10 bg-ground"
        >
          <Image src="/logo.svg" alt="" width={16} height={18} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="font-display text-sm leading-tight font-semibold tracking-[-0.01em] sm:text-base">
            Slayer Legends Analyzer
          </h1>
          <p className="truncate text-xs text-dim max-sm:hidden">
            A free build planner: enter your character, skills, equipment and companions to see every
            stat source added up. Your profile is saved only in this browser.
          </p>
        </div>
        <nav aria-label="Site" className="font-mono text-[10px] tracking-[0.08em] text-dim uppercase max-sm:order-last max-sm:w-full">
          <ul className="flex items-center gap-4">
            <VisitorCounter />
            <li><Link href="/guides" className="hover:text-ink">Guides</Link></li>
            <li><Link href="/about" className="hover:text-ink">About</Link></li>
            <li><Link href="/privacy" className="hover:text-ink">Privacy</Link></li>
          </ul>
        </nav>
        <ThemeToggle />
      </header>
      <AnalyzerShell initialTab={isTabId(requested) ? requested : DEFAULT_TAB} />
    </>
  );
}
