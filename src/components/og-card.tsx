import { ImageResponse } from "next/og";
import { COMPANY, OWNER, SITE_URL } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = `${OWNER}: full-stack developer, data scientist, engineering manager and gamer`;

/** The share card every page uses: the mark, the name, what the owner does, and the address. */
export function ogCard() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0c0f14", color: "#f1f3f6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28, letterSpacing: 4, color: "#9aa3ae" }}>
          <svg width="52" height="60" viewBox="40 0 519 599">
            <polygon fill="#48C9EC" points="40,95 204,0 367,95 40,284" />
            <polygon fill="#8BE4FF" points="367,95 367,282 204,189" />
            <polygon fill="#FF9E03" points="397,108 559,203 559,392 397,486" />
            <polygon fill="#FFB547" points="233,390 397,297 397,486" />
            <polygon fill="#FF3236" points="40,318 367,505 204,599 40,505" />
            <polygon fill="#FF8687" points="40,318 204,224 204,410" />
          </svg>
          {SITE_URL.replace("https://", "").toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 168, fontWeight: 700, letterSpacing: -6, lineHeight: 1 }}>{OWNER}</div>
          <div style={{ fontSize: 40, lineHeight: 1.3, color: "#c9d0d8" }}>Full-stack developer, data scientist, engineering manager and gamer.</div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 26, color: "#9aa3ae" }}>
          <span style={{ color: "#48C9EC" }}>Owner of {COMPANY.domain}</span>
          <span>·</span>
          <span style={{ color: "#FF9E03" }}>Slayer Legends Analyzer</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
