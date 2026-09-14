import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageTitle, Prose } from "@/components/site-chrome";
import { OWNER } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms for using viltho.dev and the Slayer Legends Analyzer.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PageFrame>
      <PageTitle eyebrow="Legal" title="Terms of use" lede="Last updated 13 September 2026." />
      <Prose>
        <p>
          By using viltho.dev you agree to these terms. If you don&rsquo;t agree, please don&rsquo;t
          use the site.
        </p>

        <h2>The analyzer and guides</h2>
        <p>
          The <Link href="/slayer-legends-analyzer">Slayer Legends Analyzer</Link> and the{" "}
          <Link href="/guides">guides</Link> are free, unofficial fan tools. Their numbers are
          worked out from game data and observed behaviour, and the game can change at any time, so
          results are estimates. Check anything important in the game before spending resources on
          it.
        </p>

        <h2>No affiliation</h2>
        <p>
          This site isn&rsquo;t affiliated with, endorsed by or sponsored by the developers or
          publishers of Slayer Legends. Game names, artwork and other game assets belong to their
          respective owners and are used here only to identify in-game items in a fan-made tool.
        </p>

        <h2>Your use of the site</h2>
        <p>
          Don&rsquo;t try to disrupt the site, access it in ways that put unreasonable load on it,
          or use it for anything unlawful.
        </p>

        <h2>Content</h2>
        <p>
          Unless stated otherwise, the site&rsquo;s own text, design and code are &copy; {OWNER}.
          You&rsquo;re welcome to link to any page and to quote short passages with attribution.
        </p>

        <h2>No warranty</h2>
        <p>
          The site is provided &ldquo;as is&rdquo;, without warranties of any kind. To the extent
          the law allows, {OWNER} isn&rsquo;t liable for any loss arising from use of the site or
          reliance on its content.
        </p>

        <h2>Changes</h2>
        <p>
          These terms may be updated. The current version is always on this page. Questions go
          through the <Link href="/contact">contact page</Link>.
        </p>
      </Prose>
    </PageFrame>
  );
}
