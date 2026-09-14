import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Instrument_Sans, Unbounded } from "next/font/google";
import { ADSENSE_CLIENT, ADSENSE_SCRIPT_URL } from "@/lib/adsense";
import { OWNER, SITE_URL } from "@/lib/site";
import "./globals.css";
import { Providers } from "./providers";

const display = Unbounded({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-display-face",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body-face",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-face",
});

const DESCRIPTION =
  "Abdullah Abu Hamad: full-stack developer, data scientist and engineering manager. Home of the Slayer Legends Analyzer and its guides.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: OWNER, template: `%s | ${OWNER}` },
  description: DESCRIPTION,
  icons: { icon: "/logo.svg" },
  openGraph: {
    siteName: OWNER,
    type: "website",
    title: OWNER,
    description: DESCRIPTION,
  },
  // AdSense site verification looks for this tag in the page head.
  other: { "google-adsense-account": ADSENSE_CLIENT },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f3f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0f14" },
  ],
};

// Without JavaScript the entry animation never runs, so nothing should stay hidden.
const noScriptStyles = `
  [data-phase="idle"] .reveal { opacity: 1; transform: none; }
  [data-phase="idle"] .mark .piece { --load: 0; opacity: 1; }
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-phase="idle"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* A plain async script, not next/script: React renders it into the
            server HTML, where the AdSense crawler can find it on every page. */}
        <script async src={ADSENSE_SCRIPT_URL} crossOrigin="anonymous" />
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: noScriptStyles }} />
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
