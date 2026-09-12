import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Instrument_Sans, Unbounded } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Abdullah Abu Hamad — Soon™",
  description: "The personal profile of Abdullah Abu Hamad. Coming soon.",
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "Abdullah Abu Hamad — Soon™",
    description: "A proper introduction is on its way.",
  },
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
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: noScriptStyles }} />
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
