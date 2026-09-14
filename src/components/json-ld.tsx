import { COMPANY, GITHUB_URL, OWNER, OWNER_DESCRIPTION, SITE_URL } from "@/lib/site";

/** Structured data for search engines, escaped so no string in it can close the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** The site's owner, as schema.org describes a person: referenced by id from the other pages' data. */
export const PERSON = {
  "@type": "Person",
  "@id": `${SITE_URL}/#person`,
  name: OWNER,
  url: SITE_URL,
  description: OWNER_DESCRIPTION,
  jobTitle: "Full-stack developer, data scientist and engineering manager",
  knowsAbout: ["Full-stack development", "Data science", "Engineering management", "Operations management", "Video games", "Slayer Legends"],
  worksFor: { "@type": "Organization", name: COMPANY.name, url: COMPANY.url },
  sameAs: [GITHUB_URL, COMPANY.url],
} as const;

export const PERSON_REF = { "@id": PERSON["@id"] } as const;
