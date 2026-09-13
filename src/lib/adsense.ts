/** Google AdSense publisher ID for viltho.dev. */
export const ADSENSE_CLIENT = "ca-pub-3650311070405680";

/**
 * Ad unit ID for the analyzer's top-right ad, created in the AdSense
 * dashboard (Ads → By ad unit → Display ads). Set it in Vercel as
 * NEXT_PUBLIC_ADSENSE_SLOT_ANALYZER; until then no ad unit renders.
 */
export const ANALYZER_AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ANALYZER;
