import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame, PageTitle, Prose } from "@/components/site-chrome";
import { OWNER, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What data viltho.dev collects, how advertising cookies are used, and how to opt out.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "14 September 2026";

export default function PrivacyPage() {
  return (
    <PageFrame>
      <PageTitle eyebrow="Legal" title="Privacy policy" lede={`Last updated ${UPDATED}.`} />
      <Prose>
        <p>
          This policy explains what information is collected when you visit{" "}
          <a href={SITE_URL}>viltho.dev</a> (&ldquo;the site&rdquo;), run by {OWNER}, and what
          choices you have. The short version: the site has no accounts and doesn&rsquo;t ask for
          your personal details; your analyzer data stays in your browser; and the site shows ads
          from Google, which uses cookies.
        </p>

        <h2>Information stored in your browser</h2>
        <p>
          The <Link href="/slayer-legends-analyzer">Slayer Legends Analyzer</Link> saves the
          profile you enter (levels, items, skills and similar game settings) in your
          browser&rsquo;s local storage so it&rsquo;s there when you come back. That data is never
          sent to this site&rsquo;s servers and I can&rsquo;t see it. You can delete it at any time
          with the analyzer&rsquo;s reset button or by clearing your browser&rsquo;s site data.
          The analyzer&rsquo;s Export JSON button saves that profile as a file on your own device,
          and Import JSON reads a file you choose in your browser; neither sends it anywhere.
        </p>

        <h2>Visitor counter</h2>
        <p>
          The analyzer shows how many visits it has had. Each browser is counted at most once a
          day: the date it was last counted is kept in your browser&rsquo;s local storage, and the
          site adds one to a single running total kept with Upstash, a database provider. Only
          that number is stored; no IP address, cookie or other detail about you goes with it.
          See <a href="https://upstash.com/trust/privacy.pdf">Upstash&rsquo;s privacy policy</a>.
        </p>

        <h2>Advertising and cookies</h2>
        <p>
          The site uses Google AdSense to show advertisements. Third-party vendors, including
          Google, use cookies to serve ads based on your prior visits to this site and other
          websites. Google&rsquo;s use of advertising cookies enables it and its partners to serve
          ads to you based on your visits to this site and/or other sites on the internet.
        </p>
        <p>You can control personalised advertising:</p>
        <ul>
          <li>
            opt out of personalised advertising from Google in{" "}
            <a href="https://adssettings.google.com">Google Ads Settings</a>;
          </li>
          <li>
            opt out of some third-party vendors&rsquo; use of cookies for personalised advertising
            at <a href="https://www.aboutads.info/choices/">aboutads.info</a> or, in Europe,{" "}
            <a href="https://www.youronlinechoices.eu/">youronlinechoices.eu</a>;
          </li>
          <li>block or delete cookies in your browser settings.</li>
        </ul>
        <p>
          Where the law requires consent, for example in the European Economic Area, the United
          Kingdom and Switzerland, you&rsquo;ll be asked before advertising cookies are used, and
          you can change your choice later. Google explains how it uses information from sites that
          use its services at{" "}
          <a href="https://policies.google.com/technologies/partner-sites">
            policies.google.com/technologies/partner-sites
          </a>
          .
        </p>

        <h2>Server logs</h2>
        <p>
          The site is hosted on Vercel. Like any web host, Vercel processes technical request data
          such as your IP address, browser type and the page requested in order to deliver the site
          and protect it from abuse. This site doesn&rsquo;t use that data to identify you or build
          a profile of you. See{" "}
          <a href="https://vercel.com/legal/privacy-policy">Vercel&rsquo;s privacy policy</a> for
          details.
        </p>

        <h2>External links</h2>
        <p>
          Pages link to other sites, such as GitHub. Those sites have their own privacy practices,
          which this policy doesn&rsquo;t cover.
        </p>

        <h2>Children</h2>
        <p>
          The site isn&rsquo;t directed at children under 13 and doesn&rsquo;t knowingly collect
          personal information from them.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on where you live, you may have rights to access, correct or delete personal
          data about you. Because the site itself doesn&rsquo;t collect personal data, most requests
          are best directed to Google for advertising data. For anything else,{" "}
          <Link href="/contact">get in touch</Link>.
        </p>

        <h2>Changes</h2>
        <p>
          If this policy changes, the new version will be posted on this page with a new
          &ldquo;last updated&rdquo; date.
        </p>
      </Prose>
    </PageFrame>
  );
}
