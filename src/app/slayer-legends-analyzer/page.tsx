import Image from "next/image";
import Link from "next/link";
import { AnalyzerShell } from "@/components/analyzer/analyzer-shell";
import { DEFAULT_TAB, isTabId } from "@/components/analyzer/tabs";
import { VisitorCounter } from "@/components/analyzer/visitor-counter";

export default async function SlayerLegendsAnalyzerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  const requested = typeof tab === "string" ? tab : null;

  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-ink/15 px-3 py-2">
        <Link href="/" aria-label="Home" className="shrink-0">
          <Image src="/logo.svg" alt="" width={14} height={16} />
        </Link>
        <h1 className="font-display text-sm font-semibold tracking-[-0.01em]">
          Slayer Legends Analyzer
        </h1>
        <p className="min-w-0 flex-1 truncate text-xs text-dim max-sm:hidden">
          A free build planner: enter your character, skills, equipment and companions to see every
          stat source added up. Your profile is saved only in this browser.
        </p>
        <nav aria-label="Site" className="ml-auto font-mono text-[10px] tracking-[0.08em] text-dim uppercase">
          <ul className="flex items-center gap-4">
            <VisitorCounter />
            <li><Link href="/guides" className="hover:text-ink">Guides</Link></li>
            <li><Link href="/about" className="hover:text-ink">About</Link></li>
            <li><Link href="/privacy" className="hover:text-ink">Privacy</Link></li>
          </ul>
        </nav>
      </header>
      <AnalyzerShell initialTab={isTabId(requested) ? requested : DEFAULT_TAB} />
    </>
  );
}
