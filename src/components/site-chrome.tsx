import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_NAV, OWNER, SITE_NAV } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";

const utility = "font-mono text-xs tracking-[0.08em] uppercase";

export function SiteHeader() {
  return (
    <header
      className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 ${utility} text-dim`}
    >
      <Link href="/" className="flex items-center gap-2.5 font-medium text-ink">
        <Image src="/logo.svg" alt="" width={16} height={18} />
        {OWNER}
      </Link>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <nav aria-label="Site">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {SITE_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer
      className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-ink/15 pt-5 ${utility} text-dim`}
    >
      <span>© 2026 {OWNER}</span>
      <nav aria-label="Legal and site">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {[...SITE_NAV, ...LEGAL_NAV].map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}

/** Header, a readable column of content, footer: the frame of every text page. */
export function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col gap-12 p-5 sm:p-8 lg:p-12">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Title block for a text page: a mono eyebrow naming the section, then the headline. */
export function PageTitle({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: ReactNode;
}) {
  return (
    <div className="mb-10 max-w-[48rem] sm:mb-14">
      <p className={`${utility} mb-4 text-dim`}>{eyebrow}</p>
      <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
        {title}
      </h1>
      {lede ? (
        <p className="mt-5 max-w-[42rem] text-[clamp(1.05rem,1.4vw,1.25rem)] leading-relaxed text-dim text-pretty">
          {lede}
        </p>
      ) : null}
    </div>
  );
}

/** Long-form text with the site's typographic rhythm. */
export function Prose({ children }: { children: ReactNode }) {
  return <div className="prose-site max-w-[42rem]">{children}</div>;
}
