import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageTitle, Prose } from "@/components/site-chrome";
import { ANALYZER_REPO_ISSUES, CONTACT_EMAIL, GITHUB_URL, OWNER } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to reach ${OWNER}, and where to report problems with the Slayer Legends Analyzer.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PageFrame>
      <PageTitle
        eyebrow="Contact"
        title="Get in touch"
        lede="Questions about my work, a project you'd like to discuss, or feedback on the analyzer are all welcome."
      />
      <Prose>
        <h2>General enquiries</h2>
        {CONTACT_EMAIL ? (
          <p>
            Email me at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. I read everything
            and reply to messages that need a response, usually within a few days.
          </p>
        ) : null}
        <p>
          My projects and code are on <a href={GITHUB_URL}>GitHub</a>.
        </p>

        <h2>Slayer Legends Analyzer feedback</h2>
        <p>
          If a number in the analyzer doesn&rsquo;t match what you see in the game, or something
          doesn&rsquo;t work, please{" "}
          <a href={ANALYZER_REPO_ISSUES}>open an issue on GitHub</a>. The most useful reports
          include:
        </p>
        <ul>
          <li>which tab and which item or skill you were looking at,</li>
          <li>the value the analyzer showed and the value the game shows,</li>
          <li>your device and browser.</li>
        </ul>
        <p>
          Your analyzer profile is stored only in your browser, so I can&rsquo;t see it. If a
          screenshot helps explain the problem, attach one. See the{" "}
          <Link href="/privacy">privacy policy</Link> for how the site handles data.
        </p>
      </Prose>
    </PageFrame>
  );
}
