import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageTitle, Prose } from "@/components/site-chrome";
import { GITHUB_URL, OWNER } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${OWNER} is a full-stack developer, data scientist and engineering manager with a background in operations management.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageFrame>
      <PageTitle
        eyebrow="About"
        title="Software, data, and the teams that run them"
        lede={`I'm ${OWNER}: a full-stack developer, data scientist and engineering manager with experience in operations management.`}
      />
      <Prose>
        <p>
          Most problems I work on don&rsquo;t sit neatly inside one discipline. A slow process is
          often a data problem, a data problem is often a missing tool, and a missing tool is often
          a team that hasn&rsquo;t had the time or the mandate to build it. Working across all three
          lets me follow a problem to wherever it actually lives.
        </p>

        <h2>Full-stack development</h2>
        <p>
          I build web applications end to end: data models, APIs and the interfaces on top of them.
          My current stack is TypeScript, React and Next.js on the front, with Python for data work
          and automation. I favour small, well-tested units over clever abstractions, and I treat
          performance and accessibility as part of the job rather than a later phase.
        </p>

        <h2>Data science</h2>
        <p>
          I use data to answer practical questions. That usually starts with the unglamorous part:
          getting data out of the systems or documents it lives in, cleaning it, and writing tests
          so it stays correct as sources change. From there it&rsquo;s analysis, modelling or
          simulation, whichever gives the clearest answer to the question being asked.
        </p>

        <h2>Engineering management and operations</h2>
        <p>
          I lead engineering teams and have managed the operations around them. The work is about
          clarity: agreeing what matters most, making ownership obvious, designing processes that
          remove friction instead of adding it, and measuring outcomes rather than activity.
          Operations experience keeps me honest about what software has to do once it leaves the
          editor and meets real users, real volume and real deadlines.
        </p>

        <h2>What&rsquo;s on this site</h2>
        <p>
          The main project here is the{" "}
          <Link href="/slayer-legends-analyzer">Slayer Legends Analyzer</Link>, a free build planner
          for the mobile game Slayer Legends, with a set of{" "}
          <Link href="/guides">guides</Link> that explain the game mechanics it models. It began as
          a way to answer my own questions about the game and grew into a small example of all three
          disciplines: a Python extraction pipeline with tests, a typed calculation library, and a
          web interface.
        </p>
        <p>
          You can find my code on <a href={GITHUB_URL}>GitHub</a>, or{" "}
          <Link href="/contact">get in touch</Link>.
        </p>
      </Prose>
    </PageFrame>
  );
}
