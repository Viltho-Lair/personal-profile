import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { GUIDES, type GuideSlug } from "@/content/guides";
import { PageFrame, PageTitle, Prose } from "@/components/site-chrome";
import { OWNER } from "@/lib/site";

function guideBySlug(slug: GuideSlug) {
  return GUIDES.find((guide) => guide.slug === slug)!;
}

export function guideMetadata(slug: GuideSlug): Metadata {
  const guide = guideBySlug(slug);
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: { type: "article", title: guide.title, description: guide.description },
  };
}

const updatedFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" });

/** A guide page: title, the article, then a way into the analyzer and the other guides. */
export function GuideArticle({ slug, children }: { slug: GuideSlug; children: ReactNode }) {
  const guide = guideBySlug(slug);
  const others = GUIDES.filter((other) => other.slug !== slug);

  return (
    <PageFrame>
      <article>
        <nav aria-label="Breadcrumb" className="mb-6 font-mono text-xs tracking-[0.08em] text-dim uppercase">
          <Link href="/guides" className="hover:text-ink">
            Slayer Legends guides
          </Link>
        </nav>
        <PageTitle
          eyebrow={`${OWNER} · Updated ${updatedFormat.format(new Date(guide.updated))}`}
          title={guide.title}
          lede={guide.description}
        />
        <Prose>{children}</Prose>
      </article>

      <aside className="mt-16 grid max-w-[42rem] gap-8 border-t border-ink/15 pt-8">
        <div>
          <p className="font-medium">Try it on your own build</p>
          <p className="mt-1 text-dim">
            The <Link href="/slayer-legends-analyzer" className="underline underline-offset-4">Slayer Legends Analyzer</Link>{" "}
            applies these rules to the profile you enter.
          </p>
        </div>
        <div>
          <p className="mb-3 font-mono text-xs tracking-[0.08em] text-dim uppercase">More guides</p>
          <ul className="flex flex-col gap-2">
            {others.map((other) => (
              <li key={other.slug}>
                <Link href={`/guides/${other.slug}`} className="underline-offset-4 hover:underline">
                  {other.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </PageFrame>
  );
}
