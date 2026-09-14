/** Facts about the site that more than one page repeats. */
export const SITE_URL = "https://viltho.dev";

export const OWNER = "Viltho";

/** Who the owner is, in one sentence: the site's default description and the person in its structured data. */
export const OWNER_DESCRIPTION =
  "Viltho is a full-stack developer, data scientist, engineering manager and gamer, and the owner of nompany.com.";

/** The company the owner runs. */
export const COMPANY = { name: "Nompany", domain: "nompany.com", url: "https://nompany.com" } as const;

export const GITHUB_URL = "https://github.com/Viltho-Lair";

/** Shown on the contact page when set. */
export const CONTACT_EMAIL: string | null = null;

export const ANALYZER_REPO_ISSUES = "https://github.com/Viltho-Lair/personal-profile/issues";

/** Pages every visitor should be able to reach from any page. */
export const SITE_NAV = [
  { href: "/slayer-legends-analyzer", label: "Analyzer" },
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const LEGAL_NAV = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;
