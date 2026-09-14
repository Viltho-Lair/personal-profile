/** Facts about the site that more than one page repeats. */
export const SITE_URL = "https://viltho.dev";

export const OWNER = "Abdullah Abu Hamad";

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
