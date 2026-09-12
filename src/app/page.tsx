import Link from "next/link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntrySequence } from "@/components/entry-sequence";
import { IsoGrid } from "@/components/iso-grid";
import { SoonHeadline } from "@/components/soon-headline";

const utilityBar = {
  flexWrap: "wrap",
  justifyContent: "space-between",
  rowGap: 1,
  columnGap: 3,
  fontFamily: "var(--font-mono-face)",
  fontSize: "0.75rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--dim)",
} as const;

export default function Home() {
  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr_auto] p-5 sm:p-8 lg:p-12">
      <EntrySequence />
      <IsoGrid />

      <Stack
        component="header"
        direction="row"
        className="reveal"
        style={{ "--i": 0 } as CSSProperties}
        sx={utilityBar}
      >
        <span className="font-medium text-ink">Abdullah Abu Hamad</span>
        {/* overflow-visible: the badge clips by default, cutting off the dot's pulse ring */}
        <Badge
          variant="ghost"
          className="h-auto gap-2.5 overflow-visible rounded-none px-0 font-mono text-xs font-normal tracking-[0.08em] text-dim uppercase hover:bg-transparent"
        >
          <span
            aria-hidden
            className="status-dot size-[7px] shrink-0 rounded-full bg-brand-orange"
          />
          Profile in progress
        </Badge>
      </Stack>

      <main className="self-end pt-12 pb-7 sm:pt-20 sm:pb-12 lg:pt-30 lg:pb-20">
        <SoonHeadline />
        <Typography
          component="p"
          className="reveal"
          style={{ "--i": 4 } as CSSProperties}
          sx={{
            maxWidth: "36ch",
            mt: { xs: 2.5, sm: 4, lg: 5 },
            fontSize: "clamp(1.05rem, 1.55vw, 1.35rem)",
            lineHeight: 1.5,
            color: "var(--dim)",
            textWrap: "pretty",
          }}
        >
          A proper introduction is on its way — my work, what I’m building, and
          how to reach me, all in one place.
        </Typography>

        <Button
          variant="outline"
          render={<Link href="/slayer-legends-analyzer" />}
          nativeButton={false}
          className="reveal mt-7 h-auto gap-2 rounded-none border-ink/25 bg-transparent px-4 py-2.5 font-mono text-xs tracking-[0.08em] text-ink uppercase hover:bg-ink hover:text-ground"
          style={{ "--i": 5 } as CSSProperties}
        >
          Slayer Legends Analyzer
          <span aria-hidden>&rarr;</span>
        </Button>
      </main>

      <Stack
        component="footer"
        direction="row"
        className="reveal"
        style={{ "--i": 6 } as CSSProperties}
        sx={utilityBar}
      >
        <span>© 2026 Abdullah Abu Hamad</span>
      </Stack>
    </div>
  );
}
